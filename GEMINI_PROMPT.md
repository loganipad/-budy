# Budy.Study — Complete Build Specification

You are building **Budy.Study**, a freemium SAT & PSAT practice test platform. The product lets students take timed practice tests, get instant scores, review answers with explanations, and track improvement over time. Free users get 10-question mini tests. Paid subscribers unlock full-length tests and AI explanations.

**Target audience**: 8th–12th grade students preparing for the SAT/PSAT, and their parents who pay for it.

**Core value proposition**: "The fastest way to practice for the SAT. Real questions, instant scores, clear explanations."

---

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS — no frameworks, no build step
- **Backend**: Vercel Serverless Functions (Node.js ESM)
- **Database**: Supabase PostgreSQL (via REST API with `fetch`, not the JS SDK)
- **Auth**: Auth0 SPA SDK 2.1
- **Payments**: Stripe (via raw `fetch` to `api.stripe.com`, not the Node SDK)
- **Charts**: Chart.js 4.4.0 (CDN)
- **Fonts**: Google Fonts — `Sora` (400–800) for all text, `Lora` (500, 700) for decorative accents
- **Deploy**: Vercel

---

## File Structure

```
/
├── index.html              # Landing page + test engine + results (single page app)
├── login.html              # Auth page (login / signup / forgot password)
├── account.html            # Account dashboard (progress, billing, settings)
├── navbar.html             # Shared nav component
├── navbar-loader.js        # Injects navbar.html into pages
├── vercel.json             # URL rewrites
├── assets/
│   └── budy-logo.png       # Logo (transparent PNG)
├── api/
│   ├── _auth.js            # Bearer token validation via Auth0 /userinfo
│   ├── _db.js              # Shared Supabase REST helpers
│   ├── me.js               # GET — user profile + subscription status
│   ├── test-attempts.js    # GET/POST — test history
│   ├── checkout.js         # POST — create Stripe checkout session
│   ├── billing-portal.js   # POST — create Stripe billing portal session
│   ├── cancel.js           # POST — cancel subscription immediately
│   ├── delete-account.js   # POST — delete user data + Auth0 account
│   └── stripe-webhook.js   # POST — Stripe event handler
└── supabase/
    └── schema.sql          # All table definitions
```

**Key simplification**: There is ONE database helper (`_db.js`) instead of separate subscription and score store files. All Supabase calls go through shared `supabaseGet`, `supabasePost`, `supabaseDelete` helpers.

---

## Design System

### Color Palette
```css
:root {
  /* Neutrals */
  --ink:        #0d1117;
  --ink-soft:   #1c2333;
  --slate:      #4a5568;
  --muted:      #718096;
  --line:       #e2e8f0;
  --bg:         #f7f8fc;
  --white:      #ffffff;

  /* Brand */
  --blue:       #1a56db;
  --blue-dark:  #1440b0;
  --blue-light: #3b82f6;
  --blue-pale:  #eff6ff;

  /* Accent */
  --gold:       #f59e0b;
  --gold-light: #fbbf24;
  --gold-pale:  #fffbeb;

  /* Feedback */
  --green:      #059669;
  --green-light:#10b981;
  --green-pale: #ecfdf5;
  --red:        #e11d48;
  --red-light:  #f43f5e;
  --red-pale:   #fff1f2;

  /* Typography */
  --font:       'Sora', system-ui, sans-serif;
  --font-serif: 'Lora', Georgia, serif;
  --font-mono:  'Courier New', monospace;
}
```

### Design Rules
- All buttons: `border-radius: 9999px` (pill)
- All cards: `border-radius: 20px`, `border: 1px solid var(--line)`
- Shadows: subtle (`0 1px 4px rgba(0,0,0,.07)` for rest, `0 12px 48px rgba(0,0,0,.13)` for elevated)
- Font rendering: `-webkit-font-smoothing: antialiased`
- Touch targets: minimum 44x44px
- Inputs: `font-size: 16px` (prevents iOS zoom)
- Transitions: `cubic-bezier(0.16, 1, 0.3, 1)` for UI animations
- Mobile-first responsive: breakpoints at 480px, 640px, 768px, 1024px

---

## Database Schema (`supabase/schema.sql`)

