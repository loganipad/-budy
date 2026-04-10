'use strict';

(() => {
  const heroUserCounterEl = document.getElementById('hero-user-counter');
  if (!heroUserCounterEl) return;
  const baseUsers = 49100;
  const counterStart = new Date('2026-03-23T22:48:42-0700').getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  const msPerWeek = 7 * msPerDay;
  const elapsedMs = Math.max(0, Date.now() - counterStart);
  const elapsedDays = elapsedMs / msPerDay;
  const elapsedWeeks = elapsedMs / msPerWeek;
  const weeklyGrowth = baseUsers * Math.pow(1.01, elapsedWeeks);
  const dailyGrowth = 200 * elapsedDays;
  const currentUsers = Math.max(baseUsers, Math.floor(weeklyGrowth + dailyGrowth));
  heroUserCounterEl.textContent = currentUsers.toLocaleString('en-US') + '+';
})();

/* ── AUTH0 CONFIG ── */
const AUTH0_DOMAIN = 'dev-rv7cg5xpm5r2o1z2.us.auth0.com';
const AUTH0_CLIENT_ID = 'UeJa9w8a0auVzw8vBBx1Tt5eD28sxMkC';
const AUTH0_REDIRECT_URI = window.location.origin;
const LOCAL_AUTH_KEY = 'budy_local_auth_user';
const SAVED_QUESTIONS_KEY = 'budy_saved_questions';
const REVIEW_TEST_STORAGE_KEY = 'budy_review_test_v1';
const TEST_DRAFT_LOCAL_PREFIX = 'budy_test_draft_v1:';
const TEST_DRAFT_AUTOSAVE_DEBOUNCE_MS = 1200;
const TEST_DRAFT_AUTOSAVE_INTERVAL_MS = 15000;
const ADMIN_PREMIUM_EMAILS = [];
const TEST_USER_EMAILS = ['loganipad@gmail.com'];
const CHECKOUT_SYNC_ATTEMPTS = 8;
const CHECKOUT_SYNC_DELAY_MS = 2500;

const LANDING_DEMO_QUESTIONS = [
  {
    section: 'Math',
    question: 'If a tutoring app has 120 users and grows by 25%, how many users does it have now?',
    choices: ['130', '140', '150', '160'],
    answer: 'C',
    explanation: '25% of 120 is 30, so 120 + 30 = 150.'
  },
  {
    section: 'SAT Reading Demo',
    question: 'A passage says a scientist repeated an experiment three times with the same result. The best inference is:',
    choices: ['The result may be reliable', 'The experiment is definitely perfect', 'The scientist is biased', 'No conclusion can be made'],
    answer: 'A',
    explanation: 'Repeated consistent outcomes increase confidence in reliability.'
  },
  {
    section: 'SAT Math Demo',
    question: 'What is the slope of a line through points (2, 4) and (6, 12)?',
    choices: ['1', '2', '3', '4'],
    answer: 'B',
    explanation: 'Slope = (12 - 4) / (6 - 2) = 8 / 4 = 2.'
  },
  {
    section: 'Writing Demo',
    question: 'Choose the best transition: "The class practiced daily. _____, scores improved by 18%."',
    choices: ['However', 'For example', 'As a result', 'Meanwhile'],
    answer: 'C',
    explanation: 'The second clause is an outcome of the first, so "As a result" fits best.'
  }
];

let actionConfirmResolver = null;
let draftAutosaveDebounceTimer = null;
let draftAutosaveIntervalTimer = null;
let draftAutosaveInFlight = false;
let draftAutosaveQueued = false;
let draftBackendUnavailable = false;

function spriteIcon(name, className) {
  const cls = className || 'ui-icon ui-icon-md';
  return `<span class="${cls}" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="/assets/ui-icons.svg#icon-${name}"></use></svg></span>`;
}

const BILLING_DISPLAY = {
  weekly: {
    weekly: '8',
    monthly: '32',
    note: 'Billed $8 weekly'
  },
  monthly: {
    weekly: '5',
    monthly: '20',
    note: 'Billed $20 monthly'
  },
  annual: {
    weekly: '2',
    monthly: '8',
    note: 'Billed $96 annually'
  }
};

let authClient = null;
let authReady = false;
let deepDiveController = null;

/* ── STATE ── */
const S = {
  view: 'landing',
  user: { name: '', grade: '', email: '' },
  authUserId: '',
  isLoggedIn: false,
  authViaLocal: false,
  scoreStoreDisabled: false,
  savedQuestionStoreDisabled: false,
  sessionCache: [],
  savedQuestionsCache: [],
  section: null,
  isPremium: false,
  obStep: 1,
  obSection: null,

  questions: [],
  answers: {},
  flags: new Set(),
  curQ: 0,
  landingTimer: null,
  landingTimeLeft: 30 * 60,
  timer: null,
  timerPaused: false,
  timeLeft: 0,
  testActive: false,

  results: null,
  chart: null,
  selectedPlan: 'monthly',
  demoIndex: 0,
  demoAnswers: {},
  demoStatus: {},
  subscriptionStatus: 'free',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  cancelAt: null,
  canceledAt: null,
  accountTab: 'progress',
  checkoutSyncInProgress: false,
  leaveTestDestination: 'landing',
  demoCompleted: false,
  demoGrading: false,
  customTestLabel: '',
  testSessionId: '',
  testSessionStartedAt: null
};

/* ── FREE TIER LIMITS ── */
const FREE_Q = 10; // questions allowed on free tier
const LANDING_TIMER_SECONDS = 30 * 60;
const LANDING_STRICT_ONE_AT_TIME = true;
const TEST_DURATION_SECONDS = {
  english: { premium: 32 * 60, free: 12 * 60 },
  math: { premium: 35 * 60, free: 12 * 60 },
  full: { premium: 67 * 60, free: 12 * 60 }
};

function formatClock(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getTestDurationSeconds(section, isPremium) {
  const tier = isPremium ? 'premium' : 'free';
  return TEST_DURATION_SECONDS[section]?.[tier] ?? TEST_DURATION_SECONDS.math[tier];
}

function getTestDurationSummary(section, isPremium) {
  const minutes = Math.round(getTestDurationSeconds(section, isPremium) / 60);
  return isPremium ? `${minutes} min` : `~${minutes} min`;
}

function buildLandingDeepDiveKeywords() {
  const terms = [
    'evidence',
    'claim',
    'reasoning',
    'author\'s purpose',
    'equation',
    'variable',
    'slope',
    'intercept',
    'probability',
    'grammar',
    'transition'
  ];
  const currentQuestion = S.questions[S.curQ] || null;
  if (currentQuestion) {
    if (currentQuestion.skill) terms.push(currentQuestion.skill);
    if (currentQuestion.domain) terms.push(currentQuestion.domain);
    if (Array.isArray(currentQuestion.tags)) terms.push(...currentQuestion.tags);
    if (currentQuestion.section === 'math') {
      terms.push('algebra', 'quadratics', 'polynomials');
    } else {
      terms.push('inference', 'central idea', 'command of evidence');
    }
  }
  if (S.results && S.results.skillMap) {
    terms.push(...Object.keys(S.results.skillMap));
  }
  return terms;
}

function getLandingDeepDiveContext() {
  const currentQuestion = S.questions[S.curQ] || null;
  return {
    surface: S.view === 'results' ? 'answer-review' : S.view === 'test' ? 'live-test' : 'practice',
    section: currentQuestion && currentQuestion.section ? String(currentQuestion.section) : String(S.section || 'Practice'),
    topic: currentQuestion && currentQuestion.domain ? String(currentQuestion.domain) : '',
    skill: currentQuestion && currentQuestion.skill ? String(currentQuestion.skill) : ''
  };
}

function syncLandingDeepDive() {
  if (!window.BudyAiDeepDive) return;

  const selectors = [];
  if (S.view === 'test') selectors.push('#q-main');
  if (S.view === 'results') selectors.push('#review-list');

  const nextConfig = {
    selectors,
    glossaryTerms: buildLandingDeepDiveKeywords(),
    enableKeywordHighlights: false,
    getAccessToken,
    getRuntimeContext: getLandingDeepDiveContext,
    upgradeUrl: '/checkout.html',
    loginUrl: '/login.html'
  };

  if (!deepDiveController && !selectors.length) {
    return;
  }

  if (!deepDiveController) {
    deepDiveController = window.BudyAiDeepDive.mount(nextConfig);
    return;
  }

  deepDiveController.refresh(nextConfig);
}

function getQueuedReviewTest() {
  try {
    const raw = localStorage.getItem(REVIEW_TEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function clearQueuedReviewTest() {
  try {
    localStorage.removeItem(REVIEW_TEST_STORAGE_KEY);
  } catch {}
}

function getSectionDisplayLabel(section, customLabel) {
  if (customLabel) return customLabel;
  if (section === 'full') return 'Full Test';
  if (section === 'english') return 'Reading & Writing';
  if (section === 'math') return 'Math';
  return section || 'Practice Test';
}

function normalizeSessionId(value) {
  const sid = String(value == null ? '' : value).trim();
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(sid)) return '';
  return sid;
}

function createTestSessionId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `sid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

function getSidFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  return normalizeSessionId(searchParams.get('sid'));
}

function replaceUrlSearchParams(searchParams) {
  const query = searchParams.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, document.title, nextUrl);
}

function upsertSidInUrl(sid) {
  const normalizedSid = normalizeSessionId(sid);
  if (!normalizedSid) return;
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set('sid', normalizedSid);
  replaceUrlSearchParams(searchParams);
}

function clearSidFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.has('sid')) return;
  searchParams.delete('sid');
  replaceUrlSearchParams(searchParams);
}

function getDraftStorageKey(sid) {
  return `${TEST_DRAFT_LOCAL_PREFIX}${sid}`;
}

function readDraftLocal(sid) {
  const normalizedSid = normalizeSessionId(sid);
  if (!normalizedSid) return null;
  try {
    const raw = localStorage.getItem(getDraftStorageKey(normalizedSid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function saveDraftLocal(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const sid = normalizeSessionId(snapshot.sid);
  if (!sid) return;
  try {
    localStorage.setItem(getDraftStorageKey(sid), JSON.stringify(snapshot));
  } catch {}
}

function deleteDraftLocal(sid) {
  const normalizedSid = normalizeSessionId(sid);
  if (!normalizedSid) return;
  try {
    localStorage.removeItem(getDraftStorageKey(normalizedSid));
  } catch {}
}

function buildDraftQuestionIds(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((question, index) => {
    const id = question && question.id ? String(question.id).trim() : '';
    return id || `idx-${index + 1}`;
  });
}

function normalizeDraftAnswers(answers, maxQuestions) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return {};
  const safeMax = Math.max(1, Number(maxQuestions) || 1);
  return Object.entries(answers).reduce((acc, [key, value]) => {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= safeMax) return acc;
    const normalized = String(value == null ? '' : value).trim();
    if (!normalized) return acc;
    acc[String(index)] = normalized;
    return acc;
  }, {});
}

function normalizeDraftFlags(flags, maxQuestions) {
  const safeMax = Math.max(1, Number(maxQuestions) || 1);
  if (!Array.isArray(flags)) return new Set();
  const next = new Set();
  flags.forEach((entry) => {
    const index = Number(entry);
    if (Number.isInteger(index) && index >= 0 && index < safeMax) {
      next.add(index);
    }
  });
  return next;
}

function buildDraftSnapshot(reason = '') {
  const sid = normalizeSessionId(S.testSessionId);
  if (!sid || !Array.isArray(S.questions) || !S.questions.length) return null;
  if (!S.testActive) return null;

  return {
    sid,
    section: S.section || 'unknown',
    questionIds: buildDraftQuestionIds(S.questions),
    questionsSnapshot: S.questions,
    answers: normalizeDraftAnswers(S.answers, S.questions.length),
    flags: Array.from(S.flags || []),
    currentQuestionIndex: Number.isInteger(S.curQ) ? S.curQ : 0,
    remainingTimeSeconds: Math.max(0, Number(S.timeLeft) || 0),
    timerPaused: Boolean(S.timerPaused),
    testActive: true,
    customTestLabel: S.customTestLabel || '',
    startedAt: S.testSessionStartedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'web',
    metadata: {
      reason: String(reason || ''),
      isPremium: Boolean(S.isPremium)
    }
  };
}

async function fetchDraftSessionRemote(sid) {
  const normalizedSid = normalizeSessionId(sid);
  if (!normalizedSid) return { ok: false, error: 'Invalid sid.' };

  const token = await getAccessToken();
  if (!token) return { ok: false, unauthorized: true, error: 'Missing access token.' };

  try {
    const response = await fetch(`/api/test-session?sid=${encodeURIComponent(normalizedSid)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        disabled: Boolean(data && data.disabled),
        notFound: response.status === 404,
        error: data && data.error ? String(data.error) : 'Unable to fetch draft session.'
      };
    }
    return { ok: true, draft: data && data.draft ? data.draft : null };
  } catch {
    return { ok: false, error: 'Draft session request failed.' };
  }
}

async function saveDraftSessionRemote(snapshot) {
  const sid = normalizeSessionId(snapshot && snapshot.sid);
  if (!sid) return { ok: false, error: 'Invalid sid.' };

  const token = await getAccessToken();
  if (!token) return { ok: false, unauthorized: true, error: 'Missing access token.' };

  try {
    const response = await fetch('/api/test-session', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ sid, draft: snapshot })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        disabled: Boolean(data && data.disabled),
        error: data && data.error ? String(data.error) : 'Unable to save draft session.'
      };
    }
    return { ok: true, draft: data && data.draft ? data.draft : null };
  } catch {
    return { ok: false, error: 'Draft session save failed.' };
  }
}

