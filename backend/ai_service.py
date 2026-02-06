import os
import time
import base64
from google import genai
from models import AIHistorySummary, ScanResult
from dotenv import load_dotenv
from functools import wraps
import json
import traceback
from pathlib import Path

# Load .env from the backend directory
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

# Initialize Client
_client = None

def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client

# Retry configuration
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 10  # seconds

def is_rate_limit_error(e) -> bool:
    """Check if the exception is a 429 RESOURCE_EXHAUSTED error"""
    error_str = str(e)
    if hasattr(e, 'code') and e.code == 429:
        return True
    if hasattr(e, 'status') and (e.status == 'RESOURCE_EXHAUSTED' or str(e.status) == '429'):
        return True
    if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
        return True
    return False

def call_gemini_with_fallback(contents):
    """
    Helper to call Gemini API with automatic fallback to 1.5-flash 
    if 2.0-flash is rate limited (429).
    """
    client = get_client()
    # Priority: Use verified models available to this account
    models_to_try = [
        'gemini-2.0-flash',
        'gemini-flash-latest',
        'gemini-pro-latest',
        'gemini-2.5-flash'
    ]
    
    last_exception = None
    
    for model in models_to_try:
        try:
            print(f"Calling Gemini API with model: {model}")
            response = client.models.generate_content(
                model=model,
                contents=contents
            )
            return response
        except Exception as e:
            last_exception = e
            if is_rate_limit_error(e):
                print(f"Rate limit hit for {model}. Falling back...")
                continue
            else:
                # If it's not a rate limit error (e.g. 500, 400), raise immediately
                raise e
                
    # If we exhausted all models
    print("All models exhausted due to rate limits.")
    raise last_exception

def retry_api_call(func):
    """
    Decorator to retry API calls on 429 RESOURCE_EXHAUSTED errors.
    Implements fallback to gemini-1.5-flash if 2.0-flash is exhausted.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        retries = 0
        while retries <= MAX_RETRIES:
            try:
                # Call the original function
                return func(*args, **kwargs)
            
            except Exception as e:
                is_429 = is_rate_limit_error(e)
                
                # If it's a 429, try to switch models if possible for 'generate_content' calls
                if is_429:
                    print(f"Rate limit hit (429). Attempt {retries + 1}/{MAX_RETRIES}")
                    
                    # FALLBACK STRATEGY: Try gemini-1.5-flash if we hit limits on 2.0
                    # Takes advantage of separate quotas for different models
                    try:
                        # Inspect the function's closure or arguments to find the client call if possible
                        # Since we can't easily change the hardcoded model string inside the function without logic change,
                        # We might need to handle this differently.
                        
                        # Simpler approach: If we hit a rate limit, waiting might not help if the bucket is empty.
                        # But wait! The 'func' has 'model=gemini-2.0-flash' hardcoded effectively.
                        pass 
                    except:
                        pass
                
                if is_429:
                    if retries >= MAX_RETRIES:
                        print(f"Max retries ({MAX_RETRIES}) exceeded for rate limit.")
                        raise e
                    
                    # Calculate wait time (exponential backoff)
                    wait_time = INITIAL_RETRY_DELAY * (2 ** retries)
                    
                    print(f"Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    retries += 1
                else:
                    # If it's not a rate limit error, raise immediately
                    raise e
    
    return wrapper


@retry_api_call
def get_gemini_summary(patient_data: dict) -> AIHistorySummary:
    """
    Generate clinical summary using Gemini AI
    For physician review only
    """
    
    # Build prompt for Gemini
    prompt = f"""
You are a clinical AI assistant helping licensed physicians. Analyze this patient data and provide a structured clinical summary.

**IMPORTANT**: This is for physician review only. Do not diagnose or prescribe.

Patient Information:
- Age: {patient_data['age']}
- Gender: {patient_data['gender']}
- Chief Complaint: {patient_data['chief_complaint']}

Vitals:
{format_vitals(patient_data['vitals'])}

Lab Results:
{format_labs(patient_data['lab_results'])}

Current Medications:
{format_medications(patient_data['current_medications'])}

Medical History:
{', '.join(patient_data['medical_history'])}