```sql
-- User subscriptions (managed by Stripe webhooks)
create table public.subscriptions (
  user_id text primary key,
  email text,
  is_premium boolean default false,
  status text default 'free',  -- free | active | trialing | canceled | past_due
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,                    -- weekly | monthly | annual
  current_period_end timestamptz,
  canceled_at timestamptz,
  updated_at timestamptz default now()
);

-- Test attempt history
create table public.test_attempts (
  id bigint generated always as identity primary key,
  user_id text not null,
  section text not null,        -- english | math | full
  score integer not null default 0,
  correct integer not null default 0,
  total integer not null default 0,
  skills jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index test_attempts_user_idx on public.test_attempts (user_id, created_at);

-- Webhook deduplication
create table public.webhook_events (
  event_id text primary key,
  event_type text,
  processed_at timestamptz default now()
);
```

---

## Environment Variables

```
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_MGMT_TOKEN=             # Management API token (for account deletion)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_WEEKLY=          # price_xxx
STRIPE_PRICE_MONTHLY=         # price_xxx
STRIPE_PRICE_ANNUAL=          # price_xxx
SUPABASE_URL=
SUPABASE_KEY=                 # service_role key
SITE_URL=https://www.budy.study
```

---

## Shared Navbar (`navbar.html`)

Fixed top bar, 64px, white with blur backdrop. CSS lives ONLY in navbar.html (not duplicated elsewhere).

**Desktop layout**:
- Left: Logo image (40x40) + "Budy.Study" in `var(--blue)`, weight 800
- Right: "Features" | "Pricing" | "My Account" (ghost pills) | Auth button ("Log In" or "Log Out") | "Start Free Test" (gold CTA)

**Mobile (< 768px)**: Collapse to hamburger menu + "Start Free Test" CTA only.

**Page variants**:
- Landing page (default): Shows all nav links
- Account page: Hides Features/Pricing, shows "Home" link instead of "My Account"

**Auth state**: Read from `localStorage` key `budy_auth`. Toggle button text and behavior accordingly.

---

## Page 1: `index.html` — Landing + Test Engine + Results

Single-page app with view switching between: `landing`, `loading`, `test`, `results`.

### Global State
```javascript
const state = {
  view: 'landing',
  user: { name: '', grade: '' },
  isLoggedIn: false,
  isPremium: false,
  section: null,       // english | math | full
  questions: [],
  answers: {},         // { index: 'A' | 'B' | 'C' | 'D' | string }
  flags: new Set(),
  current: 0,
  timeLeft: 0,
  timer: null,
  results: null,
  plan: 'monthly',     // selected plan in paywall
};
```

### View Switching
`setView(name)` toggles visibility of `#landing-view`, `#loading-view`, `#test-view`, `#results-view`. Uses `display: none/block/flex` directly. Scrolls to top on switch.

---

### LANDING PAGE

#### Hero Section
Dark background (`var(--ink)`) with subtle blue radial gradient at top and 40px grid texture overlay.

```
[pill badge] NEW — 2026 Digital SAT Format

# The fastest way to
# practice for the SAT

Real test questions. Instant scores.
Step-by-step explanations when you get stuck.

[Gold CTA: "Take a Free Practice Test →"]  [Ghost: "See Pricing"]

+190 avg score increase    |    Free to start    |    Works on any device
```

**Interactive phone mockup** below the hero text: White rounded card (28px radius) with floating animation (translateY 8px, 5s loop). Contains a live mini-quiz with 4 rotating demo questions. Users can click answers, see correct/wrong feedback with explanation text. Navigation dots at bottom. Swipeable on mobile.

Demo questions:
1. Math: "If a tutoring app has 120 users and grows by 25%, how many users does it have now?" → C) 150
2. Reading: Inference about repeated experiment results → A) Result may be reliable
3. Math: Slope through (2,4) and (6,12) → B) 2
4. Writing: Best transition for cause/effect → C) "As a result"

#### Social Proof Banner
White background. Animated counter: counts from $0 to "$40M+" on scroll into view (IntersectionObserver, 2s ease-out animation). Text: "in scholarships won by students who improved their SAT scores."

University marquee below: Infinite horizontal scroll (50s) of school names in serif font, low opacity, grayscale aesthetic. Schools: MIT, Stanford, Harvard, Yale, Princeton, Columbia, Penn, Cornell, Dartmouth, Brown, Caltech, UC Berkeley, UCLA, Duke, Northwestern, Georgetown, Rice, plus duplicates for seamless loop. Fade edges.

