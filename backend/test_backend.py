#!/usr/bin/env python
"""Simple backend test to verify imports work"""
import os
import sys

print("1. Testing environment...")
print(f"   Python version: {sys.version}")
print(f"   Working dir: {os.getcwd()}")

print("2. Testing dotenv...")
from dotenv import load_dotenv
load_dotenv()
print("   ✓ dotenv OK")

print("3. Testing FastAPI...")
from fastapi import FastAPI
print("   ✓ FastAPI OK")

print("4. Testing models...")
from models import PatientRecord, AIHistorySummary
print("   ✓ models OK")

print("5. Testing clinical_rules_engine...")
from clinical_rules_engine import ClinicalRulesEngine
print("   ✓ clinical_rules_engine OK")

print("6. Testing risk_assessment...")
from risk_assessment import ClinicalDecisionSupport
print("   ✓ risk_assessment OK")

print("7. Testing safety_engine...")
from safety_engine import check_vital_safety
print("   ✓ safety_engine OK")

print("8. Testing ai_service...")
from ai_service import get_gemini_summary
print("   ✓ ai_service OK")

print("\n✅ ALL IMPORTS SUCCESSFUL - Backend can start!")
