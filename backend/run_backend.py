#!/usr/bin/env python
"""
Simple backend starter script
"""
import sys
import os

print(f"Python: {sys.version}")
print(f"CWD: {os.getcwd()}")

try:
    print("Importing FastAPI app...")
    from main import app
    print(f"✓ App imported successfully")
    print(f"✓ Routes count: {len(app.routes)}")
    
    print("Importing uvicorn...")
    import uvicorn
    print("✓ uvicorn imported")
    
    print("\nStarting server...")
    print("=" * 50)
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
    
except ImportError as e:
    print(f"✗ Import Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
