"""
ArticleShip Payment Service
----------------------------
Stripe checkout, billing portal, and webhook-driven tier sync for the
`users` collection (see services/auth.py). Tiers map to Stripe Price IDs
via env vars — configure products/prices in the Stripe dashboard first.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import stripe
from dotenv import load_dotenv
from fastapi import HTTPException, status

from services.auth import get_user_by_id, get_user_by_stripe_customer_id, update_user

load_dotenv()

logger = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
_FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

_TIER_PRICE_IDS = {
    "pro": os.getenv("STRIPE_PRO_PRICE_ID", ""),
    "agency": os.getenv("STRIPE_AGENCY_PRICE_ID", ""),
}
_PRICE_ID_TO_TIER = {v: k for k, v in _TIER_PRICE_IDS.items() if v}


def _to_iso(unix_timestamp: Optional[int]) -> Optional[str]:
    if not unix_timestamp:
        return None
    return datetime.fromtimestamp(unix_timestamp, tz=timezone.utc).isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# Checkout / portal
# ---------------------------------------------------------------------------

def create_checkout_session(user: Dict[str, Any], tier: str) -> str:
    """Creates a Stripe Checkout session for the given tier, returns its URL."""
    price_id = _TIER_PRICE_IDS.get(tier)
    if not price_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown tier '{tier}'")

    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        customer = stripe.Customer.create(email=user["email"], metadata={"user_id": user["id"]})
        customer_id = customer["id"]
        update_user(user["id"], {"stripe_customer_id": customer_id})

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{_FRONTEND_URL}/account",
        cancel_url=f"{_FRONTEND_URL}/account",
        metadata={"user_id": user["id"], "tier": tier},
    )
    return session["url"]


def create_billing_portal_session(user: Dict[str, Any]) -> str:
    """Creates a Stripe Billing Portal session, returns its URL."""
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No billing account yet.")

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{_FRONTEND_URL}/account",
    )
    return session["url"]


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------

def verify_webhook_event(payload: bytes, sig_header: str) -> Dict[str, Any]:
    """Verifies the Stripe signature and returns the parsed event. Raises 400 on failure."""
    try:
        return stripe.Webhook.construct_event(payload, sig_header, _WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid webhook signature: {e}")


def handle_webhook_event(event: Dict[str, Any]) -> None:
    """Applies a verified Stripe event's effect to the matching user's tier."""
    event_type = event.get("type")
    obj = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        user_id = obj.get("metadata", {}).get("user_id")
        tier = obj.get("metadata", {}).get("tier")
        customer_id = obj.get("customer")
        subscription_id = obj.get("subscription")
        if not user_id or not get_user_by_id(user_id):
            logger.warning("checkout.session.completed for unknown user_id=%s", user_id)
            return
        update_user(user_id, {
            "tier": tier or "free",
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
        })

    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        customer_id = obj.get("customer")
        user = get_user_by_stripe_customer_id(customer_id)
        if not user:
            logger.warning("%s for unknown stripe_customer_id=%s", event_type, customer_id)
            return

        if event_type == "customer.subscription.deleted" or obj.get("status") in ("canceled", "unpaid", "incomplete_expired"):
            update_user(user["id"], {"tier": "free", "stripe_subscription_id": None, "stripe_current_period_end": None})
            return

        price_id = obj.get("items", {}).get("data", [{}])[0].get("price", {}).get("id")
        tier = _PRICE_ID_TO_TIER.get(price_id, user.get("tier", "free"))
        update_user(user["id"], {
            "tier": tier,
            "stripe_subscription_id": obj.get("id"),
            "stripe_current_period_end": _to_iso(obj.get("current_period_end")),
        })
