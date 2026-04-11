import { readFile } from 'node:fs/promises';
import path from 'node:path';

const QUESTION_BANK_PATH = path.join(process.cwd(), 'data', 'question-bank', 'question-bank.jsonl');

let cachePromise = null;

function normalizeSection(value) {
  if (value === 'reading_writing') return 'english';
  if (value === 'math') return 'math';
  return '';
}

function normalizeDifficulty(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'easy' || normalized === 'hard') return normalized;
  return 'medium';
}

function normalizeQuestion(item) {
  if (!item || typeof item !== 'object') return null;

  const section = normalizeSection(item.section);
  if (!section) return null;

  const type = item.format === 'spr' ? 'spr' : 'mc';
  const options = Array.isArray(item.choices)
    ? item.choices.map((entry) => String(entry || '').trim()).filter(Boolean)
    : [];

  const id = String(item.id || '').trim();
  if (!id) return null;

  const answer = item.answer == null ? '' : String(item.answer).trim();
  const acceptableAnswers = type === 'spr' && answer ? [answer] : [];

  return {
    id,
    type,
    format: item.format === 'spr' ? 'spr' : 'mc',
    section,
    domain: String(item.domain || ''),
    skill: String(item.skill || ''),
    difficulty: normalizeDifficulty(item.difficulty),
    tags: Array.isArray(item.tags) ? item.tags.slice(0, 12) : [],
    source_context: String(item.source_context || ''),
    calculator_allowed: Object.prototype.hasOwnProperty.call(item, 'calculator_allowed') ? item.calculator_allowed : null,
    estimated_time_seconds: Math.max(0, Number(item.estimated_time_seconds) || 0),
    passage: item.passage ? String(item.passage) : null,
    question: String(item.prompt || ''),
    options: type === 'spr' ? null : options,
    answer,
    acceptableAnswers,
    rationale: String(item.rationale || ''),
    distractor_rationales: item.distractor_rationales && typeof item.distractor_rationales === 'object' && !Array.isArray(item.distractor_rationales)
      ? item.distractor_rationales
      : {}
  };
}

async function parseQuestionBank() {
  const text = await readFile(QUESTION_BANK_PATH, 'utf8');
  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const byId = new Map();
  const english = [];
  const math = [];

  rows.forEach((line, index) => {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid question-bank JSONL at line ${index + 1}: ${error.message}`);
    }

    const normalized = normalizeQuestion(parsed);
    if (!normalized) return;

    if (!byId.has(normalized.id)) {
      byId.set(normalized.id, normalized);
      if (normalized.section === 'english') english.push(normalized);
      else if (normalized.section === 'math') math.push(normalized);
    }
  });

  return { byId, english, math, total: byId.size };
}

export async function loadQuestionBank() {
  if (!cachePromise) {
    cachePromise = parseQuestionBank().catch((error) => {
      cachePromise = null;
      throw error;
    });
  }
  return cachePromise;
}

export function toPublicQuestion(question) {
  return {
    id: question.id,
    type: question.type,
    section: question.section,
    domain: question.domain,
    skill: question.skill,
    difficulty: question.difficulty,
    tags: Array.isArray(question.tags) ? question.tags : [],
    source_context: question.source_context,
    calculator_allowed: question.calculator_allowed,
    estimated_time_seconds: question.estimated_time_seconds,
    passage: question.passage,
    question: question.question,
    options: question.options,
    format: question.format
  };
}

export function isCorrectAnswer(question, answer) {
  const normalized = String(answer == null ? '' : answer).trim();
  if (!normalized) return false;

  if (question.type === 'spr') {
    const accepted = Array.isArray(question.acceptableAnswers) && question.acceptableAnswers.length
      ? question.acceptableAnswers
      : [question.answer];

    return accepted.some((candidate) => String(candidate) === normalized);
  }

  return String(question.answer) === normalized;
}
