#!/usr/bin/env python
"""
Diagnostic script to identify startup issues
"""
import os
import sys

print("=" * 60)
print("MEDASSIST DIAGNOSTIC REPORT")
print("=" * 60)

# Check 1: .env file
print("\n1. ENVIRONMENT CONFIGURATION")
print("-" * 60)
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    print(f"✓ .env file found at: {env_path}")
    with open(env_path, 'r') as f:
        content = f.read()
        if 'your-gemini-api-key-here' in content:
            print("✗ GEMINI_API_KEY is still placeholder!")
            print("  ACTION: Edit .env and set GEMINI_API_KEY to your actual key")
        elif 'GEMINI_API_KEY=' in content:
            print("✓ GEMINI_API_KEY appears to be set")
else:
    print(f"✗ .env file not found at: {env_path}")

# Check 2: Python dependencies
print("\n2. PYTHON DEPENDENCIES")
print("-" * 60)
dependencies = {
    'fastapi': 'FastAPI',
    'uvicorn': 'Uvicorn',
    'pydantic': 'Pydantic',
    'dotenv': 'Python-dotenv',
    'google.generativeai': 'Google Generative AI (Gemini)'
}

for module, name in dependencies.items():
    try:
        __import__(module)
        print(f"✓ {name} installed")
    except ImportError:
        print(f"✗ {name} NOT installed")

# Check 3: Backend files
print("\n3. BACKEND FILES")
print("-" * 60)
backend_files = [
    'main.py',
    'clinical_rules_engine.py',
    'risk_assessment.py',
    'models.py',
    'safety_engine.py',
    'ai_service.py'
]

backend_path = os.path.join(os.path.dirname(__file__), 'backend')
for file in backend_files:
    file_path = os.path.join(backend_path, file)
    if os.path.exists(file_path):
        print(f"✓ {file} found")
    else:
        print(f"✗ {file} NOT found")

# Check 4: Frontend files
print("\n4. FRONTEND FILES")
print("-" * 60)
frontend_dirs = [
    'src/components',
    'src/App.jsx',
    'package.json',
    'node_modules'
]

frontend_path = os.path.join(os.path.dirname(__file__), 'frontend')
for item in frontend_dirs:
    item_path = os.path.join(frontend_path, item)
    if os.path.exists(item_path):
        print(f"✓ {item} found")
    else:
        print(f"✗ {item} NOT found")

# Check 5: Data files
print("\n5. DATA FILES")
print("-" * 60)
data_path = os.path.join(os.path.dirname(__file__), 'data', 'patients.json')
if os.path.exists(data_path):
    print(f"✓ patients.json found")
else:
    print(f"✗ patients.json NOT found")

print("\n" + "=" * 60)
print("RECOMMENDATIONS")
print("=" * 60)
print("""
If you see blank screen:

1. Check GEMINI_API_KEY is set (not placeholder)
2. Ensure backend is running: python -m uvicorn main:app --reload
3. Check browser console (F12) for errors
4. Verify ports are free: 5173 (frontend), 8000 (backend)
5. Check backend logs for error messages

To start fresh:
1. cd backend
2. python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

In another terminal:
1. cd frontend
2. npm run dev

Then open: http://localhost:5173
""")

print("=" * 60)
