import { buildListSavedQuestionsPath, buildUpsertSavedQuestionsPayload } from './_saved-question-store-core.mjs';
import { supabaseRequest } from './_supabase-rest.js';

const SAVED_QUESTION_STORE_DISABLED_ERROR = 'Saved-question store is not configured.';

async function request(path, options) {
  return supabaseRequest(path, options, {
    disabledError: SAVED_QUESTION_STORE_DISABLED_ERROR
  });
}

export async function listSavedQuestionsByUserId(userId, limit = 100) {
  let path;
  try {
    path = buildListSavedQuestionsPath(userId, limit);
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Missing user id.' };
  }

  return request(path, { method: 'GET' });
}

export async function upsertSavedQuestions(userId, items) {
  let payload;
  try {
    payload = buildUpsertSavedQuestionsPayload(userId, items);
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'No saved questions provided.' };
  }

  const path = '/rest/v1/user_saved_questions?on_conflict=user_id,question_key';
  return request(path, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(payload)
  });
}