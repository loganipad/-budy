Budy.Study Mobile Implementation Board

Last updated: 2026-04-10
Execution mode: Core team shipping as primary dev team
Planning horizon: 8 weeks

## Delivery Rules

- Definition of done requires code, tests where applicable, and a runbook note.
- Any billing or entitlement task must include failure-path handling.
- No mobile release without restore purchases and entitlement reconciliation.

## Sprint 1 (Foundation)

1. Ticket: Scaffold Capacitor project
- Owner: App platform
- Priority: P0
- Deliverables:
  - Capacitor dependencies installed
  - Capacitor config committed
  - iOS and Android native projects generated
- Acceptance criteria:
  - `npx cap doctor` reports healthy setup
  - `ios/` and `android/` directories exist
  - App opens locally in simulator/emulator path

2. Ticket: Native mode detection
- Owner: Frontend
- Priority: P0
- Deliverables:
  - Runtime helper to detect native container vs web browser
  - Feature flag branch for native paywall behavior
- Acceptance criteria:
  - Native mode returns true only in Capacitor runtime
  - Browser mode remains unchanged

3. Ticket: Paywall routing split
- Owner: Frontend
- Priority: P0
- Deliverables:
  - Stripe checkout entry hidden/disabled in native mode
  - Native purchase CTA shown in native mode
- Acceptance criteria:
  - No Stripe redirect path exposed in native app
  - Existing web Stripe flow remains intact

4. Ticket: Auth mobile lifecycle validation
- Owner: Auth
- Priority: P1
- Deliverables:
  - Validate Auth0 session persistence across app pause/resume
  - Document edge cases and required config updates
- Acceptance criteria:
  - Login state survives foreground/background cycle
  - Logout clears session consistently on mobile

## Sprint 2 (Purchases)

1. Ticket: Integrate in-app purchase plugin
- Owner: App platform
- Priority: P0
- Deliverables:
  - Plugin wiring for StoreKit and Play Billing
  - Shared purchase service abstraction
- Acceptance criteria:
  - Product list fetch works on both platforms
  - Purchase start callback path available

2. Ticket: Implement purchase flow
- Owner: Frontend + Backend
- Priority: P0
- Deliverables:
  - Native purchase request from paywall
  - Transaction token sent to backend verification endpoint
- Acceptance criteria:
  - Successful purchase grants premium entitlement
  - Failed purchase presents actionable error state

3. Ticket: Restore purchases
- Owner: Frontend + Backend
- Priority: P0
- Deliverables:
  - Restore button in settings/billing
  - Backend reconciliation endpoint
- Acceptance criteria:
  - Reinstall + restore returns premium access
  - Restore handles no-purchase case gracefully

## Sprint 3 (Entitlements + Notifications)

1. Ticket: Unified entitlement API
- Owner: Backend
- Priority: P0
- Deliverables:
  - `POST /api/mobile/entitlements/verify`
  - `GET /api/mobile/entitlements/me`
- Acceptance criteria:
  - Returns normalized statuses across stripe/apple/google
  - Response includes current product key and expiry

2. Ticket: Apple verification + notifications
- Owner: Backend
- Priority: P0
- Deliverables:
  - Apple transaction verification service
  - App Store Server Notifications V2 webhook endpoint
- Acceptance criteria:
  - Renewal/cancel notifications update entitlement state
  - Invalid signatures rejected

3. Ticket: Google verification + RTDN
- Owner: Backend
- Priority: P0
- Deliverables:
  - Google purchase token verification service
  - RTDN processing endpoint
- Acceptance criteria:
  - Renewal/cancel events update entitlement state
  - Duplicate notifications are idempotent

## Sprint 4 (Compliance + Release)

1. Ticket: Sign in with Apple
- Owner: Auth
- Priority: P0
- Deliverables:
  - Auth0 + Apple provider configured
  - Mobile login surface includes Apple option on iOS
- Acceptance criteria:
  - Apple login completes and maps to existing account strategy
  - App Review parity requirement satisfied

2. Ticket: Account deletion in app
- Owner: Frontend + Backend
- Priority: P0
- Deliverables:
  - In-app path to account deletion flow
  - Confirmation and irreversible-action warning
- Acceptance criteria:
  - User can reach deletion flow from settings in under 3 taps
  - Deleted account loses access and session is terminated

3. Ticket: Beta hardening
- Owner: QA
- Priority: P0
- Deliverables:
  - Cross-platform test matrix execution
  - Critical bug triage and fix pass
- Acceptance criteria:
  - Crash-free sessions >= 99.5% in beta week
  - No P0/P1 bugs open at submission time

## Engineering Backlog (Always On)

1. Observability and alerts
- Add alerting for entitlement verification failures > 2%
- Add webhook dead-letter and replay runbook

2. Billing support tooling
- Admin view for user entitlement timeline
- Manual recheck action for support responders

3. Analytics integrity
- Event schema contract tests for purchase and restore events
- Dashboard for paywall view to purchase success funnel

## Immediate Execution Queue (Now)

1. Scaffold Capacitor project
2. Add native mode runtime helper
3. Split paywall paths for native vs web
4. Add mobile entitlement endpoint scaffolding

## Risks and Mitigations

1. Risk: Store policy rejection on billing/auth parity
- Mitigation: complete Sign in with Apple and in-app purchase-only native paywall before submission

2. Risk: Entitlement drift between providers
- Mitigation: server-side normalized entitlement reader and scheduled re-verification

3. Risk: Restore purchase failures
- Mitigation: mandatory restore test cases in QA gate and support runbook