async function deleteDraftSessionRemote(sid) {
  const normalizedSid = normalizeSessionId(sid);
  if (!normalizedSid) return { ok: false, error: 'Invalid sid.' };

  const token = await getAccessToken();
  if (!token) return { ok: false, unauthorized: true, error: 'Missing access token.' };

  try {
    const response = await fetch(`/api/test-session?sid=${encodeURIComponent(normalizedSid)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        disabled: Boolean(data && data.disabled),
        error: data && data.error ? String(data.error) : 'Unable to delete draft session.'
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Draft session delete failed.' };
  }
}

async function persistDraftNow(reason = 'manual') {
  const snapshot = buildDraftSnapshot(reason);
  if (!snapshot) return;

  saveDraftLocal(snapshot);
  if (!S.isLoggedIn || draftBackendUnavailable) return;

  const result = await saveDraftSessionRemote(snapshot);
  if (!result.ok && result.disabled) {
    draftBackendUnavailable = true;
  }
}

async function flushDraftAutosave(reason = 'debounced') {
  if (!S.testActive) return;
  if (draftAutosaveInFlight) {
    draftAutosaveQueued = true;
    return;
  }

  draftAutosaveInFlight = true;
  try {
    await persistDraftNow(reason);
  } finally {
    draftAutosaveInFlight = false;
    if (draftAutosaveQueued) {
      draftAutosaveQueued = false;
      void flushDraftAutosave('queued');
    }
  }
}

function scheduleDraftAutosave(reason = 'interaction') {
  if (!S.testActive) return;
  if (draftAutosaveDebounceTimer) clearTimeout(draftAutosaveDebounceTimer);
  draftAutosaveDebounceTimer = setTimeout(() => {
    draftAutosaveDebounceTimer = null;
    void flushDraftAutosave(reason);
  }, TEST_DRAFT_AUTOSAVE_DEBOUNCE_MS);
}

function startDraftAutosaveLoop() {
  if (draftAutosaveIntervalTimer) {
    clearInterval(draftAutosaveIntervalTimer);
    draftAutosaveIntervalTimer = null;
  }
  if (!S.testActive) return;

  draftAutosaveIntervalTimer = setInterval(() => {
    void flushDraftAutosave('interval');
  }, TEST_DRAFT_AUTOSAVE_INTERVAL_MS);
}

function stopDraftAutosaveLoop() {
  if (draftAutosaveDebounceTimer) {
    clearTimeout(draftAutosaveDebounceTimer);
    draftAutosaveDebounceTimer = null;
  }
  if (draftAutosaveIntervalTimer) {
    clearInterval(draftAutosaveIntervalTimer);
    draftAutosaveIntervalTimer = null;
  }
}

function persistDraftOnPageExit() {
  const snapshot = buildDraftSnapshot('page_exit');
  if (!snapshot) return;
  saveDraftLocal(snapshot);
}

function inferDraftSection(draft, questions) {
  if (draft && typeof draft.section === 'string' && draft.section.trim()) {
    return draft.section.trim().toLowerCase();
  }
  if (!Array.isArray(questions) || !questions.length) return 'unknown';
  const hasEnglish = questions.some((question) => question && question.section === 'english');
  const hasMath = questions.some((question) => question && question.section === 'math');
  if (hasEnglish && hasMath) return 'full';
  if (hasEnglish) return 'english';
  if (hasMath) return 'math';
  return 'unknown';
}

function mapQuestionPoolById(pools) {
  const map = new Map();
  const all = [
    ...(Array.isArray(pools && pools.english) ? pools.english : []),
    ...(Array.isArray(pools && pools.math) ? pools.math : [])
  ];
  all.forEach((question) => {
    const id = question && question.id ? String(question.id).trim() : '';
    if (!id || map.has(id)) return;
    map.set(id, question);
  });
  return map;
}

async function materializeDraftQuestions(draft) {
  const snapshotQuestions = Array.isArray(draft && draft.questionsSnapshot)
    ? draft.questionsSnapshot.filter((item) => item && typeof item === 'object')
    : [];
  if (snapshotQuestions.length) return snapshotQuestions;

  const questionIds = Array.isArray(draft && draft.questionIds)
    ? draft.questionIds.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (!questionIds.length) return [];

  const pools = await loadGeneratedQuestionBank();
  const byId = mapQuestionPoolById(pools);
  const restored = questionIds
    .map((id) => byId.get(id))
    .filter(Boolean);

  if (restored.length !== questionIds.length) {
    return [];
  }
  return restored;
}

function applyDraftState(draft, sid, questions) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  if (!safeQuestions.length) return false;

  const section = inferDraftSection(draft, safeQuestions);
  const timeLimitSeconds = Math.max(1, Number(draft && draft.remainingTimeSeconds) || 0);
  const curIndex = Number.isInteger(Number(draft && draft.currentQuestionIndex)) ? Number(draft.currentQuestionIndex) : 0;
  const clampedIndex = Math.min(Math.max(curIndex, 0), safeQuestions.length - 1);

  S.questions = safeQuestions;
  S.answers = normalizeDraftAnswers(draft && draft.answers, safeQuestions.length);
  S.flags = normalizeDraftFlags(draft && draft.flags, safeQuestions.length);
  S.curQ = clampedIndex;
  S.timerPaused = Boolean(draft && draft.timerPaused);
  S.timeLeft = timeLimitSeconds;
  S.testActive = true;
  S.section = section;
  S.customTestLabel = draft && draft.customTestLabel ? String(draft.customTestLabel) : '';
  S.testSessionId = sid;
  S.testSessionStartedAt = draft && draft.startedAt ? String(draft.startedAt) : new Date().toISOString();

  document.getElementById('tb-sec-lbl').textContent = getSectionDisplayLabel(section, S.customTestLabel);
  updTimerPauseButton();
  updTimerDisplay();

  setView('test');
  requestAnimationFrame(() => {
    buildQNav();
    renderQ(S.curQ);
    if (S.timerPaused) {
      clearTimer();
      updTimerPauseButton();
      updTimerDisplay();
      return;
    }
    startTimer();
  });

  return true;
}

async function restoreDraftSessionBySid(sid) {
  const normalizedSid = normalizeSessionId(sid);
  if (!normalizedSid) return false;

  let remoteDraft = null;
  if (S.isLoggedIn) {
    const remote = await fetchDraftSessionRemote(normalizedSid);
    if (remote.ok && remote.draft) {
      remoteDraft = remote.draft;
    }
    if (!remote.ok && remote.disabled) {
      draftBackendUnavailable = true;
    }
  }

  const draft = remoteDraft || readDraftLocal(normalizedSid);
  if (!draft || typeof draft !== 'object') return false;

  let questions;
  try {
    questions = await materializeDraftQuestions(draft);
  } catch {
    return false;
  }

  if (!applyDraftState(draft, normalizedSid, questions)) {
    return false;
  }

  upsertSidInUrl(normalizedSid);
  startDraftAutosaveLoop();
  scheduleDraftAutosave('restore');
  return true;
}

function clearActiveDraftSession(options = {}) {
  const clearUrl = options && Object.prototype.hasOwnProperty.call(options, 'clearUrl')
    ? Boolean(options.clearUrl)
    : true;
  const sid = normalizeSessionId(S.testSessionId || getSidFromUrl());

  stopDraftAutosaveLoop();

  if (!sid) {
    S.testSessionId = '';
    S.testSessionStartedAt = null;
    if (clearUrl) clearSidFromUrl();
    return;
  }

  deleteDraftLocal(sid);
  if (S.isLoggedIn && !draftBackendUnavailable) {
    void deleteDraftSessionRemote(sid);
  }

  S.testSessionId = '';
  S.testSessionStartedAt = null;
  if (clearUrl) clearSidFromUrl();
}

function beginPreparedTestSession({ questions, section, timeLimitSeconds, label, sid }) {
  const previousSid = normalizeSessionId(S.testSessionId || getSidFromUrl());
  const nextSid = normalizeSessionId(sid) || createTestSessionId();
  stopDraftAutosaveLoop();

  if (previousSid && previousSid !== nextSid) {
    deleteDraftLocal(previousSid);
    if (S.isLoggedIn && !draftBackendUnavailable) {
      void deleteDraftSessionRemote(previousSid);
    }
  }

  S.questions = Array.isArray(questions) ? questions : [];
  S.answers = {};
  S.flags = new Set();
  S.curQ = 0;
  S.timerPaused = false;
  S.timeLeft = Math.max(60, Number(timeLimitSeconds) || 0);
  S.testActive = true;
  S.section = section;
  S.customTestLabel = label || '';
  S.testSessionId = nextSid;
  S.testSessionStartedAt = new Date().toISOString();
  draftBackendUnavailable = false;

  upsertSidInUrl(nextSid);

  document.getElementById('tb-sec-lbl').textContent = getSectionDisplayLabel(section, label);
  updTimerPauseButton();
  updTimerDisplay();

  setView('test');
  requestAnimationFrame(() => {
    buildQNav();
    renderQ(0);
    startTimer();
    startDraftAutosaveLoop();
    scheduleDraftAutosave('start');
  });
}

async function launchQueuedReviewTestIfPresent() {
  const config = getQueuedReviewTest();
  clearQueuedReviewTest();

  if (!config || !Array.isArray(config.questions) || !config.questions.length) {
    toast('That review test was not available anymore. Build it again from the Study section.', 'wn', 4200);
    return false;
  }

  const normalizedSection = config.section === 'english' || config.section === 'math' || config.section === 'full'
    ? config.section
    : 'full';

  setView('loading');
  await new Promise((resolve) => setTimeout(resolve, 300));
  beginPreparedTestSession({
    questions: config.questions,
    section: normalizedSection,
    timeLimitSeconds: config.timeLimitSeconds,
    label: config.label || 'Review Test'
  });
  return true;
}

function trackEvent(name, payload = {}) {
  const safeName = String(name || '').trim();
  if (!safeName) return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: safeName, ...payload });
  } catch {}
  try {
    console.log('analytics_event', { event: safeName, ...payload });
  } catch {}
}

/* ── AUTH ── */
function publishNavbarState() {
  if (typeof window.setNavbarState === 'function') {
    window.setNavbarState({
      isLoggedIn: Boolean(S.isLoggedIn),
      isPremium: Boolean(S.isPremium)
    });
  } else if (typeof window.refreshNavbarState === 'function') {
    window.refreshNavbarState();
  }
}

function updateAuthUI() {
  const btn = document.getElementById('auth-btn');
  if (btn) {
    const nextLabel = S.isLoggedIn ? 'Log Out' : 'Log In';
    btn.textContent = nextLabel;
  }
  const mobileAuth = document.getElementById('mobile-auth-link');
  if (mobileAuth) mobileAuth.textContent = S.isLoggedIn ? 'Log Out' : 'Log In';
  syncStartCtaLabels();
  publishNavbarState();
  applyHomeStudyNavOverride();
}

function applyHomeStudyNavOverride() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.classList.add('home-study-nav');
  const studyTarget = '/study.html';

  const authBtn = document.getElementById('auth-btn');
  if (authBtn) {
    authBtn.textContent = 'Study';
    authBtn.onclick = () => { window.location.href = studyTarget; };
  }

  const mobileAuth = document.getElementById('mobile-auth-link');
  if (mobileAuth) {
    mobileAuth.textContent = 'Study';
    mobileAuth.setAttribute('href', studyTarget);
    mobileAuth.onclick = (event) => {
      event.preventDefault();
      closeMobileMenu();
      window.location.href = studyTarget;
    };
  }
}

function syncStartCtaLabels() {
  const isPremium = Boolean(S.isPremium);

  document.querySelectorAll('[data-start-cta]').forEach((el) => {
    const freeText = el.getAttribute('data-free-text') || '';
    const premiumText = el.getAttribute('data-premium-text') || freeText;
    el.textContent = isPremium ? premiumText : freeText;
  });

  const ctaTitle = document.getElementById('landing-cta-title');
  if (ctaTitle) {
    ctaTitle.textContent = isPremium ? 'Pick your next test and keep your streak alive' : 'Start your first free test right now';
  }

  const ctaSub = document.getElementById('landing-cta-sub');
  if (ctaSub) {
    ctaSub.textContent = isPremium
      ? 'Choose Reading & Writing, Math, or Full Test and jump in.'
      : 'No account needed. No credit card. Just pick your section and go.';
  }
}

function toggleMobileMenu() {
  const panel = document.getElementById('mobile-menu-panel');
  if (!panel) return;
  panel.classList.toggle('open');
}

function closeMobileMenu() {
  const panel = document.getElementById('mobile-menu-panel');
  if (panel) panel.classList.remove('open');
}

function setAccountTab(tab) {
  S.accountTab = tab;
  ['progress', 'billing', 'settings'].forEach(name => {
    const tabEl = document.getElementById('acct-tab-' + name);
    const panelEl = document.getElementById('acct-pane-' + name);
    if (tabEl) {
      const active = name === tab;
      tabEl.classList.toggle('active', active);
      tabEl.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    if (panelEl) panelEl.classList.toggle('active', name === tab);
  });

  if (tab === 'progress' && S.chart) {
    setTimeout(() => { if (S.chart) S.chart.resize(); }, 0);
  }
}

function isAdminPremiumEmail(email) {
  if (!email) return false;
  return ADMIN_PREMIUM_EMAILS.includes(String(email).trim().toLowerCase());
}

function isTestUserEmail(email) {
  if (!email) return false;
  return TEST_USER_EMAILS.includes(String(email).trim().toLowerCase());
}

function getLocalAuthUser() {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearLocalAuthUser() {
  localStorage.removeItem(LOCAL_AUTH_KEY);
}

async function initAuth() {
  if (!window.auth0 || !window.auth0.createAuth0Client) {
    toast('Auth SDK failed to load. Refresh and try again.', 'er');
    return;
  }

  authClient = await window.auth0.createAuth0Client({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: AUTH0_REDIRECT_URI
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
    useRefreshTokensFallback: true
  });

  const hasAuthParams = window.location.search.includes('code=') && window.location.search.includes('state=');
  if (hasAuthParams) {
    try {
      await authClient.handleRedirectCallback();
    } catch {
      toast('Login callback failed. Please log in again.', 'er');
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  S.isLoggedIn = false;
  S.isPremium = false;
  S.authUserId = '';
  S.user.email = '';
  const isAuthenticated = await authClient.isAuthenticated();
  S.authViaLocal = false;

  if (isAuthenticated) {
    S.isLoggedIn = true;
    const user = await authClient.getUser();
    if (user && user.sub) S.authUserId = String(user.sub);
    if (user && user.name && !S.user.name) S.user.name = user.name;
    if (user && user.email) S.user.email = user.email;
    S.isPremium = isAdminPremiumEmail(S.user.email);
  } else {
    const localUser = getLocalAuthUser();
    if (localUser) {
      S.isLoggedIn = true;
      S.authViaLocal = true;
      if (localUser.sub) S.authUserId = String(localUser.sub);
      if (localUser.name && !S.user.name) S.user.name = localUser.name;
      if (localUser.email) S.user.email = localUser.email;
      S.isPremium = isAdminPremiumEmail(S.user.email);
    }
  }

  authReady = true;
  updateAuthUI();
}

async function login() {
  if (!authClient) {
    toast('Auth is not ready yet. Try again in a second.', 'wn');
    return;
  }
  await authClient.loginWithRedirect({
    authorizationParams: {
      redirect_uri: AUTH0_REDIRECT_URI
    }
  });
}

function logout() {
  clearLocalAuthUser();
  S.sessionCache = [];
  S.scoreStoreDisabled = false;
  if (S.authViaLocal) {
    S.authViaLocal = false;
    S.isLoggedIn = false;
    S.isPremium = false;
    S.authUserId = '';
    S.user.email = '';
    updateAuthUI();
    return;
  }
  if (!authClient) return;
  authClient.logout({
    logoutParams: {
      returnTo: AUTH0_REDIRECT_URI
    }
  });
}

async function handleAuthButton() {
  if (!authReady) {
    toast('Auth is still loading. Please try again.', 'wn');
    return;
  }
  if (S.isLoggedIn) logout();
  else window.location.href = '/login.html';
}

async function getAccessToken() {
  if (!S.isLoggedIn) return '';

  if (S.authViaLocal) {
    const localUser = getLocalAuthUser();
    return localUser && localUser.accessToken ? String(localUser.accessToken) : '';
  }

  if (!authClient) return '';
  try {
    const token = await authClient.getTokenSilently({
      authorizationParams: { scope: 'openid profile email' }
    });
    return token || '';
  } catch {
    // Safari and some social auth flows can block silent token refresh; fallback to popup.
    try {
      const popupToken = await authClient.getTokenWithPopup({
        authorizationParams: { scope: 'openid profile email' }
      });
      return popupToken || '';
    } catch {
      return '';
    }
  }
}

async function refreshPremiumStatus() {
  if (!S.isLoggedIn) return Boolean(S.isPremium);

  const token = await getAccessToken();
  if (!token) return Boolean(S.isPremium);

  try {
    const response = await fetch('/api/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (response.ok) {
      S.isPremium = Boolean(data.isPremium) || isAdminPremiumEmail(S.user.email);
      if (data.userId) S.authUserId = String(data.userId);
      S.subscriptionStatus = data && data.subscriptionStatus ? String(data.subscriptionStatus).toLowerCase() : 'free';
      S.cancelAtPeriodEnd = Boolean(data && data.cancelAtPeriodEnd);
      S.currentPeriodEnd = data && data.currentPeriodEnd ? String(data.currentPeriodEnd) : null;
      S.cancelAt = data && data.cancelAt ? String(data.cancelAt) : null;
      S.canceledAt = data && data.canceledAt ? String(data.canceledAt) : null;
      updateAuthUI();
    }
  } catch {
    // Keep current in-memory status if entitlement lookup is temporarily unavailable.
  }

  return Boolean(S.isPremium);
}

function formatBillingDate(isoValue) {
  if (!isoValue) return '';
  const dt = new Date(isoValue);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getBillingTimingText() {
  if (S.canceledAt) {
    const endedOn = formatBillingDate(S.canceledAt);
    return endedOn ? `Ended on ${endedOn}` : 'Ended';
  }

  if (S.cancelAtPeriodEnd) {
    const endDate = formatBillingDate(S.currentPeriodEnd || S.cancelAt);
    return endDate ? `Cancels on ${endDate}` : 'Cancels at period end';
  }

  if (S.isPremium) {
    const renewDate = formatBillingDate(S.currentPeriodEnd);
    return renewDate ? `Renews on ${renewDate}` : 'Auto-renews';
  }

  const status = String(S.subscriptionStatus || 'free').toLowerCase();
  if (status && status !== 'free') {
    return `Status: ${status}`;
  }

  return 'No active subscription';
}

function dismissCheckoutStatus() {
  const root = document.getElementById('checkout-status');
  if (!root) return;
  root.classList.add('hidden');
}

function updateCheckoutStatusUI(input) {
  const root = document.getElementById('checkout-status');
  const chip = document.getElementById('checkout-status-chip');
  const title = document.getElementById('checkout-status-title');
  const body = document.getElementById('checkout-status-body');
  const primary = document.getElementById('checkout-status-primary');
  const secondary = document.getElementById('checkout-status-secondary');
  if (!root || !chip || !title || !body || !primary || !secondary) return;

  const variant = input && input.variant ? String(input.variant) : 'pending';
  root.classList.remove('hidden', 'success', 'pending', 'cancel');
  root.classList.add(variant);

  chip.textContent = input && input.chip ? String(input.chip) : 'Syncing';
  title.textContent = input && input.title ? String(input.title) : 'Activating Premium...';
  body.textContent = input && input.body ? String(input.body) : 'We are syncing your payment with your account now.';

  primary.classList.toggle('hidden', !(input && input.primaryLabel && input.primaryOnClick));
  secondary.classList.toggle('hidden', !(input && input.secondaryLabel && input.secondaryOnClick));

  primary.textContent = input && input.primaryLabel ? String(input.primaryLabel) : '';
  secondary.textContent = input && input.secondaryLabel ? String(input.secondaryLabel) : '';

  primary.onclick = input && input.primaryOnClick ? input.primaryOnClick : null;
  secondary.onclick = input && input.secondaryOnClick ? input.secondaryOnClick : null;
}

function clearCheckoutQueryParams() {
  const searchParams = new URLSearchParams(window.location.search);
  ['checkout', 'plan', 'session_id'].forEach((key) => searchParams.delete(key));
  const nextQuery = searchParams.toString();
  const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
  window.history.replaceState({}, document.title, nextUrl);
}

async function pollForPremiumActivation(planLabel) {
  S.checkoutSyncInProgress = true;
  for (let attempt = 1; attempt <= CHECKOUT_SYNC_ATTEMPTS; attempt += 1) {
    const activated = await refreshPremiumStatus();
    if (activated) {
      S.checkoutSyncInProgress = false;
      return true;
    }

    const checksLeft = CHECKOUT_SYNC_ATTEMPTS - attempt;
    if (checksLeft <= 0) break;

    updateCheckoutStatusUI({
      variant: 'pending',
      chip: 'Syncing',
      title: 'Payment received. Activating Premium...',
      body: `${planLabel} payment was successful. We are waiting for Stripe webhook confirmation. Checking again in ${Math.ceil(CHECKOUT_SYNC_DELAY_MS / 1000)}s (${checksLeft} checks left).`,
      primaryLabel: 'View Plans',
      primaryOnClick: () => scrollToSection('#pricing'),
      secondaryLabel: 'Go to Dashboard',
      secondaryOnClick: () => showDash()
    });

    await new Promise((resolve) => setTimeout(resolve, CHECKOUT_SYNC_DELAY_MS));
  }

  S.checkoutSyncInProgress = false;
  return false;
}

async function handleCheckoutReturn() {
  const searchParams = new URLSearchParams(window.location.search);
  const checkoutStatus = searchParams.get('checkout');
  if (!checkoutStatus) return;

  const plan = (searchParams.get('plan') || 'premium').toLowerCase();
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  if (checkoutStatus === 'success') {
    trackEvent('checkout_return_success', { plan });
    updateCheckoutStatusUI({
      variant: 'pending',
      chip: 'Syncing',
      title: 'Payment received. Activating Premium...',
      body: `${planLabel} plan purchase was successful. We are syncing your account now.`,
      primaryLabel: 'Go to Dashboard',
      primaryOnClick: () => showDash()
    });

    const activeNow = await refreshPremiumStatus();
    const becameActive = activeNow || await pollForPremiumActivation(planLabel);

    if (becameActive) {
      updateCheckoutStatusUI({
        variant: 'success',
        chip: 'Unlocked',
        title: 'Premium unlocked. You are ready to go.',
        body: 'All premium practice tests and explanations are now active on your account.',
        primaryLabel: 'Start Premium Test',
        primaryOnClick: () => { openOnboard(); },
        secondaryLabel: 'Go to Dashboard',
        secondaryOnClick: () => showDash()
      });
      trackEvent('premium_activated', { source: 'checkout_return', plan });
      confetti();
      toast('Premium is active. Let\'s get your next score jump.', 'ok', 4200);
    } else {
      updateCheckoutStatusUI({
        variant: 'pending',
        chip: 'Pending',
        title: 'Still syncing your subscription',
        body: 'Your payment appears successful, but webhook confirmation is delayed. Reload in a few moments if premium does not appear yet.',
        primaryLabel: 'Refresh Status',
        primaryOnClick: async () => {
          const isActive = await refreshPremiumStatus();
          if (isActive) {
            updateCheckoutStatusUI({
              variant: 'success',
              chip: 'Unlocked',
              title: 'Premium unlocked. You are ready to go.',
              body: 'Your subscription just synced successfully.',
              primaryLabel: 'Start Premium Test',
              primaryOnClick: () => { openOnboard(); },
              secondaryLabel: 'Go to Dashboard',
              secondaryOnClick: () => showDash()
            });
            confetti();
            trackEvent('premium_activated', { source: 'manual_refresh', plan });
          } else {
            toast('Still syncing. Try again in a few seconds.', 'wn', 3200);
          }
        },
        secondaryLabel: 'Go to Dashboard',
        secondaryOnClick: () => showDash()
      });
      trackEvent('checkout_sync_pending', { plan });
      toast('Payment received. Subscription sync is still in progress.', 'wn', 5200);
    }

    clearCheckoutQueryParams();
    return;
  }

  if (checkoutStatus === 'cancel') {
    trackEvent('checkout_return_cancel', { plan });
    updateCheckoutStatusUI({
      variant: 'cancel',
      chip: 'Canceled',
      title: 'Checkout canceled. No charge was made.',
      body: 'You can pick another plan any time and continue using your current account.',
      primaryLabel: 'View Plans',
      primaryOnClick: () => scrollToSection('#pricing'),
      secondaryLabel: 'Keep Practicing',
      secondaryOnClick: () => openOnboard()
    });
    toast('Checkout canceled. No charge was made.', 'wn', 4000);
    clearCheckoutQueryParams();
  }
}

/* ── PRICING ── */
const PLANS = {
  weekly:  { label:'Weekly',  perWeek:'$8', billed:'$8/week',    billedStrong:'Billed $8 weekly',    pw:8 },
  monthly: { label:'Monthly', perWeek:'$5', billed:'$20/month',  billedStrong:'Billed $20 monthly',  pw:20 },
  annual:  { label:'Annually',  perWeek:'$2', billed:'$96/year',  billedStrong:'Billed $96 annually',  pw:96 }
};

/* ── VIEWS ── */
function setView(v, options = {}) {
  const preserveScroll = Boolean(options.preserveScroll);
  S.view = v;

  // Landing show/hide with display style
  document.getElementById('landing-screen').style.display = v === 'landing' ? '' : 'none';

  // All full-screen panels force display directly, don't rely on class alone
  const panels = {
    'loading': document.getElementById('loading-screen'),
    'test':    document.getElementById('test-screen'),
    'results': document.getElementById('results-screen'),
    'dash':    document.getElementById('dash-screen'),
  };

  Object.entries(panels).forEach(([name, el]) => {
    if (!el) return;
    const active = v === name;
    // Set both class and direct style so nothing can block it
    el.classList.toggle('show', active);
    if (name === 'loading') el.style.display = active ? 'flex' : 'none';
    else if (name === 'test') el.style.display = active ? 'flex' : 'none';
    else el.style.display = active ? 'block' : 'none';
  });

  if (v === 'landing') startLandingTimer();
  else clearLandingTimer();

  // Toggle navbar test mode (only left 3 buttons visible during test)
  if (typeof window.setNavTestMode === 'function') {
    window.setNavTestMode(v === 'test');
  }

  if (!preserveScroll) {
    window.scrollTo(0, 0);
  }

  syncLandingDeepDive();
}

function closeLeaveTestModal() {
  const overlay = document.getElementById('leave-test-overlay');
  if (overlay) overlay.classList.remove('open');
}

function confirmLeaveTest() {
  const destination = S.leaveTestDestination || 'landing';
  closeLeaveTestModal();
  clearTimer();
  S.testActive = false;
  clearActiveDraftSession({ clearUrl: true });

  if (destination === 'dash') {
    window.location.href = '/my-account.html';
    return;
  }

  setView('landing');
}

function requestLeaveTest(destination) {
  if (!S.testActive) {
    clearActiveDraftSession({ clearUrl: true });
    if (destination === 'dash') {
      window.location.href = '/my-account.html';
      return;
    }
    setView('landing');
    return;
  }

  S.leaveTestDestination = destination;
  const overlay = document.getElementById('leave-test-overlay');
  if (!overlay) {
    confirmLeaveTest();
    return;
  }
  overlay.classList.add('open');
}

function closeActionConfirm(result) {
  const overlay = document.getElementById('action-confirm-overlay');
  if (overlay) overlay.classList.remove('open');
  const resolver = actionConfirmResolver;
  actionConfirmResolver = null;
  if (resolver) resolver(Boolean(result));
}

function openActionConfirm(options) {
  const overlay = document.getElementById('action-confirm-overlay');
  if (!overlay) return Promise.resolve(false);

  if (actionConfirmResolver) {
    actionConfirmResolver(false);
    actionConfirmResolver = null;
  }

  const config = options || {};
  const eyebrow = document.getElementById('action-confirm-eyebrow');
  const title = document.getElementById('action-confirm-title');
  const body = document.getElementById('action-confirm-body');
  const note = document.getElementById('action-confirm-note');
  const icon = document.getElementById('action-confirm-icon');
  const closeBtn = document.getElementById('action-confirm-close');
  const modal = overlay.querySelector('.action-confirm-modal');
  const cancelBtn = document.getElementById('action-confirm-cancel-btn');
  const confirmBtn = document.getElementById('action-confirm-confirm-btn');

  if (eyebrow) eyebrow.textContent = config.eyebrow || 'Before you continue';
  if (title) title.textContent = config.title || 'Confirm action';
  if (body) body.textContent = config.body || 'Please review this action before continuing.';
  if (note) {
    note.textContent = config.note || '';
    note.classList.toggle('hidden', !config.note);
  }
  if (icon) {
    icon.innerHTML = spriteIcon(config.icon || 'warning', 'ui-icon ui-icon-lg');
    icon.classList.toggle('hidden', config.showIcon === false);
  }
  if (closeBtn) closeBtn.classList.toggle('hidden', config.showClose === false);
  if (modal) modal.classList.toggle('is-compact', Boolean(config.compact));
  if (cancelBtn) cancelBtn.textContent = config.cancelText || 'Cancel';
  if (confirmBtn) {
    confirmBtn.textContent = config.confirmText || 'Continue';
    confirmBtn.classList.remove('is-gold', 'is-danger');
    if (config.tone === 'gold') confirmBtn.classList.add('is-gold');
    if (config.tone === 'danger') confirmBtn.classList.add('is-danger');
  }

  overlay.classList.add('open');
  return new Promise((resolve) => {
    actionConfirmResolver = resolve;
  });
}

function goLanding() {
  requestLeaveTest('landing');
}
function showDash() {
  requestLeaveTest('dash');
}

/* ── NAV SCROLL ── */
window.addEventListener('scroll',()=>document.querySelectorAll('#nav').forEach(n=>n.classList.toggle('scrolled',scrollY>20)));

/* ── SMOOTH SCROLL ── */
function scrollToSection(sel) { const el=document.querySelector(sel); if(el) el.scrollIntoView({behavior:'smooth'}); }

/* ── FAQ ── */
function faq(btn) {
  const open=btn.classList.contains('open');
  document.querySelectorAll('.faq-btn.open').forEach(b=>{b.classList.remove('open');b.closest('.faq-item').querySelector('.faq-body').classList.remove('open')});
  if(!open){btn.classList.add('open');btn.closest('.faq-item').querySelector('.faq-body').classList.add('open')}
}

/* ── BILLING TOGGLE (landing) ── */
document.querySelectorAll('input[name="billing"]').forEach(radio=>{
  radio.addEventListener('change',()=>updatePriceDisplay(radio.value));
});
function updatePriceDisplay(plan) {
  const mode = plan === 'monthly' ? 'monthly' : 'weekly';
  const isTrial = plan === 'trial';
  document.querySelectorAll('[data-plan][data-rate]').forEach(el => {
    const planKey = el.getAttribute('data-plan');
    if (!planKey || !BILLING_DISPLAY[planKey]) return;
    el.textContent = BILLING_DISPLAY[planKey][mode];
  });
  const freeUnit = document.getElementById('free-price-unit');
  const weeklyUnit = document.getElementById('weekly-price-unit');
  const monthlyUnit = document.getElementById('monthly-price-unit');
  const annualUnit = document.getElementById('annual-price-unit');
  const weeklyBilledWrap = document.getElementById('weekly-price-billed');
  const monthlyBilledWrap = document.getElementById('monthly-price-billed');
  const annualBilledWrap = document.getElementById('annual-price-billed');
  const weeklyBill = document.getElementById('weekly-bill-main');
  const monthlyBill = document.getElementById('monthly-bill-main');
  const annualBill = document.getElementById('annual-bill-main');
  const weeklyCard = document.getElementById('weekly-price-card');
  const weeklyCta = document.getElementById('weekly-price-cta');
  const unitLabel = mode === 'weekly' ? 'Per Week' : 'Per Month';
  if (freeUnit) freeUnit.textContent = unitLabel;
  if (weeklyUnit) weeklyUnit.textContent = unitLabel;
  if (monthlyUnit) monthlyUnit.textContent = unitLabel;
  if (annualUnit) annualUnit.textContent = unitLabel;
  if (weeklyBilledWrap) weeklyBilledWrap.hidden = mode !== 'weekly';
  if (monthlyBilledWrap) monthlyBilledWrap.hidden = mode !== 'weekly';
  if (annualBilledWrap) annualBilledWrap.hidden = mode !== 'weekly';
  if (weeklyBill) weeklyBill.textContent = mode === 'weekly' ? 'Billed $8 weekly' : 'Billed $32 monthly equivalent';
  if (monthlyBill) monthlyBill.textContent = mode === 'weekly' ? 'Billed $20 monthly' : 'Billed $20 monthly';
  if (annualBill) annualBill.textContent = mode === 'weekly' ? 'Billed $96 annually' : 'Billed $8 monthly equivalent';
  if (weeklyCard) weeklyCard.classList.toggle('trial-focus', isTrial);
  if (weeklyCta) {
    weeklyCta.className = isTrial ? 'btn-price-trial' : 'btn-price-ghost';
    weeklyCta.textContent = 'Choose Weekly';
  }
}

function renderLandingDemo(index) {
  const q = LANDING_DEMO_QUESTIONS[index];
  if (!q) return;
  S.demoIndex = index;

  const label = document.getElementById('demo-q-label');
  const text = document.getElementById('demo-q-text');
  const opts = document.getElementById('demo-opts');
  const exp = document.getElementById('demo-exp');
  const dots = document.getElementById('demo-dots');
  const phoneBody = document.querySelector('.phone-body');
  if (!label || !text || !opts || !exp || !dots || !phoneBody) return;

  phoneBody.classList.toggle('analytics-active', Boolean(S.demoCompleted));
  phoneBody.classList.toggle('grading-active', Boolean(S.demoGrading));
  renderDemoControls();
  if (S.demoCompleted || S.demoGrading) return;

  label.textContent = q.section.toUpperCase() + ' · QUESTION ' + (index + 1) + ' OF ' + LANDING_DEMO_QUESTIONS.length;
  text.textContent = q.question;
  exp.className = 'phone-exp';
  exp.textContent = '';

  opts.innerHTML = '';
  const previousAnswer = S.demoAnswers[index];
  const previousStatus = S.demoStatus[index];

  q.choices.forEach((choice, i) => {
    const letter = ['A', 'B', 'C', 'D'][i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'phone-opt';
    btn.innerHTML = '<span class="phone-opt-k">' + letter + '</span>' + choice;

    if (previousAnswer === letter) {
      btn.classList.add(previousStatus === 'correct' ? 'correct' : 'wrong');
    }

    btn.onclick = () => {
      const all = opts.querySelectorAll('.phone-opt');
      all.forEach(o => o.classList.remove('correct', 'wrong'));
      const isCorrect = letter === q.answer;
      btn.classList.add(isCorrect ? 'correct' : 'wrong');

      S.demoAnswers[index] = letter;
      S.demoStatus[index] = isCorrect ? 'correct' : 'wrong';

      if (!isCorrect) {
        const rightIdx = ['A', 'B', 'C', 'D'].indexOf(q.answer);
        if (rightIdx >= 0 && all[rightIdx]) all[rightIdx].classList.add('correct');
      }

      exp.className = 'phone-exp show ' + (isCorrect ? 'good' : 'bad');
      exp.textContent = (isCorrect ? 'Correct. ' : 'Not quite. ') + q.explanation;
      renderDemoControls();
    };
    opts.appendChild(btn);
  });

  renderDemoControls();
}

function renderDemoControls() {
  const dots = document.getElementById('demo-dots');
  const doneBtn = document.getElementById('demo-done-btn');
  if (!dots || !doneBtn) return;

  const currentIndex = Number(S.demoIndex) || 0;
  const answeredCount = LANDING_DEMO_QUESTIONS.filter((_, i) => Boolean(S.demoAnswers[i])).length;
  const allAnswered = answeredCount === LANDING_DEMO_QUESTIONS.length;

  if (S.demoGrading) {
    dots.className = 'phone-prog';
    dots.innerHTML = '';
    doneBtn.hidden = true;
    return;
  }

  if (S.demoCompleted) {
    dots.className = 'phone-prog phone-prog-actions';
    dots.innerHTML = [
      '<button type="button" class="phone-action-btn retry" onclick="retryDemoTest()">Retry</button>',
      '<button type="button" class="phone-action-btn full" onclick="openOnboard()">Full Test</button>'
    ].join('');
    doneBtn.hidden = true;
    return;
  }

  dots.className = 'phone-prog';
  dots.innerHTML = '';
  LANDING_DEMO_QUESTIONS.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'prog-dot';
    if (i === currentIndex) dot.classList.add('cur');
    else if (S.demoStatus[i] === 'correct') dot.classList.add('done');
    else if (S.demoStatus[i] === 'wrong') dot.classList.add('wrong');
    dot.textContent = String(i + 1);
    dot.setAttribute('aria-label', 'Go to demo question ' + (i + 1));
    dot.onclick = () => renderLandingDemo(i);
    dots.appendChild(dot);
  });

  doneBtn.hidden = false;
  doneBtn.disabled = !allAnswered;
  doneBtn.classList.toggle('ready', allAnswered);
}

function attachDemoSwipe() {
  const shell = document.querySelector('.hero-phone');
  if (!shell) return;
  let startX = 0;
  shell.addEventListener('touchstart', e => {
    if (!e.touches || !e.touches.length) return;
    startX = e.touches[0].clientX;
  }, { passive: true });
  shell.addEventListener('touchend', e => {
    if (!e.changedTouches || !e.changedTouches.length) return;
    const endX = e.changedTouches[0].clientX;
    const delta = endX - startX;
    if (Math.abs(delta) < 36) return;
    if (delta < 0) renderLandingDemo((S.demoIndex + 1) % LANDING_DEMO_QUESTIONS.length);
    else renderLandingDemo((S.demoIndex - 1 + LANDING_DEMO_QUESTIONS.length) % LANDING_DEMO_QUESTIONS.length);
  }, { passive: true });
}

function completeDemoTest() {
  const allAnswered = LANDING_DEMO_QUESTIONS.every((_, i) => Boolean(S.demoAnswers[i]));
  if (!allAnswered) return;
  clearLandingTimer();
  S.demoGrading = true;
  renderLandingDemo(S.demoIndex);
  setTimeout(() => {
    S.demoGrading = false;
    S.demoCompleted = true;
    renderLandingDemo(S.demoIndex);
    renderDemoAnalytics();
  }, 1400);
}

function renderDemoAnalytics() {
  const mathIds = [0, 2];
  const englishIds = [1, 3];
  const scoreFor = (ids) => {
    const correct = ids.filter((id) => S.demoStatus[id] === 'correct').length;
    return Math.round((correct / ids.length) * 100);
  };

  const english = scoreFor(englishIds);
  const math = scoreFor(mathIds);
  const overall = Math.round((Object.values(S.demoStatus).filter((status) => status === 'correct').length / LANDING_DEMO_QUESTIONS.length) * 100);
  const rating = document.getElementById('demo-analytics-rating');
  const copy = document.getElementById('demo-analytics-copy');

  if (rating) {
    if (overall >= 75) rating.textContent = 'Strong job finishing the demo.';
    else if (overall >= 50) rating.textContent = 'Good work completing the demo.';
    else rating.textContent = 'Nice effort finishing the demo.';
  }

  if (copy) {
    if (overall >= 75) copy.textContent = 'You are showing solid early proficiency. Keep going and build on this momentum.';
    else if (overall >= 50) copy.textContent = 'You are building real progress. A few more reps can turn this into stronger consistency.';
    else copy.textContent = 'You finished the set and that matters. This snapshot gives you a starting point to improve from.';
  }

  [
    ['english', english],
    ['math', math],
    ['overall', overall]
  ].forEach(([key, value]) => {
    const fill = document.getElementById('demo-analytics-' + key);
    const score = document.getElementById('demo-analytics-' + key + '-score');
    if (fill) {
      fill.style.width = '0%';
      requestAnimationFrame(() => {
        fill.style.width = value + '%';
      });
    }
    if (score) score.textContent = value + '%';
  });
}

function retryDemoTest() {
  startLandingTimer();
  S.demoGrading = false;
  S.demoCompleted = false;
  S.demoIndex = 0;
  S.demoAnswers = {};
  S.demoStatus = {};
  renderLandingDemo(0);
}

function seedGuestDemoProfile() {
  if (!S.user.name) S.user.name = 'Alex Rivera';
  if (!S.user.grade) S.user.grade = '11';
}

/* ── ONBOARDING ── */
function openOnboard() {
  if (!S.isLoggedIn) seedGuestDemoProfile();
  S.obStep=1; S.obSection=null;
  document.getElementById('ob-name').value=S.user.name||'';
  document.getElementById('ob-grade').value=S.user.grade||'';
  document.querySelectorAll('.sec-opt').forEach(o=>o.classList.remove('sel'));
  obUpdateStep(1);
  document.getElementById('onboard-overlay').classList.add('open');
}
function closeOnboard() { document.getElementById('onboard-overlay').classList.remove('open'); }

function pickSec(sec, el) {
  if (sec==='full' && !S.isPremium) { openPaywall('section'); return; }
  S.obSection=sec;
  document.querySelectorAll('.sec-opt').forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');
}

function obUpdateStep(step) {
  S.obStep=step;
  [1,2,3].forEach(i=>{
    document.getElementById(`ob-s${i}`).classList.toggle('hidden',i!==step);
    document.getElementById(`sd${i}`).classList.toggle('on',i<=step);
  });
  document.getElementById('ob-back').style.display=step>1?'':'none';
  const btn=document.getElementById('ob-next');
  if(step===3){btn.textContent='Start Test';btn.style.background='var(--green)';btn.style.boxShadow='0 4px 20px rgba(5,150,105,.35)'}
  else{btn.textContent='Continue';btn.style.background='';btn.style.boxShadow=''}
  const subs=['Step 1 of 3','Step 2 of 3','Ready to go!'];
  document.getElementById('ob-sub').textContent=subs[step-1];
  const titles=['Let\'s set up your test','Choose a section','You\'re all set!'];
  document.getElementById('ob-title').textContent=titles[step-1];
}

function obNext() {
  if (S.obStep===1) {
    const name=document.getElementById('ob-name').value.trim();
    const grade=document.getElementById('ob-grade').value;
    if (!name){toast('Enter your name first.','wn');return}
    if (!grade){toast('Please pick your grade','wn');return}
    S.user.name=name; S.user.grade=grade;
    obUpdateStep(2);
  } else if (S.obStep===2) {
    if (!S.obSection){toast('Pick a section to practice','wn');return}
    S.section=S.obSection;
    // Populate summary
    const gradeMap={8:'8th Grade',9:'9th Grade',10:'10th Grade',11:'11th Grade',12:'12th Grade'};
    const secNames={english:'Reading & Writing',math:'Math',full:'Full Test'};
    const qCounts={english:S.isPremium?27:FREE_Q, math:S.isPremium?22:FREE_Q, full:S.isPremium?49:FREE_Q};
    document.getElementById('rb-name').textContent=S.user.name;
    document.getElementById('rb-grade').textContent=gradeMap[S.user.grade]||S.user.grade;
    document.getElementById('rb-sec').textContent=secNames[S.section];
    document.getElementById('rb-qcount').textContent=qCounts[S.section]+' questions'+(S.isPremium?'':' (free tier)');
    document.getElementById('rb-time').textContent=getTestDurationSummary(S.section, S.isPremium);
    obUpdateStep(3);
  } else {
    closeOnboard(); startTest();
  }
}
function obBack(){if(S.obStep>1)obUpdateStep(S.obStep-1)}

/* ── PAYWALL ── */
let paywallCtx='';
function detectNativeStoreEnv() {
  const params = new URLSearchParams(window.location.search);
  const forced = String(params.get('purchasePlatform') || '').toLowerCase().trim();
  const ua = navigator.userAgent || '';
  const isIOS = forced === 'ios' || /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = forced === 'android' || /Android/i.test(ua);
  const hasNativeBridge =
    Boolean(window.BudyNativePurchase && typeof window.BudyNativePurchase.openPaywall === 'function') ||
    Boolean(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.budyPurchase) ||
    Boolean(window.AndroidBridge && typeof window.AndroidBridge.openPurchase === 'function') ||
    Boolean(window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function');
  const platform = forced === 'ios' || (isIOS && !forced) ? 'ios' : forced === 'android' || (isAndroid && !forced) ? 'android' : 'web';
  const usesNativeStore = forced === 'ios' || forced === 'android' || hasNativeBridge;
  return {
    platform,
    usesNativeStore,
    hasNativeBridge,
    storeLabel: platform === 'ios' ? 'App Store' : platform === 'android' ? 'Google Play' : 'Stripe'
  };
}

function requestNativeStorePurchase(plan) {
  const payload = { type: 'openPurchase', plan: plan || 'monthly' };
  if (window.BudyNativePurchase && typeof window.BudyNativePurchase.openPaywall === 'function') {
    try { window.BudyNativePurchase.openPaywall(payload); } catch { window.BudyNativePurchase.openPaywall(payload.plan); }
    return true;
  }
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.budyPurchase && typeof window.webkit.messageHandlers.budyPurchase.postMessage === 'function') {
    window.webkit.messageHandlers.budyPurchase.postMessage(payload);
    return true;
  }
  if (window.AndroidBridge && typeof window.AndroidBridge.openPurchase === 'function') {
    window.AndroidBridge.openPurchase(payload.plan);
    return true;
  }
  if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    return true;
  }
  return false;
}

function openPaywall(ctx='') {
  paywallCtx=ctx;
  selectPlan(ctx === 'annual' ? 'annual' : 'monthly');
  // Adapt CTA for native store environments
  const nativeEnv = detectNativeStoreEnv();
  const ctaBtn = document.getElementById('pw-cta-btn');
  if (ctaBtn && nativeEnv.usesNativeStore) {
    ctaBtn.textContent = 'Continue with ' + nativeEnv.storeLabel + ' →';
  }
  document.getElementById('paywall-overlay').classList.add('open');
}
function closePaywall(){ document.getElementById('paywall-overlay').classList.remove('open') }

function selectPlan(plan) {
  S.selectedPlan=plan;
  ['weekly','monthly','annual'].forEach(p=>{
    const btn=document.getElementById('pwp-'+p);
    if(!btn)return;
    if(p===plan){
      btn.style.borderColor='var(--brand)';btn.style.background='var(--brand-pale)';
    } else {
      btn.style.borderColor='var(--line)';btn.style.background='#fff';
    }
  });
  const p=PLANS[plan];
  document.getElementById('pw-cta-btn').textContent=`Start ${p.label} Plan (${p.perWeek}/wk) →`;
}

async function handlePurchase() {
  if (!S.isLoggedIn) {
    toast('Please log in to continue.', 'wn');
    closePaywall();
    window.location.href = '/login.html';
    return;
  }

  if (S.isPremium) {
    if (isAdminPremiumEmail(S.user.email)) {
      toast('Admin premium access is active on this account.', 'ok');
    } else {
      toast('Premium access is already active on this account.', 'ok');
    }
    closePaywall();
    if (paywallCtx==='results' && S.results) renderResults(S.results);
    return;
  }

  // ── Native store detection ────────────────────────────────────────────────
  const nativeEnv = detectNativeStoreEnv();
  if (nativeEnv.usesNativeStore) {
    const cta = document.getElementById('pw-cta-btn');
    if (cta) { cta.disabled = true; cta.textContent = 'Opening ' + nativeEnv.storeLabel + '...'; }
    const sent = requestNativeStorePurchase(S.selectedPlan || 'monthly');
    if (sent) {
      toast('Opening ' + nativeEnv.storeLabel + ' purchase flow...', 'ok');
      closePaywall();
    } else {
      toast(nativeEnv.storeLabel + ' purchase bridge is not connected in this build.', 'wn');
      if (cta) { cta.disabled = false; cta.textContent = 'Start ' + nativeEnv.storeLabel; }
    }
    return;
  }

  const cta = document.getElementById('pw-cta-btn');
  const originalText = cta ? cta.textContent : '';
  if (cta) {
    cta.disabled = true;
    cta.textContent = 'Redirecting to checkout...';
  }

  try {
    trackEvent('checkout_started', {
      plan: S.selectedPlan,
      view: S.view,
      source: paywallCtx || 'paywall'
    });

    const token = await getAccessToken();
    if (!token) {
      throw new Error('Your session expired. Please log in again.');
    }

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ plan: S.selectedPlan })
    });
    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error((data && data.error) ? data.error : 'Could not start checkout.');
    }

    trackEvent('checkout_redirected', { plan: S.selectedPlan });

    window.location.href = data.url;
  } catch (err) {
    trackEvent('checkout_error', { plan: S.selectedPlan, message: err && err.message ? String(err.message) : 'unknown' });
    toast(err.message || 'Could not start checkout. Try again.', 'er');
    if (cta) {
      cta.disabled = false;
      cta.textContent = originalText;
    }
  }
}

async function openBillingPortal() {
  if (!S.isLoggedIn) {
    toast('Please log in to manage billing.', 'wn');
    window.location.href = '/login.html';
    return;
  }

  const btn = document.getElementById('billing-portal-btn');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Opening portal...';
  }

  try {
    trackEvent('billing_portal_open_requested', {
      isPremium: Boolean(S.isPremium),
      view: S.view
    });

    const token = await getAccessToken();
    if (!token) {
      throw new Error('Your session expired. Please log in again.');
    }

    const response = await fetch('/api/create-billing-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({})
    });
    const data = await response.json();

    if (response.status === 403 || response.status === 409) {
      toast('Billing portal unlocks after you start a paid plan.', 'wn', 4200);
      openPaywall('pricing');
      return;
    }

    if (!response.ok || !data.url) {
      throw new Error((data && data.error) ? data.error : 'Could not open billing portal.');
    }

    trackEvent('billing_portal_redirected', { isPremium: Boolean(S.isPremium) });
    window.location.href = data.url;
  } catch (err) {
    trackEvent('billing_portal_error', {
      message: err && err.message ? String(err.message) : 'unknown'
    });
    toast(err && err.message ? err.message : 'Could not open billing portal. Try again.', 'er');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText || 'Manage Billing';
    }
  }
}

async function cancelSubscriptionNow() {
  if (!S.isLoggedIn) {
    toast('Please log in to manage billing.', 'wn');
    window.location.href = '/login.html';
    return;
  }

  if (!S.isPremium) {
    toast('No active paid subscription to cancel.', 'wn', 3200);
    return;
  }

  const confirmed = await openActionConfirm({
    eyebrow: 'Billing change',
    title: 'Cancel Premium now?',
    body: 'Your premium access will end immediately and your account will switch back to the free plan.',
    note: 'This takes effect right away, so premium-only features lock again as soon as the cancellation finishes.',
    icon: 'card',
    cancelText: 'Keep Premium',
    confirmText: 'Cancel Now',
    tone: 'danger'
  });
  if (!confirmed) return;

  const btn = document.getElementById('billing-cancel-btn');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Canceling...';
  }

  try {
    trackEvent('billing_cancel_now_requested', {
      view: S.view,
      isPremium: Boolean(S.isPremium)
    });

    const token = await getAccessToken();
    if (!token) {
      throw new Error('Your session expired. Please log in again.');
    }

    const response = await fetch('/api/cancel-subscription-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({})
    });
    const data = await response.json();

    if (response.status === 409) {
      toast((data && data.error) ? data.error : 'No active paid subscription to cancel.', 'wn', 4200);
      await refreshPremiumStatus();
      renderDash();
      return;
    }

    if (!response.ok) {
      throw new Error((data && data.error) ? data.error : 'Could not cancel subscription immediately.');
    }

    trackEvent('billing_cancel_now_success', {
      status: data && data.subscriptionStatus ? String(data.subscriptionStatus) : 'canceled'
    });

    await refreshPremiumStatus();
    renderDash();
    toast('Subscription canceled immediately.', 'ok', 4200);
  } catch (err) {
    trackEvent('billing_cancel_now_error', {
      message: err && err.message ? String(err.message) : 'unknown'
    });
    toast(err && err.message ? err.message : 'Could not cancel subscription.', 'er');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText || 'Cancel Now';
    }
  }
}

/* ── QUESTIONS ── */
const QUESTION_BANK_URL = '/data/question-bank/question-bank.jsonl';
const QUESTION_BANK_CACHE_NAME = 'budy-question-bank-v2';

let questionBankLoadPromise = null;
let questionBankCache = null;
let questionBankPreloadStarted = false;

function shuffleQuestions(list) {
  const copy = Array.isArray(list) ? list.slice() : [];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function normalizeBankQuestion(item) {
  if (!item || typeof item !== 'object') return null;
  const section = item.section === 'reading_writing' ? 'english' : item.section === 'math' ? 'math' : null;
  if (!section) return null;

  const isSpr = item.format === 'spr';
  const options = Array.isArray(item.choices) ? item.choices.filter(Boolean) : [];
  return {
    id: String(item.id || ''),
    type: isSpr ? 'spr' : 'mc',
    section,
    domain: item.domain || '',
    skill: item.skill || 'General',
    difficulty: item.difficulty || 'medium',
    tags: Array.isArray(item.tags) ? item.tags : [],
    source_context: item.source_context || '',
    calculator_allowed: Object.prototype.hasOwnProperty.call(item, 'calculator_allowed') ? item.calculator_allowed : null,
    estimated_time_seconds: Number(item.estimated_time_seconds || 0),
    passage: item.passage || null,
    question: item.prompt || '',
    options: isSpr ? null : options,
    answer: item.answer != null ? String(item.answer) : '',
    acceptableAnswers: isSpr ? [String(item.answer)] : undefined,
    explanation: item.rationale || '',
    rationale: item.rationale || '',
    distractor_rationales: item.distractor_rationales && typeof item.distractor_rationales === 'object' ? item.distractor_rationales : {}
  };
}

function createQuestionBankPreloadHint() {
  if (!document.head || document.querySelector('link[data-budy-question-bank-preload]')) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'fetch';
  link.href = QUESTION_BANK_URL;
  link.crossOrigin = 'anonymous';
  link.setAttribute('data-budy-question-bank-preload', 'true');
  document.head.appendChild(link);
}

function parseGeneratedQuestionBank(text) {
  const rows = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const normalized = rows.map((line) => normalizeBankQuestion(JSON.parse(line))).filter(Boolean);
  const english = normalized.filter((item) => item.section === 'english');
  const math = normalized.filter((item) => item.section === 'math');
  if (!english.length || !math.length) {
    throw new Error('Question bank loaded without both sections.');
  }
  return { english, math };
}

async function fetchQuestionBankNetworkResponse() {
  const response = await fetch(QUESTION_BANK_URL, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Question bank request failed with status ${response.status}`);
  }
  return response;
}

