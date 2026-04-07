import { supabaseRequest } from './supabase-rest.js';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

const SUBSCRIPTION_STORE_DISABLED_ERROR = 'Subscription store is not configured.';

function isPremiumFromStatus(status) {
  const normalized = String(status || '').toLowerCase();
  return ACTIVE_STATUSES.has(normalized);
}

async function request(path, options) {
  return supabaseRequest(path, options, {
    disabledError: SUBSCRIPTION_STORE_DISABLED_ERROR
  });
}

export async function getSubscriptionByUserId(userId) {
  const id = String(userId || '').trim();
  if (!id) return { ok: false, error: 'Missing user id.' };

  const path = `/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(id)}&select=user_id,email,is_premium,subscription_status,stripe_customer_id,stripe_subscription_id,last_event_id,updated_at&limit=1`;
  const result = await request(path, { method: 'GET' });
  if (!result.ok) return result;

  const row = Array.isArray(result.data) ? result.data[0] || null : null;
  return { ok: true, data: row };
}

export async function getSubscriptionByStripeCustomerId(customerId) {
  const id = String(customerId || '').trim();
  if (!id) return { ok: false, error: 'Missing customer id.' };

  const path = `/rest/v1/user_subscriptions?stripe_customer_id=eq.${encodeURIComponent(id)}&select=user_id,email,is_premium,subscription_status,stripe_customer_id,stripe_subscription_id,last_event_id,updated_at&limit=1`;
  const result = await request(path, { method: 'GET' });
  if (!result.ok) return result;

  const row = Array.isArray(result.data) ? result.data[0] || null : null;
  return { ok: true, data: row };
}

export async function upsertSubscription(input) {
  const userId = String(input && input.userId ? input.userId : '').trim();
  if (!userId) return { ok: false, error: 'Missing user id.' };

  const subscriptionStatus = String(input && input.subscriptionStatus ? input.subscriptionStatus : '').toLowerCase();
  const isPremium = typeof input.isPremium === 'boolean' ? input.isPremium : isPremiumFromStatus(subscriptionStatus);

  const payload = {
    user_id: userId,
    email: input && input.email ? String(input.email).trim().toLowerCase() : null,
    is_premium: isPremium,
    subscription_status: subscriptionStatus || null,
    stripe_customer_id: input && input.stripeCustomerId ? String(input.stripeCustomerId) : null,
    stripe_subscription_id: input && input.stripeSubscriptionId ? String(input.stripeSubscriptionId) : null,
    last_event_id: input && input.lastEventId ? String(input.lastEventId) : null,
    updated_at: new Date().toISOString()
  };

  const path = '/rest/v1/user_subscriptions?on_conflict=user_id';
  return request(path, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify([payload])
  });
}

export async function markEventProcessed(eventId, eventType, userId) {
  const id = String(eventId || '').trim();
  if (!id) return { ok: false, error: 'Missing event id.' };

  const path = '/rest/v1/stripe_event_log?on_conflict=event_id';
  const payload = [{
    event_id: id,
    event_type: eventType || null,
    user_id: userId || null,
    processed_at: new Date().toISOString()
  }];

  const result = await request(path, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=ignore-duplicates,return=minimal'
    },
    body: JSON.stringify(payload)
  });

  return result;
}

export { isPremiumFromStatus };
