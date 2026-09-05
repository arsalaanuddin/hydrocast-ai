import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()
gemini_key = os.getenv("GEMINI_API_KEY", "")

if not gemini_key or gemini_key == "your_gemini_api_key_here":
    raise ValueError("GEMINI_API_KEY is missing from your .env file! Real LLM synthesis requires an active key.")

client = genai.Client(api_key=gemini_key)

async def generate_gemini_sitrep(payload: dict) -> dict:
    prompt = f"""
    You are the Chief Disaster Operations Commander for HydroCast AI. 
    Analyze the real-time telemetry and simulation metrics for sector "{payload.get('place_name')}":
    - Coordinates: Lat {payload.get('lat')}, Lng {payload.get('lng')}
    - Deluge Level: {payload.get('simulation_level')} cm
    - Peak Water Depth: {payload.get('peak_water_depth_cm')} cm
    - Compromised Road Segments: {payload.get('total_blocked_roads')}
    - Submerged Subways: {payload.get('critical_subways_submerged')}

    Generate a strict JSON object with NO markdown formatting (no ```json ... ```):
    {{
      "executive_summary": "Professional 2-sentence executive briefing on flood severity and structural risk.",
      "evacuation_directives": [
        "Specific actionable directive 1 for traffic police/NDRF",
        "Specific actionable directive 2 for municipal pump crews"
      ],
      "severity_classification": "RED ALERT / ORANGE ADVISORY / NORMAL"
    }}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())