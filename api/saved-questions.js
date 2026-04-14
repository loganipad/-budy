import { resolveAuthUser } from '../lib/auth.js';
import { withApiErrorBoundary } from '../lib/observability.js';
import { listSavedQuestionsByUserId, upsertSavedQuestions } from '../lib/saved-question-store.js';
import { normalizeSavedQuestionRow } from '../lib/saved-questions-utils.mjs';
import { json } from '../lib/http.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/saved-questions:ip',
    limit: 80,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many requests. Please try again shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const userRateLimit = await checkRateLimit({
    req,
    namespace: 'api/saved-questions:user',
    identifier: auth.user.id,
    limit: 60,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, userRateLimit);
  if (!userRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many saved question actions. Please wait and try again.',
      retryAfterSeconds: userRateLimit.retryAfterSeconds
    });
  }

  if (req.method === 'GET') {
    const result = await listSavedQuestionsByUserId(auth.user.id, 200);
    if (!result.ok) {
      const status = result.disabled ? 503 : 500;
      return json(res, status, { error: 'Unable to fetch saved questions.', disabled: Boolean(result.disabled) });
    }

    const questions = Array.isArray(result.data) ? result.data.map(normalizeSavedQuestionRow) : [];
    return json(res, 200, { questions });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const items = Array.isArray(body.questions) ? body.questions : [];
  const saveResult = await upsertSavedQuestions(auth.user.id, items);

  if (!saveResult.ok) {
    const status = saveResult.disabled ? 503 : 500;
    return json(res, status, { error: 'Unable to save questions.', disabled: Boolean(saveResult.disabled) });
  }

  const questions = Array.isArray(saveResult.data) ? saveResult.data.map(normalizeSavedQuestionRow) : [];
  return json(res, 201, { questions });
}

export default withApiErrorBoundary('api/saved-questions', handler);