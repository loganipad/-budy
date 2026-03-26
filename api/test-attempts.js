import { resolveAuthUser } from './_auth.js';
import { withApiErrorBoundary } from './_observability.js';
import { createAttempt, listAttemptsByUserId } from './_score-store.js';

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function normalizeAttemptRow(row) {
  return {
    id: row && row.id ? String(row.id) : '',
    date: row && row.created_at ? String(row.created_at) : new Date().toISOString(),
    section: row && row.section ? String(row.section) : 'unknown',
    total: Number(row && row.total_score ? row.total_score : 0),
    correct: Number(row && row.correct_count ? row.correct_count : 0),
    total_q: Number(row && row.total_questions ? row.total_questions : 0),
    skillMap: row && row.skill_breakdown && typeof row.skill_breakdown === 'object' ? row.skill_breakdown : {}
  };
}

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const result = await listAttemptsByUserId(auth.user.id, 200);
    if (!result.ok) {
      const status = result.disabled ? 503 : 500;
      return json(res, status, { error: result.error || 'Unable to fetch attempts.', disabled: Boolean(result.disabled) });
    }

    const attempts = Array.isArray(result.data) ? result.data.map(normalizeAttemptRow) : [];
    return json(res, 200, { attempts });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const createResult = await createAttempt({
    userId: auth.user.id,
    section: body.section,
    totalScore: body.total,
    correctCount: body.correct,
    totalQuestions: body.total_q,
    skillBreakdown: body.skillMap,
    source: 'web',
    createdAt: body.date
  });

  if (!createResult.ok) {
    const status = createResult.disabled ? 503 : 500;
    return json(res, status, { error: createResult.error || 'Unable to save attempt.', disabled: Boolean(createResult.disabled) });
  }

  const createdRow = Array.isArray(createResult.data) ? createResult.data[0] || null : null;
  return json(res, 201, { attempt: normalizeAttemptRow(createdRow) });
}

export default withApiErrorBoundary('api/test-attempts', handler);
