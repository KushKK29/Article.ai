"""
ArticleShip Email Service
--------------------------
Generic SMTP sender (stdlib only — works with any free SMTP provider:
Gmail SMTP, Brevo's free tier, Mailgun, etc.) via env vars. Used for OTP
signup verification and contact-form submissions (see main.py).
"""

import logging
import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", SMTP_USER)


def send_email(to: str, subject: str, body: str, html: str | None = None) -> None:
    """Sends an email via SMTP (STARTTLS). Raises on failure — caller decides how to handle it."""
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        raise RuntimeError("SMTP_HOST, SMTP_USER and SMTP_PASSWORD must be set to send email.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to
    msg.set_content(body)
    if html:
        msg.add_alternative(html, subtype="html")

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)

    logger.info("Sent email to %s: %s", to, subject)
