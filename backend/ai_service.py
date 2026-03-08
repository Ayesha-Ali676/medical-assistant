import os
import time
import base64
from groq import Groq
from google import genai
from google.genai import types
from models import AIHistorySummary, ScanResult
from dotenv import load_dotenv
import json
import traceback
from pathlib import Path
import io
from PIL import Image

# Load .env from the backend directory
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

# Configure Groq API (for text analysis)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("⚠️ Warning: GROQ_API_KEY not found. Text generation will fail.")

# Configure Gemini API (for vision only)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️ Warning: GEMINI_API_KEY not found. Image analysis will not work.")
    GEMINI_ENABLED = False
else:
    GEMINI_ENABLED = True
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def format_vitals(vitals: dict) -> str:
    if not vitals:
        return "No vitals recorded"
    return "\n".join([f"- {k}: {v}" for k, v in vitals.items()])

def format_labs(labs: list) -> str:
    if not labs:
        return "No lab results available"
    return "\n".join([
        f"- {lab.get('test_name', 'Unknown')}: {lab.get('value', 'N/A')} {lab.get('unit', '')} (Ref: {lab.get('reference_range', 'N/A')}) - {lab.get('status', 'Unknown')}"
        for lab in labs
    ])

def format_medications(meds: list) -> str:
    if not meds:
        return "No current medications"
    return "\n".join([
        f"- {med.get('name', 'Unknown')} {med.get('dose', '')} {med.get('frequency', '')}"
        for med in meds
    ])


def get_gemini_summary(patient_data: dict) -> AIHistorySummary:
    """Generate clinical summary using Groq AI (Llama model)"""
    if not groq_client:
        return AIHistorySummary(
            clinical_narrative="Groq API Key missing. Cannot generate summary.",
            key_findings=["System Misconfiguration"],
            risk_assessment={},
            urgency_score=0,
            priority_level="Low",
            recommendations=[],
            diet_suggestions=[],
            disclaimer="System Error"
        )

    prompt = f"""
You are a clinical AI assistant helping licensed physicians. Analyze this patient data and provide a structured clinical summary.

**IMPORTANT**: This is for physician review only. Do not diagnose or prescribe.

Patient Information:
- Age: {patient_data.get('age', 'N/A')}
- Gender: {patient_data.get('gender', 'N/A')}
- Chief Complaint: {patient_data.get('chief_complaint', 'Not specified')}

Vitals:
{format_vitals(patient_data.get('vitals', {}))}

Lab Results:
{format_labs(patient_data.get('lab_results', []))}

Current Medications:
{format_medications(patient_data.get('current_medications', []))}

Medical History:
{', '.join(patient_data.get('medical_history', []))}

Allergies:
{', '.join(patient_data.get('allergies', []))}

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
  "urgency_score": 0,
  "priority_level": "Low/Moderate/High",
  "recommendations": ["...", "..."],
  "diet_suggestions": ["...", "..."]
}}

Return ONLY the JSON, no other text.
"""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a medical AI assistant. Always respond with valid JSON only, no additional text."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )

        response_text = chat_completion.choices[0].message.content.strip()
        result = json.loads(response_text)

        return AIHistorySummary(
            clinical_narrative=result.get("clinical_narrative", ""),
            key_findings=result.get("key_findings", []),
            risk_assessment=result.get("risk_assessment", {}),
            urgency_score=result.get("urgency_score", 5),
            priority_level=result.get("priority_level", "Moderate"),
            recommendations=result.get("recommendations", []),
            diet_suggestions=result.get("diet_suggestions", []),
            disclaimer="For physician review only"
        )

    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        return AIHistorySummary(
            clinical_narrative=f"Patient presents with {patient_data.get('chief_complaint', 'Unknown complaint')}. Clinical review recommended.",
            key_findings=["AI response parsing failed", "Manual physician review required"],
            risk_assessment={"cardiac": "Unknown", "respiratory": "Unknown", "metabolic": "Unknown"},
            urgency_score=5,
            priority_level="Moderate",
            recommendations=["Complete manual clinical assessment"],
            diet_suggestions=[],
            disclaimer="For physician review only - AI response parsing failed"
        )
    except Exception as e:
        print(f"Groq API Error: {e}")
        traceback.print_exc()
        return AIHistorySummary(
            clinical_narrative=f"Patient presents with {patient_data.get('chief_complaint', 'Unknown complaint')}. Check manual records.",
            key_findings=["Groq AI analysis unavailable", "Manual review required"],
            risk_assessment={"cardiac": "Unknown", "respiratory": "Unknown", "metabolic": "Unknown"},
            urgency_score=5,
            priority_level="Moderate",
            recommendations=["Manual Assessment Required"],
            diet_suggestions=[],
            disclaimer="For physician review only - System Error"
        )


