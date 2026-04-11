# Budy.Study Operations Guide

This document is the production operations runbook for Budy.Study.

## 1. Required Environment Variables

Set these in Vercel Production before deployment.

### Core Auth / Access
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID` (required for profile update fallback)
- `AUTH0_CLIENT_SECRET` (required for profile update fallback)
- `ADMIN_PREMIUM_EMAILS` (comma-separated admin/test premium accounts)

### Billing (Stripe)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_TOLERANCE_SECONDS` (optional, defaults to `300`)
- `STRIPE_PRICE_ID_WEEKLY`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_PRICE_ID_YEARLY`

### Data (Supabase)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### AI Deep Dive
- `OPENAI_API_KEY`
- `AI_DEEP_DIVE_MODEL` (or `OPENAI_MODEL`)
- `AI_DEEP_DIVE_PRO_CREDITS` (optional override for monthly credits)
- `AI_DEEP_DIVE_BYPASS_EMAILS` (optional comma-separated bypass users)

### Secure Test Sessions
- `TEST_SESSION_TOKEN_SECRET` (required in production; signs test-session tokens for server-side grading)

### Security / App Behavior
- `ALLOWED_ORIGINS` (comma-separated allowlist; supports patterns like `https://*.budy.study`)

### Distributed Rate Limiting (optional, recommended)
- `RATE_LIMIT_REDIS_REST_URL` (or `UPSTASH_REDIS_REST_URL`)
- `RATE_LIMIT_REDIS_REST_TOKEN` (or `UPSTASH_REDIS_REST_TOKEN`)

### Monitoring / Alerting
- `OBSERVABILITY_INGEST_URL`
- `OBSERVABILITY_ALERT_WEBHOOK_URL`
- `OBSERVABILITY_INGEST_TOKEN` (optional)
- `OBSERVABILITY_ALERT_SPIKE_THRESHOLD` (optional)
- `OBSERVABILITY_ALERT_SPIKE_WINDOW_MS` (optional)
- `OBSERVABILITY_ALERT_COOLDOWN_MS` (optional)

## 2. Stripe Webhook Setup

1. In Stripe Dashboard, create/update webhook endpoint to:
   - `https://www.budy.study/api/stripe-webhook`
2. Subscribe to at least:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Copy webhook signing secret (`whsec_...`) into:
   - `STRIPE_WEBHOOK_SECRET` (Vercel Production)
4. Verify endpoint in Stripe dashboard shows successful 2xx responses.
5. Trigger a test event and confirm:
   - subscription state updates in app
   - observability receives webhook event/alerts

## 3. Deployment Steps

1. Merge approved changes to `main`.
2. Confirm CI passes on `main` (includes strict validation + tests).
3. In Vercel:
   - verify Production env vars are present
   - verify latest deploy target is Production, not Preview
4. Deploy from `main`.
5. Confirm required SQL migrations are applied in Supabase:
   - `supabase/2026-03-31_ai_deep_dive_usage.sql`
   - `supabase/2026-04-11_ai_deep_dive_atomic.sql`
6. Post-deploy smoke checks:
   - login/auth (`/api/me`)
   - checkout session creation
   - billing portal session creation
   - AI deep dive request
   - webhook delivery from Stripe dashboard test
6. Verify alerts/ingest are receiving events after deploy.

## 4. Rollback Steps

1. In Vercel, open Deployments for Production.
2. Promote the last known-good deployment.
3. If rollback is code-related and persistent, also revert `main`:
   - `git revert <bad_commit_sha>`
   - push revert commit
4. Re-run smoke checks (auth, checkout, webhook, deep-dive).
5. Confirm incident channel that rollback is complete and user impact is reduced.

## 5. Incident Playbook

### A. Auth failures spike
1. Check Auth0 status and token validation behavior.
2. Verify `AUTH0_DOMAIN`/client credentials are unchanged.
3. Review `auth_failure` events in observability.
4. If widespread, post status update and prioritize auth hotfix.

### B. Checkout or billing failures
1. Check Stripe status page.
2. Validate `STRIPE_SECRET_KEY` and price IDs are correct mode (live vs test).
3. Inspect API 5xx and Stripe error payloads.
4. If needed, disable paid traffic campaigns until stable.

### C. Webhook failures
1. Open Stripe webhook deliveries and inspect failing events.
2. Confirm `STRIPE_WEBHOOK_SECRET` matches active endpoint.
3. Review `webhook_failure` alerts and route logs.
4. Replay failed events after fix.

### D. Deep Dive failures
1. Verify `OPENAI_API_KEY` and model env vars.
2. Confirm deep-dive credit store (Supabase) is reachable.
3. Check rate-limit and 5xx spikes for `/api/deep-dive`.
4. If provider outage, keep preview mode fallback available.

### E. Supabase connectivity failures
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. Check Supabase status and networking.
3. Review API routes with disabled-store behavior.
4. Apply temporary degradation messaging if required.

## 6. Operational Notes

- Keep CI protection enabled for `main`.
- Do not launch paid acquisition unless observability alerts are flowing.
- Treat `.env` changes as production changes; document every update in release notes.
