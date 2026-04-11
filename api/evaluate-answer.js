import { withApiErrorBoundary } from '../lib/observability.js';
import { json } from '../lib/http.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';
import { isCorrectAnswer, loadQuestionBank } from '../lib/question-bank.js';
import { verifyTestSessionToken } from '../lib/test-session-token.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/evaluate-answer:ip',
    limit: 120,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many answer checks. Please retry shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const token = String(body.token || '').trim();
  const questionId = String(body.questionId || '').trim();
  const answer = String(body.answer == null ? '' : body.answer).trim();

  if (!token || !questionId) {
    return json(res, 400, { error: 'Token and questionId are required.' });
  }

  const tokenState = verifyTestSessionToken(token);
  if (!tokenState.ok) {
    return json(res, 401, { error: tokenState.error });
  }

  const allowedIds = new Set(tokenState.payload.questionIds);
  if (!allowedIds.has(questionId)) {
    return json(res, 403, { error: 'Question is not part of this test session.' });
  }

  const bank = await loadQuestionBank();
  const question = bank.byId.get(questionId);
  if (!question) {
    return json(res, 404, { error: 'Question not found.' });
  }

  const isCorrect = isCorrectAnswer(question, answer);
  return json(res, 200, { questionId, isCorrect });
}

export default withApiErrorBoundary('api/evaluate-answer', handler);
