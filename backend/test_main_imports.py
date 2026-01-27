#!/usr/bin/env python3
"""Minimal test to diagnose main.py issues"""
import sys
import traceback

try:
    print("1. Testing imports...", flush=True)
    import os
    print("   - os: OK")
    import json
    print("   - json: OK")
    from fastapi import FastAPI
    print("   - fastapi: OK")
    from dotenv import load_dotenv
    print("   - dotenv: OK")
    
    print("2. Loading .env file...")
    load_dotenv()
    print("   - .env loaded")
    
    print("3. Testing local imports...")
    from models import PatientRecord
    print("   - models: OK")
    from ai_service import get_gemini_summary
    print("   - ai_service: OK")
    from safety_engine import check_vital_safety
    print("   - safety_engine: OK")
    from clinical_rules_engine import ClinicalRulesEngine
    print("   - clinical_rules_engine: OK")
    from risk_assessment import ClinicalDecisionSupport
    print("   - risk_assessment: OK")
    
    print("4. Creating FastAPI app...")
    app = FastAPI(title="Test", version="1.0.0")
    print("   - app created: OK")
    
    print("5. Testing CORS...")
    from fastapi.middleware.cors import CORSMiddleware
    allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174")
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
    print(f"   - allowed_origins: {allowed_origins}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    print("   - CORS middleware added: OK")
    
    print("\n✓ All tests passed! main.py should import successfully.")
    
except Exception as e:
    print(f"\n✗ ERROR: {e}")
    print("\nTraceback:")
    traceback.print_exc()
    sys.exit(1)