**Important**: The copy says "in scholarships won by students who improved their SAT scores" — NOT "by Budy.Study students." This is the honest framing: higher scores lead to scholarships, we help raise scores.

#### Features Section (`#features`)
Eyebrow: "Why Budy.Study"
Heading: "Everything you need to raise your score"
Sub: "No confusing tools. No jargon. Just practice tests, clear feedback, and explanations that make sense."

4 feature cards (2x2 grid on desktop, 1-column mobile):
1. **Real SAT Format** — "Every question mirrors the actual College Board digital SAT. Same skills, same difficulty, same format."
2. **Instant Scoring** — "See your score the moment you finish. No waiting. Know exactly what you got right and wrong."
3. **Progress Tracking** — "Every test is saved. Watch your score trend upward and see which skills need work."
4. **Step-by-Step Explanations** — "Missed a question? Get a clear walkthrough of the correct answer and the concept behind it." *(Premium badge)*

Each card: Icon (emoji in colored square), title (bold), description. Hover lifts card with shadow.

#### How It Works
3 steps with numbered blue circles and arrow connectors:
1. "Pick your section" — Reading & Writing, Math, or Full Test
2. "Take a timed test" — Real SAT questions with a countdown timer
3. "Review and improve" — See your score, skill breakdown, and explanations

#### Pricing Section (`#pricing`)
Dark background.

Eyebrow (gold): "Simple Pricing"
Heading (white): "Start free. Upgrade when you're ready."
Sub: "Cancel anytime. 7-day money-back guarantee."

**3 pricing cards** (not 4 — remove the confusing weekly/monthly toggle):

| | Free | Monthly | Annual |
|---|---|---|---|
| Price | $0 | $19.99/mo | $9.99/mo ($119.99/yr) |
| | | | **BEST VALUE** badge |
| 10 questions per test | ✓ | ✓ | ✓ |
| Instant scoring | ✓ | ✓ | ✓ |
| Full-length tests (27-49 Q) | ✗ | ✓ | ✓ |
| Answer explanations | ✗ | ✓ | ✓ |
| Score history & analytics | ✗ | ✓ | ✓ |
| Unlimited attempts | ✗ | ✓ | ✓ |
| Button | "Start for Free" | "Start Monthly" | "Start Annual" |

Monthly card is the featured/highlighted card (blue background, slight scale up). Annual has gold "BEST VALUE" badge. No weekly plan in the main pricing grid — weekly is available only in the paywall modal as an option for users who want maximum flexibility.

Footer note: "Secure checkout via Stripe · Cancel anytime · 7-day money-back guarantee"

#### Testimonials
Heading: "What students are saying"

4 testimonial cards (2x2 on desktop):
1. "I went from a 1050 to 1280 in two months. The explanations actually helped me understand WHY I got things wrong." — Arjun K., 10th Grade
2. "I used this every night for two weeks before the PSAT. My score jumped way more than I expected." — Sofia M., 9th Grade
3. "My son was stressed about the SAT. After a month with Budy.Study he scored a 1390 — higher than we hoped." — Priya R., Parent
4. "The explanation mode feels like having a tutor. I can see exactly why each wrong answer is tempting." — Emma S., 9th Grade

Each: 5 gold stars, italic quote, avatar circle (initials on colored bg), name + meta.

#### FAQ
Heading: "Common questions"

5 accordion items:
1. "Is the free test really free?" → Yes, no credit card, no account needed. 10 questions, instant score, answer review.
2. "What grade is this for?" → Built for 8th–12th graders. Questions calibrated to SAT/PSAT difficulty.
3. "How is this different from Khan Academy or other prep?" → Mobile-first, instant scores, explanations in plain English, no 30-minute setup.
4. "Can I cancel?" → Yes, anytime. 7-day money-back guarantee, no questions asked.
5. "Do I need to download an app?" → No. Runs in your browser on any device.

#### CTA Band
Blue gradient background with gold radial accent.
"Ready to see where you stand?" / "No account needed. No credit card. Just pick a section and go."
Gold CTA button.

For premium users, change to: "Keep your streak going" / "Pick your next test and jump in."

#### Footer
Dark background. 3 columns: Brand description | Product links (Features, Pricing, My Account) | Company links (Privacy Policy, Terms of Service, Contact).
Bottom: "© 2026 Budy.Study. SAT® is a trademark of College Board. Not affiliated."

