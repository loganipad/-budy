import { resolveAuthUser } from './lib/auth.js';
import { withApiErrorBoundary } from './lib/observability.js';
import { getSubscriptionByUserId } from './lib/subscription-store.js';
import { json } from './lib/http.js';
import { resolveSafeOrigin } from './lib/origin.js';
import { looksMaskedKey, normalizeSecretKey } from './lib/stripe-key.js';

async function stripeRequest(path, secretKey, body) {
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
    throw err;
  }

  return data;
}

function canAccessBillingPortal(subscriptionRow) {
  if (!subscriptionRow) return false;

  const status = subscriptionRow.subscription_status
    ? String(subscriptionRow.subscription_status).toLowerCase()
    : 'free';

  if (status === 'free') return false;

  const hasStripeIds = Boolean(subscriptionRow.stripe_customer_id && subscriptionRow.stripe_subscription_id);
  return hasStripeIds;
}

function humanizeStripeError(err) {
  const code = err && err.stripeCode ? err.stripeCode : '';
  const type = err && err.stripeType ? err.stripeType : '';

  if (code === 'api_key_expired' || type === 'authentication_error') {
    return 'Stripe key is invalid or expired. Update STRIPE_SECRET_KEY in Vercel environment variables.';
  }
  if (type === 'permission_error') {
    return 'Stripe key lacks permission for billing portal sessions. Use a full secret key or grant billing portal permissions.';
  }

  return err && err.message ? err.message : 'Unable to create billing portal session.';
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
  if (!subscription.ok && !subscription.disabled) {
    return json(res, 500, { error: subscription.error || 'Unable to fetch subscription record.' });
  }

  const row = subscription.ok ? subscription.data : null;
  if (!canAccessBillingPortal(row)) {
    return json(res, 403, { error: 'Billing portal is available after you start a paid subscription.' });
  }

  const customerId = String(row.stripe_customer_id);

  const origin = resolveSafeOrigin(req);
  const returnUrl = `${origin}/?billing=return`;
  const body = new URLSearchParams();
  body.set('customer', customerId);
  body.set('return_url', returnUrl);

  try {
    const portalSession = await stripeRequest('/v1/billing_portal/sessions', secretKey, body);
    return json(res, 200, { url: portalSession.url, id: portalSession.id });
  } catch (err) {
    return json(res, 500, { error: humanizeStripeError(err) });
  }
}

export default withApiErrorBoundary('api/create-billing-portal-session', handler);
