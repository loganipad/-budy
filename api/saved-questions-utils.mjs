function toText(value) {
  return value == null ? '' : String(value);
}

export function normalizeSavedQuestionRow(row) {
  const safeRow = row && typeof row === 'object' ? row : null;
  const rawSaveCount = safeRow && safeRow.save_count != null ? safeRow.save_count : null;
  const saveCount = rawSaveCount == null ? Number.NaN : Number(rawSaveCount);
  return {
    id: safeRow && safeRow.id != null ? Number(safeRow.id) : null,
    key: toText(safeRow && safeRow.question_key),
    section: toText(safeRow && safeRow.section),
    skill: toText(safeRow && safeRow.skill),
    questionType: toText(safeRow && safeRow.question_type),
    prompt: toText(safeRow && safeRow.prompt),
    passage: toText(safeRow && safeRow.passage),
    options: Array.isArray(safeRow && safeRow.answer_options) ? safeRow.answer_options.map((item) => toText(item)).filter(Boolean) : [],
    correctAnswer: toText(safeRow && safeRow.correct_answer),
    userAnswer: toText(safeRow && safeRow.user_answer),
    isCorrect: Boolean(safeRow && safeRow.is_correct),
    isFlagged: Boolean(safeRow && safeRow.is_flagged),
    wasAnsweredWrong: Boolean(safeRow && safeRow.was_answered_wrong),
    sourceTestSection: toText(safeRow && safeRow.source_test_section),
    sourceAttemptedAt: toText(safeRow && safeRow.source_attempted_at),
    lastSeenAt: toText(safeRow && safeRow.last_seen_at),
    saveCount: Number.isFinite(saveCount) ? saveCount : 1,
    metadata: safeRow && safeRow.metadata && typeof safeRow.metadata === 'object' && !Array.isArray(safeRow.metadata) ? safeRow.metadata : {},
    createdAt: toText(safeRow && safeRow.created_at),
    updatedAt: toText(safeRow && safeRow.updated_at)
  };
}