async function fetchQuestionBankText() {
  if (!('caches' in window)) {
    return (await fetchQuestionBankNetworkResponse()).text();
  }

  const cache = await caches.open(QUESTION_BANK_CACHE_NAME);
  const cached = await cache.match(QUESTION_BANK_URL);
  if (cached) {
    void fetchQuestionBankNetworkResponse()
      .then((response) => cache.put(QUESTION_BANK_URL, response.clone()))
      .catch(() => {});
    return cached.text();
  }

  const response = await fetchQuestionBankNetworkResponse();
  await cache.put(QUESTION_BANK_URL, response.clone());
  return response.text();
}

function preloadQuestionBank() {
  if (questionBankPreloadStarted) return;
  questionBankPreloadStarted = true;
  createQuestionBankPreloadHint();

  const schedule = typeof window.requestIdleCallback === 'function'
    ? (callback) => window.requestIdleCallback(callback, { timeout: 1500 })
    : (callback) => window.setTimeout(callback, 400);

  schedule(() => {
    loadGeneratedQuestionBank().catch((error) => {
      console.warn('Question bank preload failed:', error);
    });
  });
}

async function loadGeneratedQuestionBank() {
  if (questionBankCache) return questionBankCache;
  if (questionBankLoadPromise) return questionBankLoadPromise;

  questionBankLoadPromise = fetchQuestionBankText()
    .then((text) => {
      questionBankCache = parseGeneratedQuestionBank(text);
      return questionBankCache;
    })
    .catch((error) => {
      questionBankLoadPromise = null;
      throw error;
    });

  return questionBankLoadPromise;
}

