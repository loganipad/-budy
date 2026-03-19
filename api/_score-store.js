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
  const id = String(userId || '').trim();
  if (!id) return { ok: false, error: 'Missing user id.' };

  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const path = `/rest/v1/user_test_attempts?user_id=eq.${encodeURIComponent(id)}&select=id,user_id,section,total_score,correct_count,total_questions,skill_breakdown,source,created_at&order=created_at.asc&limit=${safeLimit}`;
  return request(path, { method: 'GET' });
}

export async function createAttempt(input) {
  const userId = String(input && input.userId ? input.userId : '').trim();
  if (!userId) return { ok: false, error: 'Missing user id.' };

  const payload = {
    user_id: userId,
    section: input && input.section ? String(input.section) : 'unknown',
    total_score: Number.isFinite(Number(input && input.totalScore)) ? Number(input.totalScore) : 0,
    correct_count: Number.isFinite(Number(input && input.correctCount)) ? Number(input.correctCount) : 0,
    total_questions: Number.isFinite(Number(input && input.totalQuestions)) ? Number(input.totalQuestions) : 0,
    skill_breakdown: input && input.skillBreakdown && typeof input.skillBreakdown === 'object' ? input.skillBreakdown : {},
    source: input && input.source ? String(input.source) : 'web',
    created_at: input && input.createdAt ? String(input.createdAt) : new Date().toISOString()
  };

  const path = '/rest/v1/user_test_attempts';
  return request(path, {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify([payload])
  });
}
