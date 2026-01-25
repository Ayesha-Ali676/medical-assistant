import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

with open('debug_models.log', 'w') as f:
    f.write(f"Key exists: {bool(GEMINI_API_KEY)}\n")
    if GEMINI_API_KEY:
        f.write(f"Key starts with: {GEMINI_API_KEY[:5]}...\n")
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            f.write("Configured genai\n")
            models = list(genai.list_models())
            f.write(f"Found {len(models)} models\n")
            for m in models:
                f.write(f"Model: {m.name} (Supported methods: {m.supported_generation_methods})\n")
        except Exception as e:
            f.write(f"Error: {str(e)}\n")
    else:
        f.write("GEMINI_API_KEY is missing\n")
