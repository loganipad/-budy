import { resolveAuthUser } from '../lib/auth.js';
import { json } from '../lib/http.js';
import { withApiErrorBoundary } from '../lib/observability.js';
import {
  deleteDraftSessionBySid,
  getDraftSessionBySid,
  upsertDraftSession
} from '../lib/test-session-store.js';
import { normalizeDraftSessionRow } from '../lib/test-session-utils.mjs';

function readSid(req, body) {
  const querySid = req && req.query && typeof req.query.sid === 'string' ? req.query.sid : '';
  const bodySid = body && typeof body.sid === 'string' ? body.sid : '';
  const sid = String(querySid || bodySid || '').trim();
  return sid;
}

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, PUT, DELETE');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sid = readSid(req, body);
  if (!sid) {
    return json(res, 400, { error: 'Missing sid query parameter.' });
  }

  if (req.method === 'GET') {
    const result = await getDraftSessionBySid(auth.user.id, sid);
    if (!result.ok) {
      const status = result.disabled ? 503 : 500;
      return json(res, status, { error: result.error || 'Unable to fetch draft session.', disabled: Boolean(result.disabled) });
    }

    const row = Array.isArray(result.data) ? result.data[0] || null : null;
    if (!row) {
      return json(res, 404, { error: 'Draft session not found.' });
    }

    return json(res, 200, { draft: normalizeDraftSessionRow(row) });
  }

  if (req.method === 'DELETE') {
    const result = await deleteDraftSessionBySid(auth.user.id, sid);
    if (!result.ok) {
      const status = result.disabled ? 503 : 500;
      return json(res, status, { error: result.error || 'Unable to delete draft session.', disabled: Boolean(result.disabled) });
    }

    return json(res, 200, { ok: true, sid });
  }

  const draftInput = body && body.draft && typeof body.draft === 'object'
    ? { sid, ...body.draft }
    : { sid };
  const result = await upsertDraftSession(auth.user.id, draftInput);

  if (!result.ok) {
    const status = result.disabled ? 503 : 500;
    return json(res, status, { error: result.error || 'Unable to save draft session.', disabled: Boolean(result.disabled) });
  }

  const row = Array.isArray(result.data) ? result.data[0] || null : null;
  return json(res, 200, { draft: row ? normalizeDraftSessionRow(row) : null });
}

export default withApiErrorBoundary('api/test-session', handler);