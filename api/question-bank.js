import { withApiErrorBoundary } from '../lib/observability.js';
import { json } from '../lib/http.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';
import { loadQuestionBank, toPublicQuestion } from '../lib/question-bank.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const rateLimit = await checkRateLimit({
    req,
    namespace: 'api/question-bank:ip',
    limit: 80,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, rateLimit);
  if (!rateLimit.ok) {
    return json(res, 429, {
      error: 'Too many question bank requests. Please retry shortly.',
      retryAfterSeconds: rateLimit.retryAfterSeconds
    });
  }

  // Public GET: prompts and metadata only via toPublicQuestion (no answers). Guest practice
  // tests on the landing page load this without a Bearer token.
  const section = String(req.query && req.query.section ? req.query.section : 'all').trim().toLowerCase();
  const bank = await loadQuestionBank();

  const english = bank.english.map(toPublicQuestion);
  const math = bank.math.map(toPublicQuestion);

  res.setHeader('Cache-Control', 'public, max-age=120');

  if (section === 'english') {
    return json(res, 200, { english, math: [], total: english.length });
  }
  if (section === 'math') {
    return json(res, 200, { english: [], math, total: math.length });
  }

  return json(res, 200, {
    english,
    math,
    total: english.length + math.length
  });
}

export default withApiErrorBoundary('api/question-bank', handler);
