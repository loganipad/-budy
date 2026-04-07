const DEFAULT_ALLOWED_ORIGINS = 'https://www.budy.study,http://localhost:3000,http://localhost:5173';

export function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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

  if (candidate && allowed.includes(candidate)) {
    return candidate;
  }

  return allowed[0] || 'https://www.budy.study';
}