const ADAPTIVE_DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

function normalizeDifficultyLevel(level) {
  const normalized = String(level || '').trim().toLowerCase();
  return ADAPTIVE_DIFFICULTY_LEVELS.includes(normalized) ? normalized : 'medium';
}

function getRecentSectionAbilityScore(section) {
  const sessions = Array.isArray(getSessions()) ? getSessions().slice() : [];
  if (!sessions.length) return null;

  sessions.sort((a, b) => new Date(b && b.date || 0).getTime() - new Date(a && a.date || 0).getTime());

  const values = [];
  for (const session of sessions) {
    if (values.length >= 6) break;
    const breakdown = getSessionScoreBreakdown(session);
    const score = section === 'english' ? Number(breakdown.english) : Number(breakdown.math);
    if (Number.isFinite(score) && score > 0) values.push(score);
  }

  if (!values.length) return null;

  let weightedTotal = 0;
  let weightSum = 0;
  for (let i = 0; i < values.length; i += 1) {
    const weight = values.length - i;
    weightedTotal += values[i] * weight;
    weightSum += weight;
  }

  return weightSum ? Math.round(weightedTotal / weightSum) : null;
}

function getAdaptiveDifficultyWeights(sectionScore) {
  if (!Number.isFinite(sectionScore)) return { easy: 0.30, medium: 0.50, hard: 0.20 };
  if (sectionScore >= 680) return { easy: 0.10, medium: 0.40, hard: 0.50 };
  if (sectionScore >= 600) return { easy: 0.20, medium: 0.45, hard: 0.35 };
  if (sectionScore >= 500) return { easy: 0.35, medium: 0.45, hard: 0.20 };
  return { easy: 0.55, medium: 0.35, hard: 0.10 };
}

