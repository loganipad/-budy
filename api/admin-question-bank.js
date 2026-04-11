import { resolveAuthUser } from '../lib/auth.js';
import { withApiErrorBoundary } from '../lib/observability.js';
import { json } from '../lib/http.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';
import { loadQuestionBank } from '../lib/question-bank.js';

function parseAdminEmails(rawValue) {
  return new Set(
    String(rawValue || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function toAdminRow(question) {
  return {
    id: question.id,
    subject: question.section,
    domain: question.domain,
    skill: question.skill,
    difficulty: question.difficulty,
    estimatedSeconds: question.estimated_time_seconds,
    format: question.format,
    prompt: question.question
  };
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/admin-question-bank:ip',
    limit: 30,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many requests. Please retry shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const adminEmails = parseAdminEmails(process.env.ADMIN_PREMIUM_EMAILS);
  const email = String(auth.user && auth.user.email ? auth.user.email : '').trim().toLowerCase();
  if (!email || !adminEmails.has(email)) {
    return json(res, 403, { error: 'Admin access required.' });
  }

  const bank = await loadQuestionBank();
  const rows = [...bank.english, ...bank.math].map(toAdminRow);

  res.setHeader('Cache-Control', 'private, max-age=60');
  return json(res, 200, { rows, total: rows.length });
}

export default withApiErrorBoundary('api/admin-question-bank', handler);
