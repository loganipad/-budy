const PLAN_TO_ENV = {
  weekly: 'STRIPE_PRICE_ID_WEEKLY',
  monthly: 'STRIPE_PRICE_ID_MONTHLY',
  annual: 'STRIPE_PRICE_ID_YEARLY'
};

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function normalizeSecretKey(input) {
  if (!input) return '';

  let key = String(input).trim();

  // Remove wrapping quotes if they were pasted with quotes in env vars.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Handle common typo variants like SKlive... / SKtest...
  key = key.replace(/^SKlive/i, 'sk_live_').replace(/^SKtest/i, 'sk_test_');

  return key;
}

function isLikelyValidSecretKey(key) {
  return /^sk_(live|test)_[A-Za-z0-9]+$/.test(key);
}

async function createStripeSession({ secretKey, priceId, successUrl, cancelUrl }) {
  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('line_items[0][price]', priceId);
  body.set('line_items[0][quantity]', '1');
  body.set('allow_promotion_codes', 'true');

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
    const message = data && data.error && data.error.message ? data.error.message : 'Stripe session creation failed.';
    throw new Error(message);
  }
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const secretKey = normalizeSecretKey(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY environment variable.' });
  }
  if (!isLikelyValidSecretKey(secretKey)) {
    return json(res, 500, { error: 'Invalid STRIPE_SECRET_KEY format. Use sk_live_... or sk_test_...' });
  }

  const plan = (req.body && req.body.plan ? String(req.body.plan) : 'monthly').toLowerCase();
  const envName = PLAN_TO_ENV[plan];
  if (!envName) {
    return json(res, 400, { error: 'Invalid plan. Use weekly, monthly, or annual.' });
  }

  const priceId = process.env[envName];
  if (!priceId) {
    return json(res, 500, { error: `Missing ${envName} environment variable.` });
  }

  const origin = req.headers.origin || 'https://www.budy.study';
  const successUrl = `${origin}/?checkout=success&plan=${encodeURIComponent(plan)}`;
  const cancelUrl = `${origin}/?checkout=cancel&plan=${encodeURIComponent(plan)}`;

  try {
    const session = await createStripeSession({
      secretKey,
      priceId,
      successUrl,
      cancelUrl
    });
    return json(res, 200, { url: session.url, id: session.id });
  } catch (err) {
    return json(res, 500, { error: 'Unable to create checkout session. Check Stripe key and price IDs.' });
  }
}
