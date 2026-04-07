import {
  buildDeleteDraftSessionPath,
  buildGetDraftSessionPath,
  buildUpsertDraftSessionPayload
} from './test-session-store-core.mjs';
import { supabaseRequest } from './supabase-rest.js';

const DRAFT_SESSION_STORE_DISABLED_ERROR = 'Draft-session store is not configured.';

async function request(path, options) {
  return supabaseRequest(path, options, {
    disabledError: DRAFT_SESSION_STORE_DISABLED_ERROR
  });
}

export async function getDraftSessionBySid(userId, sid) {
  let path;
  try {
    path = buildGetDraftSessionPath(userId, sid);
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Invalid draft session lookup.' };
  }

  return request(path, { method: 'GET' });
}

export async function upsertDraftSession(userId, input) {
  let payload;
  try {
    payload = buildUpsertDraftSessionPayload(userId, input);
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Invalid draft session payload.' };
  }

  const path = '/rest/v1/user_test_drafts?on_conflict=user_id,sid';
  return request(path, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify([payload])
  });
}

export async function deleteDraftSessionBySid(userId, sid) {
  let path;
  try {
    path = buildDeleteDraftSessionPath(userId, sid);
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Invalid draft session delete request.' };
  }

  return request(path, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal'
    }
  });
}