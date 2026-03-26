import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  estimateSectionScore,
  getScoreSummaryValue,
  getSectionPerformanceSummary,
  getSessionScoreBreakdown
} = require('../assets/score-utils.js');

test('estimateSectionScore maps accuracy to SAT-style section band', () => {
  assert.equal(estimateSectionScore(0, 50), 200);
  assert.equal(estimateSectionScore(25, 50), 500);
  assert.equal(estimateSectionScore(50, 50), 800);
  assert.equal(estimateSectionScore(5, 0), null);
});

test('getScoreSummaryValue returns first positive numeric score', () => {
  assert.equal(getScoreSummaryValue({ rw: 650, total: 1290 }, ['english', 'rw']), 650);
  assert.equal(getScoreSummaryValue({ english: 0, rw: 'bad' }, ['english', 'rw']), null);
});

test('getSectionPerformanceSummary accumulates english and math items only', () => {
  const summary = getSectionPerformanceSummary({
    reading: { section: 'english', correct: 15, total: 20 },
    grammar: { section: 'english', correct: 12, total: 16 },
    algebra: { section: 'math', correct: 14, total: 18 },
    ignored: { section: 'science', correct: 10, total: 10 }
  });

  assert.deepEqual(summary, {
    english: { correct: 27, total: 36 },
    math: { correct: 14, total: 18 }
  });
});

test('getSessionScoreBreakdown prefers explicit score summaries', () => {
  const breakdown = getSessionScoreBreakdown({
    section: 'full',
    total: 1460,
    skillMap: {
      __scoreSummary: {
        english: 720,
        math: 740,
        total: 1460
      }
    }
  });

  assert.deepEqual(breakdown, { english: 720, math: 740, total: 1460 });
});

test('getSessionScoreBreakdown estimates missing section scores from skill totals', () => {
  const breakdown = getSessionScoreBreakdown({
    section: 'full',
    total: 1310,
    skillMap: {
      reading: { section: 'english', correct: 18, total: 24 },
      grammar: { section: 'english', correct: 16, total: 20 },
      algebra: { section: 'math', correct: 14, total: 20 }
    }
  });

  assert.equal(breakdown.total, 1310);
  assert.equal(breakdown.english, 664);
  assert.equal(breakdown.math, 620);
});

test('getSessionScoreBreakdown infers missing half from full-test total', () => {
  const breakdown = getSessionScoreBreakdown({
    section: 'full',
    total: 1380,
    skillMap: {
      __scoreSummary: {
        english: 700
      }
    }
  });

  assert.deepEqual(breakdown, { english: 700, math: 680, total: 1380 });
});