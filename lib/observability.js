function truncate(value, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

const SPIKE_STORE_KEY = '__BUDY_OBSERVABILITY_SPIKES__';

function getSpikeStore() {
  if (!globalThis[SPIKE_STORE_KEY]) {
    globalThis[SPIKE_STORE_KEY] = new Map();
  }
  return globalThis[SPIKE_STORE_KEY];
}

function readPositiveInt(rawValue, fallback, minValue, maxValue) {
  const parsed = Number.parseInt(String(rawValue || ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minValue, Math.min(maxValue, parsed));
}

function getMonitoringConfig() {
  return {
    source: 'budy-study-api',
    ingestUrl: String(process.env.OBSERVABILITY_INGEST_URL || '').trim(),
    ingestToken: String(process.env.OBSERVABILITY_INGEST_TOKEN || '').trim(),
    alertWebhookUrl: String(process.env.OBSERVABILITY_ALERT_WEBHOOK_URL || '').trim(),
    alertSpikeThreshold: readPositiveInt(process.env.OBSERVABILITY_ALERT_SPIKE_THRESHOLD, 8, 2, 500),
    alertSpikeWindowMs: readPositiveInt(process.env.OBSERVABILITY_ALERT_SPIKE_WINDOW_MS, 300000, 10000, 3600000),
    alertCooldownMs: readPositiveInt(process.env.OBSERVABILITY_ALERT_COOLDOWN_MS, 600000, 30000, 3600000)
  };
}

async function postJson(url, payload, extraHeaders = {}) {
  if (!url) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch {
    // Intentionally swallow provider transport errors to avoid blocking API responses.
  } finally {
    clearTimeout(timeoutId);
  }
}

function recordSpikeAndCheck(key, config) {
  const now = Date.now();
  const windowStart = now - config.alertSpikeWindowMs;
  const store = getSpikeStore();
  const state = store.get(key) || { timestamps: [], lastAlertAt: 0 };

  state.timestamps = state.timestamps.filter((value) => value >= windowStart);
  state.timestamps.push(now);

  const shouldAlert =
    state.timestamps.length >= config.alertSpikeThreshold &&
    now - state.lastAlertAt >= config.alertCooldownMs;

  if (shouldAlert) {
    state.lastAlertAt = now;
  }

  store.set(key, state);
  return {
    shouldAlert,
    count: state.timestamps.length
  };
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

function shipEventToProvider(event) {
  const config = getMonitoringConfig();
  if (!config.ingestUrl) return;

  const headers = config.ingestToken
    ? { Authorization: `Bearer ${config.ingestToken}` }
    : {};

  const payload = {
    source: config.source,
    ...event
  };

  void postJson(config.ingestUrl, payload, headers);
}

function sendAlert(alertType, severity, summary, event) {
  const config = getMonitoringConfig();
  if (!config.alertWebhookUrl) return;

  const payload = {
    source: config.source,
    alertType: truncate(alertType || 'alert', 80),
    severity: truncate(severity || 'medium', 32),
    summary: truncate(summary || 'Monitoring alert', 240),
    occurredAt: new Date().toISOString(),
    event: sanitizeValue(event || {}),
    text: `[${String(severity || 'medium').toUpperCase()}] ${summary}`
  };

  void postJson(config.alertWebhookUrl, payload);
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
  shipEventToProvider(event);
}

export function logOperationalEvent(type, req, payload = {}, options = {}) {
  const severity = String(options.severity || 'info').toLowerCase();
  const event = {
    kind: 'operational',
    type: truncate(type, 80),
    severity,
    occurredAt: new Date().toISOString(),
    request: getRequestContext(req),
    payload: sanitizeValue(payload)
  };

  const line = JSON.stringify(event);
  if (severity === 'error') {
    console.error(line);
  } else if (severity === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }

  shipEventToProvider(event);

  const config = getMonitoringConfig();
  if (options.trackSpike !== false && (severity === 'warn' || severity === 'error')) {
    const spike = recordSpikeAndCheck(`operational:${event.type}`, config);
    if (spike.shouldAlert) {
      sendAlert(
        'operational_spike',
        'high',
        `Operational spike for ${event.type} (${spike.count} events in window)`,
        event
      );
    }
  }

  if (options.alert) {
    sendAlert(
      String(options.alertType || event.type),
      String(options.alertSeverity || (severity === 'error' ? 'high' : 'medium')),
      String(options.alertSummary || `Operational alert: ${event.type}`),
      event
    );
  }
}

export function logAuthFailure(reason, req, details = {}) {
  const event = {
    kind: 'auth_failure',
    reason: truncate(reason, 80),
    occurredAt: new Date().toISOString(),
    request: getRequestContext(req),
    details: sanitizeValue(details)
  };

  console.warn(JSON.stringify(event));
  shipEventToProvider(event);

  const config = getMonitoringConfig();
  const spike = recordSpikeAndCheck(`auth_failure:${event.reason}`, config);
  if (spike.shouldAlert) {
    sendAlert(
      'auth_failure_spike',
      'high',
      `Auth failures spiking for ${event.reason} (${spike.count} events in window)`,
      event
    );
  }
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
  shipEventToProvider(event);

  const config = getMonitoringConfig();
  const spike = recordSpikeAndCheck(`api_error:${event.route}`, config);
  if (spike.shouldAlert) {
    sendAlert(
      'api_error_spike',
      'high',
      `API errors spiking on ${event.route} (${spike.count} events in window)`,
      event
    );
  }

  if (event.route === 'api/stripe-webhook') {
    sendAlert('webhook_failure', 'critical', `Stripe webhook failure: ${event.error.message}`, event);
  }
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