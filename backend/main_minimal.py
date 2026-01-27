#!/usr/bin/env python
"""Minimal FastAPI backend for testing"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path

app = FastAPI(title="MedAssist Test", version="1.0.0")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "MedAssist", "version": "1.0.0"}

@app.get("/patients")
async def get_patients():
    """Return sample patients"""
    patients_file = Path("data/patients.json")
    if patients_file.exists():
        with open(patients_file) as f:
            return json.load(f)
    return []

if __name__ == "__main__":
    import uvicorn
    print("Starting minimal backend on 127.0.0.1:8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
