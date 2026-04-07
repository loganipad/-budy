import { supabaseRequest } from './_supabase-rest.js';

const AI_DEEP_DIVE_STORE_DISABLED_ERROR = 'AI Deep Dive credit store is not configured.';

async function request(path, options) {
  return supabaseRequest(path, options, {
    disabledError: AI_DEEP_DIVE_STORE_DISABLED_ERROR
  });
}

export function getMonthlyCreditLimit() {
  const parsed = Number.parseInt(process.env.AI_DEEP_DIVE_PRO_CREDITS || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
}

export function getCurrentPeriodKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function getDeepDiveUsage(userId, periodKey = getCurrentPeriodKey()) {
  const id = String(userId || '').trim();
  const period = String(periodKey || '').trim();
  if (!id) return { ok: false, error: 'Missing user id.' };
  if (!period) return { ok: false, error: 'Missing period key.' };

  const path = `/rest/v1/ai_deep_dive_usage?user_id=eq.${encodeURIComponent(id)}&period_key=eq.${encodeURIComponent(period)}&select=user_id,email,period_key,used_count,credit_limit,updated_at&limit=1`;
  const result = await request(path, { method: 'GET' });
  if (!result.ok) return result;

  const row = Array.isArray(result.data) ? result.data[0] || null : null;
  return { ok: true, data: row };
}

export async function upsertDeepDiveUsage(input) {
  const userId = String(input && input.userId ? input.userId : '').trim();
  const periodKey = String(input && input.periodKey ? input.periodKey : '').trim();
  if (!userId) return { ok: false, error: 'Missing user id.' };
  if (!periodKey) return { ok: false, error: 'Missing period key.' };

  const payload = {
    user_id: userId,
    email: input && input.email ? String(input.email).trim().toLowerCase() : null,
    period_key: periodKey,
    used_count: Math.max(0, Number(input && input.usedCount) || 0),
    credit_limit: Math.max(1, Number(input && input.creditLimit) || getMonthlyCreditLimit()),
    updated_at: new Date().toISOString()
  };

  return request('/rest/v1/ai_deep_dive_usage?on_conflict=user_id,period_key', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify([payload])
  });
}

export async function consumeDeepDiveCredit(input) {
  const userId = String(input && input.userId ? input.userId : '').trim();
  const periodKey = String(input && input.periodKey ? input.periodKey : getCurrentPeriodKey()).trim();
  const creditLimit = Math.max(1, Number(input && input.creditLimit) || getMonthlyCreditLimit());
  if (!userId) return { ok: false, error: 'Missing user id.' };

  const existing = await getDeepDiveUsage(userId, periodKey);
  if (!existing.ok) return existing;

  const usedCount = Math.max(0, Number(existing.data && existing.data.used_count) || 0) + 1;
  const writeResult = await upsertDeepDiveUsage({
    userId,
    email: input && input.email ? input.email : '',
    periodKey,
    usedCount,
    creditLimit
  });

  if (!writeResult.ok) return writeResult;

  return {
    ok: true,
    data: {
      periodKey,
      usedCount,
      creditLimit,
      remainingCredits: Math.max(0, creditLimit - usedCount)
    }
  };
}