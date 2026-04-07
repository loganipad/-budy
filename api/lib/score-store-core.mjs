export function clampAttemptLimit(limit = 100) {
  const parsed = Number(limit);
  const safeLimit = Number.isFinite(parsed) ? parsed : 100;
  return Math.max(1, Math.min(safeLimit, 500));
}

export function buildListAttemptsPath(userId, limit = 100) {
  const id = String(userId || '').trim();
  if (!id) {
    throw new Error('Missing user id.');
  }

  const safeLimit = clampAttemptLimit(limit);
  return `/rest/v1/user_test_attempts?user_id=eq.${encodeURIComponent(id)}&select=id,user_id,section,total_score,correct_count,total_questions,skill_breakdown,source,created_at&order=created_at.asc&limit=${safeLimit}`;
}

export function buildCreateAttemptPayload(input) {
  const userId = String(input && input.userId ? input.userId : '').trim();
  if (!userId) {
    throw new Error('Missing user id.');
  }

  return {
    user_id: userId,
    section: input && input.section ? String(input.section) : 'unknown',
    total_score: Number.isFinite(Number(input && input.totalScore)) ? Number(input.totalScore) : 0,
    correct_count: Number.isFinite(Number(input && input.correctCount)) ? Number(input.correctCount) : 0,
    total_questions: Number.isFinite(Number(input && input.totalQuestions)) ? Number(input.totalQuestions) : 0,
    skill_breakdown: input && input.skillBreakdown && typeof input.skillBreakdown === 'object' ? input.skillBreakdown : {},
    source: input && input.source ? String(input.source) : 'web',
    created_at: input && input.createdAt ? String(input.createdAt) : new Date().toISOString()
  };
}