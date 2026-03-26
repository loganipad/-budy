import { resolveAuthUser } from './_auth.js';
import { withApiErrorBoundary } from './_observability.js';
import { getSubscriptionByUserId } from './_subscription-store.js';

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function normalizeSecretKey(input) {
  if (!input) return '';

  let key = String(input).trim();
  const assignMatch = key.match(/^[A-Za-z_][A-Za-z0-9_]*=(.+)$/);
  if (assignMatch) key = assignMatch[1].trim();

  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  key = key.replace(/^Bearer\s+/i, '');
  key = key
    .replace(/^sklive_?/i, 'sk_live_')
    .replace(/^sktest_?/i, 'sk_test_')
    .replace(/^sk[_-]?live_?/i, 'sk_live_')
    .replace(/^sk[_-]?test_?/i, 'sk_test_');

  return key;
}

function toIso(input) {
  const unixSeconds = Number(input);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return null;
  return new Date(unixSeconds * 1000).toISOString();
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

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const record = await getSubscriptionByUserId(auth.user.id);
  if (!record.ok && !record.disabled) {
    return json(res, 500, { error: record.error || 'Unable to fetch subscription.' });
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
  const isPremium = dbIsPremium || status === 'active' || status === 'trialing';

  return json(res, 200, {
    userId: auth.user.id,
    email: auth.user.email || '',
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
