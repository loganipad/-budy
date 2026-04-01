import { resolveAuthUser } from './_auth.js';
import { withApiErrorBoundary } from './_observability.js';
import { getSubscriptionByUserId, isPremiumFromStatus } from './_subscription-store.js';
import { consumeDeepDiveCredit, getCurrentPeriodKey, getDeepDiveUsage, getMonthlyCreditLimit } from './_ai-deep-dive-store.js';

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

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

  const auth = await resolveAuthUser(req);
  if (!auth.ok) {
    return json(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const text = cleanText(body.text, 180);
  const surroundingText = cleanText(body.surroundingText, 620);
  const context = body.context && typeof body.context === 'object' ? body.context : {};
  if (text.length < 2) {
    return json(res, 400, { error: 'Select a keyword or short phrase first.' });
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

  const aiConfig = getAiConfig();
  if (!aiConfig.enabled) {
    return json(res, 503, { error: 'AI Deep Dive is not configured yet.' });
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