import { resolveAuthUser } from './lib/auth.js';
import { withApiErrorBoundary } from './lib/observability.js';
import { createAttempt, listAttemptsByUserId } from './lib/score-store.js';
import { normalizeAttemptRow } from './lib/test-attempts-utils.mjs';
import { json } from './lib/http.js';

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
