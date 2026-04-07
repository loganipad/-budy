export function normalizeDraftSessionRow(row) {
  const questionIds = Array.isArray(row && row.question_ids)
    ? row.question_ids.map((item) => String(item || '')).filter(Boolean)
    : [];

  const questionsSnapshot = Array.isArray(row && row.questions_snapshot)
    ? row.questions_snapshot.filter((item) => item && typeof item === 'object')
    : [];

  const answers = row && row.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)
    ? Object.entries(row.answers).reduce((acc, [key, value]) => {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0) return acc;
      const normalizedValue = String(value == null ? '' : value).trim();
      if (!normalizedValue) return acc;
      acc[String(index)] = normalizedValue;
      return acc;
    }, {})
    : {};

  const flags = Array.isArray(row && row.flagged_indexes)
    ? Array.from(new Set(row.flagged_indexes.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry >= 0))).sort((a, b) => a - b)
    : [];

  return {
    sid: row && row.sid ? String(row.sid) : '',
    section: row && row.section ? String(row.section) : 'unknown',
    questionIds,
    questionsSnapshot,
    answers,
    flags,
    currentQuestionIndex: Number.isFinite(Number(row && row.current_question_index)) ? Number(row.current_question_index) : 0,
    remainingTimeSeconds: Number.isFinite(Number(row && row.remaining_time_seconds)) ? Number(row.remaining_time_seconds) : 0,
    timerPaused: Boolean(row && row.timer_paused),
    testActive: row && Object.prototype.hasOwnProperty.call(row, 'test_active') ? Boolean(row.test_active) : true,
    customTestLabel: row && row.custom_test_label ? String(row.custom_test_label) : '',
    startedAt: row && row.started_at ? String(row.started_at) : new Date().toISOString(),
    updatedAt: row && row.updated_at ? String(row.updated_at) : new Date().toISOString(),
    source: row && row.source ? String(row.source) : 'web',
    metadata: row && row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {}
  };
}