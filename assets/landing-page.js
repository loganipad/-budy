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
  demoGrading: false
};

/* ── FREE TIER LIMITS ── */
const FREE_Q = 10; // questions allowed on free tier
const LANDING_TIMER_SECONDS = 30 * 60;
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
  const studyTarget = S.isLoggedIn ? '/study.html' : '/login.html';

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

  if (destination === 'dash') {
    window.location.href = '/my-account.html';
    return;
  }

  setView('landing');
}

function requestLeaveTest(destination) {
  if (!S.testActive) {
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

/* ── ONBOARDING ── */
function openOnboard() {
  if (!S.isLoggedIn) {
    window.location.href = '/login.html';
    return;
  }
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
function openPaywall(ctx='') {
  paywallCtx=ctx;
  selectPlan(ctx === 'annual' ? 'annual' : 'monthly');
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
const ENG_Q = [
  {id:'e1',type:'mc',section:'english',skill:'Inference',
   passage:'The discovery of ancient cave paintings in southern France revealed that Paleolithic humans had a remarkable capacity for abstract thought. The paintings depict animals with anatomical accuracy and motion, created using mineral pigments applied with brushes and blow tubes. Archaeologists note that artists returned to the same sites over generations, suggesting early cultural transmission.',
   question:'Which inference is best supported by the passage?',
   options:['A) Cave paintings were made for religious purposes','B) Paleolithic humans passed artistic traditions across generations','C) Blow tubes indicate formal art training','D) Animals were depicted as hunting guides'],
   answer:'B'},
  {id:'e2',type:'mc',section:'english',skill:'Words in Context',
   passage:'The senator\'s speech was notable for its measured tone. Rather than using incendiary rhetoric, she chose language that was precise without being cold, acknowledging complexity rather than reducing the issue to talking points.',
   question:'As used in the passage, "measured" most nearly means:',
   options:['A) Quantified','B) Restrained and deliberate','C) Musical in rhythm','D) Mathematically exact'],
   answer:'B'},
  {id:'e3',type:'mc',section:'english',skill:'Central Ideas',
  passage:'Behavioral economists have shown that humans are not the rational actors classical economics assumes. People feel the pain of losing $100 more than the pleasure of gaining $100. They are influenced by irrelevant numbers and overestimate small probabilities. These biases are not random. They are predictable and consistent.',
   question:'What is the central idea of this passage?',
   options:['A) Humans always make poor decisions','B) Loss aversion is the most important bias','C) Human decision-making deviates from rationality in predictable ways','D) Classical economics must be abandoned'],
   answer:'C'},
  {id:'e4',type:'mc',section:'english',skill:'Grammar',
   passage:null,
   question:'Choose the grammatically correct sentence:',
   options:['A) The collection of rare books are housed in a vault.','B) The collection of rare books is housed in a vault.','C) The collection of rare books have been housed in a vault.','D) The collection of rare books were housed in a vault.'],
   answer:'B'},
  {id:'e5',type:'mc',section:'english',skill:'Transitions',
   passage:null,
   question:'Choose the best transition: "Early studies suggested caffeine impairs memory. _____, more recent research found no significant effect."',
   options:['A) Similarly','B) Therefore','C) However','D) In other words'],
   answer:'C'},
  {id:'e6',type:'mc',section:'english',skill:'Inference',
  passage:'Despite producing celebrated novels since 1992, Elena Ferrante has kept her identity completely secret. She gives interviews only by email and never appears publicly. Critics have speculated she may be a translator, professor, or even a male writer, though Ferrante says gender is irrelevant to the work.',
   question:'What can be inferred about why Ferrante says gender is irrelevant?',
   options:['A) She wants to confirm she is male','B) She is redirecting attention from biography to the writing itself','C) She believes female authors cannot achieve recognition','D) She is unaware speculation exists'],
   answer:'B'},
  {id:'e7',type:'mc',section:'english',skill:'Punctuation',
   passage:null,
   question:'Which sentence uses apostrophes correctly?',
   options:['A) The companys\' policy changed it\'s approach.','B) The company\'s policy changed its approach.','C) The companies policy changed its\' approach.','D) The company\'s policy changed it\'s approach.'],
   answer:'B'},
  {id:'e8',type:'mc',section:'english',skill:'Command of Evidence',
  passage:'Dr. Osei claims: "Students who take music lessons before age 10 show higher math performance." A critic says this may reflect selection bias because families who afford music lessons may also provide other academic advantages.',
   question:'Which study design best addresses the critic\'s concern?',
   options:['A) Survey adult musicians about childhood math scores','B) Randomly assign similar-background children to music or non-music groups and track math performance','C) Interview parents of high-achieving math students','D) Analyze music school enrollment by zip code'],
   answer:'B'},
  {id:'e9',type:'mc',section:'english',skill:'Parallel Structure',
   passage:null,
   question:'Which version uses parallel structure correctly? "The policy requires employees to submit reports weekly, attending monthly reviews, and that they complete training."',
   options:['A) to submit reports weekly, to attend monthly reviews, and to complete training','B) submitting reports weekly, attending monthly reviews, and completing training','C) Both A and B are correct','D) Neither corrects the error'],
   answer:'C'},
  {id:'e10',type:'mc',section:'english',skill:'Text Structure',
   passage:'Historians long assumed the Bronze Age Collapse (~1200 BCE) had a single cause. Recent scholarship challenges this, pointing to a "perfect storm": climate change, drought, seismic activity, and trade disruption. New paleoclimatic data from the Eastern Mediterranean strongly supports a prolonged drought matching the collapse timeline.',
   question:'How is this passage structured?',
   options:['A) Problem then solution','B) Original claim, counter-claim, then supporting evidence','C) Chronological narrative','D) Comparison of two civilizations'],
   answer:'B'},
  {id:'e11',type:'mc',section:'english',skill:'Words in Context',
  passage:'The new bridge was lauded for its elegance, but engineers quietly worried about its structural redundancy, or rather, the lack of it. A single point of failure in the cable arrangement could, under certain loads, trigger failures across the entire span.',
   question:'As used here, "redundancy" refers to:',
   options:['A) Unnecessary repetition','B) Backup systems that maintain safety if one component fails','C) Excess weight in the design','D) The bridge\'s decorative elements'],
   answer:'B'},
  {id:'e12',type:'mc',section:'english',skill:'Inference',
  passage:'Early jazz musicians in New Orleans improvised not just musically but socially, playing everything from funeral processions to dance halls. They had to read audiences instantly, shifting tempo and feel within a single song. This sensitivity to context may explain why jazz developed such a rich vocabulary for musical conversation between performers.',
   question:'What does the passage imply about the relationship between jazz musicians\' social environment and their music?',
   options:['A) Jazz developed mainly from the funeral tradition','B) Playing in diverse settings built improvisational skills that shaped the music','C) The venues were considered disreputable','D) Jazz musicians were socially isolated'],
   answer:'B'},
  {id:'e13',type:'mc',section:'english',skill:'Rhetorical Synthesis',
   passage:'A student argues that urban green spaces improve mental health. She has: (1) A meta-analysis of 47 studies showing parks reduce anxiety by 18%. (2) Surveys showing residents near parks report higher life satisfaction. (3) A report that wealthy neighborhoods have 3x more green space than low-income ones.',
   question:'Which sources best support the student\'s central argument?',
   options:['A) Sources 1 and 2 only','B) Source 3 only','C) Sources 2 and 3 only','D) All three equally'],
   answer:'A'},
  {id:'e14',type:'mc',section:'english',skill:'Pronoun Reference',
   passage:null,
   question:'Which revision best fixes the ambiguity? "When the director spoke to the actor, he seemed nervous."',
   options:['A) When the director spoke to the actor, they seemed nervous.','B) The director seemed nervous when speaking to the actor.','C) When the director spoke to the actor, the director seemed nervous.','D) Both B and C fix the ambiguity.'],
   answer:'D'},
  {id:'e15',type:'mc',section:'english',skill:'Run-on Sentences',
   passage:null,
   question:'Which version correctly fixes this run-on? "The glacier retreated in the 20th century this exposed new land scientists are studying."',
   options:['A) The glacier retreated, this exposed new land scientists are studying.','B) The glacier retreated in the 20th century; this exposed new land scientists are studying.','C) The glacier retreated in the 20th century, this exposed new land.','D) The glacier retreated: this exposed new land scientists studying it.'],
   answer:'B'},
  // Extra for premium full tests
  {id:'e16',type:'mc',section:'english',skill:'Purpose',
   passage:'The city planning memo stated: "Stakeholder concerns have been reviewed. The department has determined the public benefit of reduced traffic substantially outweighs disruption to affected residents." Local residents disputed this, calling the process "anything but careful."',
   question:'What is the primary purpose of including the residents\' response?',
   options:['A) To prove the city was wrong','B) To show the memo\'s language was disputed by those most affected','C) To argue transit corridors are harmful','D) To provide a legal counterargument'],
   answer:'B'},
  {id:'e17',type:'mc',section:'english',skill:'Colon Usage',
   passage:null,
   question:'Which sentence uses a colon correctly?',
   options:['A) The researcher identified three variables: temperature, humidity, and pressure.','B) The researcher: identified temperature, humidity, and pressure.','C) The researcher identified: three variables temperature humidity pressure.','D) Three variables were: temperature, humidity, and pressure.'],
   answer:'A'},
  {id:'e18',type:'mc',section:'english',skill:'Central Ideas',
   passage:'Economists debate whether minimum wage increases cause unemployment. Classical theory says yes. But empirical research is inconsistent: fast-food industries often show minimal job losses after increases while some manufacturing sectors do show effects. The variation likely reflects differences in industry structure and automation potential.',
   question:'What is the central idea?',
   options:['A) Minimum wages should be abolished','B) Minimum wage effects depend on context and resist simple generalization','C) Fast-food is immune to wage increases','D) Manufacturing is always hurt by wage policy'],
   answer:'B'},
  {id:'e19',type:'mc',section:'english',skill:'Inference',
  passage:'In the 1950s, American supermarkets offered trading stamps, redeemable coupons given with purchases. At their peak, more stamps were printed than postage stamps. By the 1980s they had largely vanished, replaced by credit card rewards and frequent flyer miles, different mechanisms serving the same psychological function.',
   question:'The author\'s final observation implies that:',
   options:['A) Trading stamps were better than loyalty programs','B) The desire for consumer rewards is a persistent feature of human behavior','C) Credit cards were invented to replace trading stamps','D) Frequent flyer miles are less effective'],
   answer:'B'},
  {id:'e20',type:'mc',section:'english',skill:'Modifiers',
   passage:null,
   question:'Which revision best corrects this error? "Having studied for six hours, the exam felt easy to Maya."',
   options:['A) Having studied for six hours, the exam was easy.','B) The exam felt easy after Maya studied for six hours.','C) Maya, having studied six hours, found the exam easy.','D) Both B and C are correct.'],
   answer:'D'},
  {id:'e21',type:'mc',section:'english',skill:'Data Interpretation',
   passage:'A researcher recorded tree canopy coverage in five neighborhoods: Ashford (42%), Birchwood (18%), Culver Heights (61%), Downtown (7%), and Elmwood (38%). The researcher hypothesized that canopy correlates with median household income.',
   question:'Which finding would WEAKEN the hypothesis?',
   options:['A) Birchwood has lower canopy and lower income than Ashford','B) Elmwood has moderate canopy and moderate income','C) A high-income neighborhood has significantly lower canopy than a middle-income one','D) Downtown\'s canopy decreased over the past decade'],
   answer:'C'},
  {id:'e22',type:'mc',section:'english',skill:'Inference',
   passage:'A longitudinal study tracking 1,400 adults over 25 years found that those with strong social connections showed 34% lower cognitive decline. Researchers cautioned, however, that the relationship may not be purely causal: people with better cognitive health may be better at maintaining social networks, confounding the interpretation.',
   question:'What is the researchers\' main concern about the finding?',
   options:['A) The sample size is too small','B) Correlation between social connection and cognitive health might run in both directions','C) Social connection is impossible to measure','D) 25 years is insufficient'],
   answer:'B'},
  {id:'e23',type:'mc',section:'english',skill:'Grammar',
   passage:null,
   question:'Which sentence is grammatically correct?',
   options:['A) Neither the students nor the teacher were prepared for the power outage.','B) Neither the students nor the teacher was prepared for the power outage.','C) Neither the students nor the teacher are prepared for the power outage.','D) Neither the students nor the teacher have been prepared for the power outage.'],
   answer:'B'},
  {id:'e24',type:'mc',section:'english',skill:'Evidence',
   passage:null,
   question:'"Social media doesn\'t cause depression; depressed people use social media more." What study best tests this claim?',
   options:['A) Cross-sectional survey of social media users\' depression scores','B) Longitudinal study measuring depression before and after social media adoption','C) Experiment where participants avoid social media for 30 days','D) Meta-analysis of all social media studies'],
   answer:'B'},
  {id:'e25',type:'mc',section:'english',skill:'Words in Context',
   passage:'The documentary pulled no punches in its portrayal of the oil industry, laying bare the financial arrangements between lobbyists and regulatory officials that had remained opaque to the public for decades.',
   question:'As used here, "opaque" most nearly means:',
   options:['A) Dark in color','B) Hidden from understanding','C) Covered with oil','D) Mathematically complex'],
   answer:'B'},
  {id:'e26',type:'mc',section:'english',skill:'Rhetorical Purpose',
   passage:null,
   question:'A student argues libraries should expand digital lending. Which best introduces a counterargument to address?',
   options:['A) Libraries have served communities for centuries.','B) Publishers argue digital lending threatens author royalties.','C) Digital books work on many devices.','D) Younger readers prefer digital formats.'],
   answer:'B'},
  {id:'e27',type:'mc',section:'english',skill:'Transitions',
   passage:null,
   question:'Choose the best transition: "The protein structure had been theorized for decades. _____, no lab successfully synthesized it until 2023."',
   options:['A) Consequently','B) In addition','C) Nevertheless','D) For example'],
   answer:'C'}
];

const MATH_Q = [
  {id:'m1',type:'mc',section:'math',skill:'Linear Equations',passage:null,
   question:'If 5x − 3 = 2x + 12, what is x?',
   options:['A) 3','B) 5','C) 6','D) 9'],answer:'B'},
  {id:'m2',type:'mc',section:'math',skill:'Systems of Equations',passage:null,
   question:'In the system 2x + y = 10 and x − y = 2, what is y?',
   options:['A) 1','B) 2','C) 4','D) 6'],answer:'C'},
  {id:'m3',type:'mc',section:'math',skill:'Quadratic Equations',passage:null,
   question:'What are the solutions to x² − 5x + 6 = 0?',
   options:['A) x=1 and x=6','B) x=2 and x=3','C) x=−2 and x=−3','D) x=−1 and x=6'],answer:'B'},
  {id:'m4',type:'mc',section:'math',skill:'Ratios & Proportions',passage:null,
   question:'A recipe uses 3 cups of flour for 24 cookies. How many cups for 40 cookies?',
   options:['A) 4','B) 4.5','C) 5','D) 6'],answer:'C'},
  {id:'m5',type:'mc',section:'math',skill:'Percentages',passage:null,
   question:'A $120 jacket is 35% off. What is the sale price?',
   options:['A) $42','B) $72','C) $78','D) $85'],answer:'C'},
  {id:'m6',type:'spr',section:'math',skill:'Linear Equations',passage:null,
   question:'If 4(x + 3) = 44, what is x?',
   options:null,answer:'8',acceptableAnswers:['8']},
  {id:'m7',type:'mc',section:'math',skill:'Functions',passage:null,
   question:'If f(x) = 3x² − 2x + 1, what is f(−2)?',
   options:['A) 17','B) 9','C) −7','D) 5'],answer:'A'},
  {id:'m8',type:'mc',section:'math',skill:'Data Analysis',passage:null,
   question:'Dataset: 12, 15, 18, 21, 24, 27, 30. What is the median?',
   options:['A) 18','B) 20','C) 21','D) 22'],answer:'C'},
  {id:'m9',type:'mc',section:'math',skill:'Geometry',passage:null,
   question:'A circle has radius 7. What is its area? (π ≈ 3.14)',
   options:['A) 43.96','B) 153.86','C) 43.98','D) 44'],answer:'B'},
  {id:'m10',type:'mc',section:'math',skill:'Inequalities',passage:null,
   question:'Which value of x satisfies 3x − 7 > 14?',
   options:['A) 5','B) 6','C) 7','D) 8'],answer:'D'},
  {id:'m11',type:'mc',section:'math',skill:'Exponents',passage:null,
   question:'Simplify: (2³)² × 2⁻¹',
   options:['A) 16','B) 32','C) 64','D) 128'],answer:'B'},
  {id:'m12',type:'mc',section:'math',skill:'Word Problems',passage:null,
   question:'Train A: 60 mph. Train B: 80 mph, departs 30 min later, same direction. How many hours after Train A departs does Train B catch up?',
   options:['A) 1.5','B) 2','C) 2.5','D) 3'],answer:'B'},
  {id:'m13',type:'spr',section:'math',skill:'Algebra',passage:null,
   question:'If x/4 + x/6 = 5, what is x?',
   options:null,answer:'12',acceptableAnswers:['12']},
  {id:'m14',type:'mc',section:'math',skill:'Geometry - Triangles',passage:null,
   question:'A right triangle has legs of length 9 and 12. What is the hypotenuse?',
   options:['A) 13','B) 15','C) 17','D) 21'],answer:'B'},
  {id:'m15',type:'mc',section:'math',skill:'Statistics',passage:null,
   question:'A class of 20 students has mean score 78. If 5 students averaging 90 are removed, what is the new mean?',
   options:['A) 71','B) 73','C) 74','D) 75'],answer:'C'},
  {id:'m16',type:'mc',section:'math',skill:'Polynomials',passage:null,
   question:'Which expression equals (x + 4)(x − 3)?',
   options:['A) x² − x − 12','B) x² + x − 12','C) x² + 7x − 12','D) x² − 7x + 12'],answer:'B'},
  {id:'m17',type:'mc',section:'math',skill:'Rates',passage:null,
   question:'A car gets 32 mpg. Gas is $3.80/gallon. Cost to drive 160 miles?',
   options:['A) $17.50','B) $19.00','C) $20.75','D) $22.00'],answer:'B'},
  {id:'m18',type:'mc',section:'math',skill:'Probability',passage:null,
   question:'A bag has 4 red, 6 blue, 2 green marbles. What is P(not red)?',
   options:['A) 1/3','B) 1/4','C) 2/3','D) 3/4'],answer:'C'},
  {id:'m19',type:'spr',section:'math',skill:'Linear Models',passage:null,
   question:'A line passes through (0, 5) and (3, 11). What is the slope?',
   options:null,answer:'2',acceptableAnswers:['2']},
  {id:'m20',type:'mc',section:'math',skill:'Scatterplot',passage:null,
   question:'A line of best fit passes through (2, 65) and (8, 89). What score does it predict for 5 hours of study?',
   options:['A) 73','B) 75','C) 77','D) 79'],answer:'C'},
  {id:'m21',type:'mc',section:'math',skill:'Geometry - Volume',passage:null,
   question:'A cylinder has r=5 cm, h=10 cm. Volume? (π≈3.14)',
   options:['A) 628','B) 785','C) 1570','D) 314'],answer:'B'},
  {id:'m22',type:'mc',section:'math',skill:'Complex Numbers',passage:null,
   question:'What is (3 + 2i)(3 − 2i)?',
   options:['A) 9 − 4','B) 13','C) 5','D) 9 + 4'],answer:'B'}
];

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

  setView('loading');

  // Short delay so the spinner renders, then build the test
  setTimeout(()=>{
    try {
      let questions;
      if (S.section==='english')      questions = ENG_Q.slice(0, limit);
      else if (S.section==='math')    questions = MATH_Q.slice(0, limit);
      else                            questions = [...ENG_Q.slice(0, Math.ceil(limit*.55)), ...MATH_Q.slice(0, Math.floor(limit*.45))];

      S.questions  = questions;
      S.answers    = {};
      S.flags      = new Set();
      S.curQ       = 0;
      S.timerPaused = false;
      S.timeLeft   = getTestDurationSeconds(S.section, isPrem);
      S.testActive = true;

      const labels = { english:'Reading & Writing', math:'Math', full:'Full Test' };
      document.getElementById('tb-sec-lbl').textContent = labels[S.section] || S.section;
      updTimerPauseButton();
      updTimerDisplay();

      setView('test');

      // Wait one frame after the test screen is visible before touching DOM inside it
      requestAnimationFrame(()=>{
        buildQNav();
        renderQ(0);
        startTimer();
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
  S.questions.forEach((_,i)=>{
    const b=document.createElement('button');
    b.className='qn-btn';b.textContent=i+1;b.id='qnb-'+i;
    b.onclick=()=>goQ(i);g.appendChild(b);
  });updQNav();
}
function updQNav(){
  S.questions.forEach((_,i)=>{
    const b=document.getElementById('qnb-'+i);if(!b)return;
    b.className='qn-btn';
    if(i===S.curQ)b.classList.add('cur');
    else if(S.flags.has(i))b.classList.add('flag');
    else if(S.answers[i]!==undefined)b.classList.add('ans');
  });
  const pct=Object.keys(S.answers).length/S.questions.length*100;
  document.getElementById('tb-prog-fill').style.width=pct+'%';
  document.getElementById('test-prog-txt').textContent=`${S.curQ+1}/${S.questions.length}`;
  document.getElementById('prev-btn').disabled=S.curQ===0;
  const last=S.curQ===S.questions.length-1;
  document.getElementById('next-btn').classList.toggle('hidden',last);
  document.getElementById('submit-btn').classList.toggle('hidden',!last);
}

/* ── RENDER QUESTION ── */
function renderQ(idx){
  S.curQ=idx;
  const q=S.questions[idx];
  const sec=q.section==='math'?'Math':'Reading & Writing';
  let html=`<div class="q-hd"><div class="q-badge">${sec} · Q${idx+1} of ${S.questions.length}</div><div class="q-skill">${q.skill||''}</div></div>`;
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
}
function saveSpr(qi,v){if(v.trim())S.answers[qi]=v.trim();else delete S.answers[qi];updQNav();}

function goQ(i){
  const spr=document.getElementById('spr-'+S.curQ);
  if(spr)saveSpr(S.curQ,spr.value);
  renderQ(i);
}
function goNext(){goQ(Math.min(S.curQ+1,S.questions.length-1))}
function goPrev(){goQ(Math.max(S.curQ-1,0))}

/* ── FLAG ── */
function toggleFlag(){
  if(S.flags.has(S.curQ)){S.flags.delete(S.curQ);toast('Flag removed')}
  else{S.flags.add(S.curQ);toast('Question flagged.','wn')}
  updFlag();updQNav();
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
    questions:qs.map((q,i)=>({...q,userAnswer:S.answers[i],isCorrect:S.answers[i]?(q.type==='spr'?(q.acceptableAnswers||[q.answer]).some(a=>a.toString()===S.answers[i].toString()):S.answers[i]===q.answer):false})),
    date:new Date().toISOString(),isFree:!S.isPremium};
  saveSession(S.results);
  void saveSavedQuestionsForResult(S.results);
  setView('results');renderResults(S.results);
}

/* ── RESULTS ── */
function renderResults(r){
  const max=r.section==='full'?1600:800;
  document.getElementById('res-headline').textContent=`${S.user.name||'Your'} Results`;
  document.getElementById('res-subline').textContent=`${r.section==='full'?'Full Test':r.section==='english'?'Reading & Writing':'Math'} · ${new Date(r.date).toLocaleDateString()}`;
  document.getElementById('r-correct').textContent=r.correct;
  document.getElementById('r-wrong').textContent=r.wrong;
  document.getElementById('r-skip').textContent=r.skipped;
  document.getElementById('score-lbl').textContent=r.section==='full'?'Combined SAT Score':r.section==='english'?'Reading & Writing Score':'Math Score';
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
    box.textContent=exps[q.skill]||exps.default;
    btn.style.display='none';
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
  if(e.key==='ArrowRight')goNext();
  if(e.key==='ArrowLeft')goPrev();
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
async function init() {
  setView('landing', { preserveScroll: true });
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

  await handleCheckoutReturn();

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('billing') === 'return') {
    await refreshPremiumStatus();
    toast('Returned from billing portal.', 'ok', 3600);
    trackEvent('billing_portal_returned', { isPremium: Boolean(S.isPremium) });
    searchParams.delete('billing');
    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState({}, document.title, nextUrl);
  }

  /* Scholarship counter, triggers when scrolled into view */
  const counterEl = document.getElementById('impact-counter');
  if (counterEl) {
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
        // Ease in-out for a smoother start and finish.
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

    // Use IntersectionObserver to trigger on scroll into view
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { runCounter(); obs.disconnect(); }
      }, { threshold: 0.4 });
      obs.observe(counterEl);
    } else {
      // Fallback: run immediately
      counterEl.textContent = finalCounterLabel;
    }
  }

  /* Hero user counter, grows from this request timestamp */
  const heroUserCounterEl = document.getElementById('hero-user-counter');
  if (heroUserCounterEl) {
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
    setInterval(updateHeroUserCounter, 1000);
  }

  /* Register service worker for PWA offline support */
  if ('serviceWorker' in navigator) {
    // navigator.serviceWorker.register('/sw.js');
  }
}

// Run after full DOM is parsed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { init(); });
} else {
  init();
}

document.addEventListener('click', e => {
  const panel = document.getElementById('mobile-menu-panel');
  const wrap = document.querySelector('.mobile-menu-wrap');
  if (!panel || !wrap) return;
  if (!wrap.contains(e.target)) panel.classList.remove('open');
});

// Prevent pull-down overscroll when the page is already at the top.
(function lockTopOverscroll() {
  let touchStartY = 0;

  window.addEventListener('touchstart', e => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (!e.touches || e.touches.length === 0) return;
    const currentY = e.touches[0].clientY;
    const pullingDown = currentY > touchStartY;
    if (window.scrollY <= 0 && pullingDown) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('wheel', e => {
    if (window.scrollY <= 0 && e.deltaY < 0) {
      e.preventDefault();
    }
  }, { passive: false });
})();
