import { resolveAuthUser } from '../lib/auth.js';
import { withApiErrorBoundary } from '../lib/observability.js';
import { getSubscriptionByUserId } from '../lib/subscription-store.js';
import { json } from '../lib/http.js';
import { normalizeSecretKey } from '../lib/stripe-key.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';

function toIso(input) {
  const unixSeconds = Number(input);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function parseAdminEmails(rawValue) {
  return String(rawValue || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

async function getStripeSubscriptionDetails(secretKey, subscriptionId) {
  const id = String(subscriptionId || '').trim();
  if (!secretKey || !id) return null;

  try {
    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    if (!response.ok) return null;

    const data = await response.json();
    return {
      status: data && data.status ? String(data.status).toLowerCase() : '',
      cancelAtPeriodEnd: Boolean(data && data.cancel_at_period_end),
      currentPeriodEnd: toIso(data && data.current_period_end),
      cancelAt: toIso(data && data.cancel_at),
      canceledAt: toIso(data && data.canceled_at)
    };
  } catch {
    return null;
  }
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/me:ip',
    limit: 80,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many requests. Please retry shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const userRateLimit = await checkRateLimit({
    req,
    namespace: 'api/me:user',
    identifier: auth.user.id,
    limit: 60,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, userRateLimit);
  if (!userRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many account status checks. Please wait and try again.',
      retryAfterSeconds: userRateLimit.retryAfterSeconds
    });
  }

  const record = await getSubscriptionByUserId(auth.user.id);
  if (!record.ok && !record.disabled) {
    return json(res, 500, { error: 'Unable to fetch subscription.' });
  }

  const row = record.ok ? record.data : null;

  const dbStatus = row && row.subscription_status ? String(row.subscription_status).toLowerCase() : 'free';
  const dbIsPremium = Boolean(row && row.is_premium);
  const stripeSecretKey = normalizeSecretKey(process.env.STRIPE_SECRET_KEY);
  const stripeDetails = await getStripeSubscriptionDetails(
    stripeSecretKey,
    row && row.stripe_subscription_id ? row.stripe_subscription_id : ''
  );

  const status = stripeDetails && stripeDetails.status
    ? stripeDetails.status
    : (dbIsPremium && (!dbStatus || dbStatus === 'free') ? 'active' : dbStatus);
  const adminEmails = parseAdminEmails(process.env.ADMIN_PREMIUM_EMAILS);
  const isAdmin = adminEmails.includes(String(auth.user.email || '').trim().toLowerCase());
  const isPremium = dbIsPremium || status === 'active' || status === 'trialing';

  return json(res, 200, {
    userId: auth.user.id,
    email: auth.user.email || '',
    isAdmin,
    isPremium,
    subscriptionStatus: status,
    cancelAtPeriodEnd: Boolean(stripeDetails && stripeDetails.cancelAtPeriodEnd),
    currentPeriodEnd: stripeDetails && stripeDetails.currentPeriodEnd ? stripeDetails.currentPeriodEnd : null,
    cancelAt: stripeDetails && stripeDetails.cancelAt ? stripeDetails.cancelAt : null,
    canceledAt: stripeDetails && stripeDetails.canceledAt ? stripeDetails.canceledAt : null,
    hasStore: !record.disabled
  });
}

export default withApiErrorBoundary('api/me', handler);
