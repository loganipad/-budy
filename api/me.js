import { resolveAuthUser } from './_auth.js';
import { getSubscriptionByUserId } from './_subscription-store.js';

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
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

  return json(res, 200, {
    userId: auth.user.id,
    email: auth.user.email || '',
    isPremium: Boolean(row && row.is_premium),
    subscriptionStatus: row && row.subscription_status ? row.subscription_status : 'free',
    hasStore: !record.disabled
  });
}
