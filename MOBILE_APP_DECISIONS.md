Budy.Study Mobile App Decisions (iOS + Android)

Last updated: 2026-04-10
Owner: Budy.Study core team
Status: Approved baseline for implementation

## 1) Final Product Decisions

1. Platform launch scope
- iOS App Store and Google Play Store (both)
- Sequencing: build both in parallel, release in phases (TestFlight + Internal Track first)

2. App architecture
- Decision: Capacitor wrapper around current web app
- Why: fastest path to ship while preserving current product velocity
- Revisit trigger: if native-only feature roadmap grows beyond 30% of app surface

3. Authentication
- Keep Auth0 as identity provider
- Keep Google sign-in
- Add Sign in with Apple (required parity for iOS when third-party sign-in exists)

4. Payments and plans
- Web: Stripe subscriptions continue
- Native iOS: StoreKit subscriptions only
- Native Android: Google Play Billing subscriptions only
- Entitlements: server-side source of truth across all channels

5. Entitlement strategy
- Single entitlement key: `premium_active`
- User can unlock via Stripe OR Apple OR Google
- Access is granted if any active subscription record exists

## 2) Subscription Catalog (Exact Choices)

Keep plans simple at launch:

- Monthly plan
- Yearly plan (with savings)

SKU naming convention:
- Apple monthly: `com.budystudy.premium.monthly`
- Apple yearly: `com.budystudy.premium.yearly`
- Google monthly: `premium_monthly`
- Google yearly: `premium_yearly`
- Internal normalized keys: `monthly`, `yearly`

Pricing policy:
- Maintain near-parity across platforms
- Allow regional currency handling by Apple/Google
- Annual should be positioned as the default value plan

Trial policy:
- Start with 7-day trial for monthly only
- No trial on yearly at launch
- Reassess after 30 days of production retention data

## 3) Required Backend Components

1. Apple
- App Store Server Notifications V2 endpoint
- Transaction verification via App Store APIs
- Server mapping from App Store original transaction to Budy user

2. Google
- Play Developer API verification endpoint
- Real-time Developer Notifications (RTDN) via Google Pub/Sub
- Token to user mapping in subscription records

3. Unified subscription table fields (minimum)
- `user_id`
- `source` (`stripe`, `apple`, `google`)
- `product_key` (`monthly`, `yearly`)
- `platform_product_id`
- `status` (`active`, `trialing`, `grace`, `paused`, `canceled`, `expired`)
- `period_start`
- `period_end`
- `auto_renew`
- `external_customer_id` (nullable)
- `external_subscription_id`
- `last_verified_at`

4. Access rule
- Premium on if at least one subscription status is `active`, `trialing`, or `grace`

## 4) Native App Runtime Decisions

1. Capacitor plugins
- In-app purchases plugin for StoreKit + Play Billing
- Deep links plugin
- Device/network status plugin

2. In-app purchase UX
- Purchase buttons shown only in native mode
- Stripe checkout buttons hidden in native mode
- Add Restore Purchases button in Settings/Billing

3. Account linking
- Purchase restoration requires logged-in account
- If purchase is detected pre-login, prompt to sign in and then attach entitlement

4. Offline behavior
- Keep last known entitlement for short cache window (24h)
- Re-verify entitlement on app foreground/resume

## 5) Compliance and Store Requirements

1. iOS
- Add Sign in with Apple
- Use in-app subscriptions for digital premium
- Include account deletion path in app (or direct in-app route to deletion flow)

2. Android
- Use Play Billing library compliant with latest required version
- Publish Data Safety form in Play Console

3. Policy and legal
- Privacy Policy and Terms must mention mobile in-app billing and restore behavior
- Support URL and in-app support contact required for store listing trust

## 6) Analytics, Observability, and Quality

1. Analytics stack
- Firebase Analytics events on both mobile platforms
- Keep existing web telemetry for browser usage

2. Crash/error monitoring
- Crashlytics for native crash visibility
- Keep server observability for entitlement and webhook failures

3. Required launch events
- `mobile_app_open`
- `paywall_viewed`
- `subscription_purchase_started`
- `subscription_purchase_success`
- `subscription_purchase_failed`
- `subscription_restore_started`
- `subscription_restore_success`
- `subscription_restore_failed`
- `entitlement_check_success`
- `entitlement_check_failed`

## 7) CI/CD and Release Pipeline

1. Build tooling
- GitHub Actions + Fastlane

2. Environments
- `development`
- `staging`
- `production`

3. Artifact flow
- iOS: archive -> TestFlight internal -> TestFlight external -> App Store release
- Android: internal testing -> closed testing -> open/staged production

4. Rollout policy
- Android production staged rollout: 10% -> 25% -> 50% -> 100%
- iOS: phased release if available, otherwise controlled release window

## 8) Implementation Phases (8 Weeks)

Week 1-2
- Capacitor app shell
- Native projects generated and configured
- Auth session tested on mobile lifecycle

Week 3-4
- Apple/Google purchase flows integrated
- Restore purchases implemented
- Native mode paywall switches in place

Week 5
- Backend verification + notifications live
- Unified entitlement logic shipped
- Admin visibility dashboard for subscription state

Week 6
- Sign in with Apple finalized
- App Store / Play policy text and legal updates
- QA matrix execution begins

Week 7
- TestFlight external + Play internal/closed testing
- Fixes from billing/account/restore edge cases

Week 8
- Store metadata lock
- Production submission and staged rollout

## 9) Open Choices To Finalize This Week

1. Final monthly and yearly prices
2. Trial availability by region
3. Whether yearly has intro discount
4. Support SLA target for purchase/access tickets
5. Minimum OS versions
- iOS recommendation: iOS 16+
- Android recommendation: API 29+

## 10) Launch Readiness Checklist

Must be true before production release:

- In-app purchases complete successfully on iOS and Android
- Restore purchases works across reinstall/new device
- Entitlement updates within 60 seconds of transaction confirmation
- Canceled/expired subscriptions remove premium access correctly
- Sign in with Apple reviewed and approved
- Account deletion path available from app settings
- Privacy policy, terms, support URL, and store metadata complete
- Crash-free session rate >= 99.5% in beta week

## 11) Immediate Next Actions (This Sprint)

1. Scaffold Capacitor apps and commit baseline native projects
2. Implement native-mode paywall routing (hide Stripe buttons in app)
3. Build `POST /api/mobile/entitlements/verify` and unified entitlement reader
4. Wire StoreKit and Play Billing purchase + restore flows
5. Add Sign in with Apple to Auth0 and mobile login UI
