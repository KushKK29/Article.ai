"""
ArticleShip Auth Service
------------------------
Handles user storage (MongoDB `users` collection), password hashing,
JWT access-token minting, and the FastAPI `get_current_user` dependency.

Token strategy
  access_token  – short-lived (30 min), sent in Authorization: Bearer header
  refresh_token – longer-lived (7 days), stored in an httpOnly cookie
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from uuid import uuid4

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pymongo import MongoClient

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "INSECURE_FALLBACK_CHANGE_ME")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

_http_bearer = HTTPBearer(auto_error=True)


# ---------------------------------------------------------------------------
# MongoDB helpers
# ---------------------------------------------------------------------------

def _get_users_collection():
    mongo_uri = os.getenv("MONGODB_URI", "").strip()
    if not mongo_uri:
        raise ValueError("MONGODB_URI is not configured")
    db_name = os.getenv("MONGODB_DB_NAME", "ArticleShip").strip() or "ArticleShip"
    client = MongoClient(mongo_uri)
    return client[db_name]["users"]


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def _create_token(data: Dict[str, Any], expire_delta: timedelta) -> str:
    payload = dict(data)
    payload["exp"] = datetime.now(timezone.utc) + expire_delta
    payload["iat"] = datetime.now(timezone.utc)
    payload["jti"] = uuid4().hex          # unique token ID (allows future revocation)
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_access_token(user_id: str, email: str) -> str:
    return _create_token(
        {"sub": user_id, "email": email, "type": "access"},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT. Raises HTTPException 401 on any failure."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------

def create_user(email: str, plain_password: str) -> Dict[str, Any]:
    """
    Creates a new user. Raises HTTPException 409 if email already exists.
    Returns the user doc (without hashed_password for safety).
    """
    col = _get_users_collection()
    email = email.strip().lower()

    if col.find_one({"email": email}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user: Dict[str, Any] = {
        "id": uuid4().hex,
        "email": email,
        "hashed_password": hash_password(plain_password),
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    col.insert_one(user)
    user.pop("_id", None)
    return _safe_user(user)


def get_user_by_email(email: str) -> Dict[str, Any] | None:
    col = _get_users_collection()
    doc = col.find_one({"email": email.strip().lower()}, {"_id": 0})
    return doc


def get_user_by_id(user_id: str) -> Dict[str, Any] | None:
    col = _get_users_collection()
    doc = col.find_one({"id": user_id}, {"_id": 0})
    return doc


def _safe_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """Strip hashed_password before returning to callers."""
    return {k: v for k, v in user.items() if k != "hashed_password"}


# ---------------------------------------------------------------------------
# FastAPI dependency: get_current_user
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_http_bearer),
) -> Dict[str, Any]:
    """
    FastAPI dependency that validates the Bearer token from the
    Authorization header and returns the authenticated user dict.

    Usage:
        @app.get("/protected")
        async def protected(user = Depends(get_current_user)):
            ...
    """
    payload = decode_token(credentials.credentials)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not an access token",
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return _safe_user(user)
