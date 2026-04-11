import { withApiErrorBoundary } from '../lib/observability.js';
import { json } from '../lib/http.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';
import { isCorrectAnswer, loadQuestionBank } from '../lib/question-bank.js';
import { verifyTestSessionToken } from '../lib/test-session-token.js';

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

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

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

export default withApiErrorBoundary('api/grade-test', handler);
