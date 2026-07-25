# ArticleShip/test_impersonation.py
from fastapi.testclient import TestClient
from main import app
from services.auth import create_access_token, create_user, get_user_by_email

client = TestClient(app)


def _ensure_user(email: str, password: str = "testpass123"):
    existing = get_user_by_email(email)
    if existing:
        return existing
    return create_user(email, password)


def test_non_privileged_cannot_impersonate():
    _ensure_user("impersonation-target@example.com")
    caller_token = create_access_token("some-random-user-id", "randomuser@example.com")
    resp = client.post(
        "/api/v1/auth/impersonate",
        json={"target_email": "impersonation-target@example.com"},
        headers={"Authorization": f"Bearer {caller_token}"},
    )
    # 401 because "some-random-user-id" doesn't resolve via get_current_user
    # (it re-fetches the caller from Mongo by `sub`), never even reaching the
    # privilege check. This proves the boundary can't be forged with a bare JWT.
    assert resp.status_code in (401, 403), resp.text


def test_real_signed_up_nonprivileged_user_cannot_impersonate():
    # Stronger variant: a REAL, DB-backed non-privileged account (so
    # get_current_user succeeds and we actually exercise is_privileged()
    # returning False, not just the "unknown sub" 401 short-circuit).
    caller = _ensure_user("not-privileged-caller@example.com")
    caller_token = create_access_token(caller["id"], caller["email"])
    target = _ensure_user("impersonation-target3@example.com")
    resp = client.post(
        "/api/v1/auth/impersonate",
        json={"target_email": "impersonation-target3@example.com"},
        headers={"Authorization": f"Bearer {caller_token}"},
    )
    assert resp.status_code == 403, resp.text


def test_privileged_caller_gets_target_token():
    # Uses the REAL seeded admin account (kush282930@gmail.com) already
    # present in the dev DB — see privileges.py PRIVILEGED_EMAILS. We do not
    # know its password, so we mint a token directly via create_access_token
    # using its real id, rather than logging in.
    admin = get_user_by_email("kush282930@gmail.com")
    if not admin:
        print("SKIP: no seeded privileged account (kush282930@gmail.com) in DB")
        return
    target = _ensure_user("impersonation-target2@example.com")
    admin_token = create_access_token(admin["id"], admin["email"])
    resp = client.post(
        "/api/v1/auth/impersonate",
        json={"target_email": "impersonation-target2@example.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["user"]["email"] == "impersonation-target2@example.com"
    assert data["user"]["id"] == target["id"]
    assert "hashed_password" not in data["user"]
    assert "otp_code" not in data["user"]
    assert "otp_expires_at" not in data["user"]
    assert "otp_attempts" not in data["user"]

    # Decode the issued token to confirm `sub` is the TARGET's id, not the caller's.
    from services.auth import decode_token
    payload = decode_token(data["access_token"])
    assert payload["sub"] == target["id"], "token sub must be target user, not caller"
    assert payload["sub"] != admin["id"]
    assert payload["email"] == "impersonation-target2@example.com"


def test_unknown_target_email_returns_404():
    admin = get_user_by_email("kush282930@gmail.com")
    if not admin:
        print("SKIP: no seeded privileged account (kush282930@gmail.com) in DB")
        return
    admin_token = create_access_token(admin["id"], admin["email"])
    resp = client.post(
        "/api/v1/auth/impersonate",
        json={"target_email": "definitely-does-not-exist-xyz@example.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 404, resp.text


if __name__ == "__main__":
    test_non_privileged_cannot_impersonate()
    print("OK: non_privileged_cannot_impersonate")
    test_real_signed_up_nonprivileged_user_cannot_impersonate()
    print("OK: real_signed_up_nonprivileged_user_cannot_impersonate")
    test_privileged_caller_gets_target_token()
    print("OK: privileged_caller_gets_target_token (or skipped)")
    test_unknown_target_email_returns_404()
    print("OK: unknown_target_email_returns_404 (or skipped)")
