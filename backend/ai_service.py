import os
import google.generativeai as genai
from models import AIHistorySummary, ScanResult
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

def get_model(model_name="gemini-2.5-flash"):
    """Get a Gemini model, with fallback to gemini-pro if needed"""
    try:
        return genai.GenerativeModel(model_name)
    except:
        return genai.GenerativeModel("gemini-2.5-flash")

# Default model for general use
model = get_model("gemini-2.5-flash")

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
        # Try with flash first, then fallback to pro for text summary
        try:
            response = model.generate_content(prompt)
        except Exception as e:
            if "404" in str(e) or "not found" in str(e).lower():
                fallback_model = genai.GenerativeModel("gemini-2.5-flash")
                response = fallback_model.generate_content(prompt)
            else:
                raise e
        
        # Parse JSON response
        import json
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
        
    except Exception as e:
        # Fallback response if Gemini fails
        print(f"Gemini API Error: {str(e)}")
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
        # Prepare image for Gemini
        image_part = {
            "mime_type": "image/jpeg", # Assuming JPEG, but Gemini is flexible
            "data": image_bytes
        }
        
        # Vision requires 1.5 models. If 1.5-flash fails, tried flash-latest or pro-vision
        try:
            response = model.generate_content([prompt, image_part])
        except Exception as e:
            if "404" in str(e) or "not found" in str(e).lower():
                # Try gemini-1.5-pro or legacy gemini-pro-vision
                try:
                    alt_model = genai.GenerativeModel("gemini-2.5-flash")
                    response = alt_model.generate_content([prompt, image_part])
                except:
                    alt_model = genai.GenerativeModel("gemini-2.5-flash")
                    response = alt_model.generate_content([prompt, image_part])
            else:
                raise e

        response_text = response.text.strip()
        
        # Clean JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        import json
        result = json.loads(response_text)
        
        return ScanResult(
            summary=result.get("summary", "Analysis complete"),
            key_observations=result.get("key_observations", []),
            detected_conditions=result.get("detected_conditions", []),
            confidence_score=result.get("confidence_score", 0.0),
            is_valid_medical_report=result.get("is_valid_medical_report", True)
        )
    except Exception as e:
        print(f"Vision API Error: {str(e)}")
        return ScanResult(
            summary=f"Error analyzing report: {str(e)}",
            key_observations=[],
            detected_conditions=[],
            confidence_score=0.0,
            is_valid_medical_report=False
        )
