"""Hardcoded privileged-account allowlists. Two accounts today — a `role`
field on the user document is the upgrade path if this list ever grows."""
from typing import Any, Dict

ADMIN_EMAILS = {"kush282930@gmail.com"}
SUPPORT_EMAILS = {"support@articleship.com"}
PRIVILEGED_EMAILS = ADMIN_EMAILS | SUPPORT_EMAILS

FREE_TIER_ARTICLE_LIMIT = 5


def is_admin(email: str) -> bool:
    return (email or "").strip().lower() in ADMIN_EMAILS


def is_privileged(email: str) -> bool:
    return (email or "").strip().lower() in PRIVILEGED_EMAILS


def over_free_tier_limit(user: Dict[str, Any]) -> bool:
    if is_admin(user.get("email", "")):
        return False
    if user.get("tier", "free") != "free":
        return False
    completed = user.get("usage", {}).get("completed_jobs", 0)
    return completed >= FREE_TIER_ARTICLE_LIMIT
