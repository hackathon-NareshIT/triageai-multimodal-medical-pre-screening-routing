import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# 1. The output schema remains identical (forcing structured JSON)
class TriageResult(BaseModel):
    urgency_level: str = Field(description="Must be 'Red', 'Yellow', or 'Green'.")
    suggested_specialty: str = Field(description="Medical specialty mapping key.")
    possible_causes: list[str] = Field(description="2-3 probable causes written in simple, plain English (e.g., 'Heart Attack' instead of 'Myocardial Infarction'). NO MEDICAL JARGON.")
    precautions: list[str] = Field(description="3-5 first-aid steps written so an 8th grader could understand them.")
    watch_out_symptoms: list[str] = Field(description="Severe symptoms for ER escalation, written in plain, patient-friendly English.")

# 2. UPDATE: Signature now accepts optional image data
def analyze_symptoms(image_bytes: bytes | None, mime_type: str | None, text_description: str) -> dict:
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    # 3. Streamlined Content Building (NO NESTED LISTS)
    if image_bytes and mime_type:
        prompt_prefix = "Analyze this text description and the attached image of the symptom:"
    else:
        prompt_prefix = "Analyze this text description of a medical symptom (no image available):"
    
    final_prompt = f"{prompt_prefix}\n\nPatient Description: {text_description}"
    
    # Start the list with the text prompt
    api_contents = [final_prompt]
    
    # Append the image ONLY if it exists
    if image_bytes and mime_type:
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        api_contents.append(image_part)

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=api_contents, # Pass the flat list directly
            config=types.GenerateContentConfig(
                system_instruction="""
                    You are an expert medical triage assistant speaking directly to everyday patients. 
                    Analyze the provided text and images (if any).
                    CRITICAL RULE: You MUST translate all medical jargon into simple, plain English. 
                    For example: say "Heart Attack" instead of "Myocardial Infarction", or "Collapsed Lung" instead of "Pneumothorax".
                    You DO NOT diagnose. You assess urgency, suggest specialties, and provide safe precautions. Prioritize user safety and total clarity.
                    When suggesting the medical specialty, you MUST choose from this exact list of strings. 
                    Do not deviate, do not use synonyms, and do not add the word 'Doctor'.
                    The allowed specialties are: ['Emergency Medicine', 'General Practice', 'Cardiology', 'Orthopedics', 'Neurology'].
                """,
                response_mime_type="application/json",
                response_schema=TriageResult,
                temperature=0.2,
            ),
        )
        
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Gemini Engine Error: {str(e)}")
        # Fallback ensures response structure never changes
        return {
            "urgency_level": "Yellow",
            "suggested_specialty": "General Practice",
            "possible_causes": ["API error. Manual assessment needed."],
            "precautions": ["Keep area clean.", "Seek professional medical evaluation."],
            "watch_out_symptoms": ["Severe pain", "Fever"]
        }