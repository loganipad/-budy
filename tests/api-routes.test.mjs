import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function loadRouteModule(routeRelativePath, imports) {
  const absolutePath = path.join(process.cwd(), routeRelativePath);
  const source = readFileSync(absolutePath, 'utf8');

  let transformed = source;
  transformed = transformed.replace(/import\s+\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"];?/g, (_m, bindings, specifier) => {
    const mapped = bindings
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.replace(/\s+as\s+/g, ': '))
      .join(', ');
    return `const { ${mapped} } = __imports[${JSON.stringify(specifier)}];`;
  });
  transformed = transformed.replace(/import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"];?/g, (_m, localName, specifier) => {
    return `const ${localName} = (__imports[${JSON.stringify(specifier)}] && (__imports[${JSON.stringify(specifier)}].default ?? __imports[${JSON.stringify(specifier)}])) ;`;
  });

  const exportedConsts = [];
  transformed = transformed.replace(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=/g, (_m, name) => {
    exportedConsts.push(name);
    return `const ${name} =`;
  });
  transformed = transformed.replace(/export\s+default\s+/g, 'exports.default = ');

  if (exportedConsts.length) {
    transformed += `\n${exportedConsts.map((name) => `exports.${name} = ${name};`).join('\n')}\n`;
  }

  const exports = {};
  const evaluator = new Function('exports', '__imports', transformed);
  evaluator(exports, imports);
  return exports;
}

function createReq({ method = 'GET', headers = {}, body = null, query = {} } = {}) {
  return { method, headers, body, query };
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end(value) {
      this.body = String(value || '');
      return this;
    }
  };
}

function parseJsonBody(res) {
  assert.ok(res.body, 'Expected response body to be set.');
  return JSON.parse(res.body);
}

function makeCommonImports(overrides = {}) {
  return {
    '../lib/observability.js': {
      withApiErrorBoundary: (_route, handler) => handler,
      logOperationalEvent: () => {}
    },
    '../lib/http.js': {
      json: (res, status, payload) => {
        res.status(status).setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
      }
    },
    ...overrides
  };
}

test('api/me returns 401 when auth fails', { concurrency: false }, async () => {
  const mod = loadRouteModule('api/me.js', makeCommonImports({
    '../lib/auth.js': {
      resolveAuthUser: async () => ({ ok: false, status: 401, error: 'Missing Bearer token.' })
    },
    '../lib/subscription-store.js': {
      getSubscriptionByUserId: async () => ({ ok: true, data: null })
    },
    '../lib/stripe-key.js': {
      normalizeSecretKey: () => ''
    }
  }));

  const req = createReq({ method: 'GET' });
  const res = createRes();
  await mod.default(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(parseJsonBody(res).error, 'Missing Bearer token.');
});

test('api/create-checkout-session validates method and plan', { concurrency: false }, async () => {
  const mod = loadRouteModule('api/create-checkout-session.js', makeCommonImports({
    '../lib/auth.js': { resolveAuthUser: async () => ({ ok: true, user: { id: 'u_1', email: 'a@b.com' } }) },
    '../lib/origin.js': { resolveSafeOrigin: () => 'https://budy.study' },
    '../lib/stripe-key.js': {
      normalizeSecretKey: () => 'sk_live_123',
      looksMaskedKey: () => false
    },
    '../lib/rate-limit.js': {
      checkRateLimit: () => ({ ok: true, limit: 10, remaining: 9, windowMs: 60000, retryAfterSeconds: 0 }),
      applyRateLimitHeaders: () => {}
    }
  }));

  const badMethodReq = createReq({ method: 'GET' });
  const badMethodRes = createRes();
  await mod.default(badMethodReq, badMethodRes);
  assert.equal(badMethodRes.statusCode, 405);

  process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_123';

  const invalidPlanReq = createReq({ method: 'POST', body: { plan: 'invalid' } });
  const invalidPlanRes = createRes();
  await mod.default(invalidPlanReq, invalidPlanRes);
  assert.equal(invalidPlanRes.statusCode, 400);
  assert.match(parseJsonBody(invalidPlanRes).error, /Invalid plan/i);

  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_ID_MONTHLY;
});

test('api/create-checkout-session returns checkout url on success', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ id: 'cs_test_123', url: 'https://checkout.stripe.test/session' })
  });

  const mod = loadRouteModule('api/create-checkout-session.js', makeCommonImports({
    '../lib/auth.js': { resolveAuthUser: async () => ({ ok: true, user: { id: 'u_1', email: 'user@example.com' } }) },
    '../lib/origin.js': { resolveSafeOrigin: () => 'https://budy.study' },
    '../lib/stripe-key.js': {
      normalizeSecretKey: () => 'sk_live_abc',
      looksMaskedKey: () => false
    },
    '../lib/rate-limit.js': {
      checkRateLimit: () => ({ ok: true, limit: 30, remaining: 29, windowMs: 60000, retryAfterSeconds: 0 }),
      applyRateLimitHeaders: () => {}
    }
  }));

  process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';

  const req = createReq({ method: 'POST', body: { plan: 'monthly' } });
  const res = createRes();
  await mod.default(req, res);

  assert.equal(res.statusCode, 200);
  const body = parseJsonBody(res);
  assert.equal(body.id, 'cs_test_123');
  assert.equal(body.url, 'https://checkout.stripe.test/session');

  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_ID_MONTHLY;
  globalThis.fetch = originalFetch;
});

