import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCreateAttemptPayload, buildListAttemptsPath, clampAttemptLimit } from '../api/lib/score-store-core.mjs';

test('clampAttemptLimit bounds values to supported range', () => {
  assert.equal(clampAttemptLimit(-5), 1);
  assert.equal(clampAttemptLimit(0), 1);
  assert.equal(clampAttemptLimit(25), 25);
  assert.equal(clampAttemptLimit(999), 500);
});

test('buildListAttemptsPath trims and encodes user ids', () => {
  const path = buildListAttemptsPath(' user+1@example.com ', 999);
  assert.match(path, /user_id=eq\.user%2B1%40example\.com/);
  assert.match(path, /limit=500$/);
});

test('buildListAttemptsPath rejects missing user ids', () => {
  assert.throws(() => buildListAttemptsPath('   '), /Missing user id/);
});

test('buildCreateAttemptPayload normalizes numeric fields and defaults', () => {
  const payload = buildCreateAttemptPayload({
    userId: 'abc123',
    section: 'math',
    totalScore: '780',
    correctCount: '18',
    totalQuestions: '22',
    skillBreakdown: { algebra: { correct: 8, total: 10 } },
    source: 'web',
    createdAt: '2026-03-25T18:30:00.000Z'
  });

  assert.deepEqual(payload, {
    user_id: 'abc123',
    section: 'math',
    total_score: 780,
    correct_count: 18,
    total_questions: 22,
    skill_breakdown: { algebra: { correct: 8, total: 10 } },
    source: 'web',
    created_at: '2026-03-25T18:30:00.000Z'
  });
});

test('buildCreateAttemptPayload falls back to safe defaults', () => {
  const payload = buildCreateAttemptPayload({
    userId: 'abc123',
    totalScore: 'not-a-number',
    correctCount: null,
    totalQuestions: undefined,
    skillBreakdown: 'invalid'
  });

  assert.equal(payload.section, 'unknown');
  assert.equal(payload.total_score, 0);
  assert.equal(payload.correct_count, 0);
  assert.equal(payload.total_questions, 0);
  assert.deepEqual(payload.skill_breakdown, {});
  assert.equal(payload.source, 'web');
  assert.match(payload.created_at, /^2026|^20\d\d-/);
});