import { resolveAuthUser } from '../lib/auth.js';
import { withApiErrorBoundary } from '../lib/observability.js';
import { getSubscriptionByUserId, upsertSubscription } from '../lib/subscription-store.js';
import { json } from '../lib/http.js';
import { resolveSafeOrigin } from '../lib/origin.js';
import { looksMaskedKey, normalizeSecretKey } from '../lib/stripe-key.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';

const PLAN_TO_ENV = {
  weekly: 'STRIPE_PRICE_ID_WEEKLY',
  monthly: 'STRIPE_PRICE_ID_MONTHLY',
  annual: 'STRIPE_PRICE_ID_YEARLY',
  monthly_trial: 'STRIPE_PRICE_ID_MONTHLY_TRIAL',
  annual_trial: 'STRIPE_PRICE_ID_YEARLY_TRIAL'
};

function getAction(req) {
  const raw = req.query && req.query.action;
  return String(Array.isArray(raw) ? raw[0] : raw || '').trim().toLowerCase();
}

function toIso(input) {
  const unixSeconds = Number(input);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function canAccessBillingPortal(subscriptionRow) {
  if (!subscriptionRow) return false;
  const status = subscriptionRow.subscription_status
    ? String(subscriptionRow.subscription_status).toLowerCase()
    : 'free';
  if (status === 'free') return false;
  return Boolean(subscriptionRow.stripe_customer_id && subscriptionRow.stripe_subscription_id);
}

function canCancelNow(subscriptionRow) {
  if (!subscriptionRow) return false;
  const status = subscriptionRow.subscription_status
    ? String(subscriptionRow.subscription_status).toLowerCase()
    : 'free';
  if (status === 'free' || status === 'canceled') return false;
  return Boolean(subscriptionRow.stripe_subscription_id && subscriptionRow.stripe_customer_id);
}

async function stripePost(path, secretKey, body) {
  const response = await fetch(`https://api.stripe.com${path}`, {
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
    const err = new Error(stripeErr.message || 'Stripe request failed.');
    err.stripeType = stripeErr.type || '';
    err.stripeCode = stripeErr.code || '';
    err.stripeParam = stripeErr.param || '';
    throw err;
  }
  return data;
}

async function stripeDelete(path, secretKey) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    const stripeErr = data && data.error ? data.error : {};
    const err = new Error(stripeErr.message || 'Unable to process Stripe request.');
    err.stripeType = stripeErr.type || '';
    err.stripeCode = stripeErr.code || '';
    err.stripeParam = stripeErr.param || '';
    throw err;
  }
  return data;
}

function humanizeCheckoutError(err) {
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
    return 'Stripe price ID was not found. Verify STRIPE_PRICE_ID_WEEKLY/MONTHLY/YEARLY (and optional *_TRIAL IDs) are real price_ IDs in the same Stripe mode (live vs test) as STRIPE_SECRET_KEY.';
  }
  if (code === 'invalid_request_error' && param.includes('line_items')) {
    return 'Stripe price ID is invalid for this request. Verify the selected plan env var points to a recurring price_ ID.';
  }

  return 'Unable to create checkout session.';
}

function humanizeBillingPortalError(err) {
  const code = err && err.stripeCode ? err.stripeCode : '';
  const type = err && err.stripeType ? err.stripeType : '';

  if (code === 'api_key_expired' || type === 'authentication_error') {
    return 'Stripe key is invalid or expired. Update STRIPE_SECRET_KEY in Vercel environment variables.';
  }
  if (type === 'permission_error') {
    return 'Stripe key lacks permission for billing portal sessions. Use a full secret key or grant billing portal permissions.';
  }

  return 'Unable to create billing portal session.';
}

function humanizeCancelError(err) {
  const code = err && err.stripeCode ? err.stripeCode : '';
  const type = err && err.stripeType ? err.stripeType : '';

  if (code === 'api_key_expired' || type === 'authentication_error') {
    return 'Stripe key is invalid or expired. Update STRIPE_SECRET_KEY in Vercel environment variables.';
  }
  if (type === 'permission_error') {
    return 'Stripe key lacks permission to cancel subscriptions.';
  }

  return 'Unable to cancel subscription.';
}

