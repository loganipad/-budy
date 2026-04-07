export function normalizeAttemptRow(row) {
  return {
    id: row && row.id ? String(row.id) : '',
    date: row && row.created_at ? String(row.created_at) : new Date().toISOString(),
    section: row && row.section ? String(row.section) : 'unknown',
    total: Number(row && row.total_score ? row.total_score : 0),
    correct: Number(row && row.correct_count ? row.correct_count : 0),
    total_q: Number(row && row.total_questions ? row.total_questions : 0),
    skillMap: row && row.skill_breakdown && typeof row.skill_breakdown === 'object' ? row.skill_breakdown : {}
  };
}