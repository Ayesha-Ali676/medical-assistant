import json
import os
import hashlib
from typing import Optional
from pydantic import BaseModel

USERS_FILE = "users.json"

class UserLogin(BaseModel):
    username: str
    password: str

class UserSignup(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    medical_license_id: str

def _load_users():
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def _save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(user_data: UserSignup) -> bool:
    users = _load_users()
    # Check if username OR email already exists
    if user_data.username in users:
        return False
    
    # Simple check for email uniqueness (O(N) but fine for json file)
    for u in users.values():
        if u.get("email") == user_data.email:
            return False

    users[user_data.username] = {
        "password_hash": _hash_password(user_data.password),
        "full_name": user_data.full_name,
        "medical_license_id": user_data.medical_license_id,
        "email": user_data.email
    }
    _save_users(users)
    return True

def verify_user(credentials: UserLogin) -> Optional[dict]:
    users = _load_users()
    
    # Try to find user by username
    user = users.get(credentials.username)
    
    # If not found, try to find by email
    found_username = credentials.username
    if not user:
        for uname, udata in users.items():
            if udata.get("email") == credentials.username:
                user = udata
                found_username = uname
                break
    
    if not user:
        return None
        
    if user["password_hash"] == _hash_password(credentials.password):
        return {
            "username": found_username,
            "full_name": user["full_name"],
            "medical_license_id": user["medical_license_id"],
            "email": user.get("email", "")
        }
    return None
