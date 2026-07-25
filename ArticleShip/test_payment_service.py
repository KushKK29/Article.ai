"""
Regression tests for services/payment_service.py webhook handling.
Run: .venv/bin/python test_payment_service.py  (no network, no DB, no Stripe keys needed)
"""
import os

os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_not_used")
os.environ.setdefault("STRIPE_PRO_PRICE_ID", "price_pro")
os.environ.setdefault("STRIPE_AGENCY_PRICE_ID", "price_agency")

from services import payment_service

payment_service._TIER_PRICE_IDS = {"pro": "price_pro", "agency": "price_agency"}
payment_service._PRICE_ID_TO_TIER = {"price_pro": "pro", "price_agency": "agency"}


def _fake_store(payment_service, users):
    payment_service.get_user_by_id = lambda uid: users.get(uid)
    payment_service.get_user_by_stripe_customer_id = lambda cid: next(
        (u for u in users.values() if u.get("stripe_customer_id") == cid), None
    )
    payment_service.update_user = lambda uid, fields: users[uid].update(fields)


def test_checkout_completed_sets_tier():
    users = {"u1": {"id": "u1", "email": "a@example.com", "tier": "free", "stripe_customer_id": None}}
    _fake_store(payment_service, users)

    event = {
        "type": "checkout.session.completed",
        "data": {"object": {
            "metadata": {"user_id": "u1", "tier": "pro"},
            "customer": "cus_123",
            "subscription": "sub_123",
        }},
    }
    payment_service.handle_webhook_event(event)

    assert users["u1"]["tier"] == "pro"
    assert users["u1"]["stripe_customer_id"] == "cus_123"
    assert users["u1"]["stripe_subscription_id"] == "sub_123"


def test_subscription_updated_syncs_tier_from_price():
    users = {"u1": {"id": "u1", "email": "a@example.com", "tier": "pro", "stripe_customer_id": "cus_123"}}
    _fake_store(payment_service, users)

    event = {
        "type": "customer.subscription.updated",
        "data": {"object": {
            "id": "sub_123",
            "customer": "cus_123",
            "status": "active",
            "current_period_end": 1783900000,
            "items": {"data": [{"price": {"id": "price_agency"}}]},
        }},
    }
    payment_service.handle_webhook_event(event)

    assert users["u1"]["tier"] == "agency"
    assert users["u1"]["stripe_current_period_end"] == "2026-07-12T23:46:40Z"


def test_subscription_deleted_reverts_to_free():
    users = {"u1": {
        "id": "u1", "email": "a@example.com", "tier": "pro", "stripe_customer_id": "cus_123",
        "stripe_current_period_end": "2026-08-01T00:00:00Z",
    }}
    _fake_store(payment_service, users)

    event = {
        "type": "customer.subscription.deleted",
        "data": {"object": {"id": "sub_123", "customer": "cus_123", "status": "canceled"}},
    }
    payment_service.handle_webhook_event(event)

    assert users["u1"]["tier"] == "free"
    assert users["u1"]["stripe_subscription_id"] is None
    assert users["u1"]["stripe_current_period_end"] is None


def test_unknown_customer_is_ignored_not_raised():
    users = {}
    _fake_store(payment_service, users)

    event = {
        "type": "customer.subscription.updated",
        "data": {"object": {"id": "sub_x", "customer": "cus_unknown", "status": "active", "items": {"data": []}}},
    }
    payment_service.handle_webhook_event(event)  # should not raise


if __name__ == "__main__":
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"PASS {t.__name__}")
    print(f"\n{len(tests)} tests passed.")
