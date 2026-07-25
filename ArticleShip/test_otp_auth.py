"""
Regression tests for OTP signup verification in services/auth.py.
Run: .venv/bin/python test_otp_auth.py  (no network, no real MongoDB needed)
"""
import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-not-used")

from fastapi import HTTPException

from services import auth


class FakeCollection:
    def __init__(self):
        self.docs = {}

    def find_one(self, query, projection=None):
        for doc in self.docs.values():
            if all(doc.get(k) == v for k, v in query.items()):
                result = dict(doc)
                if projection and projection.get("_id") == 0:
                    result.pop("_id", None)
                return result
        return None

    def insert_one(self, doc):
        self.docs[doc["id"]] = dict(doc)

    def update_one(self, query, update):
        doc = self.find_one(query)
        if doc:
            self.docs[doc["id"]].update(update["$set"])


def _fresh_auth():
    col = FakeCollection()
    auth._get_users_collection = lambda: col
    return col


def test_create_user_starts_unverified():
    _fresh_auth()
    user = auth.create_user("new@example.com", "password123")
    assert user["verified"] is False
    assert user["otp_code"] is None


def test_generate_and_verify_otp_happy_path():
    _fresh_auth()
    user = auth.create_user("a@example.com", "password123")
    code = auth.generate_and_store_otp(user["id"])
    assert len(code) == 6 and code.isdigit()

    auth.verify_otp_code(user["id"], code)
    verified = auth.get_user_by_id(user["id"])
    assert verified["verified"] is True
    assert verified["otp_code"] is None


def test_wrong_code_increments_attempts_and_raises():
    _fresh_auth()
    user = auth.create_user("b@example.com", "password123")
    auth.generate_and_store_otp(user["id"])

    try:
        auth.verify_otp_code(user["id"], "000000")
        assert False, "expected HTTPException"
    except HTTPException as e:
        assert e.status_code == 400

    updated = auth.get_user_by_id(user["id"])
    assert updated["otp_attempts"] == 1
    assert updated["verified"] is False


def test_too_many_attempts_locks_out():
    _fresh_auth()
    user = auth.create_user("c@example.com", "password123")
    real_code = auth.generate_and_store_otp(user["id"])

    for _ in range(auth.OTP_MAX_ATTEMPTS):
        try:
            auth.verify_otp_code(user["id"], "000000")
        except HTTPException:
            pass

    # Even the correct code should now be rejected until a resend.
    try:
        auth.verify_otp_code(user["id"], real_code)
        assert False, "expected lockout HTTPException"
    except HTTPException as e:
        assert "Too many" in e.detail


def test_expired_code_rejected():
    _fresh_auth()
    user = auth.create_user("d@example.com", "password123")
    code = auth.generate_and_store_otp(user["id"])
    expired = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat().replace("+00:00", "Z")
    auth.update_user(user["id"], {"otp_expires_at": expired})

    try:
        auth.verify_otp_code(user["id"], code)
        assert False, "expected expiry HTTPException"
    except HTTPException as e:
        assert "expired" in e.detail.lower()


def test_legacy_user_without_verified_field_is_treated_as_verified():
    _fresh_auth()
    legacy_user = {"id": "legacy1", "email": "legacy@example.com"}  # no "verified" key at all
    assert auth.is_verified(legacy_user) is True


if __name__ == "__main__":
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"PASS {t.__name__}")
    print(f"\n{len(tests)} tests passed.")
