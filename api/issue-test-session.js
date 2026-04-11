import { withApiErrorBoundary } from '../lib/observability.js';
import { json } from '../lib/http.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';
import { loadQuestionBank } from '../lib/question-bank.js';
import { createTestSessionToken } from '../lib/test-session-token.js';

function normalizeQuestionIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = value.map((entry) => String(entry || '').trim()).filter(Boolean);
  return Array.from(new Set(ids)).slice(0, 80);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/issue-test-session:ip',
    limit: 40,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many test start requests. Please retry shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const section = String(body.section || 'unknown').trim().toLowerCase();
  const questionIds = normalizeQuestionIds(body.questionIds);

  if (!questionIds.length) {
    return json(res, 400, { error: 'Question ids are required.' });
  }

  if (questionIds.length > 60) {
    return json(res, 400, { error: 'Test session cannot include more than 60 questions.' });
  }

  const bank = await loadQuestionBank();
  const unknownId = questionIds.find((id) => !bank.byId.has(id));
  if (unknownId) {
    return json(res, 400, { error: `Unknown question id: ${unknownId}` });
  }

  const tokenResult = createTestSessionToken({
    section,
    questionIds,
    expiresInSeconds: 2 * 60 * 60
  });

  return json(res, 200, {
    token: tokenResult.token,
    expiresAt: new Date(tokenResult.expiresAtMs).toISOString(),
    expiresInSeconds: tokenResult.expiresInSeconds
  });
}

export default withApiErrorBoundary('api/issue-test-session', handler);
