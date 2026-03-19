function getBearerToken(req) {
  const header = req && req.headers ? req.headers.authorization || req.headers.Authorization : '';
  if (!header || typeof header !== 'string') return '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export async function resolveAuthUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: 'Missing Bearer token.' };
  }

  const auth0Domain = process.env.AUTH0_DOMAIN;
  if (!auth0Domain) {
    return { ok: false, status: 500, error: 'Missing AUTH0_DOMAIN environment variable.' };
  }

  const userInfoUrl = `https://${auth0Domain}/userinfo`;

  try {
    const response = await fetch(userInfoUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      return { ok: false, status: 401, error: 'Invalid or expired access token.' };
    }

    const profile = await response.json();
    const userId = profile && profile.sub ? String(profile.sub).trim() : '';
    const email = profile && profile.email ? String(profile.email).trim().toLowerCase() : '';

    if (!userId) {
      return { ok: false, status: 401, error: 'Token did not contain a valid user id.' };
    }

    return {
      ok: true,
      user: {
        id: userId,
        email
      }
    };
  } catch {
    return { ok: false, status: 502, error: 'Failed to verify token with Auth0.' };
  }
}
