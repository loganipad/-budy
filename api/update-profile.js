import { resolveAuthUser } from '../lib/auth.js';
import { withApiErrorBoundary } from '../lib/observability.js';
import { json } from '../lib/http.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';

function normalizeName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function readJsonBody(req) {
  if (req && req.body && typeof req.body === 'object') return req.body;
  if (req && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

async function getManagementToken(domain) {
  const existingToken = String(process.env.AUTH0_MGMT_TOKEN || '').trim();
  if (existingToken) return existingToken;

  const clientId = String(process.env.AUTH0_MGMT_CLIENT_ID || process.env.AUTH0_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.AUTH0_MGMT_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET || '').trim();
  if (!domain || !clientId || !clientSecret) {
    return '';
  }

  const response = await fetch('https://' + domain + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: 'https://' + domain + '/api/v2/',
      grant_type: 'client_credentials'
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data && (data.error_description || data.message || data.error)) || 'Unable to authenticate with Auth0 Management API.');
  }

  return data && data.access_token ? String(data.access_token) : '';
}

async function updateAuth0UserName(domain, token, userId, name) {
  const response = await fetch('https://' + domain + '/api/v2/users/' + encodeURIComponent(userId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({ name })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data && (data.message || data.error_description || data.error)) || 'Unable to update profile name.');
  }

  return data;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/update-profile:ip',
    limit: 20,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many requests. Please try again shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const userRateLimit = await checkRateLimit({
    req,
    namespace: 'api/update-profile:user',
    identifier: auth.user.id,
    limit: 12,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, userRateLimit);
  if (!userRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many profile updates. Please wait and try again.',
      retryAfterSeconds: userRateLimit.retryAfterSeconds
    });
  }

  const domain = String(process.env.AUTH0_DOMAIN || '').trim();
  if (!domain) {
    return json(res, 500, { error: 'Missing AUTH0_DOMAIN environment variable.' });
  }

  const body = readJsonBody(req);
  const nextName = normalizeName(body && body.name);
  if (nextName.length < 2) {
    return json(res, 400, { error: 'Name must be at least 2 characters.' });
  }

  const managementToken = await getManagementToken(domain);
  if (!managementToken) {
    return json(res, 500, { error: 'Missing Auth0 Management API credentials.' });
  }

  const updatedProfile = await updateAuth0UserName(domain, managementToken, auth.user.id, nextName);
  return json(res, 200, {
    ok: true,
    name: updatedProfile && updatedProfile.name ? String(updatedProfile.name) : nextName
  });
}

export default withApiErrorBoundary('api/update-profile', handler);
