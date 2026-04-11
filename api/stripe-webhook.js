import crypto from 'node:crypto';
import {
  getSubscriptionByStripeCustomerId,
  isPremiumFromStatus,
  markEventProcessed,
  upsertSubscription
} from '../lib/subscription-store.js';
import { logOperationalEvent, withApiErrorBoundary } from '../lib/observability.js';
import { json } from '../lib/http.js';

export const config = {
  api: {
    bodyParser: false
  }
};

function timingSafeEquals(a, b) {
  const aa = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function parseStripeSignature(signatureHeader) {
  const result = { t: '', v1: [] };
  if (!signatureHeader) return result;

  String(signatureHeader)
    .split(',')
    .map((part) => part.trim())
    .forEach((part) => {
      const [key, value] = part.split('=');
      if (key === 't') result.t = value || '';
      if (key === 'v1' && value) result.v1.push(value);
    });

  return result;
}

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function verifyStripeSignature(rawBody, signatureHeader, webhookSecret) {
  const parsed = parseStripeSignature(signatureHeader);
  if (!parsed.t || !parsed.v1.length) return false;

  const timestamp = Number(parsed.t);
  if (!Number.isFinite(timestamp)) return false;

  const toleranceSeconds = Math.max(60, Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS) || 300);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${parsed.t}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return parsed.v1.some((sig) => timingSafeEquals(sig, expected));
}

async function getLatestStripeSubscription(subscriptionId, secretKey) {
  const id = String(subscriptionId || '').trim();
  if (!id || !secretKey) return null;

  try {
    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function getUserIdFromEvent(event) {
  const object = event && event.data ? event.data.object : null;
  if (!object) return '';

  const fromMetadata = object.metadata && object.metadata.userId ? String(object.metadata.userId).trim() : '';
  const fromReference = object.client_reference_id ? String(object.client_reference_id).trim() : '';
  return fromMetadata || fromReference;
}

function getEmailFromEvent(event) {
  const object = event && event.data ? event.data.object : null;
  if (!object) return '';

  if (object.customer_details && object.customer_details.email) {
    return String(object.customer_details.email).trim().toLowerCase();
  }
  if (object.customer_email) {
    return String(object.customer_email).trim().toLowerCase();
  }
  return '';
}

async function handleCheckoutCompleted(event) {
  const session = event.data.object;
  const userId = getUserIdFromEvent(event);
  if (!userId) {
    return { ok: false, status: 400, error: 'Missing userId in checkout session metadata.' };
  }

  await upsertSubscription({
    userId,
    email: getEmailFromEvent(event),
    isPremium: true,
    subscriptionStatus: 'active',
    stripeCustomerId: session.customer ? String(session.customer) : null,
    stripeSubscriptionId: session.subscription ? String(session.subscription) : null,
    lastEventId: event.id
  });

  return { ok: true, userId };
}

async function handleSubscriptionChanged(event, secretKey) {
  const eventSubscription = event.data.object;
  const latestSubscription = await getLatestStripeSubscription(eventSubscription && eventSubscription.id, secretKey);
  const subscription = latestSubscription || eventSubscription;
  const customerId = subscription && subscription.customer ? String(subscription.customer) : '';
  let userId = getUserIdFromEvent(event);

  if (!userId && customerId) {
    const lookup = await getSubscriptionByStripeCustomerId(customerId);
    if (lookup.ok && lookup.data && lookup.data.user_id) {
      userId = String(lookup.data.user_id);
    }
  }

  if (!userId) {
    return { ok: false, status: 400, error: 'Unable to map Stripe subscription event to a user.' };
  }

  const status = subscription && subscription.status ? String(subscription.status).toLowerCase() : 'canceled';

  await upsertSubscription({
    userId,
    isPremium: isPremiumFromStatus(status),
    subscriptionStatus: status,
    stripeCustomerId: customerId || null,
    stripeSubscriptionId: subscription && subscription.id ? String(subscription.id) : null,
    lastEventId: event.id
  });

  return { ok: true, userId };
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  if (!webhookSecret) {
    logOperationalEvent('stripe_webhook_misconfigured_secret', req, {}, {
      severity: 'error',
      alert: true,
      alertType: 'webhook_failure',
      alertSummary: 'Stripe webhook secret is missing in production configuration.'
    });
    return json(res, 500, { error: 'Missing STRIPE_WEBHOOK_SECRET environment variable.' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    logOperationalEvent('stripe_webhook_missing_signature', req, {}, {
      severity: 'warn'
    });
    return json(res, 400, { error: 'Missing Stripe signature header.' });
  }

  const rawBody = await readRawBody(req);
  const isValidSignature = verifyStripeSignature(rawBody, signature, webhookSecret);
  if (!isValidSignature) {
    logOperationalEvent('stripe_webhook_invalid_signature', req, {}, {
      severity: 'warn'
    });
    return json(res, 400, { error: 'Invalid Stripe signature.' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    logOperationalEvent('stripe_webhook_invalid_json', req, {}, {
      severity: 'warn'
    });
    return json(res, 400, { error: 'Invalid webhook payload JSON.' });
  }

  const eventType = event && event.type ? String(event.type) : 'unknown';
  const dedupe = await markEventProcessed(event.id, eventType, getUserIdFromEvent(event));
  if (dedupe.ok === false && dedupe.status === 409) {
    return json(res, 200, { received: true, duplicate: true });
  }

  try {
    if (eventType === 'checkout.session.completed') {
      const result = await handleCheckoutCompleted(event);
      if (!result.ok) {
        logOperationalEvent('stripe_webhook_event_rejected', req, { eventType, eventId: event.id, reason: result.error }, {
          severity: 'warn'
        });
        return json(res, result.status || 400, { error: result.error });
      }
    } else if (eventType === 'customer.subscription.updated' || eventType === 'customer.subscription.deleted') {
      const result = await handleSubscriptionChanged(event, stripeSecretKey);
      if (!result.ok) {
        logOperationalEvent('stripe_webhook_event_rejected', req, { eventType, eventId: event.id, reason: result.error }, {
          severity: 'warn'
        });
        return json(res, result.status || 400, { error: result.error });
      }
    }

    console.log('stripe_webhook_processed', { eventType, eventId: event.id });
    return json(res, 200, { received: true });
  } catch (err) {
    const message = err && err.message ? err.message : 'Webhook processing failed.';
    logOperationalEvent('stripe_webhook_processing_failure', req, { eventType, eventId: event && event.id ? event.id : '', error: message }, {
      severity: 'error',
      alert: true,
      alertType: 'webhook_failure',
      alertSummary: `Stripe webhook processing failed for ${eventType}`
    });
    return json(res, 500, { error: message });
  }
}

export default withApiErrorBoundary('api/stripe-webhook', handler);
