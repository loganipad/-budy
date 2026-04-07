import { resolveAuthUser } from './lib/auth.js';
import { withApiErrorBoundary } from './lib/observability.js';
import { getSubscriptionByUserId, upsertSubscription } from './lib/subscription-store.js';
import { json } from './lib/http.js';
import { looksMaskedKey, normalizeSecretKey } from './lib/stripe-key.js';

function canCancelNow(subscriptionRow) {
  if (!subscriptionRow) return false;
  const status = subscriptionRow.subscription_status
    ? String(subscriptionRow.subscription_status).toLowerCase()
    : 'free';
  if (status === 'free' || status === 'canceled') return false;
  return Boolean(subscriptionRow.stripe_subscription_id && subscriptionRow.stripe_customer_id);
}

function toIso(input) {
  const unixSeconds = Number(input);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

async function cancelStripeSubscriptionNow(secretKey, subscriptionId) {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    const stripeErr = data && data.error ? data.error : {};
    const err = new Error(stripeErr.message || 'Unable to cancel subscription.');
    err.stripeType = stripeErr.type || '';
    err.stripeCode = stripeErr.code || '';
    throw err;
  }

  return data;
}

function humanizeStripeError(err) {
  const code = err && err.stripeCode ? err.stripeCode : '';
  const type = err && err.stripeType ? err.stripeType : '';

  if (code === 'api_key_expired' || type === 'authentication_error') {
    return 'Stripe key is invalid or expired. Update STRIPE_SECRET_KEY in Vercel environment variables.';
  }
  if (type === 'permission_error') {
    return 'Stripe key lacks permission to cancel subscriptions.';
  }

  return err && err.message ? err.message : 'Unable to cancel subscription.';
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
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

  const subscription = await getSubscriptionByUserId(auth.user.id);
  if (!subscription.ok) {
    return json(res, 500, { error: subscription.error || 'Unable to fetch subscription record.' });
  }

  const row = subscription.data;
  if (!canCancelNow(row)) {
    return json(res, 409, { error: 'No active paid subscription found to cancel.' });
  }

  try {
    const canceled = await cancelStripeSubscriptionNow(secretKey, row.stripe_subscription_id);

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
    return json(res, 500, { error: humanizeStripeError(err) });
  }
}

export default withApiErrorBoundary('api/cancel-subscription-now', handler);
