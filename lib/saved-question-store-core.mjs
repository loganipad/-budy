function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.round(parsed));
}

function normalizeText(value, fallback = '') {
  const normalized = String(value == null ? '' : value).trim();
  return normalized || fallback;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => normalizeText(option))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return metadata;
}

export function clampSavedQuestionLimit(limit = 100) {
  return Math.min(500, normalizePositiveInteger(limit, 100));
}

export function buildSavedQuestionKey(input) {
  const section = normalizeText(input && input.section, 'unknown').toLowerCase();
  const questionId = normalizeText(input && input.questionId);
  if (questionId) return `${section}:${questionId}`;

  const prompt = normalizeText(input && input.prompt);
  if (!prompt) {
    throw new Error('Missing question prompt.');
  }

  return `${section}:${prompt.toLowerCase().slice(0, 160)}`;
}

export function buildListSavedQuestionsPath(userId, limit = 100) {
  const id = normalizeText(userId);
  if (!id) {
    throw new Error('Missing user id.');
  }

  const safeLimit = clampSavedQuestionLimit(limit);
  return `/rest/v1/user_saved_questions?user_id=eq.${encodeURIComponent(id)}&select=id,user_id,question_key,section,skill,question_type,prompt,passage,answer_options,correct_answer,user_answer,is_correct,is_flagged,was_answered_wrong,source_test_section,source_attempted_at,last_seen_at,save_count,metadata,created_at,updated_at&order=updated_at.desc&limit=${safeLimit}`;
}

export function buildUpsertSavedQuestionPayload(userId, input) {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    throw new Error('Missing user id.');
  }

  const prompt = normalizeText(input && input.prompt);
  if (!prompt) {
    throw new Error('Missing question prompt.');
  }

  const sourceAttemptedAt = normalizeText(input && input.sourceAttemptedAt);
  const lastSeenAt = normalizeText(input && input.lastSeenAt, sourceAttemptedAt || new Date().toISOString());
  const isFlagged = Boolean(input && input.isFlagged);
  const userAnswer = normalizeText(input && input.userAnswer);
  const isCorrect = Boolean(input && input.isCorrect);
  const wasAnsweredWrong = Boolean(input && input.wasAnsweredWrong) || Boolean(userAnswer && !isCorrect);

  return {
    user_id: normalizedUserId,
    question_key: buildSavedQuestionKey(input),
    section: normalizeText(input && input.section, 'unknown').toLowerCase(),
    skill: normalizeText(input && input.skill) || null,
    question_type: normalizeText(input && input.questionType) || null,
    prompt,
    passage: normalizeText(input && input.passage) || null,
    answer_options: normalizeOptions(input && input.options),
    correct_answer: normalizeText(input && input.correctAnswer) || null,
    user_answer: userAnswer || null,
    is_correct: isCorrect,
    is_flagged: isFlagged,
    was_answered_wrong: wasAnsweredWrong,
    source_test_section: normalizeText(input && input.sourceTestSection) || null,
    source_attempted_at: sourceAttemptedAt || null,
    last_seen_at: lastSeenAt,
    save_count: normalizePositiveInteger(input && input.saveCount, 1),
    metadata: normalizeMetadata(input && input.metadata)
  };
}

export function buildUpsertSavedQuestionsPayload(userId, items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error('No saved questions provided.');
  }

  return items.map((item) => buildUpsertSavedQuestionPayload(userId, item));
}