import os
import time
from google import genai
from google.genai import types
from models import AIHistorySummary, ScanResult
from dotenv import load_dotenv
from functools import wraps
import json
import traceback

load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

# Initialize the client
client = genai.Client(api_key=GEMINI_API_KEY)

# Rate limiting configuration
last_api_call_time = 0
MIN_TIME_BETWEEN_CALLS = 4.0  # 4 seconds between calls (allows max 15 calls/minute)

def rate_limit(func):
    """Decorator to enforce rate limiting on API calls"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        global last_api_call_time
        
        # Calculate time since last call
        current_time = time.time()
        time_since_last_call = current_time - last_api_call_time
        
        # If not enough time has passed, wait
        if time_since_last_call < MIN_TIME_BETWEEN_CALLS:
            sleep_time = MIN_TIME_BETWEEN_CALLS - time_since_last_call
            time.sleep(sleep_time)
        
        # Update last call time
        last_api_call_time = time.time()
        
        # Call the original function
        return func(*args, **kwargs)
    
    return wrapper

@rate_limit
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

Format your response as JSON with these exact keys:
{{
  "clinical_narrative": "...",
  "key_findings": ["...", "..."],
  "risk_assessment": {{"cardiac": "...", "respiratory": "...", "metabolic": "..."}},
  "urgency_score": 0-10,
  "priority_level": "Low/Moderate/High",
  "recommendations": ["...", "..."]
}}
"""
    
    try:
        # Generate response from Gemini
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
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
            disclaimer="For physician review only"
        )
        
        return summary
        
    except json.JSONDecodeError as e:
        # JSON parsing error
        traceback.print_exc()
        
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
            disclaimer="For physician review only - AI response parsing failed"
        )
    except AttributeError as e:
        # Response object doesn't have expected attributes
        traceback.print_exc()
        
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
            disclaimer="For physician review only - AI response format error"
        )
    except Exception as e:
        # Fallback response if Gemini fails
        traceback.print_exc()
        
        return AIHistorySummary(
            clinical_narrative=f"Patient presents with {patient_data['chief_complaint']}. Clinical review recommended.",
            key_findings=[
                "Gemini AI analysis unavailable",
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

@rate_limit
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
        # Upload the image
        uploaded_file = client.files.upload(file_data=image_bytes)
        
        # Generate content with image
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_uri(
                            file_uri=uploaded_file.uri,
                            mime_type="image/jpeg"
                        ),
                        types.Part.from_text(text=prompt)
                    ]
                )
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
        traceback.print_exc()
        
        return ScanResult(
            summary=f"Error analyzing report: {str(e)}",
            key_observations=[],
            detected_conditions=[],
            confidence_score=0.0,
            is_valid_medical_report=False
        )