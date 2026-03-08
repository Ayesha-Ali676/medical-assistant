"""
Supabase Database Client for MedAssist
Replaces local patients.json and users.json with Supabase cloud storage.
"""

import os
from supabase import create_client, Client
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for backend

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file.\n"
        "Please add them — see SUPABASE_SETUP.md for instructions."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ============================================================
# PATIENT OPERATIONS
# ============================================================

def get_all_patients() -> list:
    """Fetch all patients from Supabase."""
    response = supabase.table("patients").select("*").order("created_at", desc=False).execute()
    # Return raw patient dicts (without internal Supabase 'id' field if desired)
    return response.data or []


def get_patient_by_id(patient_id: str) -> dict | None:
    """Fetch a single patient by patient_id."""
    response = (
        supabase.table("patients")
        .select("*")
        .eq("patient_id", patient_id)
        .single()
        .execute()
    )
    return response.data


def create_patient(patient_data: dict) -> dict:
    """Insert a new patient. Returns the inserted record."""
    # Remove any frontend-only fields
    clean = {k: v for k, v in patient_data.items() if k != "id"}
    response = supabase.table("patients").insert(clean).execute()
    if response.data:
        return response.data[0]
    raise RuntimeError(f"Failed to insert patient: {response}")


def update_patient(patient_id: str, patient_data: dict) -> dict:
    """Update an existing patient by patient_id."""
    clean = {k: v for k, v in patient_data.items() if k not in ("id", "patient_id", "created_at")}
    response = (
        supabase.table("patients")
        .update(clean)
        .eq("patient_id", patient_id)
        .execute()
    )
    if response.data:
        return response.data[0]
    raise RuntimeError(f"Failed to update patient {patient_id}")


def delete_patient(patient_id: str) -> bool:
    """Delete a patient by patient_id. Returns True if deleted."""
    response = (
        supabase.table("patients")
        .delete()
        .eq("patient_id", patient_id)
        .execute()
    )
    return bool(response.data)


# ============================================================
# USER / AUTH OPERATIONS
# ============================================================

def get_user_by_username(username: str) -> dict | None:
    """Fetch a user by username."""
    response = (
        supabase.table("users")
        .select("*")
        .eq("username", username)
        .execute()
    )
    return response.data[0] if response.data else None


def get_user_by_email(email: str) -> dict | None:
    """Fetch a user by email."""
    response = (
        supabase.table("users")
        .select("*")
        .eq("email", email)
        .execute()
    )
    return response.data[0] if response.data else None


def create_user_record(username: str, email: str, password_hash: str,
                       full_name: str, medical_license_id: str) -> bool:
    """Insert a new user. Returns True on success, False if duplicate."""
    try:
        supabase.table("users").insert({
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
            "medical_license_id": medical_license_id,
        }).execute()
        return True
    except Exception as e:
        # Duplicate username or email (unique constraint violation)
        print(f"create_user_record error: {e}")
        return False