Allergies:
{', '.join(patient_data['allergies'])}

Please provide:
1. Clinical Narrative (2-3 sentences summary)
2. Key Findings (3-5 bullet points)
3. Risk Assessment (cardiac, respiratory, metabolic risks - Low/Medium/High)
4. Urgency Score (0-10, where 10 is most urgent)
5. Priority Level (Low/Moderate/High)
6. Clinical Recommendations (3-5 actionable items for physician review)
7. Diet Suggestions (2-4 personalized dietary recommendations based on condition)

Format your response as JSON with these exact keys:
{{
  "clinical_narrative": "...",
  "key_findings": ["...", "..."],
  "risk_assessment": {{"cardiac": "...", "respiratory": "...", "metabolic": "..."}},
  "urgency_score": 0-10,
  "priority_level": "Low/Moderate/High",
  "recommendations": ["...", "..."],
  "diet_suggestions": ["...", "..."]
}}
"""
    
    try:
        # Generate response from Gemini (with fallback)
        response = call_gemini_with_fallback(contents=prompt)
        
        # Parse JSON response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        result = json.loads(response_text)
        
        # Create AIHistorySummary object
        summary = AIHistorySummary(
            clinical_narrative=result.get("clinical_narrative", ""),
            key_findings=result.get("key_findings", []),
            risk_assessment=result.get("risk_assessment", {}),
            urgency_score=result.get("urgency_score", 5),
            priority_level=result.get("priority_level", "Moderate"),
            recommendations=result.get("recommendations", []),
            diet_suggestions=result.get("diet_suggestions", []),
            disclaimer="For physician review only"
        )
        
        return summary
        
    except json.JSONDecodeError as e:
        # JSON parsing error
        traceback.print_exc()
        print(f"JSON Error: {e}")
        
        return AIHistorySummary(
            clinical_narrative=f"Patient presents with {patient_data['chief_complaint']}. Clinical review recommended.",
            key_findings=[
                "AI response parsing failed",
                "Manual physician review required",
                f"Chief complaint: {patient_data['chief_complaint']}"
            ],
            risk_assessment={
                "cardiac": "Unknown",
                "respiratory": "Unknown",
                "metabolic": "Unknown"
            },
            urgency_score=5,
            priority_level="Moderate",
            recommendations=[
                "Complete manual clinical assessment",
                "Review all lab results",
                "Verify medication interactions"
            ],
            diet_suggestions=[],
            disclaimer="For physician review only - AI response parsing failed"
        )
    except AttributeError as e:
        # Response object doesn't have expected attributes
        traceback.print_exc()
        print(f"Attribute Error: {e}")
        
        return AIHistorySummary(
            clinical_narrative=f"Patient presents with {patient_data['chief_complaint']}. Clinical review recommended.",
            key_findings=[
                "AI response format error",
                "Manual physician review required",
                f"Chief complaint: {patient_data['chief_complaint']}"
            ],
            risk_assessment={
                "cardiac": "Unknown",
                "respiratory": "Unknown",
                "metabolic": "Unknown"
            },
            urgency_score=5,
            priority_level="Moderate",
            recommendations=[
                "Complete manual clinical assessment",
                "Review all lab results",
                "Verify medication interactions"
            ],
            diet_suggestions=[],
            disclaimer="For physician review only - AI response format error"
        )
    except Exception as e:
        if is_rate_limit_error(e):
            raise e
        # Fallback response if Gemini fails
        traceback.print_exc()
        print(f"Gemini API Error: {e}")
        
        return AIHistorySummary(
            clinical_narrative=f"Patient presents with {patient_data['chief_complaint']}. Clinical review recommended.",
            key_findings=[
                "Gemini AI analysis unavailable",
                f"Error: {str(e)}",
                "Manual physician review required",
                f"Chief complaint: {patient_data['chief_complaint']}"
            ],
            risk_assessment={
                "cardiac": "Unknown",
                "respiratory": "Unknown",
                "metabolic": "Unknown"
            },
            urgency_score=5,
            priority_level="Moderate",
            recommendations=[
                "Complete manual clinical assessment",
                "Review all lab results",
                "Verify medication interactions"
            ],
            diet_suggestions=[],
            disclaimer="For physician review only - AI analysis unavailable"
        )

def format_vitals(vitals: dict) -> str:
    """Format vitals for prompt"""
    return "\n".join([f"- {k}: {v}" for k, v in vitals.items()])

def format_labs(labs: list) -> str:
    """Format lab results for prompt"""
    return "\n".join([
        f"- {lab['test_name']}: {lab['value']} {lab['unit']} (Ref: {lab['reference_range']}) - {lab['status']}"
        for lab in labs
    ])

def format_medications(meds: list) -> str:
    """Format medications for prompt"""
    return "\n".join([
        f"- {med['name']} {med['dose']} {med['frequency']}"
        for med in meds
    ])


@retry_api_call
def analyze_medical_report(image_bytes: bytes) -> ScanResult:
    """
    Analyze medical report image using Gemini Vision
    """
    prompt = """
