function truncate(value, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function sanitizeValue(value, depth = 0) {
  if (depth > 4) return '[max-depth]';
  if (value == null) return null;

  if (typeof value === 'string') {
    return truncate(
      value
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
        .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]'),
      400
    );
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeValue(entry, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.entries(value).slice(0, 20).reduce((acc, [key, entry]) => {
      if (/(password|token|secret|authorization|cookie)/i.test(key)) {
        acc[key] = '[redacted]';
        return acc;
      }

      acc[key] = sanitizeValue(entry, depth + 1);
      return acc;
    }, {});
  }

  return truncate(String(value), 200);
}

function getRequestContext(req) {
  const headers = req && req.headers ? req.headers : {};
  return {
    method: truncate(req && req.method ? String(req.method) : '', 16),
    path: truncate(req && req.url ? String(req.url) : '', 200),
    userAgent: truncate(String(headers['user-agent'] || ''), 240),
    requestId: truncate(String(headers['x-vercel-id'] || headers['x-request-id'] || ''), 120),
    origin: truncate(String(headers.origin || ''), 200),
    referer: truncate(String(headers.referer || ''), 200)
  };
}

export function logTelemetryEvent(type, req, payload, context) {
  const event = {
    kind: 'telemetry',
    type: truncate(type, 64),
    receivedAt: new Date().toISOString(),
    request: getRequestContext(req),
    context: sanitizeValue(context || {}),
    payload: sanitizeValue(payload || {})
  };

  console.log(JSON.stringify(event));
}

export function captureApiError(routeName, req, error, extra = {}) {
  const event = {
    kind: 'api_error',
    route: truncate(routeName || 'unknown', 120),
    capturedAt: new Date().toISOString(),
    request: getRequestContext(req),
    error: {
      name: truncate(error && error.name ? String(error.name) : 'Error', 120),
      message: truncate(error && error.message ? String(error.message) : 'Unhandled server error', 400),
      stack: sanitizeValue(error && error.stack ? String(error.stack) : '')
    },
    extra: sanitizeValue(extra)
  };

  console.error(JSON.stringify(event));
}

export function withApiErrorBoundary(routeName, handler) {
  return async function wrappedHandler(req, res) {
    try {
      return await handler(req, res);
    } catch (error) {
      captureApiError(routeName, req, error);

      if (res.headersSent) {
        try {
          res.end();
        } catch (_) {}
        return;
      }

      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  };
}