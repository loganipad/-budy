import crypto from 'node:crypto';

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const safeValue = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padLength = safeValue.length % 4;
  const padded = padLength ? safeValue + '='.repeat(4 - padLength) : safeValue;
  return Buffer.from(padded, 'base64').toString('utf8');
}

function getTokenSecret() {
  const secret = String(
    process.env.TEST_SESSION_TOKEN_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.AUTH0_CLIENT_SECRET ||
    ''
  ).trim();

  if (secret) return secret;

  const env = String(process.env.VERCEL_ENV || process.env.NODE_ENV || '').toLowerCase();
  if (env === 'production') {
    throw new Error(
      'TEST_SESSION_TOKEN_SECRET is not configured. Refusing to use fallback secret in production.'
    );
  }

  return 'budy-study-local-dev-secret';
}

function sign(unsignedToken, secret) {
  return crypto.createHmac('sha256', secret).update(unsignedToken, 'utf8').digest('base64url');
}

export function createTestSessionToken(input) {
  const section = String(input && input.section ? input.section : 'unknown').trim().toLowerCase();
  const ids = Array.isArray(input && input.questionIds)
    ? input.questionIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];

  if (!ids.length) {
    throw new Error('Cannot issue a test session token without question ids.');
  }

  const uniqueIds = Array.from(new Set(ids)).slice(0, 80);
  const issuedAtMs = Date.now();
  const expiresInSeconds = Math.max(60, Number(input && input.expiresInSeconds) || 2 * 60 * 60);
  const expiresAtMs = issuedAtMs + expiresInSeconds * 1000;

  const payload = {
    section,
    questionIds: uniqueIds,
    iat: issuedAtMs,
    exp: expiresAtMs
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `v1.${encodedPayload}`;
  const signature = sign(unsignedToken, getTokenSecret());

  return {
    token: `${unsignedToken}.${signature}`,
    expiresAtMs,
    expiresInSeconds
  };
}

export function verifyTestSessionToken(token) {
  const raw = String(token || '').trim();
  const parts = raw.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    return { ok: false, error: 'Invalid test session token format.' };
  }

  const unsignedToken = `${parts[0]}.${parts[1]}`;
  const expectedSignature = sign(unsignedToken, getTokenSecret());
  const providedSignature = String(parts[2] || '').trim();

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const providedBuffer = Buffer.from(providedSignature, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return { ok: false, error: 'Invalid test session token signature.' };
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return { ok: false, error: 'Invalid test session token payload.' };
  }

  const exp = Number(payload && payload.exp);
  if (!Number.isFinite(exp) || exp <= Date.now()) {
    return { ok: false, error: 'Test session expired. Please start a new test.' };
  }

  const ids = Array.isArray(payload && payload.questionIds)
    ? payload.questionIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];

  if (!ids.length) {
    return { ok: false, error: 'Test session token does not contain questions.' };
  }

  return {
    ok: true,
    payload: {
      section: String(payload && payload.section ? payload.section : 'unknown').trim().toLowerCase(),
      questionIds: Array.from(new Set(ids)).slice(0, 80),
      iat: Number(payload && payload.iat) || 0,
      exp
    }
  };
}