function buildAdaptiveDifficultyQuota(limit, weights) {
  const safeLimit = Math.max(1, Number(limit) || 1);
  const quota = { easy: 0, medium: 0, hard: 0 };
  const fractions = [];
  let used = 0;

  ADAPTIVE_DIFFICULTY_LEVELS.forEach((level) => {
    const raw = safeLimit * (Number(weights[level]) || 0);
    const base = Math.floor(raw);
    quota[level] = base;
    used += base;
    fractions.push({ level, fraction: raw - base });
  });

  let remaining = safeLimit - used;
  fractions.sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; index < fractions.length && remaining > 0; index += 1) {
    quota[fractions[index].level] += 1;
    remaining -= 1;
  }

  return quota;
}

function getAdaptiveDifficultyPattern(sectionScore) {
  if (!Number.isFinite(sectionScore)) return ['easy', 'medium', 'medium', 'hard'];
  if (sectionScore >= 680) return ['medium', 'hard', 'hard', 'medium', 'easy'];
  if (sectionScore >= 560) return ['easy', 'medium', 'hard', 'medium'];
  return ['easy', 'easy', 'medium', 'easy', 'hard', 'medium'];
}

function orderAdaptiveQuestions(questions, sectionScore) {
  const bins = { easy: [], medium: [], hard: [] };
  shuffleQuestions(questions).forEach((question) => {
    bins[normalizeDifficultyLevel(question && question.difficulty)].push(question);
  });

  const ordered = [];
  const pattern = getAdaptiveDifficultyPattern(sectionScore);
  while (ordered.length < questions.length) {
    const preferred = pattern[ordered.length % pattern.length];
    let picked = null;
    if (bins[preferred] && bins[preferred].length) {
      picked = bins[preferred].pop();
    } else {
      const fallbackLevel = ADAPTIVE_DIFFICULTY_LEVELS.find((level) => bins[level].length);
      if (fallbackLevel) picked = bins[fallbackLevel].pop();
    }
    if (!picked) break;
    ordered.push(picked);
  }
  return ordered;
}

function buildAdaptiveSectionQuestions(pool, limit, sectionScore) {
  const safeLimit = Math.max(1, Number(limit) || 1);
  const grouped = { easy: [], medium: [], hard: [] };

  shuffleQuestions(pool).forEach((question) => {
    grouped[normalizeDifficultyLevel(question && question.difficulty)].push(question);
  });

  const weights = getAdaptiveDifficultyWeights(sectionScore);
  const quota = buildAdaptiveDifficultyQuota(safeLimit, weights);
  const selected = [];

  ADAPTIVE_DIFFICULTY_LEVELS.forEach((level) => {
    for (let count = 0; count < quota[level] && grouped[level].length; count += 1) {
      selected.push(grouped[level].pop());
    }
  });

  const leftovers = shuffleQuestions([].concat(grouped.easy, grouped.medium, grouped.hard));
  while (selected.length < safeLimit && leftovers.length) {
    selected.push(leftovers.pop());
  }

  return orderAdaptiveQuestions(selected, sectionScore).slice(0, safeLimit);
}

async function buildQuestionSet(section, limit) {
  const pools = await loadGeneratedQuestionBank();
  const safeLimit = Math.max(1, Number(limit) || 1);
  const englishScore = getRecentSectionAbilityScore('english');
  const mathScore = getRecentSectionAbilityScore('math');

  if (section === 'english') return buildAdaptiveSectionQuestions(pools.english, safeLimit, englishScore);
  if (section === 'math') return buildAdaptiveSectionQuestions(pools.math, safeLimit, mathScore);

  const englishCount = Math.ceil(safeLimit * 0.55);
  const mathCount = Math.max(0, safeLimit - englishCount);
  const englishQuestions = buildAdaptiveSectionQuestions(pools.english, englishCount, englishScore);
  const mathQuestions = buildAdaptiveSectionQuestions(pools.math, mathCount, mathScore);
  return [...englishQuestions, ...mathQuestions];
}

/* ── SCORE TABLES ── */
function rawToScaled(raw, total, sec) {
  const pct = Math.min(1, raw / Math.max(1, total));
  const t = sec==='math' ? [
    [0,200],[.05,220],[.1,250],[.15,280],[.2,300],[.25,330],[.3,360],[.35,390],
    [.4,420],[.45,450],[.5,480],[.55,510],[.6,540],[.65,570],[.7,600],[.75,630],
    [.8,660],[.85,690],[.9,720],[.93,740],[.96,770],[.98,790],[1,800]
  ] : [
    [0,200],[.05,230],[.1,260],[.15,290],[.2,310],[.25,330],[.3,360],[.35,390],
    [.4,420],[.45,450],[.5,470],[.55,490],[.6,520],[.65,540],[.7,560],[.75,590],
    [.8,620],[.85,650],[.9,680],[.93,710],[.96,740],[.98,770],[1,800]
  ];
  for(let i=1;i<t.length;i++){
    if(pct<=t[i][0]){
      const[p0,s0]=t[i-1],[p1,s1]=t[i],r=(pct-p0)/(p1-p0);
      return Math.round(s0+r*(s1-s0));
    }
  }
  return 800;
}
function getPct(score,max){
  const p=score/max;
  if(p>=.99)return'99th';if(p>=.96)return'96th–98th';if(p>=.92)return'92nd–95th';
  if(p>=.87)return'87th–91st';if(p>=.80)return'80th–86th';if(p>=.70)return'70th–79th';
  if(p>=.58)return'58th–69th';if(p>=.45)return'45th–57th';if(p>=.30)return'30th–44th';
  return'Below 30th';
}

/* ── START TEST ── */
function startTest() {
  const isPrem = S.isPremium;
  const qLimits = { english: isPrem?27:FREE_Q, math: isPrem?22:FREE_Q, full: isPrem?49:FREE_Q };
  const limit   = qLimits[S.section];
  S.customTestLabel = '';

  setView('loading');

  // Short delay so the spinner renders, then build the test
  setTimeout(async ()=>{
    try {
      const questions = await buildQuestionSet(S.section, limit);
      beginPreparedTestSession({
        questions,
        section: S.section,
        timeLimitSeconds: getTestDurationSeconds(S.section, isPrem),
        label: ''
      });

    } catch(err) {
      console.error('startTest error:', err);
      setView('landing');
      toast('Something went wrong starting the test. Please try again.', 'er');
    }
  }, 400);
}

/* ── QNAV ── */
function buildQNav(){
  const g=document.getElementById('qn-grid');g.innerHTML='';
  const testScreen=document.getElementById('test-screen');
  if(testScreen)testScreen.classList.toggle('one-at-time',LANDING_STRICT_ONE_AT_TIME);
  if(LANDING_STRICT_ONE_AT_TIME)return;
  S.questions.forEach((_,i)=>{
    const b=document.createElement('button');
    b.className='qn-btn';b.textContent=i+1;b.id='qnb-'+i;
    b.onclick=()=>goQ(i);g.appendChild(b);
  });updQNav();
}

function hasSubmittedAnswer(qIndex){
  const value = S.answers[qIndex];
  if (value === undefined || value === null) return false;
  return String(value).trim().length > 0;
}

function isAnswerCorrectForQuestion(question, answer){
  if (!question) return false;
  if (answer === undefined || answer === null) return false;
  if (question.type === 'spr') {
    const accepted = Array.isArray(question.acceptableAnswers) && question.acceptableAnswers.length
      ? question.acceptableAnswers
      : [question.answer];
    return accepted.some((candidate) => String(candidate) === String(answer));
  }
  return String(answer) === String(question.answer);
}

function difficultyToRank(level){
  const normalized = normalizeDifficultyLevel(level);
  return normalized === 'easy' ? 0 : normalized === 'hard' ? 2 : 1;
}

function rankToDifficulty(rank){
  if (rank <= 0) return 'easy';
  if (rank >= 2) return 'hard';
  return 'medium';
}

function pickAdaptiveNextQuestionIndex(currentIndex){
  const current = S.questions[currentIndex];
  if (!current) return currentIndex + 1;

  const userAnswer = S.answers[currentIndex];
  const wasCorrect = isAnswerCorrectForQuestion(current, userAnswer);
  const currentRank = difficultyToRank(current.difficulty);
  const targetRank = wasCorrect ? currentRank + 1 : currentRank - 1;
  const targetDifficulty = rankToDifficulty(targetRank);

  const futureIndices = [];
  for (let i = currentIndex + 1; i < S.questions.length; i += 1) {
    if (!hasSubmittedAnswer(i)) futureIndices.push(i);
  }
  if (!futureIndices.length) return currentIndex + 1;

  const sectionMatched = futureIndices.filter((idx) => S.questions[idx] && S.questions[idx].section === current.section);
  const candidateIndices = sectionMatched.length ? sectionMatched : futureIndices;

  let bestIndex = candidateIndices[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  candidateIndices.forEach((idx) => {
    const q = S.questions[idx];
    const distance = Math.abs(difficultyToRank(q && q.difficulty) - difficultyToRank(targetDifficulty));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = idx;
    }
  });

  return bestIndex;
}

function adaptUpcomingQuestion(currentIndex){
  if (currentIndex >= S.questions.length - 1) return;

  const answeredAhead = Object.keys(S.answers).some((key) => Number(key) > currentIndex);
  if (answeredAhead) return;

  const targetIndex = pickAdaptiveNextQuestionIndex(currentIndex);
  const nextIndex = currentIndex + 1;
  if (targetIndex <= nextIndex || targetIndex >= S.questions.length) return;

  const swap = S.questions[nextIndex];
  S.questions[nextIndex] = S.questions[targetIndex];
  S.questions[targetIndex] = swap;
}

