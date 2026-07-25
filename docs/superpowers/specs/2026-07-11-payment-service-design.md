# Payment Service Design

Date: 2026-07-11
Status: Approved

## Problem

ArticleShip's pricing page (`Frontend/app/pricing/page.tsx`) advertises three tiers
(Free / Pro $49 / Agency $149) but nothing in the backend can take payment or
track which tier a user is on. `users` documents (`services/auth.py`) have no
tier concept — only `credits` and `usage`.

## Scope

Backend only. Stripe integration: checkout, webhook-driven tier sync, and a
billing portal link. Frontend wiring (buttons, account page tier display) is
explicitly out of scope for this pass. Email notifications are a separate,
not-yet-scoped piece of work.

## Architecture

New `services/payment_service.py`, matching the shape of `services/auth.py`:
Stripe SDK calls plus reads/writes on the existing `users` Mongo collection.
Three new fields on the user document, defaulted at creation:

- `tier`: `"free" | "pro" | "agency"` (default `"free"`)
- `stripe_customer_id`: `str | None`
- `stripe_subscription_id`: `str | None`

Three new routes in `main.py`, under `/api/v1/billing`, following the existing
`/api/v1/auth/*` route style:

- `POST /api/v1/billing/checkout` (auth required) — body `{tier: "pro"|"agency"}`,
  returns `{url}`. Creates a Stripe Customer for the user on first use
  (stored on the user doc), then a Checkout Session for the tier's Price ID.
  Both success and cancel redirect to `FRONTEND_URL/account`.
- `POST /api/v1/billing/portal` (auth required) — returns `{url}` for a Stripe
  Billing Portal session. 400 if the user has no `stripe_customer_id` yet.
- `POST /api/v1/billing/webhook` (no auth — verified via Stripe signature) —
  handles `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`. Matches the Stripe customer ID back to a
  user doc and updates `tier` / `stripe_subscription_id`.

## Config

New env vars (`.env.example`, same pattern as existing keys):
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`,
`STRIPE_AGENCY_PRICE_ID`, `FRONTEND_URL` (default `http://localhost:3000`).

New dependency: `stripe` (added to `requirements.txt`).

## Error handling

- Bad/missing webhook signature → 400 (Stripe retries).
- Unknown/missing `tier` in checkout request → 400.
- Webhook event whose `stripe_customer_id` matches no user → log a warning,
  return 200 (nothing we can do; returning an error just makes Stripe retry
  forever).
- Portal requested with no `stripe_customer_id` → 400 ("no billing account yet").

## Testing

`test_payment_service.py`: mocks the `stripe` client, feeds fixture event
payloads for the three handled event types through `handle_webhook_event`,
asserts the in-memory/mongo user doc's `tier` and `stripe_subscription_id`
end up correct. No live Stripe calls.

## Explicitly out of scope

- Frontend wiring (pricing page buttons, account page tier display).
- Tier-based enforcement of article/generation quotas (existing `credits`/
  `usage` fields are untouched — a follow-up if/when quota limits per tier
  are needed).
- Email notifications on payment events (separate work, details pending).
