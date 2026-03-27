import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredHtmlFiles = [
  'index.html',
  'study.html',
  'login.html',
  'checkout.html',
  'my-account.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  'score-guarantee.html',
  '404.html'
];
const observabilitySnippet = '<script src="/assets/observability.js" defer></script>';
const jsFiles = [];
const testFiles = [];

function walk(dirPath) {
  for (const entry of readdirSync(dirPath)) {
    if (entry === '.git' || entry === '.venv' || entry === '.venv-1' || entry === 'node_modules') {
      continue;
    }

    const fullPath = path.join(dirPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs')) {
      jsFiles.push(fullPath);
    }

    if (fullPath.endsWith('.test.mjs')) {
      testFiles.push(fullPath);
    }
  }
}

for (const file of requiredHtmlFiles) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required page: ${file}`);
  }

  const html = readFileSync(fullPath, 'utf8');
  if (!html.includes(observabilitySnippet)) {
    throw new Error(`Missing observability script include in ${file}`);
  }
}

const vercelConfigPath = path.join(root, 'vercel.json');
if (!existsSync(vercelConfigPath)) {
  throw new Error('Missing vercel.json');
}

JSON.parse(readFileSync(vercelConfigPath, 'utf8'));
walk(root);

for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

if (testFiles.length) {
  execFileSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
}

const questionBankValidator = path.join(root, 'scripts', 'validate-question-bank.mjs');
const questionBankJsonl = path.join(root, 'data', 'question-bank', 'question-bank.jsonl');
if (existsSync(questionBankValidator) && existsSync(questionBankJsonl)) {
  execFileSync(process.execPath, [questionBankValidator], { stdio: 'inherit' });
}

console.log(`Validated ${requiredHtmlFiles.length} pages, ${jsFiles.length} JavaScript files, and ${testFiles.length} test files.`);