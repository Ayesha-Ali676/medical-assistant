#!/usr/bin/env python
"""
Quick validation test for the clinical assessment system.
Tests that all modules import correctly and basic functionality works.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

try:
    # Test imports
    print("Testing imports...")
    from clinical_rules_engine import ClinicalRulesEngine, RiskLevel
    print("✓ clinical_rules_engine imported")
    
    from risk_assessment import ClinicalDecisionSupport, RiskScorer
    print("✓ risk_assessment imported")
    
    # Test basic functionality
    print("\nTesting risk assessment...")
    test_patient = {
        "vitals": {
            "bp": "150/90",
            "hr": 95,
            "spo2": 96,
            "temp": 37.2
        },
        "symptoms": ["headache", "fatigue"],
        "age": 55,
        "gender": "M",
        "medical_history": ["hypertension"]
    }
    
    result = ClinicalDecisionSupport.generate_assessment(test_patient)
    
    if result.get("success"):
        assessment = result["assessment"]
        print(f"✓ Assessment successful")
        print(f"  Risk Level: {assessment['level']}")
        print(f"  Score: {assessment['score']}")
        print(f"  Recommendation: {assessment['recommendation']}")
    else:
        print(f"✗ Assessment failed: {result.get('error')}")
        sys.exit(1)
    
    print("\n✓ All tests passed! System ready for deployment.")
    
except Exception as e:
    print(f"✗ Test failed: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
