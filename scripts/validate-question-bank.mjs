import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const baseDir = path.join(root, 'data', 'question-bank');
const jsonlPath = path.join(baseDir, 'question-bank.jsonl');
const blueprintPath = path.join(baseDir, 'blueprint-summary.json');
const batchDir = path.join(baseDir, 'batches');
const auditDir = path.join(baseDir, 'audits');

if (!existsSync(jsonlPath)) {
  throw new Error('Missing question bank JSONL file. Run scripts/generate-question-bank.mjs first.');
}

if (!existsSync(blueprintPath)) {
  throw new Error('Missing question bank blueprint summary.');
}

function parseJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function parseJsonl(filePath) {
  return readFileSync(filePath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSON on line ${index + 1} of ${filePath}: ${error.message}`);
      }
    });
}

function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function countBy(items, key) {
  const counts = {};
  items.forEach((item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
  });
  return counts;
}

function countByNested(items, keyA, keyB) {
  const counts = {};
  items.forEach((item) => {
    counts[item[keyA]] ||= {};
    counts[item[keyA]][item[keyB]] = (counts[item[keyA]][item[keyB]] || 0) + 1;
  });
  return counts;
}

function duplicateCount(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });
  return duplicates.size;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeValue(value[key])])
    );
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));
}

const blueprint = parseJson(blueprintPath);
const items = parseJsonl(jsonlPath);

assert(items.length === 3200, `Expected 3200 items but found ${items.length}.`);

const requiredKeys = [
  'id',
  'section',
  'domain',
  'skill',
  'difficulty',
  'format',
  'prompt',
  'passage',
  'choices',
  'answer',
  'rationale',
  'distractor_rationales',
  'tags',
  'source_context',
  'calculator_allowed',
  'estimated_time_seconds'
];

items.forEach((item, index) => {
  requiredKeys.forEach((key) => {
    assert(Object.prototype.hasOwnProperty.call(item, key), `Missing key ${key} on item ${index + 1}.`);
  });
  assert(typeof item.id === 'string' && item.id.length > 0, `Invalid id on item ${index + 1}.`);
  assert(['easy', 'medium', 'hard'].includes(item.difficulty), `Invalid difficulty on ${item.id}.`);
  assert(typeof item.prompt === 'string' && item.prompt.length > 0, `Invalid prompt on ${item.id}.`);
  assert(typeof item.passage === 'string', `Invalid passage on ${item.id}.`);
  assert(typeof item.rationale === 'string' && item.rationale.length > 0, `Invalid rationale on ${item.id}.`);
  assert(Array.isArray(item.tags), `Invalid tags on ${item.id}.`);
  assert(typeof item.source_context === 'string' && item.source_context.length > 0, `Invalid source_context on ${item.id}.`);
  assert(typeof item.estimated_time_seconds === 'number' && item.estimated_time_seconds > 0, `Invalid estimated_time_seconds on ${item.id}.`);
  assert(item.distractor_rationales && typeof item.distractor_rationales === 'object' && !Array.isArray(item.distractor_rationales), `Invalid distractor_rationales on ${item.id}.`);

  if (item.section === 'reading_writing') {
    assert(item.format === 'mc', `Reading/Writing item ${item.id} must be multiple choice.`);
    assert(words(item.passage) >= 25 && words(item.passage) <= 150, `Reading/Writing passage length out of range on ${item.id}.`);
    assert(Array.isArray(item.choices) && item.choices.length === 4, `Reading/Writing item ${item.id} must have four choices.`);
    assert(['A', 'B', 'C', 'D'].includes(item.answer), `Reading/Writing item ${item.id} must have an A-D answer.`);
    assert(item.calculator_allowed === null, `Reading/Writing item ${item.id} must set calculator_allowed to null.`);
  } else if (item.section === 'math') {
    assert(['mc', 'spr'].includes(item.format), `Math item ${item.id} has invalid format.`);
    assert(item.calculator_allowed === true, `Math item ${item.id} must set calculator_allowed to true.`);
    if (item.format === 'mc') {
      assert(Array.isArray(item.choices) && item.choices.length === 4, `Math MC item ${item.id} must have four choices.`);
      assert(['A', 'B', 'C', 'D'].includes(item.answer), `Math MC item ${item.id} must have an A-D answer.`);
      assert(Object.keys(item.distractor_rationales).length === 3, `Math MC item ${item.id} must have three distractor rationales.`);
    } else {
      assert(Array.isArray(item.choices) && item.choices.length === 0, `Math SPR item ${item.id} must have no choices.`);
      assert(typeof item.answer === 'string' && item.answer.length > 0, `Math SPR item ${item.id} must have a string answer.`);
      assert(Object.keys(item.distractor_rationales).length === 0, `Math SPR item ${item.id} must not have distractor rationales.`);
    }
  } else {
    throw new Error(`Unknown section on ${item.id}: ${item.section}`);
  }
});

const bySection = countBy(items, 'section');
const byDomain = countByNested(items, 'section', 'domain');
const bySkill = countByNested(items, 'section', 'skill');
const byDifficulty = countByNested(items, 'section', 'difficulty');
const mathFormats = countBy(items.filter((item) => item.section === 'math'), 'format');
const answerBalance = countBy(items.filter((item) => item.format === 'mc'), 'answer');

assert(sameJson(bySection, { reading_writing: 1600, math: 1600 }), 'Section totals do not match blueprint.');
assert(sameJson(byDomain.reading_writing, Object.fromEntries(Object.entries(blueprint.reading_writing.domains).map(([domain, info]) => [domain, info.total]))), 'Reading/Writing domain totals do not match blueprint.');
assert(sameJson(byDomain.math, Object.fromEntries(Object.entries(blueprint.math.domains).map(([domain, info]) => [domain, info.total]))), 'Math domain totals do not match blueprint.');
assert(sameJson(bySkill.reading_writing, Object.assign({}, ...Object.values(blueprint.reading_writing.domains).map((entry) => entry.skills))), 'Reading/Writing skill totals do not match blueprint.');
assert(sameJson(bySkill.math, Object.assign({}, ...Object.values(blueprint.math.domains).map((entry) => entry.skills))), 'Math skill totals do not match blueprint.');
assert(sameJson(byDifficulty.reading_writing, blueprint.reading_writing.difficulty), 'Reading/Writing difficulty mix does not match blueprint.');
assert(sameJson(byDifficulty.math, blueprint.math.difficulty), 'Math difficulty mix does not match blueprint.');
assert(sameJson(mathFormats, blueprint.math.format), 'Math format mix does not match blueprint.');
assert(sameJson(answerBalance, { A: 700, B: 700, C: 700, D: 700 }), 'MC answer balance is not evenly distributed.');
assert(duplicateCount(items.map((item) => item.prompt)) === 0, 'Duplicate prompts detected.');
assert(duplicateCount(items.map((item) => item.passage).filter(Boolean)) === 0, 'Duplicate passages detected.');

const batchFiles = readdirSync(batchDir).filter((name) => name.endsWith('.jsonl')).sort();
const auditFiles = readdirSync(auditDir).filter((name) => name.endsWith('.json')).sort();
assert(batchFiles.length === 32, `Expected 32 batch files but found ${batchFiles.length}.`);
assert(auditFiles.length === 33, `Expected 33 audit files but found ${auditFiles.length}.`);

batchFiles.forEach((name) => {
  const batchItems = parseJsonl(path.join(batchDir, name));
  assert(batchItems.length === 100, `Batch ${name} does not contain 100 items.`);
});

console.log('Question bank validated successfully.');