function updQNav(){
  if(!LANDING_STRICT_ONE_AT_TIME){
    S.questions.forEach((_,i)=>{
      const b=document.getElementById('qnb-'+i);if(!b)return;
      b.className='qn-btn';
      if(i===S.curQ)b.classList.add('cur');
      else if(S.flags.has(i))b.classList.add('flag');
      else if(S.answers[i]!==undefined)b.classList.add('ans');
    });
  }
  const pct=Object.keys(S.answers).length/S.questions.length*100;
  const currentQ=Math.min(S.curQ+1,S.questions.length);
  const leftQ=Math.max(0,S.questions.length-currentQ);
  document.getElementById('tb-prog-fill').style.width=pct+'%';
  document.getElementById('test-prog-txt').textContent=`Q${currentQ} of ${S.questions.length} · ${leftQ} left`;
  const stepSubmitBtn=document.getElementById('step-submit-btn');
  if(stepSubmitBtn){
    const last=S.curQ===S.questions.length-1;
    stepSubmitBtn.disabled=!hasSubmittedAnswer(S.curQ);
    stepSubmitBtn.textContent=last?'Submit Test':'Submit';
  }
}

/* ── RENDER QUESTION ── */
function renderQ(idx){
  S.curQ=idx;
  const q=S.questions[idx];
  const sec=q.section==='math'?'Math':'Reading & Writing';
  const remaining=Math.max(0,S.questions.length-(idx+1));
  const qBadge=`${sec} · Q${idx+1} of ${S.questions.length} · ${remaining} left`;
  let html=`<div class="q-hd"><div class="q-badge">${qBadge}</div><div class="q-skill">${q.skill||''}</div></div>`;
  if(q.passage)html+=`<div class="q-passage">${q.passage}</div>`;
  html+=`<div class="q-text">${q.question}</div>`;
  if(q.type==='spr'){
    const v=S.answers[idx]||'';
    html+=`<p class="q-spr-lbl">Type your answer below. Fractions and decimals are OK.</p>
    <input class="q-spr-inp" type="text" id="spr-${idx}" placeholder="Your answer" value="${v}"
      oninput="saveSpr(${idx},this.value)">`;
  } else {
    html+=`<div class="q-opts">`;
    (q.options||[]).forEach((opt,oi)=>{
      const l=['A','B','C','D'][oi];
      const sel=S.answers[idx]===l;
      html+=`<div class="q-opt${sel?' sel':''}" onclick="selAns(${idx},'${l}',this)" role="radio" aria-checked="${sel}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')this.click()">
        <div class="q-opt-k">${l}</div><div>${opt.replace(/^[A-D]\)\s*/,'')}</div></div>`;
    });
    html+=`</div>`;
  }
  document.getElementById('q-main').innerHTML=html;
  // Animate in
  document.querySelectorAll('.q-opt,.q-text,.q-passage').forEach((el,i)=>{
    el.style.opacity='0';el.style.transform='translateY(6px)';
    setTimeout(()=>{el.style.transition='opacity .25s,transform .25s';el.style.opacity='1';el.style.transform='translateY(0)'},i*35);
  });
  document.getElementById('q-main').scrollTo(0,0);
  updQNav();updFlag();
  announce(`Question ${idx+1}: ${q.question}`);
  syncLandingDeepDive();
}

/* ── RIPPLE (attached after DOM ready) ── */
function attachRipple() {
  const qMain = document.getElementById('q-main');
  if (!qMain) return;
  qMain.addEventListener('click', e => {
    const opt = e.target.closest('.q-opt');
    if (!opt) return;
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = opt.getBoundingClientRect();
    const sz = Math.max(rect.width, rect.height) * 2;
    r.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX-rect.left-sz/2}px;top:${e.clientY-rect.top-sz/2}px`;
    opt.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  });
}

function selAns(qi,l,el){
  document.querySelectorAll('.q-opt').forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');S.answers[qi]=l;updQNav();
  scheduleDraftAutosave('answer_select');
}
function saveSpr(qi,v){if(v.trim())S.answers[qi]=v.trim();else delete S.answers[qi];updQNav();scheduleDraftAutosave('answer_input');}

function goQ(i,options={}){
  const allowBackward=Boolean(options&&options.allowBackward);
  if(LANDING_STRICT_ONE_AT_TIME&&i<S.curQ&&!allowBackward){
    toast('You cannot return to previous questions in this test mode.','wn');
    return;
  }
  const spr=document.getElementById('spr-'+S.curQ);
  if(spr)saveSpr(S.curQ,spr.value);
  renderQ(i);
  scheduleDraftAutosave('question_nav');
}
function goNext(){
  const current=S.curQ;
  if(!hasSubmittedAnswer(current)){
    toast('Submit an answer before moving to the next question.','wn');
    return;
  }
  adaptUpcomingQuestion(current);
  goQ(Math.min(current+1,S.questions.length-1));
}
function goPrev(){
  toast('You cannot return to previous questions in this test mode.','wn');
}

function handleStepSubmit(){
  const current=S.curQ;
  if(!hasSubmittedAnswer(current)){
    toast('Submit an answer before continuing.','wn');
    return;
  }
  if(current>=S.questions.length-1){
    confirmSubmit();
    return;
  }
  adaptUpcomingQuestion(current);
  goQ(Math.min(current+1,S.questions.length-1));
}

/* ── FLAG ── */
function toggleFlag(){
  if(S.flags.has(S.curQ)){S.flags.delete(S.curQ);toast('Flag removed')}
  else{S.flags.add(S.curQ);toast('Question flagged.','wn')}
  updFlag();updQNav();
  scheduleDraftAutosave('flag_toggle');
}
function updFlag(){
  const on=S.flags.has(S.curQ);
  document.getElementById('flag-btn').classList.toggle('on',on);
  document.getElementById('flag-lbl').textContent=on?'Flagged':'Flag';
}

/* ── TIMER ── */
function startLandingTimer(){
  clearLandingTimer();
  S.landingTimeLeft = LANDING_TIMER_SECONDS;
  updLandingTimerDisplay();
  S.landingTimer = setInterval(()=>{
    S.landingTimeLeft--;
    updLandingTimerDisplay();
    if(S.landingTimeLeft<=0)clearLandingTimer();
  },1000)
}
function clearLandingTimer(){if(S.landingTimer){clearInterval(S.landingTimer);S.landingTimer=null}}
function updLandingTimerDisplay(){
  const el=document.getElementById('landing-phone-timer');if(el)el.textContent=`⏱ ${formatClock(S.landingTimeLeft)}`;
}
function runTimerLoop(){
  clearTimer();
  S.timer=setInterval(()=>{
    if(S.timerPaused)return;
    S.timeLeft--;
    updTimerDisplay();
    if(S.timeLeft<=0){
      clearTimer();
      S.timerPaused=false;
      updTimerPauseButton();
      toast('Time\'s up! Submitting your test.','wn',3000);
      setTimeout(submitTest,2000)
    }
  },1000)
}
function startTimer(){S.timerPaused=false;updTimerPauseButton();updTimerDisplay();runTimerLoop()}
function clearTimer(){if(S.timer){clearInterval(S.timer);S.timer=null}}
function toggleTimerPause(){
  if(!S.testActive||S.timeLeft<=0)return;
  S.timerPaused=!S.timerPaused;
  if(S.timerPaused)clearTimer();
  else runTimerLoop();
  updTimerPauseButton();
  scheduleDraftAutosave('timer_toggle');
}
function updTimerPauseButton(){
  const btn=document.getElementById('timer-toggle-btn');
  const icon=document.getElementById('timer-toggle-icon');
  if(!btn||!icon)return;
  const paused=Boolean(S.timerPaused);
  btn.setAttribute('aria-label',paused?'Resume timer':'Pause timer');
  btn.setAttribute('title',paused?'Resume timer':'Pause timer');
  icon.innerHTML=paused
    ? '<polygon points="8,6 19,12 8,18"></polygon>'
    : '<rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect>';
}
function updTimerDisplay(){
  const el=document.getElementById('timer-txt');if(el)el.textContent=formatClock(S.timeLeft);
  const w=document.getElementById('tb-timer');if(w)w.classList.toggle('warn',S.timeLeft<=300&&S.timeLeft>0);
}

/* ── SUBMIT ── */
async function confirmSubmit(){
  const un=S.questions.length-Object.keys(S.answers).length;
  if(un>0){
    const confirmed=await openActionConfirm({
      eyebrow:'Submit Test Incomplete',
      title:`${un} question${un>1?'s are':' is'} still blank`,
      body:`You can go back and review those unanswered question${un>1?'s':''}, or submit now and score the test as it stands.`,
      icon:'warning',
      showIcon:false,
      showClose:false,
      compact:true,
      cancelText:'Review Again',
      confirmText:'Submit Anyways',
      tone:'gold'
    });
    if(!confirmed)return;
  }
  submitTest();
}
function submitTest(){
  clearTimer();S.timerPaused=false;updTimerPauseButton();S.testActive=false;
  clearActiveDraftSession({ clearUrl: true });
  const qs=S.questions;
  let correct=0,wrong=0,skipped=0;
  const skillMap={};
  qs.forEach((q,i)=>{
    const ua=S.answers[i];const ca=q.answer;const sk=q.skill||'General';
    if(!skillMap[sk])skillMap[sk]={correct:0,total:0,section:q.section};
    skillMap[sk].total++;
    let ok=false;
    if(!ua)skipped++;
    else{
      ok=q.type==='spr'?(q.acceptableAnswers||[q.answer]).some(a=>a.toString()===ua.toString()):ua===ca;
      if(ok){correct++;skillMap[sk].correct++}else wrong++;
    }
  });
  const sec=S.section;
  const eng=qs.filter(q=>q.section==='english');
  const mat=qs.filter(q=>q.section==='math');
  let engSc=0,mathSc=0,total=0;
  if(sec==='full'){
    let ec=0,mc=0;
    qs.forEach((q,i)=>{const ua=S.answers[i];if(!ua)return;const ok=q.type==='spr'?(q.acceptableAnswers||[q.answer]).some(a=>a.toString()===ua.toString()):ua===q.answer;if(ok){if(q.section==='english')ec++;else mc++}});
    engSc=rawToScaled(ec,eng.length,'english');mathSc=rawToScaled(mc,mat.length,'math');total=engSc+mathSc;
  } else {
    const sc=rawToScaled(correct,qs.length,sec);
    if(sec==='english'){engSc=sc;total=sc}else{mathSc=sc;total=sc}
  }
  S.results={section:sec,total,engSc,mathSc,correct,wrong,skipped,total_q:qs.length,skillMap,
    customLabel:S.customTestLabel || '',
    questions:qs.map((q,i)=>({...q,userAnswer:S.answers[i],isCorrect:S.answers[i]?(q.type==='spr'?(q.acceptableAnswers||[q.answer]).some(a=>a.toString()===S.answers[i].toString()):S.answers[i]===q.answer):false})),
    date:new Date().toISOString(),isFree:!S.isPremium};
  saveSession(S.results);
  void saveSavedQuestionsForResult(S.results);
  setView('results');renderResults(S.results);
}

/* ── RESULTS ── */
function renderResults(r){
  const max=r.section==='full'?1600:800;
  const displayLabel = getSectionDisplayLabel(r.section, r.customLabel);
  document.getElementById('res-headline').textContent=`${S.user.name||'Your'} Results`;
  document.getElementById('res-subline').textContent=`${displayLabel} · ${new Date(r.date).toLocaleDateString()}`;
  document.getElementById('r-correct').textContent=r.correct;
  document.getElementById('r-wrong').textContent=r.wrong;
  document.getElementById('r-skip').textContent=r.skipped;
  document.getElementById('score-lbl').textContent=r.customLabel ? 'Review Test Score' : (r.section==='full'?'Combined SAT Score':r.section==='english'?'Reading & Writing Score':'Math Score');
  document.getElementById('pct-badge').textContent=`~${getPct(r.total,max)} percentile`;

  const col=r.total>=700||r.section==='full'&&r.total>=1400?'gr':r.total>=500||r.section==='full'&&r.total>=1000?'bl':'or';
  const bigEl=document.getElementById('big-score');
  bigEl.className=`big-num ${col}`;
  animScore(bigEl,r.total,max);

  // Free tier banner
  document.getElementById('free-limit-banner').classList.toggle('hidden',S.isPremium);

  // Skill bars
  const sb=document.getElementById('skill-bars');sb.innerHTML='';
  Object.entries(r.skillMap).forEach(([sk,d])=>{
    const pct=Math.round(d.correct/d.total*100);
    const clr=d.section==='math'?'var(--green)':'var(--brand)';
    const row=document.createElement('div');row.className='skill-row';
    row.innerHTML=`<div class="skill-row-hd"><span class="skill-row-nm">${sk}</span><span class="skill-row-sc">${d.correct}/${d.total}</span></div><div class="skill-track"><div class="skill-fill" style="background:${clr}" data-p="${pct}"></div></div>`;
    sb.appendChild(row);
    setTimeout(()=>{row.querySelector('.skill-fill').style.width=pct+'%'},400);
  });

  // Perf summary
  const pctCor=Math.round(r.correct/r.total_q*100);
  let sum=`<p>You answered <strong>${r.correct} of ${r.total_q}</strong> questions correctly (${pctCor}%).</p>`;
  if(r.section==='full')sum+=`<p style="margin-top:10px">R&W: <strong>${r.engSc}</strong> · Math: <strong>${r.mathSc}</strong></p>`;
  if(r.isFree)sum+=`<p style="margin-top:10px;color:var(--brand);font-weight:700">${spriteIcon('lock','ui-icon ui-icon-sm')} Upgrade to Premium for a full 27-49 question test and detailed explanations.</p>`;
  document.getElementById('perf-summary').innerHTML=sum;

  // Review
  const rv=document.getElementById('review-list');rv.innerHTML='';
  r.questions.forEach((q,i)=>{
    const st=!q.userAnswer?'s':q.isCorrect?'c':'w';
    const badge={c:'Correct',w:'Wrong',s:'Skipped'}[st];
    const cls={c:'c',w:'w',s:'s'}[st];
    const shortQ=q.question.length>100?q.question.slice(0,100)+'…':q.question;
    const div=document.createElement('div');div.className='review-item';
    div.innerHTML=`<div class="rev-hd"><span class="rev-badge ${cls}">${badge}</span><span style="font-size:.75rem;color:var(--muted)">Q${i+1} · ${q.skill||''}</span></div>
      <div class="rev-q">${shortQ}</div>
      <div class="rev-ans">
        ${q.userAnswer?`<span class="${q.isCorrect?'ra-yours ok':'ra-yours'}">Yours: ${q.userAnswer}</span>`:'<span class="ra-yours">No answer</span>'}
        ${!q.isCorrect?`<span class="ra-correct">Correct: ${q.answer}</span>`:''}
      </div>
      <div class="exp-wrap" id="exp-wrap-${i}"></div>`;
    rv.appendChild(div);
    buildExpSection(i, q, div.querySelector(`#exp-wrap-${i}`));
  });

  if(r.total>=700||(r.section==='full'&&r.total>=1400))setTimeout(confetti,900);
  document.getElementById('results-screen').classList.add('p-enter');
  syncLandingDeepDive();
}

function buildExpSection(i, q, wrap) {
  if (!S.isPremium) {
    // Show locked blur
    const fakeExp = `The correct answer is ${q.answer} because this question tests ${q.skill}. To get this type of question right, you need to carefully analyze the ${q.section==='math'?'equation and apply the relevant formula':'passage and identify the key supporting evidence'}. Remember that on the SAT, the correct answer is always directly supported by the text or mathematical logic, never your outside knowledge.`;
    wrap.innerHTML=`<div class="exp-locked">
      <div class="exp-locked-preview">${fakeExp}</div>
      <div class="exp-lock-overlay">
        <div class="exp-lock-icon">${spriteIcon('lock','ui-icon ui-icon-md')}</div>
        <div class="exp-lock-text">Explanation locked</div>
        <button class="exp-unlock-btn" onclick="openPaywall('results')">Unlock with Premium</button>
      </div>
    </div>`;
  } else {
    wrap.innerHTML=`<button class="exp-btn" id="exp-btn-${i}" onclick="getExp(${i},this)">${spriteIcon('bulb','ui-icon ui-icon-sm')} See Explanation</button><div id="exp-box-${i}" class="exp-box" style="display:none"></div>`;
  }
}

