import { buildCreateAttemptPayload, buildListAttemptsPath } from './_score-store-core.mjs';

function getConfig() {
  const baseUrl = process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    enabled: Boolean(baseUrl && serviceRoleKey),
    baseUrl: baseUrl.replace(/\/$/, ''),
    serviceRoleKey
  };
}

function headers(serviceRoleKey, extra) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...(extra || {})
  };
}

async function request(path, options) {
  const cfg = getConfig();
  if (!cfg.enabled) {
    return { ok: false, disabled: true, error: 'Score store is not configured.' };
  }

  try {
    const response = await fetch(`${cfg.baseUrl}${path}`, {
      ...options,
      headers: headers(cfg.serviceRoleKey, options && options.headers)
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data && data.message ? data.message : 'Supabase request failed.',
        data
      };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Supabase request failed.' };
  }
}

export async function listAttemptsByUserId(userId, limit = 100) {
  let path;
  try {
    path = buildListAttemptsPath(userId, limit);
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Missing user id.' };
  }

  return request(path, { method: 'GET' });
}

export async function createAttempt(input) {
  let payload;
  try {
    payload = buildCreateAttemptPayload(input);
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Missing user id.' };
  }

  const path = '/rest/v1/user_test_attempts';
  return request(path, {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify([payload])
  });
}
