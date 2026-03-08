"""
auth.py — Updated to use Supabase instead of users.json
"""

import hashlib
from typing import Optional
from pydantic import BaseModel
from database import get_user_by_username, get_user_by_email, create_user_record


class UserLogin(BaseModel):
    username: str
    password: str


class UserSignup(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    medical_license_id: str


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_user(user_data: UserSignup) -> bool:
    """
    Create a new user in Supabase.
    Returns False if username or email already exists.
    """
    return create_user_record(
        username=user_data.username,
        email=user_data.email,
        password_hash=_hash_password(user_data.password),
        full_name=user_data.full_name,
        medical_license_id=user_data.medical_license_id,
    )


def verify_user(credentials: UserLogin) -> Optional[dict]:
    """
    Verify login credentials against Supabase.
    Supports login by username OR email.
    """
    # Try username first
    user = get_user_by_username(credentials.username)

    # Fallback to email lookup
    if not user:
        user = get_user_by_email(credentials.username)

    if not user:
        return None

    if user["password_hash"] == _hash_password(credentials.password):
        return {
            "username": user["username"],
            "full_name": user["full_name"],
            "medical_license_id": user["medical_license_id"],
            "email": user.get("email", ""),
        }

    return None