You are an expert medical AI specializing in clinical document analysis.
Analyze this medical report image and provide:
1. A concise summary of the report.
2. Key clinical observations.
3. Any detected or suggested medical conditions.
4. A confidence score (0.0 to 1.0).
5. Boolean assessment if this is actually a valid medical report.

Format your response as JSON with these exact keys:
{
  "summary": "...",
  "key_observations": ["...", "..."],
  "detected_conditions": ["...", "..."],
  "confidence_score": 0.0-1.0,
  "is_valid_medical_report": true/false
}
"""
    
    try:
        # Convert bytes to base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Use the correct API format for image analysis (with fallback)
        response = call_gemini_with_fallback(
            contents=[
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64
                            }
                        }
                    ]
                }
            ]
        )

        response_text = response.text.strip()
        
        # Clean JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        result = json.loads(response_text)
        
        return ScanResult(
            summary=result.get("summary", "Analysis complete"),
            key_observations=result.get("key_observations", []),
            detected_conditions=result.get("detected_conditions", []),
            confidence_score=result.get("confidence_score", 0.0),
            is_valid_medical_report=result.get("is_valid_medical_report", True)
        )
    except Exception as e:
        if is_rate_limit_error(e):
            raise e
        traceback.print_exc()
        print(f"Vision Analysis Error: {e}")
        
        return ScanResult(
            summary=f"Error analyzing report: {str(e)}",
            key_observations=[],
            detected_conditions=[],
            confidence_score=0.0,
            is_valid_medical_report=False
        )

@retry_api_call
def generate_soap_note(patient_data: dict) -> str:
    """
    Generate a professional clinical SOAP note using Gemini AI.
    """
    try:
        with open("ai_debug.log", "a") as f:
            f.write(f"\n--- New SOAP Request ---\nData: {str(patient_data)}\n")
    except:
        pass

    prompt = f"""
You are a senior medical consultant. Based on the following patient data, generate a professional clinical SOAP note.
The note should be concise, professional, and formatted correctly for a physician's record.

Patient Data:
- Name: {patient_data.get('patient_name', 'Unknown')}
- Age: {patient_data.get('age', 'N/A')}
- Gender: {patient_data.get('gender', 'N/A')}
- Chief Complaint: {patient_data.get('chief_complaint', 'Not provided')}

Vitals:
{format_vitals(patient_data.get('vitals', {}))}

Medical History:
{', '.join(patient_data.get('medical_history', []))}

Format the output exactly as follows:
S: (Subjective - Patient's complaints, history, symptoms)
O: (Objective - Clinical findings, vitals, physical exam observations)
A: (Assessment - Differential diagnosis, clinical reasoning)
P: (Plan - Next steps, medications, follow-up, dietary advice)

**IMPORTANT**: This is for simulation/educational purposes in a hackathon setting.
"""

    try:
        response = call_gemini_with_fallback(contents=prompt)
        return response.text.strip()
    except Exception as e:
        if is_rate_limit_error(e):
            raise e
        error_msg = f"SOAP generation error: {str(e)}"
        try:
            with open("ai_debug.log", "a") as f:
                f.write(f"{error_msg}\n")
        except:
            pass
        print(error_msg)
        return "Error generating SOAP note. Please review manual records."
