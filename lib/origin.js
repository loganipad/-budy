const DEFAULT_ALLOWED_ORIGINS = 'https://www.budy.study,https://budy.study,http://localhost:3000,http://localhost:5173';

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesOriginPattern(origin, pattern) {
  if (!origin || !pattern) return false;
  if (origin === pattern) return true;
  if (!pattern.includes('*')) return false;

  const regex = new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, '[^.]+')}$`, 'i');
  return regex.test(origin);
}

export function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS;
  const deduped = new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
  return Array.from(deduped);
}

export function isAllowedOrigin(origin, allowedOrigins = getAllowedOrigins()) {
  const candidate = String(origin || '').trim();
  if (!candidate) return false;

  return allowedOrigins.some((pattern) => matchesOriginPattern(candidate, pattern));
}

export function getOriginFromReferer(referer) {
  try {
    return referer ? new URL(referer).origin : '';
  } catch {
    return '';
  }
}

export function resolveSafeOrigin(req) {
  const allowed = getAllowedOrigins();
  const requestOrigin = req.headers.origin || '';
  const refererOrigin = getOriginFromReferer(req.headers.referer || '');
  const candidate = requestOrigin || refererOrigin;

  if (isAllowedOrigin(candidate, allowed)) {
    return candidate;
  }

  return allowed[0] || 'https://www.budy.study';
}