---

### ONBOARDING MODAL (3 steps)

Triggered by any "Start Test" button. Overlay with backdrop blur, white modal.

**Step 1** — "Let's set up your test"
- First name input
- Grade dropdown (8th–12th)
- "Continue →"

**Step 2** — "What do you want to practice?"
- 3 section cards (click to select):
  - 📖 Reading & Writing — "10 Qs free · 27 with Premium"
  - 🔢 Math — "10 Qs free · 22 with Premium"
  - 📋 Full Test — "Premium only · 49 Qs, 67 min" (locked for free users → opens paywall on click)
- "← Back" + "Continue →"

**Step 3** — "You're all set"
- Summary: Name, Grade, Section, Question count, Time limit
- Tip: "Find a quiet spot and treat this like the real thing."
- "← Back" + "Start Test" (green button)

---

### PAYWALL MODAL

Overlay with centered white card.

- 🔓 icon in blue gradient square
- "Unlock Premium"
- "Full tests, explanations, and score tracking."
- 3 perks: Full-length tests | Answer explanations | Progress analytics
- **Plan selector** (3 clickable cards, selected = blue border):
  - Weekly: $9.99/wk — "Flexible, cancel anytime"
  - Monthly: $19.99/mo — "POPULAR" badge — default selected
  - Annual: $9.99/mo billed $119.99/yr — "BEST VALUE"
- Blue CTA: "Start [Plan] →"
- "7-day money-back guarantee · Cancel anytime"
- "No thanks" dismiss button

**Behavior**: If user is not logged in, redirect to `/login.html` first. If already premium, show toast "You already have Premium" and close. Otherwise, call `POST /api/checkout` and redirect to Stripe.

---

### TEST ENGINE

Full-screen overlay (z-index 800).

**Top bar** (dark, 58px):
- "Budy.Study" text left
- Section label pill
- Thin progress bar
- Timer (monospace, gold, pulses red < 5 min)
- "Submit" button right

**Sidebar** (180px, desktop only):
- Numbered question grid (5 columns)
- States: unanswered (gray), answered (light blue), current (blue), flagged (amber)
- Legend

**Question area**:
- Badge: "📖 R&W · Q3 of 27" + skill tag
- Passage (if applicable): Light bg, blue left border, scrollable
- Question text (bold)
- Multiple choice: 4 options as clickable cards with letter circles. Selected = blue. Ripple on click.
- SPR (student-produced response): Large monospace text input for math free-response

**Bottom bar**:
- Flag toggle button
- "← Prev" | "3/27" | "Next →"
- On last question: "Next" becomes green "Submit ✓"
- Mobile: Sticky bottom with blur backdrop

**Keyboard shortcuts**: A/B/C/D or 1-4 select answer, ← → navigate, F to flag

**Timer**: Counts down. Free tier: 12 min. Premium: English 32 min, Math 35 min, Full 67 min. At 0: auto-submit with warning toast.

**beforeunload**: Warn if test is active.

---

### QUESTION BANKS

#### English Questions (27 items)
Format: `{ id, type: 'mc', section: 'english', skill, passage, question, options: ['A) ...', ...], answer: 'B', explanation: '...' }`

**Every question must have an `explanation` field.** This is the key premium feature. Free users see it blurred; premium users can reveal it.

Skills to cover (at least 2 questions each): Inference, Words in Context, Central Ideas, Grammar & Usage, Transitions, Command of Evidence, Text Structure, Rhetorical Synthesis

Write 27 high-quality SAT-style questions with realistic passages about diverse topics (science, history, social science, literature). Each explanation should be 2-3 sentences, written in plain language a 9th grader would understand.

#### Math Questions (22 items)
Format: `{ id, type: 'mc' | 'spr', section: 'math', skill, question, options, answer, acceptableAnswers, explanation }`

SPR (student-produced response) questions: `type: 'spr'`, `options: null`, `acceptableAnswers: ['8', '8.0']`

Skills to cover: Linear Equations, Systems, Quadratics, Ratios, Percentages, Functions, Statistics, Geometry, Inequalities, Probability, Word Problems

Include 3 SPR questions. Write 22 questions with explanations showing step-by-step solutions.

**Free tier**: First 10 questions. Premium: full set.
**Full test**: ~55% english, ~45% math from both banks.

