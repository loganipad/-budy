function getSupabaseConfig() {
  const baseUrl = process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    enabled: Boolean(baseUrl && serviceRoleKey),
    baseUrl: baseUrl.replace(/\/$/, ''),
    serviceRoleKey
  };
}

function withServiceRoleHeaders(serviceRoleKey, extra) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...(extra || {})
  };
}

export async function supabaseRequest(path, options, config = {}) {
  const cfg = getSupabaseConfig();
  const disabledError = config.disabledError || 'Supabase store is not configured.';
  const requestError = config.requestError || 'Supabase request failed.';

  if (!cfg.enabled) {
    return { ok: false, disabled: true, error: disabledError };
  }

  try {
    const response = await fetch(`${cfg.baseUrl}${path}`, {
      ...options,
      headers: withServiceRoleHeaders(cfg.serviceRoleKey, options && options.headers)
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
        error: data && data.message ? data.message : requestError,
        data
      };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, error: requestError };
  }
}
