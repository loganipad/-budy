import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildListSavedQuestionsPath,
  buildSavedQuestionKey,
  buildUpsertSavedQuestionPayload,
  clampSavedQuestionLimit
} from '../api/lib/saved-question-store-core.mjs';

test('clampSavedQuestionLimit bounds values to supported range', () => {
  assert.equal(clampSavedQuestionLimit(-10), 1);
  assert.equal(clampSavedQuestionLimit(0), 1);
  assert.equal(clampSavedQuestionLimit(25), 25);
  assert.equal(clampSavedQuestionLimit(999), 500);
});

test('buildSavedQuestionKey prefers explicit question ids', () => {
  assert.equal(buildSavedQuestionKey({ section: 'Math', questionId: 'm14' }), 'math:m14');
});

test('buildSavedQuestionKey falls back to section and prompt text', () => {
  const key = buildSavedQuestionKey({ section: 'English', prompt: ' Which choice best supports the claim? ' });
  assert.equal(key, 'english:which choice best supports the claim?');
});

test('buildListSavedQuestionsPath trims and encodes user ids', () => {
  const path = buildListSavedQuestionsPath(' user+1@example.com ', 999);
  assert.match(path, /user_id=eq\.user%2B1%40example\.com/);
  assert.match(path, /limit=500$/);
});

test('buildUpsertSavedQuestionPayload preserves flagged skipped questions without marking them wrong', () => {
  const payload = buildUpsertSavedQuestionPayload('abc123', {
    questionId: 'e12',
    section: 'english',
    prompt: 'Which choice best supports the claim?',
    options: ['A', 'B', 'C', 'D'],
    isFlagged: true,
    isCorrect: false,
    userAnswer: '',
    sourceAttemptedAt: '2026-03-27T12:00:00.000Z'
  });

  assert.equal(payload.question_key, 'english:e12');
  assert.equal(payload.is_flagged, true);
  assert.equal(payload.was_answered_wrong, false);
  assert.equal(payload.user_answer, null);
  assert.deepEqual(payload.answer_options, ['A', 'B', 'C', 'D']);
});

test('buildUpsertSavedQuestionPayload records wrong answers and normalizes defaults', () => {
  const payload = buildUpsertSavedQuestionPayload('abc123', {
    section: 'math',
    questionId: 'm14',
    prompt: 'A right triangle has legs of length 9 and 12. What is the hypotenuse?',
    skill: 'Geometry - Triangles',
    questionType: 'mc',
    options: ['A) 13', 'B) 15', 'C) 17', 'D) 21'],
    correctAnswer: 'B',
    userAnswer: 'A',
    isCorrect: false,
    metadata: { questionNumber: 14 }
  });

  assert.equal(payload.user_id, 'abc123');
  assert.equal(payload.was_answered_wrong, true);
  assert.equal(payload.is_flagged, false);
  assert.equal(payload.question_type, 'mc');
  assert.deepEqual(payload.metadata, { questionNumber: 14 });
  assert.match(payload.last_seen_at, /^2026|^20\d\d-/);
});