---

### SCORING

**Raw-to-Scaled conversion**: Piecewise linear interpolation. Percentage correct (0–1) maps to scaled score (200–800). Separate curves for English and Math. Full test = English score + Math score (max 1600).

**Percentile estimate**: Score/max ratio mapped to percentile buckets (99th, 96th–98th, 92nd–95th, etc.).

---

### RESULTS SCREEN

**Header**: Dark with blue gradient. "[Name]'s Results" + section + date.

**Score card** (white, overlapping header):
- Animated score counter (0 → final, 1.5s, ease-out-cubic via requestAnimationFrame)
- Color: green ≥ 700, blue ≥ 500, amber < 500 (double thresholds for full test)
- Percentile badge
- Correct / Wrong / Skipped counts

**Free tier banner** (amber, only shown for free users):
"You completed a 10-question practice test. Unlock full-length tests (27–49 questions) and detailed explanations with Premium."
+ "Unlock Premium" button

**Skill Breakdown**: Horizontal bars per skill, animated width, color by section.

**Summary**: "You answered X of Y correctly (Z%)." For full: R&W and Math sub-scores.

**Answer Review**: List of all questions:
- Correct ✓ (green) / Wrong ✗ (red) / Skipped (gray) badge
- Truncated question + your answer vs correct answer
- **Explanation**:
  - Free: Blurred text (`filter: blur(5px)`) with lock overlay + "Unlock with Premium" button
  - Premium: "Show Explanation" button → reveals the `explanation` field from the question data (no delay needed — it's already in the data)

**Actions**: "Take Another Test" | "My Account" | "Download Report" (generates .txt summary)

**Confetti**: Canvas particle animation on scores ≥ 700 (or ≥ 1400 full).

---

## Page 2: `login.html` — Authentication

Dark themed. Gradient background matching hero.

### Layout:
- Navbar (dark variant) with logo + "← Back to Budy.Study"
- Centered white card (max-width 420px)
- Tab switcher: "Log In" | "Sign Up"

### Log In Tab:
- Email input
- Password input (with show/hide toggle)
- "Forgot password?" link
- Blue "Log In" button (full width)
- "or" divider
- Google OAuth button

### Sign Up Tab:
- Name input
- Email input
- Password input (with 4-bar strength indicator)
- Blue "Create Account" button
- Google OAuth button
- Terms text: "By signing up you agree to our Terms and Privacy Policy"

### Forgot Password:
- Email input
- "Send Reset Link" button
- "← Back to login"

### Auth Implementation:
- Init Auth0 SPA client
- Database login: `POST https://{domain}/oauth/token` with `grant_type: password`
- Signup: `POST https://{domain}/dbconnections/signup`
- Google: `authClient.loginWithPopup({ connection: 'google-oauth2' })`
- On success: Store `{ sub, name, email, accessToken }` in `localStorage` key `budy_auth`
- Redirect to `/?login=success`
- Password reset: `POST https://{domain}/dbconnections/change_password`
- Inline field validation with error messages
- Toast notifications

---

## Page 3: `account.html` — Account Dashboard

This is the ONLY account/dashboard page. There is no duplicate dashboard embedded in index.html. When users click "My Account," they navigate to this page.

**Dark theme**: `#131822` background, `#1a2235` cards, `#f0f4ff` text.

### Header:
- "Welcome back" label + user name heading
- Status pill: "FREE" (green) or "PREMIUM" (blue) with pulsing dot

### Tabs: My Progress | Billing | Settings

### Progress Tab:
**Stats row** (4 cards): Best Score | Latest Score | 7-Day Change (+/- with color) | Tests This Month

**Score Chart**: Chart.js line chart (blue line, light fill, dark-themed axes). Shows last 30 days. Empty state: "Take your first test to see your progress."

**Recent Tests Table**: Date | Section | Score (colored pill) | Accuracy %. Last 8 tests. Empty state: "No tests yet."

### Billing Tab:
**Current Plan card**: Shows plan name + price. If free: "Upgrade to Premium" button. If premium: plan details.

**Billing details**:
- Status: ACTIVE / CANCELED / FREE
- Renewal/cancellation date (computed from subscription data)
- Payment: "Managed by Stripe"
- Actions: "Manage Billing" (opens Stripe portal) | "Cancel Subscription" (red, with confirm dialog)

"Manage Billing" calls `POST /api/billing-portal`, redirects to Stripe portal URL.
"Cancel" calls `POST /api/cancel` after `confirm()`, updates UI, shows toast.

If user is on free plan, hide cancel button and show upgrade CTA instead.

### Settings Tab:
**Profile**: Name (read-only), Email (read-only), Grade (read-only). These come from auth — no edit UI needed for v1.

**Account Actions**:
- "Export My Data" → Client-side: Generates CSV from cached test attempts and triggers download. Format: `Date, Section, Score, Correct, Total, Accuracy%`
- "Sign Out" → Clears `localStorage`, calls `auth0Client.logout()` if available, redirects to `/`
- "Delete My Account" → Confirm dialog: "This will permanently delete your account and all test data. This cannot be undone." → Calls `POST /api/delete-account` → Clears local storage → Redirects to `/`

**No notification toggles.** Don't show UI for features that aren't built. If you add email notifications later, add the toggles then.

### Auth Guard:
On page load, check `budy_auth` in localStorage. If missing, redirect to `/login.html`. Fetch `/api/me` for subscription status. Fetch `/api/test-attempts` for history. Render.

---

## Backend API

All endpoints: ESM exports (`export default async function handler(req, res)`). JSON responses via `json(res, status, payload)` helper. All protected endpoints validate Bearer token via `_auth.js`.

### `api/_auth.js`
```javascript
// Extracts Bearer token from Authorization header
// Validates by calling GET https://{AUTH0_DOMAIN}/userinfo
// Returns { ok: true, user: { id, email } } or { ok: false, status, error }
```

### `api/_db.js`
Shared Supabase helper. Three functions:
- `supabaseGet(path)` — GET request
- `supabasePost(path, body, prefer)` — POST with Prefer header
- `supabaseDelete(path)` — DELETE request

All include `apikey` and `Authorization: Bearer {SUPABASE_KEY}` headers.

### `api/me.js` — `GET /api/me`
1. Validate auth
2. Query `subscriptions` table by user_id
3. If subscription has `stripe_subscription_id`, fetch live status from Stripe API (`GET /v1/subscriptions/{id}`)
4. Return: `{ userId, email, isPremium, status, plan, currentPeriodEnd, canceledAt }`

### `api/test-attempts.js` — `GET` & `POST`
- GET: List attempts for user (limit 200, ordered by created_at asc)
- POST: Insert new attempt `{ section, score, correct, total, skills }`

### `api/checkout.js` — `POST /api/checkout`
1. Validate auth
2. Read `{ plan }` from body (weekly | monthly | annual)
3. Map plan to env var (`STRIPE_PRICE_WEEKLY`, etc.)
4. Create Stripe checkout session via `POST /v1/checkout/sessions` (form-encoded)
   - mode: subscription
   - allow_promotion_codes: true
   - client_reference_id: userId
   - metadata: { userId, plan }
   - success_url: `{SITE_URL}/?checkout=success&plan={plan}`
   - cancel_url: `{SITE_URL}/?checkout=cancel`
5. Return `{ url }` for client redirect

### `api/billing-portal.js` — `POST /api/billing-portal`
1. Validate auth
2. Get subscription, verify has stripe_customer_id
3. Create portal session via `POST /v1/billing_portal/sessions`
4. Return `{ url }`
5. If no subscription: return 403

### `api/cancel.js` — `POST /api/cancel`
1. Validate auth
2. Verify active subscription exists
3. `DELETE /v1/subscriptions/{id}` (immediate cancel)
4. Update Supabase: `is_premium: false`, `status: 'canceled'`
5. Return `{ ok: true }`

### `api/delete-account.js` — `POST /api/delete-account`
1. Validate auth
2. Delete from `test_attempts` where user_id matches
3. Delete from `subscriptions` where user_id matches
4. If has stripe_subscription_id and status is active: cancel Stripe subscription first
5. Delete Auth0 user via Management API: `DELETE /api/v2/users/{userId}` (requires `AUTH0_MGMT_TOKEN`)
6. Return `{ ok: true }`

### `api/stripe-webhook.js` — `POST`
- Disable body parser (`export const config = { api: { bodyParser: false } }`)
- Read raw body, verify HMAC-SHA256 signature with timing-safe comparison
- Deduplicate via `webhook_events` table
- Handle events:
  - `checkout.session.completed` → upsert subscription (premium: true, status: active)
  - `customer.subscription.updated` → update status
  - `customer.subscription.deleted` → set premium: false, status: canceled
- Extract userId from `metadata.userId` or `client_reference_id`, fallback to customer ID lookup

---

## Checkout Return Flow

On `index.html` load, check URL params:

**`?checkout=success`**:
1. Show amber "Activating Premium..." banner at top of landing page
2. Call `GET /api/me` to check if webhook has processed
3. If premium: Show green "Premium unlocked!" banner + confetti + toast
4. If not yet: Poll up to 8 times, 2.5s apart. Update banner with progress.
5. On final success: Green banner with "Start Premium Test" and "Go to Account" buttons
6. If still pending after all retries: Show "Payment received, activation in progress. Refresh in a moment."

**`?checkout=cancel`**:
- Show "Checkout canceled. No charge." banner with "View Plans" button
- Toast confirmation

Clean URL params after handling via `history.replaceState`.

---

## Key Behaviors

### CTA Label Sync
All "Start Test" buttons use `data-free-text` and `data-premium-text` attributes. On auth state change, update all button labels. Premium users see "Start a Test →" instead of "Take a Free Practice Test →".

### Session Persistence
- Logged in: Save to Supabase via `POST /api/test-attempts`. Cache in `state.sessions` array.
- Not logged in: Save to `localStorage` key `budy_sessions`.
- If remote save fails: Fall back to localStorage.

### Test Data Flow
1. Onboarding selects section
2. `startTest()`: Slice questions from bank (free: 10, premium: full), set timer, switch to test view
3. User answers questions, navigates, flags
4. On submit: Calculate score, build skill breakdown, save session
5. Switch to results view, render animated results

### Download Report
Generates a `.txt` file:
```
BUDY.STUDY — Practice Test Report
Student: [Name]
Date: [Date]
Section: [Section]
Score: [Score] / [Max]
Correct: [X] / [Y]
Percentile: ~[Xth]

Skill Breakdown:
  Inference: 3/4 (75%)
  Grammar: 2/3 (67%)
  ...
```
Triggers browser download via `Blob` + `URL.createObjectURL`.

---

## What NOT To Build

These features do not exist and should not be referenced anywhere in the UI, copy, or code:

- ~~Flashcards~~ — Not built. Do not mention.
- ~~Extra quizzes~~ — Not built. Do not mention.
- ~~AI-generated explanations~~ — Explanations are pre-written in the question data. Label them "explanations," not "AI explanations."
- ~~Notification preferences~~ — No email/push system exists. No toggles.
- ~~QR codes~~ — Not a feature. Do not reference.
- ~~"Coming Soon" placeholders~~ — Ship what exists. No placeholder cards.
- ~~Weekly plan in main pricing grid~~ — Weekly is paywall-only. Main grid shows Free / Monthly / Annual.
- ~~Editable profile fields~~ — v1 shows read-only profile from auth data.
- ~~Service worker / offline mode~~ — Not implemented. Don't register a SW.

---

## Quality Checklist

Before considering this complete, verify:

- [ ] Every button has a working handler (no `onclick="undefinedFunction()"`)
- [ ] Sign Out works on every page (calls correct logout function)
- [ ] Delete Account actually deletes data from Supabase + Auth0
- [ ] Export CSV actually downloads a file
- [ ] Free tier properly limits to 10 questions
- [ ] Full Test is locked for free users (opens paywall)
- [ ] Explanations are blurred for free users, revealed for premium
- [ ] Pricing is consistent everywhere ($0 / $19.99/mo / $119.99/yr)
- [ ] No features are advertised that don't exist
- [ ] Stripe checkout creates session and redirects
- [ ] Webhook processes events and activates premium
- [ ] Dashboard shows real data from test history
- [ ] Chart renders with actual scores
- [ ] Mobile layout works on iPhone SE through iPad
- [ ] Timer auto-submits at 0
- [ ] Confetti fires on good scores
- [ ] Auth persists across page navigation
- [ ] Account page redirects to login if not authenticated
- [ ] Cancel subscription works with confirmation
- [ ] Billing portal opens Stripe portal
- [ ] Navbar loads correctly on all pages

Build this application with clean, maintainable code. Every feature described above should work end-to-end. Do not add features not described here. Ship what works.
