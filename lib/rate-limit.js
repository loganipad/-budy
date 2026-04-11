const STORE_KEY = '__BUDY_RATE_LIMIT_STORE__';

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = {
      buckets: new Map(),
      lastSweepAt: 0
    };
  }
  return globalThis[STORE_KEY];
}

function nowMs() {
  return Date.now();
}

function sweepBuckets(store, referenceMs) {
  if (referenceMs - store.lastSweepAt < 30_000) return;
  store.lastSweepAt = referenceMs;

  for (const [key, entry] of store.buckets.entries()) {
    if (!entry || !entry.timestamps || !entry.timestamps.length) {
      store.buckets.delete(key);
      continue;
    }

    const mostRecent = entry.timestamps[entry.timestamps.length - 1];
    if (referenceMs - mostRecent > entry.windowMs) {
      store.buckets.delete(key);
    }
  }
}

export function getClientIp(req) {
  const headers = (req && req.headers) || {};
  const forwardedFor = String(headers['x-forwarded-for'] || '').trim();
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = String(headers['x-real-ip'] || '').trim();
  if (realIp) return realIp;

  const socketIp = req && req.socket ? String(req.socket.remoteAddress || '').trim() : '';
  return socketIp || 'unknown';
}

export function checkRateLimit({ req, namespace, identifier, limit, windowMs }) {
  const safeNamespace = String(namespace || 'global').trim() || 'global';
  const safeLimit = Math.max(1, Number(limit) || 1);
  const safeWindowMs = Math.max(1_000, Number(windowMs) || 60_000);
  const keyId = String(identifier || getClientIp(req) || 'unknown').trim();
  const key = `${safeNamespace}:${keyId}`;

  const store = getStore();
  const current = nowMs();
  sweepBuckets(store, current);

  const entry = store.buckets.get(key) || { windowMs: safeWindowMs, timestamps: [] };
  entry.windowMs = safeWindowMs;
  entry.timestamps = entry.timestamps.filter((ts) => current - ts < safeWindowMs);

  if (entry.timestamps.length >= safeLimit) {
    const retryAfterMs = Math.max(0, safeWindowMs - (current - entry.timestamps[0]));
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    store.buckets.set(key, entry);
    return {
      ok: false,
      key,
      limit: safeLimit,
      windowMs: safeWindowMs,
      remaining: 0,
      retryAfterSeconds
    };
  }

  entry.timestamps.push(current);
  store.buckets.set(key, entry);

  return {
    ok: true,
    key,
    limit: safeLimit,
    windowMs: safeWindowMs,
    remaining: Math.max(0, safeLimit - entry.timestamps.length),
    retryAfterSeconds: 0
  };
}

export function applyRateLimitHeaders(res, result) {
  if (!res || !result) return;

  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Window', String(result.windowMs));
  if (!result.ok && result.retryAfterSeconds > 0) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds));
  }
}
