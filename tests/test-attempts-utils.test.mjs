import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeAttemptRow } from '../lib/test-attempts-utils.mjs';

test('normalizeAttemptRow maps stored attempt rows to API response shape', () => {
  const normalized = normalizeAttemptRow({
    id: 42,
    created_at: '2026-03-25T19:00:00.000Z',
    section: 'math',
    total_score: '770',
    correct_count: '19',
    total_questions: '22',
    skill_breakdown: { algebra: { correct: 9, total: 10 } }
  });

  assert.deepEqual(normalized, {
    id: '42',
    date: '2026-03-25T19:00:00.000Z',
    section: 'math',
    total: 770,
    correct: 19,
    total_q: 22,
    skillMap: { algebra: { correct: 9, total: 10 } }
  });
});

test('normalizeAttemptRow falls back to safe defaults', () => {
  const normalized = normalizeAttemptRow(null);

  assert.equal(normalized.id, '');
  assert.equal(normalized.section, 'unknown');
  assert.equal(normalized.total, 0);
  assert.equal(normalized.correct, 0);
  assert.equal(normalized.total_q, 0);
  assert.deepEqual(normalized.skillMap, {});
  assert.match(normalized.date, /^2026|^20\d\d-/);
});