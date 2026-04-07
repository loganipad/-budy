import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSavedQuestionRow } from '../lib/saved-questions-utils.mjs';

test('normalizeSavedQuestionRow maps stored rows to API response shape', () => {
  const normalized = normalizeSavedQuestionRow({
    id: 9,
    question_key: 'math:m14',
    section: 'math',
    skill: 'Geometry - Triangles',
    question_type: 'mc',
    prompt: 'A right triangle has legs of length 9 and 12. What is the hypotenuse?',
    passage: null,
    answer_options: ['A) 13', 'B) 15', 'C) 17', 'D) 21'],
    correct_answer: 'B',
    user_answer: 'A',
    is_correct: false,
    is_flagged: true,
    was_answered_wrong: true,
    source_test_section: 'full',
    source_attempted_at: '2026-03-27T12:00:00.000Z',
    last_seen_at: '2026-03-27T12:00:00.000Z',
    save_count: '3',
    metadata: { questionNumber: 14 },
    created_at: '2026-03-27T12:00:00.000Z',
    updated_at: '2026-03-27T12:30:00.000Z'
  });

  assert.deepEqual(normalized, {
    id: 9,
    key: 'math:m14',
    section: 'math',
    skill: 'Geometry - Triangles',
    questionType: 'mc',
    prompt: 'A right triangle has legs of length 9 and 12. What is the hypotenuse?',
    passage: '',
    options: ['A) 13', 'B) 15', 'C) 17', 'D) 21'],
    correctAnswer: 'B',
    userAnswer: 'A',
    isCorrect: false,
    isFlagged: true,
    wasAnsweredWrong: true,
    sourceTestSection: 'full',
    sourceAttemptedAt: '2026-03-27T12:00:00.000Z',
    lastSeenAt: '2026-03-27T12:00:00.000Z',
    saveCount: 3,
    metadata: { questionNumber: 14 },
    createdAt: '2026-03-27T12:00:00.000Z',
    updatedAt: '2026-03-27T12:30:00.000Z'
  });
});

test('normalizeSavedQuestionRow falls back to safe defaults', () => {
  const normalized = normalizeSavedQuestionRow(null);

  assert.equal(normalized.id, null);
  assert.equal(normalized.key, '');
  assert.equal(normalized.section, '');
  assert.equal(normalized.prompt, '');
  assert.deepEqual(normalized.options, []);
  assert.equal(normalized.isFlagged, false);
  assert.equal(normalized.wasAnsweredWrong, false);
  assert.equal(normalized.saveCount, 1);
  assert.deepEqual(normalized.metadata, {});
});