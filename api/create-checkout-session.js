import { resolveAuthUser } from '../lib/auth.js';
import { withApiErrorBoundary } from '../lib/observability.js';
import { json } from '../lib/http.js';
import { resolveSafeOrigin } from '../lib/origin.js';
import { looksMaskedKey, normalizeSecretKey } from '../lib/stripe-key.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';

const PLAN_TO_ENV = {
  weekly: 'STRIPE_PRICE_ID_WEEKLY',
  monthly: 'STRIPE_PRICE_ID_MONTHLY',
  annual: 'STRIPE_PRICE_ID_YEARLY'
};

async function createStripeSession({ secretKey, priceId, successUrl, cancelUrl, userId, email, plan }) {
  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('line_items[0][price]', priceId);
  body.set('line_items[0][quantity]', '1');
  body.set('allow_promotion_codes', 'true');
  body.set('client_reference_id', userId);
  body.set('metadata[userId]', userId);
  body.set('metadata[plan]', plan);
  body.set('subscription_data[metadata][userId]', userId);
  if (email) {
    body.set('customer_email', email);
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    const stripeErr = data && data.error ? data.error : {};
    const err = new Error(stripeErr.message || 'Stripe session creation failed.');
    err.stripeType = stripeErr.type || '';
    err.stripeCode = stripeErr.code || '';
    err.stripeParam = stripeErr.param || '';
    throw err;
  }
  return data;
}

function humanizeStripeError(err) {
  const code = err && err.stripeCode ? err.stripeCode : '';
  const type = err && err.stripeType ? err.stripeType : '';
  const param = err && err.stripeParam ? err.stripeParam : '';

  if (code === 'api_key_expired' || type === 'authentication_error') {
    return 'Stripe key is invalid or expired. Update STRIPE_SECRET_KEY in Vercel Production env vars.';
  }
  if (type === 'permission_error') {
    return 'Stripe key lacks permissions for checkout sessions. Use a full Secret key or grant restricted-key permission for checkout.sessions.create.';
  }
  if (code === 'resource_missing' && param.includes('line_items')) {
    return 'Stripe price ID was not found. Verify STRIPE_PRICE_ID_WEEKLY/MONTHLY/YEARLY are real price_ IDs in the same Stripe mode (live vs test) as STRIPE_SECRET_KEY.';
  }
  if (code === 'invalid_request_error' && param.includes('line_items')) {
    return 'Stripe price ID is invalid for this request. Verify the selected plan env var points to a recurring price_ ID.';
  }

  return err && err.message ? err.message : 'Unable to create checkout session.';
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/create-checkout-session:ip',
    limit: 30,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many requests. Please try again shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const userRateLimit = await checkRateLimit({
    req,
    namespace: 'api/create-checkout-session:user',
    identifier: auth.user.id,
    limit: 10,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, userRateLimit);
  if (!userRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many checkout attempts. Please wait a moment before trying again.',
      retryAfterSeconds: userRateLimit.retryAfterSeconds
    });
  }

  const secretKey = normalizeSecretKey(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY environment variable.' });
  }
  if (looksMaskedKey(secretKey)) {
    return json(res, 500, { error: 'STRIPE_SECRET_KEY appears masked or incomplete. Paste the full key from Stripe API Keys.' });
  }

  // Do not hard-block uncommon but potentially valid key formats.
  // Stripe API will return a canonical auth error if the key is invalid.

  const plan = (req.body && req.body.plan ? String(req.body.plan) : 'monthly').toLowerCase();
  const envName = PLAN_TO_ENV[plan];
  if (!envName) {
    return json(res, 400, { error: 'Invalid plan. Use weekly, monthly, or annual.' });
  }

  const priceId = process.env[envName];
  if (!priceId) {
    return json(res, 500, { error: `Missing ${envName} environment variable.` });
  }

  const origin = resolveSafeOrigin(req);
  const successUrl = `${origin}/?checkout=success&plan=${encodeURIComponent(plan)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/?checkout=cancel&plan=${encodeURIComponent(plan)}`;

  try {
    const session = await createStripeSession({
      secretKey,
      priceId,
      successUrl,
      cancelUrl,
      userId: auth.user.id,
      email: auth.user.email,
      plan
    });
    return json(res, 200, { url: session.url, id: session.id });
  } catch (err) {
    return json(res, 500, { error: humanizeStripeError(err) });
  }
}

export default withApiErrorBoundary('api/create-checkout-session', handler);
