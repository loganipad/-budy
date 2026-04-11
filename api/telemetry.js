import { logTelemetryEvent, withApiErrorBoundary } from '../lib/observability.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';

const ALLOWED_TYPES = new Set([
  'pageview',
  'interaction',
  'page_timing',
  'client_error',
  'unhandled_rejection',
  'session_hidden',
  'custom_event'
]);

function end(res, status, payload) {
  res.status(status);
  if (payload == null) {
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return end(res, 204, null);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return end(res, 405, { error: 'Method Not Allowed' });
  }

  const rateLimit = await checkRateLimit({
    req,
    namespace: 'api/telemetry:ip',
    limit: 240,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, rateLimit);
  if (!rateLimit.ok) {
    return end(res, 429, {
      error: 'Too many telemetry events. Please retry later.',
      retryAfterSeconds: rateLimit.retryAfterSeconds
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const type = body && body.type ? String(body.type).trim() : '';

  if (!ALLOWED_TYPES.has(type)) {
    return end(res, 400, { error: 'Unsupported telemetry type.' });
  }

  logTelemetryEvent(type, req, body.payload || {}, body.context || {});
  return end(res, 204, null);
}

export default withApiErrorBoundary('api/telemetry', handler);