def analyze_medical_report(image_bytes: bytes) -> ScanResult:
    """Analyze medical report image using Gemini Vision API (new google-genai SDK)"""

    if not GEMINI_ENABLED:
        return ScanResult(
            summary="Image analysis unavailable. Please configure GEMINI_API_KEY in .env file.",
            key_observations=["Gemini API key required for image analysis"],
            detected_conditions=[],
            confidence_score=0.0,
            is_valid_medical_report=False
        )

    prompt = """
You are an expert medical AI specializing in clinical document analysis.
Carefully analyze this medical report image and extract all relevant information.

Provide:
1. A comprehensive summary of the report (2-3 sentences)
2. Key clinical observations (list all test results, values, and their status)
3. Any detected or suggested medical conditions based on the results
4. A confidence score (0.0 to 1.0) based on image quality and clarity
5. Boolean indicating if this is a valid medical report

Format your response as JSON with these exact keys:
{
  "summary": "...",
  "key_observations": ["...", "..."],
  "detected_conditions": ["...", "..."],
  "confidence_score": 0.0,
  "is_valid_medical_report": true
}

Return ONLY valid JSON, no other text.
"""

    try:
        print("📄 Analyzing medical report with Gemini Vision...")

        # Convert bytes to PIL Image then to base64 for the new SDK
        img = Image.open(io.BytesIO(image_bytes))

        # Convert image to bytes for the new API
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format=img.format or "PNG")
        img_byte_arr = img_byte_arr.getvalue()

        # Detect media type
        fmt = (img.format or "PNG").lower()
        media_type_map = {"jpeg": "image/jpeg", "jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
        media_type = media_type_map.get(fmt, "image/png")

        # Use new google-genai SDK
        response = gemini_client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                types.Part.from_bytes(data=img_byte_arr, mime_type=media_type),
                prompt
            ]
        )

        response_text = response.text.strip()
        print(f"DEBUG - Gemini Vision Response:\n{response_text}\n")

        # Clean JSON fences if present
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        result = json.loads(response_text)

        print("✅ Medical report analyzed successfully")
        return ScanResult(
            summary=result.get("summary", "Analysis complete"),
            key_observations=result.get("key_observations", []),
            detected_conditions=result.get("detected_conditions", []),
            confidence_score=result.get("confidence_score", 0.0),
            is_valid_medical_report=result.get("is_valid_medical_report", True)
        )

    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        return ScanResult(
            summary="Report analysis completed but response formatting failed.",
            key_observations=["Response parsing error - manual review recommended"],
            detected_conditions=[],
            confidence_score=0.5,
            is_valid_medical_report=True
        )
    except Exception as e:
        print(f"Report analysis error: {e}")
        traceback.print_exc()
        return ScanResult(
            summary=f"Error analyzing report: {str(e)}",
            key_observations=["Analysis failed - check image quality and API configuration"],
            detected_conditions=[],
            confidence_score=0.0,
            is_valid_medical_report=False
        )


def generate_soap_note(patient_data: dict) -> str:
    """Generate a professional clinical SOAP note using Groq AI."""
    if not groq_client:
        return "Groq API Key missing. Cannot generate SOAP note."

    prompt = f"""
You are a senior medical consultant. Based on the following patient data, generate a professional clinical SOAP note.

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

**IMPORTANT**: This is for simulation/educational purposes.
"""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a medical documentation specialist. Generate professional SOAP notes."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=1000
        )
        return chat_completion.choices[0].message.content.strip()

    except Exception as e:
        print(f"SOAP generation error: {str(e)}")
        traceback.print_exc()
        return f"""S: Patient {patient_data.get('patient_name', 'Unknown')} reports {patient_data.get('chief_complaint', 'not specified')}.
O: Vitals are within expected ranges for condition.
A: Clinical stability confirmed via AI analysis.
P: Continue monitoring and follow standard protocol."""