import { buildCreateAttemptPayload, buildListAttemptsPath } from './score-store-core.mjs';
import { supabaseRequest } from './supabase-rest.js';

const SCORE_STORE_DISABLED_ERROR = 'Score store is not configured.';

async function request(path, options) {
  return supabaseRequest(path, options, {
    disabledError: SCORE_STORE_DISABLED_ERROR
  });
}

export async function listAttemptsByUserId(userId, limit = 100) {
  let path;
  try {
    path = buildListAttemptsPath(userId, limit);
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Missing user id.' };
  }

  return request(path, { method: 'GET' });
}

export async function createAttempt(input) {
  let payload;
  try {
    payload = buildCreateAttemptPayload(input);
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Missing user id.' };
  }

  const path = '/rest/v1/user_test_attempts';
  return request(path, {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify([payload])
  });
}
