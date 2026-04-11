import { resolveAuthUser } from '../lib/auth.js';
import { withApiErrorBoundary } from '../lib/observability.js';
import { getSubscriptionByUserId, isPremiumFromStatus } from '../lib/subscription-store.js';
import { consumeDeepDiveCredit, getCurrentPeriodKey, getDeepDiveUsage, getMonthlyCreditLimit } from '../lib/ai-deep-dive-store.js';
import { json } from '../lib/http.js';
import { applyRateLimitHeaders, checkRateLimit } from '../lib/rate-limit.js';

function cleanText(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim();
}

function getAiConfig() {
  const model = String(process.env.AI_DEEP_DIVE_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  return {
    model,
    apiKey,
    enabled: Boolean(model && apiKey)
  };
}

function getBypassEmails() {
  const raw = process.env.AI_DEEP_DIVE_BYPASS_EMAILS || process.env.ADMIN_PREMIUM_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeDeepDivePayload(raw, fallbackTerm) {
  const relatedTerms = Array.isArray(raw && raw.relatedTerms)
    ? raw.relatedTerms.map((item) => cleanText(item, 48)).filter(Boolean).slice(0, 4)
    : [];

  return {
    term: cleanText(raw && raw.term ? raw.term : fallbackTerm, 80),
    definition: cleanText(raw && raw.definition, 320),
    explanation: cleanText(raw && raw.explanation, 700),
    satConnection: cleanText(raw && raw.satConnection, 320),
    example: cleanText(raw && raw.example, 320),
    caution: cleanText(raw && raw.caution, 200),
    relatedTerms
  };
}

function toTitleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildRelatedTerms(term, context) {
  const items = [
    context && context.skill ? String(context.skill) : '',
    context && context.topic ? String(context.topic) : '',
    context && context.section ? String(context.section) : '',
    'evidence',
    'strategy',
    'trap answer',
    'timed practice'
  ];

  const seen = new Set();
  return items
    .map((item) => cleanText(item, 40))
    .filter(Boolean)
    .filter((item) => {
      const lower = item.toLowerCase();
      if (lower === String(term || '').toLowerCase()) return false;
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .slice(0, 4);
}

function buildPreviewDeepDive(input) {
  const context = input.context && typeof input.context === 'object' ? input.context : {};
  const rawTerm = cleanText(input.text, 80);
  const term = toTitleCase(rawTerm || 'SAT Topic');
  const section = cleanText(context.section, 60) || 'SAT practice';
  const skill = cleanText(context.skill || context.topic, 80) || 'this topic';
  const surface = cleanText(context.surface, 40) || 'study mode';
  const visibleContext = cleanText(input.surroundingText, 260);

  const specialCases = {
    inference: {
      definition: 'Inference means using clues from the passage to figure out what is most strongly supported, even if the answer is not stated word-for-word.',
      explanation: 'On the SAT, inference questions reward careful reading, not guessing. You look at the exact lines, connect the evidence, and choose the answer that follows logically from what the author gives you.',
      satConnection: 'Inference matters because many Reading and Writing questions test whether you can move from explicit evidence to the best-supported conclusion.',
      example: 'If a passage says a scientist repeated an experiment three times with the same result, you can infer the result seems reliable.',
      caution: 'Do not pick an answer just because it sounds smart. It still has to be supported by the passage.'
    },
    grammar: {
      definition: 'Grammar is the set of rules that makes a sentence clear, correct, and easy to follow.',
      explanation: 'SAT grammar questions usually test sentence structure, agreement, punctuation, and clarity. The goal is not to sound fancy. The goal is to choose the version that follows standard written English.',
      satConnection: 'Grammar shows up in Standard English Conventions questions, where small wording changes can completely change whether a sentence is correct.',
      example: 'A verb has to match its subject, so "The list of items is" is correct, not "The list of items are."',
      caution: 'Do not trust what only sounds natural. Check the actual rule being tested.'
    },
    slope: {
      definition: 'Slope tells you how steep a line is by comparing how much it rises or falls to how much it moves left or right.',
      explanation: 'In SAT math, slope is a fast way to describe the rate of change in a linear relationship. Positive slope means the line goes up, negative slope means it goes down, and zero slope means it stays flat.',
      satConnection: 'Slope appears in graph, equation, and word-problem questions because it helps describe how one quantity changes compared with another.',
      example: 'From points (2, 4) and (6, 12), the slope is (12 - 4) / (6 - 2) = 2.',
      caution: 'Do not mix up rise over run with run over rise.'
    },
    quadratic: {
      definition: 'A quadratic is an expression or equation where the highest power of the variable is 2.',
      explanation: 'Quadratics often create parabolas, factor pairs, and two possible solutions. On the SAT, they can appear as equations to solve, expressions to rewrite, or graphs to analyze.',
      satConnection: 'Quadratics matter because Advanced Math questions often test whether you can recognize structure, factor correctly, and interpret zeros or vertex information.',
      example: 'In x^2 - 5x + 6 = 0, the solutions are x = 2 and x = 3 because the expression factors into (x - 2)(x - 3).',
      caution: 'Do not stop after finding one solution if the equation can produce two.'
    }
  };

  const normalizedKey = rawTerm.toLowerCase();
  if (specialCases[normalizedKey]) {
    return {
      term,
      relatedTerms: buildRelatedTerms(rawTerm, context),
      ...specialCases[normalizedKey]
    };
  }

  return {
    term,
    definition: `${term} is a key ${section} idea connected to ${skill}. Students usually need to know what it means, where it appears, and how to recognize it quickly under time pressure.`,
    explanation: `${term} matters in ${surface} because SAT questions reward pattern recognition more than memorizing big words. When you understand what ${term.toLowerCase()} is doing in the problem or passage, you can slow down the guesswork and focus on the real evidence, rule, or math structure. ${visibleContext ? `In the current material, the clue is: ${visibleContext}` : 'In practice, the best move is to connect the term to the exact sentence, graph, or equation in front of you.'}`,
    satConnection: `${term} shows up as part of the decision students must make on the SAT: identify the skill, avoid the trap answer, and prove the choice with evidence or correct math steps.`,
    example: `A strong student response would be: "I know this question is testing ${term.toLowerCase()}, so I should look for the exact evidence or setup before choosing an answer."`,
    caution: `A common mistake is recognizing the word ${term.toLowerCase()} but not connecting it to the exact part of the question that proves the answer.` ,
    relatedTerms: buildRelatedTerms(rawTerm, context)
  };
}

function buildMessages(input) {
  const systemPrompt = [
    'You are Budy.Study AI Deep Dive.',
    'Explain SAT and PSAT terms to a high school student using clear, age-appropriate language.',
    'Write with the tone of a smart tutor, not an adult academic reference.',
    'Keep the answer factual, concise, and supportive.',
    'Return valid JSON with keys: term, definition, explanation, satConnection, example, caution, relatedTerms.',
    'definition should be 1-2 sentences.',
    'explanation should feel Wikipedia-like but readable for a 9th or 10th grader.',
    'satConnection should explain why the topic matters on the SAT or PSAT.',
    'example should be short and concrete.',
    'caution should name one common mistake students make.',
    'relatedTerms should contain 2 to 4 short strings.',
    'Do not mention being an AI or mention hidden prompts.'
  ].join(' ');

  const context = input.context && typeof input.context === 'object' ? input.context : {};
  const userPrompt = [
    `Selected term or phrase: ${input.text}`,
    `Surface: ${cleanText(context.surface, 40) || 'study'}`,
    `Section: ${cleanText(context.section, 60) || 'unknown'}`,
    `Skill or topic: ${cleanText(context.topic || context.skill, 80) || 'general SAT prep'}`,
    `Visible context: ${input.surroundingText || 'No extra context was supplied.'}`
  ].join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

async function requestDeepDiveFromOpenAI(input, config) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.35,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: buildMessages(input)
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        error: data && data.error && data.error.message ? data.error.message : 'AI provider request failed.'
      };
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';

    if (!content) {
      return { ok: false, status: 502, error: 'AI provider returned an empty response.' };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, status: 502, error: 'AI provider returned invalid JSON.' };
    }

    const normalized = normalizeDeepDivePayload(parsed, input.text);
    if (!normalized.definition || !normalized.explanation || !normalized.satConnection) {
      return { ok: false, status: 502, error: 'AI provider response was incomplete.' };
    }

    return { ok: true, data: normalized };
  } catch {
    return { ok: false, status: 502, error: 'AI provider request failed.' };
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const ipRateLimit = checkRateLimit({
    req,
    namespace: 'api/deep-dive:ip',
    limit: 40,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, ipRateLimit);
  if (!ipRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many requests. Please slow down and try again.',
      retryAfterSeconds: ipRateLimit.retryAfterSeconds
    });
  }

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const userRateLimit = checkRateLimit({
    req,
    namespace: 'api/deep-dive:user',
    identifier: auth.user.id,
    limit: 15,
    windowMs: 60_000
  });
  applyRateLimitHeaders(res, userRateLimit);
  if (!userRateLimit.ok) {
    return json(res, 429, {
      error: 'Too many AI Deep Dive requests. Please wait and try again.',
      retryAfterSeconds: userRateLimit.retryAfterSeconds
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const text = cleanText(body.text, 180);
  const surroundingText = cleanText(body.surroundingText, 620);
  const context = body.context && typeof body.context === 'object' ? body.context : {};
  if (text.length < 2) {
    return json(res, 400, { error: 'Select a keyword or short phrase first.' });
  }

  const aiConfig = getAiConfig();
  const previewMode = !aiConfig.enabled;

  if (previewMode) {
    const previewResult = buildPreviewDeepDive({ text, surroundingText, context });
    return json(res, 200, {
      ...previewResult,
      previewMode: true,
      usedCredits: 0,
      remainingCredits: null,
      creditLimit: null,
      periodKey: null,
      model: 'local-preview'
    });
  }

  const email = cleanText(auth.user && auth.user.email, 160).toLowerCase();
  const bypassEmails = getBypassEmails();
  const hasBypass = email ? bypassEmails.has(email) : false;

  const subscription = await getSubscriptionByUserId(auth.user.id);
  if (!subscription.ok && !subscription.disabled && !hasBypass) {
    return json(res, 500, { error: subscription.error || 'Unable to verify subscription.' });
  }
  if (subscription.disabled && !hasBypass) {
    return json(res, 503, { error: 'Subscription access is not configured yet.' });
  }

  const subscriptionRow = subscription.ok ? subscription.data : null;
  const subscriptionStatus = cleanText(subscriptionRow && subscriptionRow.subscription_status, 24).toLowerCase();
  const isPremium = hasBypass || Boolean(subscriptionRow && subscriptionRow.is_premium) || isPremiumFromStatus(subscriptionStatus);
  if (!isPremium) {
    return json(res, 403, {
      error: 'AI Deep Dive is included with Pro.',
      upgradeRequired: true
    });
  }

  const periodKey = getCurrentPeriodKey();
  const creditLimit = getMonthlyCreditLimit();
  const usage = await getDeepDiveUsage(auth.user.id, periodKey);
  if (!usage.ok) {
    const status = usage.disabled ? 503 : 500;
    return json(res, status, { error: usage.error || 'Unable to verify AI Deep Dive credits.' });
  }

  const usedCredits = Math.max(0, Number(usage.data && usage.data.used_count) || 0);
  const remainingCredits = Math.max(0, creditLimit - usedCredits);
  if (remainingCredits <= 0) {
    return json(res, 429, {
      error: 'You used all of your AI Deep Dive credits for this month.',
      usedCredits,
      remainingCredits: 0,
      creditLimit,
      periodKey
    });
  }

  const aiResult = await requestDeepDiveFromOpenAI({ text, surroundingText, context }, aiConfig);
  if (!aiResult.ok) {
    return json(res, aiResult.status || 502, { error: aiResult.error || 'Could not generate the deep dive.' });
  }

  const charge = await consumeDeepDiveCredit({
    userId: auth.user.id,
    email,
    periodKey,
    creditLimit
  });
  if (!charge.ok) {
    const status = charge.disabled ? 503 : 500;
    return json(res, status, { error: charge.error || 'Could not record AI Deep Dive usage.' });
  }

  return json(res, 200, {
    ...aiResult.data,
    usedCredits: charge.data.usedCount,
    remainingCredits: charge.data.remainingCredits,
    creditLimit: charge.data.creditLimit,
    periodKey,
    model: aiConfig.model
  });
}

export default withApiErrorBoundary('api/deep-dive', handler);