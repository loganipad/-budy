(function () {
  var didMountNavbar = false;
  var didBindScroll = false;
  var NAV_CACHE_KEY = 'budy_navbar_html_v3';
  var NAV_STATE_KEY = 'budy_navbar_state_v1';

  function getPath() {
    return String(window.location.pathname || '/').toLowerCase();
  }

  function isAccountPage(path) {
    return path === '/my-account.html' || path === '/my-account';
  }

  function isTestContext() {
    return Boolean(document.body && document.body.classList.contains('test-active'));
  }

  function getLocalAuthUser() {
    try {
      var raw = localStorage.getItem('budy_local_auth_user') || localStorage.getItem('budy_auth');
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function readStoredNavState() {
    try {
      var raw = localStorage.getItem(NAV_STATE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeStoredNavState(state) {
    try {
      localStorage.setItem(NAV_STATE_KEY, JSON.stringify({
        isLoggedIn: Boolean(state && state.isLoggedIn),
        isPremium: Boolean(state && state.isPremium)
      }));
    } catch (_) {}
  }

  function getRuntimeNavState() {
    var localUser = getLocalAuthUser();
    var stored = readStoredNavState();
    var explicit = window.__BUDY_NAVBAR_STATE && typeof window.__BUDY_NAVBAR_STATE === 'object'
      ? window.__BUDY_NAVBAR_STATE
      : {};
    var pageState = window.S && typeof window.S === 'object'
      ? window.S
      : {};

    var isLoggedIn = typeof explicit.isLoggedIn === 'boolean'
      ? explicit.isLoggedIn
      : (typeof pageState.isLoggedIn === 'boolean'
        ? pageState.isLoggedIn
        : (typeof stored.isLoggedIn === 'boolean'
          ? stored.isLoggedIn
          : Boolean(localUser && (localUser.accessToken || localUser.sub))));

    var isPremium = typeof explicit.isPremium === 'boolean'
      ? explicit.isPremium
      : (typeof pageState.isPremium === 'boolean'
        ? pageState.isPremium
        : (typeof stored.isPremium === 'boolean'
          ? stored.isPremium
          : false));

    return {
      isLoggedIn: Boolean(isLoggedIn),
      isPremium: Boolean(isPremium)
    };
  }

  function updateAccountLink(isHome) {
    var desktopAccount = document.getElementById('nav-link-account');
    var mobileAccount = document.getElementById('nav-m-link-account');

    if (desktopAccount) {
      desktopAccount.textContent = isHome ? 'Home' : 'My Account';
      desktopAccount.setAttribute('href', isHome ? '/' : '/my-account.html');
    }

    if (mobileAccount) {
      mobileAccount.textContent = isHome ? 'Home' : 'My Account';
      mobileAccount.setAttribute('href', isHome ? '/' : '/my-account.html');
    }
  }

  function syncNavStartCtas() {
    var state = getRuntimeNavState();
    var isPremium = Boolean(state.isPremium);
    var nextLabel = isPremium ? 'Start Test' : 'Start Free Test';

    document.querySelectorAll('[data-start-cta]').forEach(function (el) {
      var freeText = el.getAttribute('data-free-text') || '';
      var premiumText = el.getAttribute('data-premium-text') || freeText;
      el.textContent = isPremium ? premiumText : freeText;
    });

    var nav = document.getElementById('nav');
    if (!nav) return;

    nav.querySelectorAll('button[onclick="openOnboard()"], button[onclick="openOnboard();"]').forEach(function (el) {
      if (!el.hasAttribute('data-start-cta')) {
        el.textContent = nextLabel;
      }
    });
  }

  function applyNavContext() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    var path = getPath();
    var account = isAccountPage(path);
    var test = isTestContext() || nav.classList.contains('nav-context-test');

    nav.classList.remove('nav-context-default', 'nav-context-account', 'nav-context-test');
    nav.classList.add(test ? 'nav-context-test' : (account ? 'nav-context-account' : 'nav-context-default'));

    updateAccountLink(account || test);
  }

  function syncNavAuthState() {
    var nav = document.getElementById('nav');
    var authBtn = document.getElementById('auth-btn');
    var mobileAuth = document.getElementById('mobile-auth-link');
    if (!authBtn || !nav) return;

    var state = getRuntimeNavState();
    var isLoggedIn = Boolean(state.isLoggedIn);
    var nextLabel = isLoggedIn ? 'Log Out' : 'Log In';

    authBtn.textContent = nextLabel;
    if (mobileAuth) {
      mobileAuth.textContent = nextLabel;
      mobileAuth.setAttribute('href', '/login.html');
      mobileAuth.onclick = function (event) {
        event.preventDefault();
        if (typeof window.handleAuthButton === 'function') {
          window.handleAuthButton();
        }
        if (typeof window.closeMobileMenu === 'function') {
          window.closeMobileMenu();
        }
      };
    }

    if (typeof window.handleAuthButton !== 'function') {
      window.handleAuthButton = function () {
        if (isLoggedIn) {
          try {
            localStorage.removeItem('budy_local_auth_user');
            localStorage.removeItem('budy_auth');
          } catch (_) {}
          window.location.href = '/';
          return;
        }
        window.location.href = '/login.html';
      };
    }

    nav.classList.add('nav-auth-ready');
    syncNavStartCtas();
  }

  function setNavFallbacks() {
    if (typeof window.toggleMobileMenu !== 'function') {
      window.toggleMobileMenu = function () {
        var panel = document.getElementById('mobile-menu-panel');
        if (panel) panel.classList.toggle('open');
      };
    }

    if (typeof window.closeMobileMenu !== 'function') {
      window.closeMobileMenu = function () {
        var panel = document.getElementById('mobile-menu-panel');
        if (panel) panel.classList.remove('open');
      };
    }

    if (typeof window.openOnboard !== 'function') {
      window.openOnboard = function () {
        window.location.href = '/';
      };
    }

    if (!didBindScroll) {
      window.addEventListener('scroll', function () {
        var nav = document.getElementById('nav');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
      });
      didBindScroll = true;
    }

    var navNow = document.getElementById('nav');
    if (navNow) navNow.classList.toggle('scrolled', window.scrollY > 20);
  }

  function postMount() {
    setNavFallbacks();
    applyNavContext();
    syncNavAuthState();
    syncNavStartCtas();
    document.dispatchEvent(new CustomEvent('navbar:mounted'));
  }

  function mountNavbar() {
    if (didMountNavbar) return;

    var slot = document.getElementById('navbar-slot');
    if (!slot) return;
    didMountNavbar = true;

    if (document.getElementById('nav')) {
      postMount();
      return;
    }

    try {
      var cached = sessionStorage.getItem(NAV_CACHE_KEY);
      if (cached) {
        slot.innerHTML = cached;
        postMount();
      }
    } catch (_) {}

    fetch('/navbar.html', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load navbar');
        return res.text();
      })
      .then(function (html) {
        if (slot.innerHTML !== html) {
          slot.innerHTML = html;
        }
        try {
          sessionStorage.setItem(NAV_CACHE_KEY, html);
        } catch (_) {}
        postMount();
      })
      .catch(function () {
        // Keep page usable even if navbar fetch fails.
      });
  }

  window.setNavTestMode = function (enabled) {
    var nav = document.getElementById('nav');
    if (!nav) return;

    nav.classList.toggle('nav-context-test', !!enabled);
    if (!enabled) nav.classList.remove('nav-context-test');
    applyNavContext();
  };

  window.refreshNavbarState = function () {
    applyNavContext();
    syncNavAuthState();
    syncNavStartCtas();
  };

  window.setNavbarState = function (nextState) {
    var current = getRuntimeNavState();
    var merged = {
      isLoggedIn: typeof nextState?.isLoggedIn === 'boolean' ? nextState.isLoggedIn : current.isLoggedIn,
      isPremium: typeof nextState?.isPremium === 'boolean' ? nextState.isPremium : current.isPremium
    };

    window.__BUDY_NAVBAR_STATE = merged;
    writeStoredNavState(merged);
    window.refreshNavbarState();
  };

  window.clearNavbarState = function () {
    window.__BUDY_NAVBAR_STATE = { isLoggedIn: false, isPremium: false };
    try {
      localStorage.removeItem(NAV_STATE_KEY);
    } catch (_) {}
    window.refreshNavbarState();
  };

  mountNavbar();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountNavbar);
  }
})();
