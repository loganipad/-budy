import { withApiErrorBoundary } from '../lib/observability.js';
import { json } from '../lib/http.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';
import { isCorrectAnswer, loadQuestionBank } from '../lib/question-bank.js';
import { createTestSessionToken, verifyTestSessionToken } from '../lib/test-session-token.js';

function getAction(req) {
  const raw = req.query && req.query.action;
  return String(Array.isArray(raw) ? raw[0] : raw || '').trim().toLowerCase();
}

function normalizeQuestionIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = value.map((entry) => String(entry || '').trim()).filter(Boolean);
  return Array.from(new Set(ids)).slice(0, 80);
}

function normalizeAnswerMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value).reduce((acc, [key, answer]) => {
    const id = String(key || '').trim();
    if (!id) return acc;
    const normalizedAnswer = String(answer == null ? '' : answer).trim();
    acc[id] = normalizedAnswer;
    return acc;
  }, {});
}

async function handleIssue(req, res) {
  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/issue-test-session:ip',
    limit: 40,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many test start requests. Please retry shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const section = String(body.section || 'unknown').trim().toLowerCase();
  const questionIds = normalizeQuestionIds(body.questionIds);

  if (!questionIds.length) {
    return json(res, 400, { error: 'Question ids are required.' });
  }

  if (questionIds.length > 60) {
    return json(res, 400, { error: 'Test session cannot include more than 60 questions.' });
  }

  const bank = await loadQuestionBank();
  const unknownId = questionIds.find((id) => !bank.byId.has(id));
  if (unknownId) {
    return json(res, 400, { error: `Unknown question id: ${unknownId}` });
  }

  const tokenResult = createTestSessionToken({
    section,
    questionIds,
    expiresInSeconds: 2 * 60 * 60
  });

  return json(res, 200, {
    token: tokenResult.token,
    expiresAt: new Date(tokenResult.expiresAtMs).toISOString(),
    expiresInSeconds: tokenResult.expiresInSeconds
  });
}

async function handleEvaluate(req, res) {
  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/evaluate-answer:ip',
    limit: 120,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many answer checks. Please retry shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const token = String(body.token || '').trim();
  const questionId = String(body.questionId || '').trim();
  const answer = String(body.answer == null ? '' : body.answer).trim();

  if (!token || !questionId) {
    return json(res, 400, { error: 'Token and questionId are required.' });
  }

  const tokenState = verifyTestSessionToken(token);
  if (!tokenState.ok) {
    return json(res, 401, { error: tokenState.error });
  }

  const allowedIds = new Set(tokenState.payload.questionIds);
  if (!allowedIds.has(questionId)) {
    return json(res, 403, { error: 'Question is not part of this test session.' });
  }

  const bank = await loadQuestionBank();
  const question = bank.byId.get(questionId);
  if (!question) {
    return json(res, 404, { error: 'Question not found.' });
  }

  const isCorrect = isCorrectAnswer(question, answer);
  return json(res, 200, { questionId, isCorrect });
}

async function handleGrade(req, res) {
  const ipRateLimit = await checkRateLimit({
    req,
    namespace: 'api/grade-test:ip',
    limit: 30,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many grading requests. Please retry shortly.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const token = String(body.token || '').trim();
  if (!token) {
    return json(res, 400, { error: 'Missing test session token.' });
  }

  const tokenState = verifyTestSessionToken(token);
  if (!tokenState.ok) {
    return json(res, 401, { error: tokenState.error });
  }

  const answersByQuestionId = normalizeAnswerMap(body.answersByQuestionId);
  const bank = await loadQuestionBank();

  const graded = tokenState.payload.questionIds.map((questionId) => {
    const question = bank.byId.get(questionId);
    if (!question) {
      return {
        id: questionId,
        missing: true,
        userAnswer: '',
        isCorrect: false,
        correctAnswer: '',
        rationale: '',
        distractor_rationales: {}
      };
    }

    const userAnswer = String(answersByQuestionId[questionId] || '').trim();
    const isSubmitted = Boolean(userAnswer);

    return {
      id: questionId,
      missing: false,
      section: question.section,
      skill: question.skill,
      type: question.type,
      userAnswer,
      isCorrect: isSubmitted ? isCorrectAnswer(question, userAnswer) : false,
      correctAnswer: question.answer,
      rationale: question.rationale,
      distractor_rationales: question.distractor_rationales || {}
    };
  });

  return json(res, 200, { graded });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const action = getAction(req);
  if (action === 'issue') {
    return handleIssue(req, res);
  }
  if (action === 'evaluate') {
    return handleEvaluate(req, res);
  }
  if (action === 'grade') {
    return handleGrade(req, res);
  }

  return json(res, 400, { error: 'Invalid action. Use issue, evaluate, or grade.' });
}

export default withApiErrorBoundary('api/test-engine', handler);
