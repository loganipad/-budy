import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDeleteDraftSessionPath,
  buildGetDraftSessionPath,
  buildUpsertDraftSessionPayload,
  normalizeSessionId
} from '../lib/test-session-store-core.mjs';

test('normalizeSessionId validates expected sid format', () => {
  assert.equal(normalizeSessionId('550e8400-e29b-41d4-a716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
  assert.equal(normalizeSessionId('test_sid_1234'), 'test_sid_1234');
  assert.equal(normalizeSessionId('short'), '');
  assert.equal(normalizeSessionId('bad sid with spaces'), '');
});

test('buildGetDraftSessionPath encodes user id and sid', () => {
  const path = buildGetDraftSessionPath(' user+1@example.com ', '550e8400-e29b-41d4-a716-446655440000');
  assert.match(path, /user_id=eq\.user%2B1%40example\.com/);
  assert.match(path, /sid=eq\.550e8400-e29b-41d4-a716-446655440000/);
  assert.match(path, /limit=1$/);
});

test('buildDeleteDraftSessionPath rejects invalid sid', () => {
  assert.throws(() => buildDeleteDraftSessionPath('abc', 'bad sid'), /Invalid session id/);
});

test('buildUpsertDraftSessionPayload normalizes draft fields', () => {
  const payload = buildUpsertDraftSessionPayload('abc123', {
    sid: 'session_12345678',
    section: 'Math',
    questionIds: ['q1', 'q2'],
    questionsSnapshot: [{ id: 'q1' }, { id: 'q2' }],
    answers: { 0: 'A', 1: 'B', bad: 'skip' },
    flags: [1, 1, '2'],
    currentQuestionIndex: 1,
    remainingTimeSeconds: 456,
    timerPaused: true,
    testActive: true,
    customTestLabel: 'Review Test',
    startedAt: '2026-04-07T01:00:00.000Z',
    updatedAt: '2026-04-07T01:05:00.000Z',
    metadata: { source: 'unit-test' }
  });

  assert.equal(payload.user_id, 'abc123');
  assert.equal(payload.sid, 'session_12345678');
  assert.equal(payload.section, 'math');
  assert.deepEqual(payload.question_ids, ['q1', 'q2']);
  assert.deepEqual(payload.answers, { 0: 'A', 1: 'B' });
  assert.deepEqual(payload.flagged_indexes, [1, 2]);
  assert.equal(payload.current_question_index, 1);
  assert.equal(payload.remaining_time_seconds, 456);
  assert.equal(payload.timer_paused, true);
  assert.equal(payload.test_active, true);
  assert.equal(payload.custom_test_label, 'Review Test');
  assert.equal(payload.started_at, '2026-04-07T01:00:00.000Z');
  assert.equal(payload.updated_at, '2026-04-07T01:05:00.000Z');
  assert.deepEqual(payload.metadata, { source: 'unit-test' });
});

test('buildUpsertDraftSessionPayload requires question identity data', () => {
  assert.throws(() => buildUpsertDraftSessionPayload('abc123', {
    sid: 'session_12345678',
    questionIds: [],
    questionsSnapshot: []
  }), /requires question identifiers/);
});