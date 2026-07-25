"""
Regression tests for services/email_service.py.
Run: .venv/bin/python test_email_service.py  (no network, no real SMTP server needed)
"""
import os

os.environ["SMTP_HOST"] = "smtp.example.com"
os.environ["SMTP_USER"] = "bot@example.com"
os.environ["SMTP_PASSWORD"] = "secret"
os.environ["EMAIL_FROM"] = "bot@example.com"

from services import email_service


class FakeSMTP:
    sent = []
    started_tls = False
    logged_in = None

    def __init__(self, host, port):
        FakeSMTP.sent = []
        FakeSMTP.started_tls = False
        FakeSMTP.logged_in = None
        assert host == "smtp.example.com"
        assert port == 587

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def starttls(self):
        FakeSMTP.started_tls = True

    def login(self, user, password):
        FakeSMTP.logged_in = (user, password)

    def send_message(self, msg):
        FakeSMTP.sent.append(msg)


def test_send_email_happy_path():
    email_service.smtplib.SMTP = FakeSMTP

    email_service.send_email("user@example.com", "Welcome", "Hello there")

    assert FakeSMTP.started_tls is True
    assert FakeSMTP.logged_in == ("bot@example.com", "secret")
    assert len(FakeSMTP.sent) == 1
    msg = FakeSMTP.sent[0]
    assert msg["To"] == "user@example.com"
    assert msg["From"] == "bot@example.com"
    assert msg["Subject"] == "Welcome"
    assert "Hello there" in msg.get_content()


def test_send_email_missing_config_raises():
    orig = (email_service.SMTP_HOST, email_service.SMTP_USER, email_service.SMTP_PASSWORD)
    email_service.SMTP_HOST = ""
    try:
        try:
            email_service.send_email("user@example.com", "x", "y")
            assert False, "expected RuntimeError"
        except RuntimeError:
            pass
    finally:
        email_service.SMTP_HOST, email_service.SMTP_USER, email_service.SMTP_PASSWORD = orig


if __name__ == "__main__":
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"PASS {t.__name__}")
    print(f"\n{len(tests)} tests passed.")