function getExp(i, btn) {
  btn.disabled=true;btn.textContent='Loading...';
  const q=S.results.questions[i];
  const exps={
    'Linear Equations':`To solve this, isolate x by applying inverse operations to both sides. ${q.answer===q.userAnswer?'You got it right!':'Work step by step and check your arithmetic.'}`,
    'Inference':`The correct answer is always directly supported by evidence in the passage. ${q.answer===q.userAnswer?'Great job finding the textual evidence!':'Re-read the passage and find the specific sentence that supports each answer choice before selecting.'}`,
    'Grammar':`This tests a specific grammar rule. The correct answer follows standard written English conventions. ${q.answer===q.userAnswer?'Nicely done!':'Review this grammar rule and look for similar patterns.'}`,
    default:`The correct answer is ${q.answer}. This question tests ${q.skill}. ${q.answer===q.userAnswer?'You answered correctly!':'Review this concept and try similar practice questions to reinforce your understanding.'}`
  };
  setTimeout(()=>{
    const box=document.getElementById(`exp-box-${i}`);
    box.style.display='block';
    const rationale = q.rationale || q.explanation || '';
    const distractorDetail = q.userAnswer && q.userAnswer !== q.answer && q.distractor_rationales && q.distractor_rationales[q.userAnswer]
      ? ` You chose ${q.userAnswer}, but ${q.distractor_rationales[q.userAnswer]}`
      : '';
    box.textContent=(rationale ? `${rationale}${distractorDetail}` : (exps[q.skill]||exps.default));
    btn.style.display='none';
    syncLandingDeepDive();
  },600);
}

/* ── SCORE ANIMATION ── */
function animScore(el,target,max){
  const c=document.getElementById('result-gauge-fill');
  let start=null;const dur=1600;
  function step(ts){
    if(!start)start=ts;
    const prog=Math.min((ts-start)/dur,1);
    const ease=1-Math.pow(1-prog,3);
    el.textContent=Math.round(ease*target);
    if(prog<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── DOWNLOAD ── */
function downloadReport(){
  if(!S.results){toast('No results yet','wn');return}
  const r=S.results;
  const text=`BUDY.STUDY PRACTICE TEST REPORT\n============================\nStudent: ${S.user.name||'Student'}\nDate: ${new Date(r.date).toLocaleDateString()}\nSection: ${r.section}\n\nSCORE: ${r.total} / ${r.section==='full'?1600:800}\nCorrect: ${r.correct}/${r.total_q}\nPercentile: ~${getPct(r.total,r.section==='full'?1600:800)}\n\nSKILL BREAKDOWN\n${Object.entries(r.skillMap).map(([s,d])=>`${s}: ${d.correct}/${d.total} (${Math.round(d.correct/d.total*100)}%)`).join('\n')}\n\nBudy.Study | budy.study\nSAT® is a trademark of College Board. Not affiliated.`;
  const b=new Blob([text],{type:'text/plain'});const u=URL.createObjectURL(b);
  const a=document.createElement('a');a.href=u;a.download=`BudyStudy_${S.user.name||'Report'}.txt`;a.click();URL.revokeObjectURL(u);
  toast('Report downloaded!','ok');
}

/* ── PERSIST ── */
function saveSession(r){
  const entry = {
    date: r.date,
    section: r.section,
    total: r.total,
    correct: r.correct,
    total_q: r.total_q,
    skillMap: {
      ...(r.skillMap || {}),
      __scoreSummary: {
        english: Number(r.engSc || 0),
        math: Number(r.mathSc || 0),
        total: Number(r.total || 0)
      }
    }
  };

  if (S.isLoggedIn) {
    S.sessionCache = [...S.sessionCache, entry];
    void saveSessionRemote(entry);
    return;
  }

  saveSessionLocal(entry);
}

function buildSavedQuestionStorageKey(entry) {
  const section = String(entry && entry.section ? entry.section : 'unknown').trim().toLowerCase();
  const questionId = String(entry && (entry.questionId || entry.key) ? (entry.questionId || entry.key) : '').trim();
  if (questionId) return `${section}:${questionId}`;
  const prompt = String(entry && entry.prompt ? entry.prompt : '').trim().toLowerCase();
  return prompt ? `${section}:${prompt.slice(0, 160)}` : '';
}

function mergeSavedQuestionEntries(existingEntries, incomingEntries) {
  const merged = new Map();

  [...(Array.isArray(existingEntries) ? existingEntries : []), ...(Array.isArray(incomingEntries) ? incomingEntries : [])].forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const key = buildSavedQuestionStorageKey(entry);
    if (!key) return;

    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, {
        ...entry,
        key,
        saveCount: Number.isFinite(Number(entry.saveCount)) ? Number(entry.saveCount) : 1
      });
      return;
    }

    merged.set(key, {
      ...previous,
      ...entry,
      key,
      isFlagged: Boolean(previous.isFlagged || entry.isFlagged),
      wasAnsweredWrong: Boolean(previous.wasAnsweredWrong || entry.wasAnsweredWrong),
      options: Array.isArray(entry.options) && entry.options.length ? entry.options : previous.options,
      correctAnswer: entry.correctAnswer || previous.correctAnswer,
      userAnswer: entry.userAnswer || previous.userAnswer,
      lastSeenAt: entry.lastSeenAt || previous.lastSeenAt,
      sourceAttemptedAt: entry.sourceAttemptedAt || previous.sourceAttemptedAt,
      saveCount: (Number(previous.saveCount) || 1) + (Number(entry.saveCount) || 1)
    });
  });

  return [...merged.values()].sort((a, b) => new Date(b.lastSeenAt || b.updatedAt || 0).getTime() - new Date(a.lastSeenAt || a.updatedAt || 0).getTime());
}

function buildSavedQuestionEntries(result) {
  if (!result || !Array.isArray(result.questions)) return [];

  return result.questions.map((question, index) => {
    const isFlagged = S.flags.has(index);
    const wasAnsweredWrong = Boolean(question && question.userAnswer && !question.isCorrect);
    if (!isFlagged && !wasAnsweredWrong) return null;

    return {
      questionId: question && question.id ? String(question.id) : `${result.section || 'unknown'}-${index + 1}`,
      section: question && question.section ? question.section : result.section,
      skill: question && question.skill ? question.skill : '',
      questionType: question && question.type ? question.type : '',
      prompt: question && question.question ? question.question : '',
      passage: question && question.passage ? question.passage : '',
      options: Array.isArray(question && question.options) ? question.options : [],
      correctAnswer: question && question.answer ? String(question.answer) : '',
      userAnswer: question && question.userAnswer ? String(question.userAnswer) : '',
      isCorrect: Boolean(question && question.isCorrect),
      isFlagged,
      wasAnsweredWrong,
      sourceTestSection: result.section || '',
      sourceAttemptedAt: result.date || new Date().toISOString(),
      lastSeenAt: result.date || new Date().toISOString(),
      metadata: {
        questionNumber: index + 1,
        savedFrom: 'practice_test',
        score: Number(result.total || 0)
      }
    };
  }).filter(Boolean);
}

function getSavedQuestionsLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_QUESTIONS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSavedQuestionsLocal(entries) {
  const merged = mergeSavedQuestionEntries(getSavedQuestionsLocal(), entries);
  try {
    localStorage.setItem(SAVED_QUESTIONS_KEY, JSON.stringify(merged));
  } catch {}
  S.savedQuestionsCache = merged;
}

async function saveSavedQuestionsRemote(entries) {
  const token = await getAccessToken();
  if (!token) {
    saveSavedQuestionsLocal(entries);
    return;
  }

  try {
    const response = await fetch('/api/saved-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ questions: entries })
    });
    const data = await response.json();

    if (!response.ok) {
      if (data && data.disabled) S.savedQuestionStoreDisabled = true;
      saveSavedQuestionsLocal(entries);
      return;
    }

    const saved = Array.isArray(data && data.questions) ? data.questions : entries;
    S.savedQuestionsCache = mergeSavedQuestionEntries(S.savedQuestionsCache, saved);
  } catch {
    saveSavedQuestionsLocal(entries);
  }
}

async function saveSavedQuestionsForResult(result) {
  const entries = buildSavedQuestionEntries(result);
  if (!entries.length) return;

  if (S.isLoggedIn) {
    await saveSavedQuestionsRemote(entries);
    return;
  }

  saveSavedQuestionsLocal(entries);
}

function getDemoSessions() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    { date: new Date(now - 14 * day).toISOString(), section: 'english', total: 1210, correct: 35, total_q: 50, skillMap: { __scoreSummary: { english: 1210, math: 0, total: 1210 } } },
    { date: new Date(now - 10 * day).toISOString(), section: 'math', total: 1260, correct: 38, total_q: 50, skillMap: { __scoreSummary: { english: 0, math: 1260, total: 1260 } } },
    { date: new Date(now - 7 * day).toISOString(), section: 'english', total: 1320, correct: 41, total_q: 50, skillMap: { __scoreSummary: { english: 1320, math: 0, total: 1320 } } },
    { date: new Date(now - 4 * day).toISOString(), section: 'math', total: 1370, correct: 44, total_q: 50, skillMap: { __scoreSummary: { english: 0, math: 1370, total: 1370 } } },
    { date: new Date(now - 1 * day).toISOString(), section: 'full', total: 1410, correct: 46, total_q: 50, skillMap: { __scoreSummary: { english: 700, math: 710, total: 1410 } } }
  ];
}

function getScoreSummaryValue(source, keys) {
  if (!source || typeof source !== 'object') return null;
  for (const key of keys) {
    const value = Number(source[key]);
    if (Number.isFinite(value) && value > 0) return Math.round(value);
  }
  return null;
}

function getSectionPerformanceSummary(skillMap) {
  const summary = {
    english: { correct: 0, total: 0 },
    math: { correct: 0, total: 0 }
  };

  Object.values(skillMap || {}).forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const section = String(item.section || '').toLowerCase();
    if (section !== 'english' && section !== 'math') return;
    summary[section].correct += Number(item.correct) || 0;
    summary[section].total += Number(item.total) || 0;
  });

  return summary;
}

function estimateSectionScore(correct, total) {
  if (!total) return null;
  const pct = Math.max(0, Math.min(1, (Number(correct) || 0) / total));
  return Math.round(200 + (pct * 600));
}

function getSessionScoreBreakdown(session) {
  const skillMap = session && session.skillMap && typeof session.skillMap === 'object' ? session.skillMap : {};
  const scoreSummary = skillMap.__scoreSummary && typeof skillMap.__scoreSummary === 'object' ? skillMap.__scoreSummary : skillMap;
  const total = getScoreSummaryValue(scoreSummary, ['total', 'totalScore']) || Math.round(Number(session && session.total) || 0) || null;
  let english = getScoreSummaryValue(scoreSummary, ['english', 'englishScore', 'readingWriting', 'readingWritingScore', 'rw']);
  let math = getScoreSummaryValue(scoreSummary, ['math', 'mathScore']);

  if (english == null || math == null) {
    const sectionSummary = getSectionPerformanceSummary(skillMap);
    if (english == null) english = estimateSectionScore(sectionSummary.english.correct, sectionSummary.english.total);
    if (math == null) math = estimateSectionScore(sectionSummary.math.correct, sectionSummary.math.total);
  }

  const section = String(session && session.section || '').toLowerCase();
  if (section === 'english' && english == null) english = total;
  if (section === 'math' && math == null) math = total;
  if (section === 'full' && total != null) {
    if (english == null && math != null) english = Math.max(200, total - math);
    if (math == null && english != null) math = Math.max(200, total - english);
  }

  return { english, math, total };
}

function formatScoreHistoryValue(value) {
  return Number.isFinite(value) && value > 0 ? String(Math.round(value)) : '—';
}

function renderScoreHistoryHover(context) {
  const chart = context && context.chart;
  const tooltip = context && context.tooltip;
  if (!chart) return;

  const wrap = chart.canvas && chart.canvas.parentElement;
  const card = wrap ? wrap.querySelector('.score-hover-card') : null;
  if (!wrap || !card) return;

  if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints || !tooltip.dataPoints.length) {
    card.classList.remove('show');
    return;
  }

  const point = tooltip.dataPoints[0];
  const session = Array.isArray(chart.$sessionRows) ? chart.$sessionRows[point.dataIndex] : null;
  if (!session) {
    card.classList.remove('show');
    return;
  }

  const breakdown = getSessionScoreBreakdown(session);
  card.replaceChildren();

  const dateRow = document.createElement('div');
  dateRow.className = 'score-hover-date';
  dateRow.textContent = new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  card.appendChild(dateRow);

  [
    ['Math', formatScoreHistoryValue(breakdown.math), false],
    ['English', formatScoreHistoryValue(breakdown.english), false],
    ['Total', formatScoreHistoryValue(breakdown.total), true]
  ].forEach(([label, value, isTotal]) => {
    const row = document.createElement('div');
    row.className = 'score-hover-row' + (isTotal ? ' total' : '');

    const name = document.createElement('span');
    name.textContent = label;

    const strong = document.createElement('strong');
    strong.textContent = value;

    row.appendChild(name);
    row.appendChild(strong);
    card.appendChild(row);
  });

  card.classList.add('show');
  const pad = 14;
  const half = card.offsetWidth / 2;
  const left = Math.max(half + pad, Math.min(tooltip.caretX, wrap.clientWidth - half - pad));
  const top = Math.max(card.offsetHeight + 12, tooltip.caretY - 10);
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function getSessions(){
  if (S.isLoggedIn) return Array.isArray(S.sessionCache) ? S.sessionCache : [];
  const localSessions = getSessionsLocal();
  return localSessions.length ? localSessions : getDemoSessions();
}

function saveSessionLocal(entry) {
  try {
    const s = getSessionsLocal();
    s.push(entry);
    localStorage.setItem('sm_s', JSON.stringify(s));
  } catch {}
}

function getSessionsLocal() {
  try {
    return JSON.parse(localStorage.getItem('sm_s') || '[]');
  } catch {
    return [];
  }
}

async function hydrateSessions() {
  if (!S.isLoggedIn) {
    S.sessionCache = [];
    return;
  }

  const token = await getAccessToken();
  if (!token) {
    S.sessionCache = [];
    return;
  }

  try {
    const response = await fetch('/api/test-attempts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (!response.ok) {
      if (data && data.disabled) S.scoreStoreDisabled = true;
      return;
    }

    const attempts = Array.isArray(data && data.attempts) ? data.attempts : [];
    S.sessionCache = attempts.map((item) => ({
      date: item.date,
      section: item.section,
      total: Number(item.total || 0),
      correct: Number(item.correct || 0),
      total_q: Number(item.total_q || 0),
      skillMap: item.skillMap && typeof item.skillMap === 'object' ? item.skillMap : {}
    }));
  } catch {
    // Keep in-memory cache as-is when score sync temporarily fails.
  }
}

async function saveSessionRemote(entry) {
  const token = await getAccessToken();
  if (!token) {
    saveSessionLocal(entry);
    return;
  }

  try {
    const response = await fetch('/api/test-attempts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(entry)
    });
    const data = await response.json();

    if (!response.ok) {
      if (data && data.disabled) S.scoreStoreDisabled = true;
      saveSessionLocal(entry);
    }
  } catch {
    saveSessionLocal(entry);
  }
}

