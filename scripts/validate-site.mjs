import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
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
const observabilitySnippets = [
  '<script src="/assets/shared/observability.js" defer></script>',
  '<script src="/assets/observability.js" defer></script>'
];
const jsFiles = [];
const testFiles = [];
const htmlLinkFiles = [...requiredHtmlFiles, 'footer.html', 'navbar.html'];
const moduleSyntaxPattern = /(^|\n)\s*(import\s|export\s)/;

function checkJavaScriptSyntax(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const treatAsModule = filePath.endsWith('.mjs') || moduleSyntaxPattern.test(source);

  if (!treatAsModule || filePath.endsWith('.mjs')) {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
    return;
  }

  // Parse module-style .js files via a temporary .mjs copy.
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'validate-site-'));
  const tempPath = path.join(tempDir, path.basename(filePath).replace(/\.js$/, '.mjs'));
  try {
    writeFileSync(tempPath, source, 'utf8');
    execFileSync(process.execPath, ['--check', tempPath], { stdio: 'pipe' });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function validateApiFunctionLayout() {
  const apiDir = path.join(root, 'api');
  if (!existsSync(apiDir)) {
    return;
  }

  for (const entry of readdirSync(apiDir)) {
    const fullPath = path.join(apiDir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      throw new Error(
        `Unexpected directory in api/: ${entry}. Move helper modules outside api/ to avoid Vercel treating them as routes.`
      );
    }

    if (!entry.endsWith('.js') && !entry.endsWith('.mjs')) {
      continue;
    }

    const source = readFileSync(fullPath, 'utf8');
    const hasDefaultHandler = /export\s+default\b|module\.exports\s*=|exports\.default\s*=/.test(source);
    if (!hasDefaultHandler) {
      throw new Error(`API route missing default handler export: api/${entry}`);
    }
  }
}

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
  if (!observabilitySnippets.some((snippet) => html.includes(snippet))) {
    throw new Error(`Missing observability script include in ${file}`);
  }
}

const vercelConfigPath = path.join(root, 'vercel.json');
if (!existsSync(vercelConfigPath)) {
  throw new Error('Missing vercel.json');
}

const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, 'utf8'));
const rewriteSources = new Set((vercelConfig.rewrites || []).map((entry) => String(entry.source || '')));

for (const file of htmlLinkFiles) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing shared page or partial: ${file}`);
  }

  const html = readFileSync(fullPath, 'utf8');
  const anchorMatches = html.matchAll(/<a\b[^>]*\bhref\s*=\s*['"]([^'"]+)['"][^>]*>/gi);

  for (const match of anchorMatches) {
    const href = String(match[1] || '').trim();
    const tag = String(match[0] || '');

    if (!href) {
      throw new Error(`Empty link href in ${file}`);
    }

    if (href === '#' && !/\bonclick\s*=/.test(tag) && !/\bid\s*=/.test(tag)) {
      throw new Error(`Placeholder link href found in ${file}: ${tag}`);
    }

    if (
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      href.startsWith('http://') ||
      href.startsWith('https://')
    ) {
      continue;
    }

    const hrefWithoutHash = href.split('#')[0].split('?')[0] || '/';
    if (hrefWithoutHash === '/') {
      continue;
    }

    if (rewriteSources.has(hrefWithoutHash)) {
      continue;
    }

    const relativeHref = hrefWithoutHash.startsWith('/') ? hrefWithoutHash.slice(1) : hrefWithoutHash;
    if (!relativeHref || existsSync(path.join(root, relativeHref))) {
      continue;
    }

    throw new Error(`Unresolved local link in ${file}: ${href}`);
  }
}

walk(root);
validateApiFunctionLayout();

for (const file of jsFiles) {
  checkJavaScriptSyntax(file);
}

if (testFiles.length) {
  execFileSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
}

const questionBankValidator = path.join(root, 'scripts', 'validate-question-bank.mjs');
const questionBankJsonl = path.join(root, 'data', 'question-bank', 'question-bank.jsonl');
const shouldValidateQuestionBank = process.env.RUN_QUESTION_BANK_VALIDATION === '1';
if (existsSync(questionBankValidator) && existsSync(questionBankJsonl)) {
  if (shouldValidateQuestionBank) {
    execFileSync(process.execPath, [questionBankValidator], { stdio: 'inherit' });
  } else {
    console.warn('Skipping question bank validation (set RUN_QUESTION_BANK_VALIDATION=1 to enable).');
  }
}

console.log(`Validated ${requiredHtmlFiles.length} pages, ${jsFiles.length} JavaScript files, and ${testFiles.length} test files.`);