async function handleCheckout(req, res, auth, secretKey) {
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

  const plan = (req.body && req.body.plan ? String(req.body.plan) : 'monthly').toLowerCase();
  const envName = PLAN_TO_ENV[plan];
  if (!envName) {
    return json(res, 400, { error: 'Invalid plan. Use weekly, monthly, annual, monthly_trial, or annual_trial.' });
  }

  const priceId = process.env[envName];
  if (!priceId) {
    return json(res, 500, { error: `Missing ${envName} environment variable.` });
  }

  const origin = resolveSafeOrigin(req);
  const successUrl = `${origin}/?checkout=success&plan=${encodeURIComponent(plan)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/?checkout=cancel&plan=${encodeURIComponent(plan)}`;

  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('line_items[0][price]', priceId);
  body.set('line_items[0][quantity]', '1');
  body.set('allow_promotion_codes', 'true');
  body.set('client_reference_id', auth.user.id);
  body.set('metadata[userId]', auth.user.id);
  body.set('metadata[plan]', plan);
  body.set('subscription_data[metadata][userId]', auth.user.id);
  if (auth.user.email) {
    body.set('customer_email', auth.user.email);
  }

  try {
    const session = await stripePost('/v1/checkout/sessions', secretKey, body);
    return json(res, 200, { url: session.url, id: session.id });
  } catch (err) {
    return json(res, 500, { error: humanizeCheckoutError(err) });
  }
}

async function handleBillingPortal(req, res, auth, secretKey) {
  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/create-billing-portal-session:ip',
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

  const userRateLimit = await checkRateLimit({
    req,
    namespace: 'api/create-billing-portal-session:user',
    identifier: auth.user.id,
    limit: 12,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, userRateLimit);
  if (!userRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many billing portal requests. Please wait and try again.',
      retryAfterSeconds: userRateLimit.retryAfterSeconds
    });
  }

  const subscription = await getSubscriptionByUserId(auth.user.id);
  if (!subscription.ok && !subscription.disabled) {
    return json(res, 500, { error: subscription.error || 'Unable to fetch subscription record.' });
  }

  const row = subscription.ok ? subscription.data : null;
  if (!canAccessBillingPortal(row)) {
    return json(res, 403, { error: 'Billing portal is available after you start a paid subscription.' });
  }

  const origin = resolveSafeOrigin(req);
  const body = new URLSearchParams();
  body.set('customer', String(row.stripe_customer_id));
  body.set('return_url', `${origin}/?billing=return`);

  try {
    const portalSession = await stripePost('/v1/billing_portal/sessions', secretKey, body);
    return json(res, 200, { url: portalSession.url, id: portalSession.id });
  } catch (err) {
    return json(res, 500, { error: humanizeBillingPortalError(err) });
  }
}

async function handleCancel(req, res, auth, secretKey) {
  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/cancel-subscription-now:ip',
    limit: 20,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many requests. Please try again shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const userRateLimit = await checkRateLimit({
    req,
    namespace: 'api/cancel-subscription-now:user',
    identifier: auth.user.id,
    limit: 5,
    windowMs: 10 * 60_000
  });
  applyRateLimitHeaders(res, userRateLimit);
  if (!userRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many cancellation attempts. Please wait and try again.',
      retryAfterSeconds: userRateLimit.retryAfterSeconds
    });
  }

  const subscription = await getSubscriptionByUserId(auth.user.id);
  if (!subscription.ok) {
    return json(res, 500, { error: subscription.error || 'Unable to fetch subscription record.' });
  }

  const row = subscription.data;
  if (!canCancelNow(row)) {
    return json(res, 409, { error: 'No active paid subscription found to cancel.' });
  }

  try {
    const canceled = await stripeDelete(`/v1/subscriptions/${encodeURIComponent(row.stripe_subscription_id)}`, secretKey);

    const canceledStatus = canceled && canceled.status ? String(canceled.status).toLowerCase() : 'canceled';
    await upsertSubscription({
      userId: auth.user.id,
      email: auth.user.email,
      isPremium: false,
      subscriptionStatus: canceledStatus,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      lastEventId: row.last_event_id || null
    });

    return json(res, 200, {
      ok: true,
      subscriptionStatus: canceledStatus,
      canceledAt: toIso(canceled && canceled.canceled_at),
      currentPeriodEnd: toIso(canceled && canceled.current_period_end)
    });
  } catch (err) {
    return json(res, 500, { error: humanizeCancelError(err) });
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const action = getAction(req);
  if (!action) {
    return json(res, 400, { error: 'Missing action query parameter.' });
  }

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const secretKey = normalizeSecretKey(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY environment variable.' });
  }
  if (looksMaskedKey(secretKey)) {
    return json(res, 500, { error: 'STRIPE_SECRET_KEY appears masked or incomplete. Paste the full key from Stripe API Keys.' });
  }

  if (action === 'checkout') {
    return handleCheckout(req, res, auth, secretKey);
  }
  if (action === 'billing-portal') {
    return handleBillingPortal(req, res, auth, secretKey);
  }
  if (action === 'cancel') {
    return handleCancel(req, res, auth, secretKey);
  }

  return json(res, 400, { error: 'Invalid action. Use checkout, billing-portal, or cancel.' });
}

export default withApiErrorBoundary('api/subscription', handler);