/* ── DASHBOARD ── */
function renderDash(){
  const ssRaw = getSessions();
  const ss = ssRaw
    .map((s) => ({
      ...s,
      total: Number(s && s.total),
      correct: Number(s && s.correct),
      total_q: Number(s && s.total_q),
      date: s && s.date
    }))
    .filter((s) => Number.isFinite(s.total) && s.total > 0 && !Number.isNaN(new Date(s.date).getTime()));
  document.getElementById('dash-greet').textContent=S.user.name?`Welcome back, ${S.user.name}!`:'Welcome back, Student!';

  const statusBadge = document.getElementById('acct-status-badge');
  const statusText = document.getElementById('acct-status-text');
  if (statusBadge && statusText) {
    const statusIcon = document.getElementById('acct-status-icon');
    const isTestUser = isTestUserEmail(S.user.email);
    if (S.isPremium) {
      statusBadge.classList.remove('free');
      statusBadge.classList.add('pro');
      statusText.textContent = isTestUser ? 'Test Plan' : 'Pro Plan';
      if (statusIcon) statusIcon.textContent = '';
    } else {
      statusBadge.classList.remove('pro');
      statusBadge.classList.add('free');
      statusText.textContent = isTestUser ? 'Test Plan' : 'Free Plan';
      if (statusIcon) statusIcon.textContent = '';
    }
  }

  const testsTakenEl = document.getElementById('d-count');
  if (testsTakenEl) {
    const now = new Date();
    const monthCount = ss.filter((s) => {
      const date = new Date(s.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length;
    testsTakenEl.textContent = String(monthCount);
  }

  const accountStatus = document.getElementById('profile-account-status');
  const accountType = document.getElementById('profile-account-type');
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileGrade = document.getElementById('profile-grade');
  const profilePlan = document.getElementById('profile-plan');
  const profileBillingTiming = document.getElementById('profile-billing-timing');
  if (accountStatus) {
    if (isTestUserEmail(S.user.email)) {
      accountStatus.textContent = S.isPremium ? 'TEST (PRO)' : 'TEST (FREE)';
    } else {
      accountStatus.textContent = S.isPremium ? 'ACTIVE PRO' : 'ACTIVE FREE';
    }
  }
  if (accountType) accountType.textContent = isTestUserEmail(S.user.email) ? 'Test user' : 'Standard user';
  if (profileName) profileName.textContent = S.user.name || '-';
  if (profileEmail) profileEmail.textContent = S.user.email || '-';
  if (profileGrade) profileGrade.textContent = S.user.grade ? `${S.user.grade}th grade` : '-';
  if (profilePlan) profilePlan.textContent = S.isPremium ? 'Pro' : 'Free';
  if (profileBillingTiming) profileBillingTiming.textContent = getBillingTimingText();
  setAccountTab(S.accountTab || 'progress');

  const weekImpEl = document.getElementById('d-week-imp');
  const weekCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const weekSessions = ss
    .filter(s => new Date(s.date).getTime() >= weekCutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weekImp = weekSessions.length >= 2 ? (weekSessions[weekSessions.length - 1].total - weekSessions[0].total) : 0;
  if (weekImpEl) {
    weekImpEl.textContent = (weekImp >= 0 ? '+' : '') + weekImp;
    weekImpEl.classList.remove('pos', 'neg', 'neu');
    weekImpEl.classList.add(weekImp > 0 ? 'pos' : weekImp < 0 ? 'neg' : 'neu');
  }

  if(!ss.length){
    ['d-best','d-latest'].forEach(id=>document.getElementById(id).textContent='-');
    document.getElementById('sess-empty').classList.remove('hidden');
    document.getElementById('sess-tbl').style.display='none';
    document.getElementById('ch-empty').classList.remove('hidden');
    document.getElementById('score-chart').style.display='none';
    if(S.chart){S.chart.destroy();S.chart=null}
    return;
  }
  document.getElementById('sess-empty').classList.add('hidden');
  document.getElementById('sess-tbl').style.display='';
  document.getElementById('ch-empty').classList.add('hidden');
  document.getElementById('score-chart').style.display='';

  const scores=ss.map(s=>s.total);
  document.getElementById('d-best').textContent=Math.max(...scores);
  document.getElementById('d-latest').textContent=scores[scores.length-1];

  const tb=document.getElementById('sess-tbody');tb.replaceChildren();
  [...ss].reverse().slice(0,8).forEach(s=>{
    const pct = s.total_q > 0 ? Math.round((s.correct / s.total_q) * 100) : 0;
    const cls=s.total>=700?'sc-hi':s.total>=500?'sc-mid':'sc-lo';
    const tr = document.createElement('tr');
    const dateTd = document.createElement('td');
    dateTd.textContent = new Date(s.date).toLocaleDateString();

    const sectionTd = document.createElement('td');
    sectionTd.textContent = s.section==='full' ? 'Full' : s.section==='english' ? 'R&W' : 'Math';

    const scoreTd = document.createElement('td');
    const scorePill = document.createElement('span');
    scorePill.className = `sc-pill ${cls}`;
    scorePill.textContent = String(s.total);
    scoreTd.appendChild(scorePill);

    const pctTd = document.createElement('td');
    pctTd.textContent = `${pct}%`;

    tr.appendChild(dateTd);
    tr.appendChild(sectionTd);
    tr.appendChild(scoreTd);
    tr.appendChild(pctTd);
    tb.appendChild(tr);
  });

  if(S.chart)S.chart.destroy();
  const labels=ss.map((s,i)=>{const d=new Date(s.date);return`${d.getMonth()+1}/${d.getDate()}`});
  const minScore = Math.max(200, Math.min(...scores) - 60);
  const maxScore = Math.min(1600, Math.max(...scores) + 60);
  S.chart=new Chart(document.getElementById('score-chart').getContext('2d'),{
    type:'line',
    data:{labels,datasets:[{label:'Score',data:scores,borderColor:'#1a56db',backgroundColor:'rgba(26,86,219,.07)',borderWidth:2.5,pointBackgroundColor:'#1a56db',pointRadius:5,pointHoverRadius:7,pointHitRadius:22,fill:true,tension:.4}]},
    options:{responsive:true,maintainAspectRatio:true,aspectRatio:2.25,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{enabled:false,external:renderScoreHistoryHover}},
      scales:{y:{min:minScore,max:maxScore,grid:{color:'rgba(0,0,0,.05)'},ticks:{color:'#718096',font:{size:11}}},x:{grid:{display:false},ticks:{color:'#718096',font:{size:11}}}}}
  });
  S.chart.$sessionRows = ss;
}

/* ── CONFETTI ── */
function confetti(){
  const c=document.getElementById('confetti-c');c.style.display='block';
  const ctx=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  const cols=['#1a56db','#f59e0b','#059669','#e11d48','#7c3aed'];
  const p=Array.from({length:100},()=>({x:Math.random()*c.width,y:Math.random()*-c.height,r:Math.random()*7+3,d:Math.random()*100+50,color:cols[Math.floor(Math.random()*5)],t:Math.random()*Math.PI*2,ts:Math.random()*.04+.02}));
  let f=0;(function draw(){ctx.clearRect(0,0,c.width,c.height);p.forEach(pp=>{ctx.beginPath();ctx.lineWidth=pp.r/2;ctx.strokeStyle=pp.color;ctx.moveTo(pp.x+Math.sin(pp.t)*pp.r,pp.y);ctx.lineTo(pp.x,pp.y+pp.r);ctx.stroke();pp.t+=pp.ts;pp.y+=(Math.cos(f*.015)+1.4);pp.x+=Math.sin(f*.01)*.7;if(pp.y>c.height){pp.y=-10;pp.x=Math.random()*c.width}});f++;if(f<260)requestAnimationFrame(draw);else{ctx.clearRect(0,0,c.width,c.height);c.style.display='none'}})();
}

/* ── TOAST ── */
function toast(msg,type='',dur=3000){
  const c=document.getElementById('toasts');const t=document.createElement('div');
  t.className=`toast ${type}`;const ico={ok:'check',er:'x',wn:'warning','':'info'}[type]||'info';
  const iconWrap = document.createElement('span');
  iconWrap.innerHTML = spriteIcon(ico,'ui-icon ui-icon-sm');
  const msgWrap = document.createElement('span');
  msgWrap.textContent = msg;
  t.appendChild(iconWrap.firstElementChild);
  t.appendChild(msgWrap);
  c.appendChild(t);
  const rm=()=>{t.classList.add('out');setTimeout(()=>t.remove(),280)};
  setTimeout(rm,dur);t.addEventListener('click',rm);
}

/* ── ARIA ── */
function announce(msg){const e=document.getElementById('aria-live');e.textContent='';setTimeout(()=>e.textContent=msg,50)}

/* ── KEYBOARD ── */
document.addEventListener('keydown',e=>{
  const actionConfirmOverlay = document.getElementById('action-confirm-overlay');
  if (actionConfirmOverlay && actionConfirmOverlay.classList.contains('open')) {
    if (e.key === 'Escape') closeActionConfirm(false);
    return;
  }
  const leaveTestOverlay = document.getElementById('leave-test-overlay');
  if (leaveTestOverlay && leaveTestOverlay.classList.contains('open')) {
    if (e.key === 'Escape') closeLeaveTestModal();
    return;
  }
  if(S.view!=='test')return;
  if(e.target.tagName==='INPUT')return;
  const q=S.questions[S.curQ];
  if(q&&q.type==='mc'){const m={a:0,b:1,c:2,d:3,'1':0,'2':1,'3':2,'4':3}[e.key.toLowerCase()];
    if(m!==undefined){const opts=document.querySelectorAll('.q-opt');if(opts[m])opts[m].click()}}
  if(e.key==='ArrowRight')handleStepSubmit();
  if(e.key==='f'||e.key==='F')toggleFlag();
});

/* ── iOS KEYBOARD SCROLL FIX ──
   When the soft keyboard opens on iOS, it can scroll the fixed test footer
   off screen. This snaps the viewport back. */
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  window.addEventListener('focusin', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      // Small delay lets keyboard animate in, then scroll active element into view
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  });
  window.addEventListener('focusout', () => {
    // When keyboard dismisses, restore scroll position
    setTimeout(() => window.scrollTo(0, window.scrollY), 100);
  });
}

/* ── PREVENT DOUBLE-TAP ZOOM on question options (iOS) ── */
let lastTap = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTap < 300) {
    const t = e.target.closest('.q-opt, .sec-opt, .btn, button');
    if (t) e.preventDefault();
  }
  lastTap = now;
}, { passive: false });

/* ── PWA INSTALL PROMPT ── */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  // Show a subtle "Add to Home Screen" nudge after user completes first test
});

/* ── INIT ── */
function initLandingCounters() {
  /* Scholarship counter, triggers when scrolled into view */
  const counterEl = document.getElementById('impact-counter');
  if (counterEl && counterEl.dataset.budyInit !== '1') {
    counterEl.dataset.budyInit = '1';
    const target = 100000;
    const finalCounterLabel = '$100K';
    let started = false;

    const formatDollar = n => {
      if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
      return '$' + Math.round(n).toLocaleString('en-US');
    };

    const runCounter = () => {
      if (started) return;
      started = true;
      const duration = 2600;
      let startTime = null;
      const step = ts => {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        const current = Math.round(eased * target);
        counterEl.textContent = formatDollar(current);
        if (progress < 1) requestAnimationFrame(step);
        else counterEl.textContent = finalCounterLabel;
      };
      requestAnimationFrame(step);
    };

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { runCounter(); obs.disconnect(); }
      }, { threshold: 0.4 });
      obs.observe(counterEl);
    } else {
      counterEl.textContent = finalCounterLabel;
    }
  }

  /* Hero user counter */
  const heroUserCounterEl = document.getElementById('hero-user-counter');
  if (heroUserCounterEl && heroUserCounterEl.dataset.budyInit !== '1') {
    heroUserCounterEl.dataset.budyInit = '1';
    const baseUsers = 49100;
    const counterStart = new Date('2026-03-23T22:48:42-0700').getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    const msPerWeek = 7 * msPerDay;

    const formatExactNumber = n => Math.max(baseUsers, Math.floor(n)).toLocaleString('en-US');
    const getCurrentUserCount = () => {
      const elapsedMs = Math.max(0, Date.now() - counterStart);
      const elapsedDays = elapsedMs / msPerDay;
      const elapsedWeeks = elapsedMs / msPerWeek;
      const weeklyGrowth = baseUsers * Math.pow(1.01, elapsedWeeks);
      const dailyGrowth = 200 * elapsedDays;
      return weeklyGrowth + dailyGrowth;
    };

    const updateHeroUserCounter = () => {
      heroUserCounterEl.textContent = formatExactNumber(getCurrentUserCount()) + '+';
    };

    updateHeroUserCounter();
    window.setInterval(updateHeroUserCounter, 1000);
  }
}

function ensurePrimaryViewVisible() {
  const ids = ['landing-screen', 'loading-screen', 'test-screen', 'results-screen', 'dash-screen'];
  const hasVisible = ids.some((id) => {
    const el = document.getElementById(id);
    return el && window.getComputedStyle(el).display !== 'none';
  });
  if (hasVisible) return;
  setView('landing', { preserveScroll: true });
  renderLandingDemo(0);
}

async function init() {
  const initialSearchParams = new URLSearchParams(window.location.search);
  const initialSid = normalizeSessionId(initialSearchParams.get('sid'));
  setView(initialSid ? 'loading' : 'landing', { preserveScroll: true });
  preloadQuestionBank();
  if (typeof window.__budyRestoreLandingScroll === 'function') {
    window.__budyRestoreLandingScroll();
  }
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('scrolled', scrollY > 20);
  });
  closeMobileMenu();
  selectPlan('monthly');
  updatePriceDisplay('weekly');
  renderLandingDemo(0);
  attachDemoSwipe();
  attachRipple();
  initLandingCounters();
  updateAuthUI();
  document.addEventListener('navbar:mounted', applyHomeStudyNavOverride);
  try {
    await initAuth();
    await refreshPremiumStatus();
    await hydrateSessions();
  } catch (err) {
    console.error('Auth init failed:', err);
    toast('Auth setup failed. Check Auth0 URLs and try again.', 'er');
  }

  syncLandingDeepDive();

  await handleCheckoutReturn();

  const searchParams = new URLSearchParams(window.location.search);
  const sidQueryValue = String(searchParams.get('sid') || '');
  const sidFromUrl = normalizeSessionId(sidQueryValue);

  if (sidQueryValue && !sidFromUrl) {
    searchParams.delete('sid');
    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState({}, document.title, nextUrl);
  }

  if (sidFromUrl) {
    setView('loading', { preserveScroll: true });
    const restored = await restoreDraftSessionBySid(sidFromUrl);
    if (restored) {
      return;
    }

    searchParams.delete('sid');
    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState({}, document.title, nextUrl);
    setView('landing', { preserveScroll: true });
    toast('We could not restore your previous test session.', 'wn', 4200);
  }

  setView('landing', { preserveScroll: true });

  if (searchParams.get('review') === '1') {
    searchParams.delete('review');
    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState({}, document.title, nextUrl);
    const launched = await launchQueuedReviewTestIfPresent();
    if (launched) return;
  }

  if (searchParams.get('start') === '1') {
    const section = (searchParams.get('section') || '').toLowerCase();
    searchParams.delete('start');
    searchParams.delete('section');
    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState({}, document.title, nextUrl);
    openOnboard();
    if (section && ['english', 'math', 'full'].includes(section)) {
      S.obSection = section;
      document.querySelectorAll('.sec-opt').forEach((option) => {
        const onclickValue = String(option.getAttribute('onclick') || '');
        option.classList.toggle('sel', onclickValue.includes(`pickSec('${section}'`));
      });
      obUpdateStep(2);
    }
  }

  if (searchParams.get('billing') === 'return') {
    await refreshPremiumStatus();
    toast('Returned from billing portal.', 'ok', 3600);
    trackEvent('billing_portal_returned', { isPremium: Boolean(S.isPremium) });
    searchParams.delete('billing');
    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState({}, document.title, nextUrl);
  }

  ensurePrimaryViewVisible();

  /* Register service worker for PWA offline support */
  if ('serviceWorker' in navigator) {
    // navigator.serviceWorker.register('/sw.js');
  }
}

// Run after full DOM is parsed
function bootLanding() {
  init().catch((err) => {
    console.error('Landing init failed:', err);
    try {
      setView('landing', { preserveScroll: true });
      renderLandingDemo(0);
      initLandingCounters();
      ensurePrimaryViewVisible();
    } catch {}
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { bootLanding(); });
} else {
  bootLanding();
}

window.addEventListener('load', () => {
  try {
    initLandingCounters();
    ensurePrimaryViewVisible();
  } catch {}
});

document.addEventListener('click', e => {
  const panel = document.getElementById('mobile-menu-panel');
  const wrap = document.querySelector('.mobile-menu-wrap');
  if (!panel || !wrap) return;
  if (!wrap.contains(e.target)) panel.classList.remove('open');
});

window.addEventListener('pagehide', persistDraftOnPageExit);
window.addEventListener('beforeunload', persistDraftOnPageExit);

// Prevent pull-down overscroll when the page is already at the top.
(function lockTopOverscroll() {
  let touchStartY = 0;

  function isInsideDeepDiveModal(target) {
    return Boolean(target && target.closest && target.closest('.budy-deep-dive-modal'));
  }

  window.addEventListener('touchstart', e => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (!e.touches || e.touches.length === 0) return;
    if (isInsideDeepDiveModal(e.target)) return;
    const currentY = e.touches[0].clientY;
    const pullingDown = currentY > touchStartY;
    if (window.scrollY <= 0 && pullingDown) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('wheel', e => {
    if (isInsideDeepDiveModal(e.target)) return;
    if (window.scrollY <= 0 && e.deltaY < 0) {
      e.preventDefault();
    }
  }, { passive: false });
})();
