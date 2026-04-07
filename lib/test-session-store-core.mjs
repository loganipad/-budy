function normalizeText(value, fallback = '') {
  const normalized = String(value == null ? '' : value).trim();
  return normalized || fallback;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function normalizeAnswersObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [key, answer]) => {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0) return acc;

    const normalizedAnswer = normalizeText(answer);
    if (!normalizedAnswer) return acc;
    acc[String(index)] = normalizedAnswer;
    return acc;
  }, {});
}

function normalizeFlags(value) {
  if (!Array.isArray(value)) return [];
  const deduped = new Set();
  value.forEach((entry) => {
    const parsed = Number(entry);
    if (Number.isInteger(parsed) && parsed >= 0) {
      deduped.add(parsed);
    }
  });
  return Array.from(deduped).sort((a, b) => a - b);
}

function normalizeQuestionIds(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeText(entry))
    .filter(Boolean)
    .slice(0, 120);
}

function normalizeQuestionsSnapshot(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === 'object')
    .slice(0, 120);
}

function normalizeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

export function normalizeSessionId(value) {
  const sid = normalizeText(value);
  if (!sid) return '';
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(sid)) return '';
  return sid;
}

export function buildGetDraftSessionPath(userId, sid) {
  const normalizedUserId = normalizeText(userId);
  const normalizedSid = normalizeSessionId(sid);
  if (!normalizedUserId) {
    throw new Error('Missing user id.');
  }
  if (!normalizedSid) {
    throw new Error('Invalid session id.');
  }

  return `/rest/v1/user_test_drafts?user_id=eq.${encodeURIComponent(normalizedUserId)}&sid=eq.${encodeURIComponent(normalizedSid)}&select=user_id,sid,section,question_ids,questions_snapshot,answers,flagged_indexes,current_question_index,remaining_time_seconds,timer_paused,test_active,custom_test_label,started_at,updated_at,source,metadata&limit=1`;
}

export function buildDeleteDraftSessionPath(userId, sid) {
  const normalizedUserId = normalizeText(userId);
  const normalizedSid = normalizeSessionId(sid);
  if (!normalizedUserId) {
    throw new Error('Missing user id.');
  }
  if (!normalizedSid) {
    throw new Error('Invalid session id.');
  }

  return `/rest/v1/user_test_drafts?user_id=eq.${encodeURIComponent(normalizedUserId)}&sid=eq.${encodeURIComponent(normalizedSid)}`;
}

export function buildUpsertDraftSessionPayload(userId, input) {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    throw new Error('Missing user id.');
  }

  const sid = normalizeSessionId(input && input.sid);
  if (!sid) {
    throw new Error('Invalid session id.');
  }

  const questionIds = normalizeQuestionIds(input && input.questionIds);
  const questionsSnapshot = normalizeQuestionsSnapshot(input && input.questionsSnapshot);
  if (!questionIds.length && !questionsSnapshot.length) {
    throw new Error('Draft session requires question identifiers.');
  }

  const nowIso = new Date().toISOString();

  return {
    user_id: normalizedUserId,
    sid,
    section: normalizeText(input && input.section, 'unknown').toLowerCase(),
    question_ids: questionIds,
    questions_snapshot: questionsSnapshot,
    answers: normalizeAnswersObject(input && input.answers),
    flagged_indexes: normalizeFlags(input && input.flags),
    current_question_index: normalizePositiveInteger(input && input.currentQuestionIndex, 0),
    remaining_time_seconds: normalizePositiveInteger(input && input.remainingTimeSeconds, 0),
    timer_paused: Boolean(input && input.timerPaused),
    test_active: Boolean(input && input.testActive),
    custom_test_label: normalizeText(input && input.customTestLabel) || null,
    started_at: normalizeText(input && input.startedAt, nowIso),
    updated_at: normalizeText(input && input.updatedAt, nowIso),
    source: normalizeText(input && input.source, 'web'),
    metadata: normalizeMetadata(input && input.metadata)
  };
}