test('api/stripe-webhook handles missing config/signature and invalid payload', { concurrency: false }, async () => {
  const mod = loadRouteModule('api/stripe-webhook.js', makeCommonImports({
    'node:crypto': { default: crypto },
    '../lib/subscription-store.js': {
      getSubscriptionByStripeCustomerId: async () => ({ ok: true, data: null }),
      isPremiumFromStatus: (status) => status === 'active' || status === 'trialing',
      markEventProcessed: async () => ({ ok: true }),
      upsertSubscription: async () => ({ ok: true })
    }
  }));

  delete process.env.STRIPE_WEBHOOK_SECRET;
  const reqNoSecret = createReq({ method: 'POST', headers: {}, body: '{}' });
  const resNoSecret = createRes();
  await mod.default(reqNoSecret, resNoSecret);
  assert.equal(resNoSecret.statusCode, 500);

  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  const reqNoSig = createReq({ method: 'POST', headers: {}, body: '{}' });
  const resNoSig = createRes();
  await mod.default(reqNoSig, resNoSig);
  assert.equal(resNoSig.statusCode, 400);
  assert.match(parseJsonBody(resNoSig).error, /Missing Stripe signature/i);

  const rawBody = '{invalid-json';
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${ts}.${rawBody}`, 'utf8').digest('hex');
  const reqInvalidJson = createReq({
    method: 'POST',
    headers: { 'stripe-signature': `t=${ts},v1=${signature}` },
    body: rawBody
  });
  const resInvalidJson = createRes();
  await mod.default(reqInvalidJson, resInvalidJson);
  assert.equal(resInvalidJson.statusCode, 400);
  assert.match(parseJsonBody(resInvalidJson).error, /Invalid webhook payload JSON/i);

  delete process.env.STRIPE_WEBHOOK_SECRET;
});

test('api/deep-dive enforces auth and supports preview mode', { concurrency: false }, async () => {
  const commonRouteImports = {
    '../lib/subscription-store.js': {
      getSubscriptionByUserId: async () => ({ ok: true, data: { is_premium: true, subscription_status: 'active' } }),
      isPremiumFromStatus: (status) => status === 'active' || status === 'trialing'
    },
    '../lib/ai-deep-dive-store.js': {
      consumeDeepDiveCredit: async () => ({ ok: true, data: { used_count: 1 } }),
      getCurrentPeriodKey: () => '2026-04',
      getDeepDiveUsage: async () => ({ ok: true, data: { used_count: 0 } }),
      getMonthlyCreditLimit: () => 30
    },
    '../lib/rate-limit.js': {
      checkRateLimit: () => ({ ok: true, limit: 40, remaining: 39, windowMs: 60000, retryAfterSeconds: 0 }),
      applyRateLimitHeaders: () => {}
    }
  };

  const modUnauthorized = loadRouteModule('api/deep-dive.js', makeCommonImports({
    '../lib/auth.js': { resolveAuthUser: async () => ({ ok: false, status: 401, error: 'Unauthorized' }) },
    ...commonRouteImports
  }));

  const unauthorizedReq = createReq({ method: 'POST', body: { text: 'inference' } });
  const unauthorizedRes = createRes();
  await modUnauthorized.default(unauthorizedReq, unauthorizedRes);
  assert.equal(unauthorizedRes.statusCode, 401);

  const modPreview = loadRouteModule('api/deep-dive.js', makeCommonImports({
    '../lib/auth.js': { resolveAuthUser: async () => ({ ok: true, user: { id: 'u_1', email: 'user@example.com' } }) },
    ...commonRouteImports
  }));

  delete process.env.OPENAI_API_KEY;
  delete process.env.AI_DEEP_DIVE_MODEL;

  const previewReq = createReq({
    method: 'POST',
    body: { text: 'inference', context: { section: 'reading_writing', skill: 'inference' } }
  });
  const previewRes = createRes();
  await modPreview.default(previewReq, previewRes);

  assert.equal(previewRes.statusCode, 200);
  const payload = parseJsonBody(previewRes);
  assert.equal(payload.previewMode, true);
  assert.ok(payload.definition);
});
