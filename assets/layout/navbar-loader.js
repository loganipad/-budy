(function () {
  var didMountNavbar = false;
  var didBindScroll = false;
  var didBindResize = false;
  var NAV_CACHE_KEY = 'budy_navbar_html_v4';
  var NAV_STATE_KEY = 'budy_navbar_state_v1';
  var NAV_PROGRESS_ITEMS = [
    { linkId: 'nav-link-why', sectionId: 'features' },
    { linkId: 'nav-link-pricing', sectionId: 'pricing' },
    { linkId: 'nav-link-features', sectionId: 'solutions' }
  ];

  function getPath() {
    return String(window.location.pathname || '/').toLowerCase();
  }

  function getPageLabel(path) {
    switch (path) {
      case '/':
      case '/index':
      case '/index.html':
        return 'Home';
      case '/study.html':
      case '/study':
        return 'Study Hub';
      case '/study-guide-viewer.html':
      case '/study-guide-viewer':
        return 'Study Guide Viewer';
      case '/my-account.html':
      case '/my-account':
        return 'My Account';
      case '/checkout.html':
      case '/checkout':
        return 'Checkout';
      case '/login.html':
      case '/login':
        return 'Log In';
      case '/about.html':
      case '/about':
        return 'About';
      case '/contact.html':
      case '/contact':
        return 'Contact';
      case '/privacy.html':
      case '/privacy':
        return 'Privacy Policy';
      case '/terms.html':
      case '/terms':
        return 'Terms of Use';
      case '/score-guarantee.html':
      case '/score-guarantee':
        return 'Score Guarantee';
      case '/404.html':
        return 'Page Not Found';
      default:
        return '';
    }
  }

  function ensureBrowserMetadata() {
    var head = document.head;
    if (!head) return;

    var faviconHref = '/assets/budy-logo.png';
    var icon = head.querySelector('link[rel="icon"]') || document.createElement('link');
    icon.setAttribute('rel', 'icon');
    icon.setAttribute('type', 'image/png');
    icon.setAttribute('href', faviconHref);
    if (!icon.parentNode) head.appendChild(icon);

    var apple = head.querySelector('link[rel="apple-touch-icon"]') || document.createElement('link');
    apple.setAttribute('rel', 'apple-touch-icon');
    apple.setAttribute('href', faviconHref);
    if (!apple.parentNode) head.appendChild(apple);

    var path = getPath();
    var label = getPageLabel(path);
    if (!label) return;
    document.title = 'Budy.Study | ' + label;
  }

  function isAccountPage(path) {
    return path === '/my-account.html' || path === '/my-account';
  }

  function isLandingPage(path) {
    return path === '/' || path === '/index.html' || path === '/index';
  }

  function isLoginPage(path) {
    return path === '/login.html' || path === '/login';
  }

  function isStudyPage(path) {
    return path === '/study.html' || path === '/study';
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
      desktopAccount.textContent = isHome ? 'Home' : 'Dashboard';
      desktopAccount.setAttribute('href', isHome ? '/' : '/my-account.html');
    }

    if (mobileAccount) {
      mobileAccount.textContent = isHome ? 'Home' : 'Dashboard';
      mobileAccount.setAttribute('href', isHome ? '/' : '/my-account.html');
    }
  }

  function updateStudyLink(isStudy) {
    var desktopHome = document.getElementById('nav-link-why');
    var mobileHome = document.getElementById('nav-m-link-why');

    if (desktopHome) {
      desktopHome.textContent = isStudy ? 'Home' : 'Why Budy?';
      desktopHome.setAttribute('href', isStudy ? '/' : '/#features');
    }

    if (mobileHome) {
      mobileHome.textContent = isStudy ? 'Home' : 'Why Budy?';
      mobileHome.setAttribute('href', isStudy ? '/' : '/#features');
    }
  }

  function syncNavStartCtas() {
    var nextLabel = 'Start Test';

    var nav = document.getElementById('nav');
    if (!nav) return;

    nav.querySelectorAll('[data-start-cta]').forEach(function (el) {
      var freeText = el.getAttribute('data-free-text') || '';
      var premiumText = el.getAttribute('data-premium-text') || freeText;
      el.textContent = premiumText || freeText || nextLabel;
    });

    nav.querySelectorAll('button[onclick="openOnboard()"], button[onclick="openOnboard();"]').forEach(function (el) {
      if (!el.hasAttribute('data-start-cta')) {
        el.textContent = nextLabel;
      }
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clearNavProgress() {
    NAV_PROGRESS_ITEMS.forEach(function (item) {
      var link = document.getElementById(item.linkId);
      if (!link) return;
      link.style.setProperty('--nav-pill-fill', '0%');
      link.style.setProperty('--nav-pill-glow', '0');
      link.classList.remove('nav-progress-active', 'nav-progress-complete');
    });
  }

  function updateNavProgress() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    if (!isLandingPage(getPath()) || nav.classList.contains('nav-context-account') || nav.classList.contains('nav-context-test')) {
      clearNavProgress();
      return;
    }

    var navHeight = nav.offsetHeight || 64;
    var anchorY = window.scrollY + navHeight + Math.max(window.innerHeight * 0.14, 32);
    var activeSectionId = '';

    NAV_PROGRESS_ITEMS.forEach(function (item) {
      var section = document.getElementById(item.sectionId);
      if (!section) return;
      var sectionTop = section.offsetTop;
      var sectionBottom = sectionTop + section.offsetHeight;
      if (anchorY >= sectionTop && anchorY < sectionBottom) {
        activeSectionId = item.sectionId;
      }
    });

    NAV_PROGRESS_ITEMS.forEach(function (item) {
      var link = document.getElementById(item.linkId);
      var section = document.getElementById(item.sectionId);
      if (!link || !section) return;

      var sectionTop = section.offsetTop;
      var sectionBottom = sectionTop + section.offsetHeight;
      var progress = clamp((anchorY - sectionTop) / Math.max(sectionBottom - sectionTop, 1), 0, 1);
      link.style.setProperty('--nav-pill-fill', (progress * 100).toFixed(1) + '%');
      link.style.setProperty('--nav-pill-glow', progress > 0.02 ? '1' : '0');
      link.classList.toggle('nav-progress-active', activeSectionId === item.sectionId);
      link.classList.toggle('nav-progress-complete', progress >= 0.999);
    });
  }

  function refreshNavChrome() {
    var nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    updateNavProgress();
  }

  function runFallbackAuthAction(isLoggedIn) {
    if (isLoggedIn) {
      if (typeof window.logout === 'function') {
        window.logout();
        return;
      }
      try {
        localStorage.removeItem('budy_local_auth_user');
        localStorage.removeItem('budy_auth');
      } catch (_) {}
      if (typeof window.clearNavbarState === 'function') {
        window.clearNavbarState();
      }
      window.location.href = '/';
      return;
    }
    window.location.href = '/login.html';
  }

  function applyNavContext() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    var path = getPath();
    var account = isAccountPage(path);
    var study = isStudyPage(path);
    var test = isTestContext() || nav.classList.contains('nav-context-test');

    nav.classList.remove('nav-context-home', 'nav-context-default', 'nav-context-account', 'nav-context-study', 'nav-context-test');
    nav.classList.add(
      test
        ? 'nav-context-test'
        : (isLandingPage(path)
          ? 'nav-context-home'
          : (study ? 'nav-context-study' : (account ? 'nav-context-account' : 'nav-context-default')))
    );

    updateAccountLink(account || test || isLoginPage(path));
    updateStudyLink(study);

    var panel = document.getElementById('mobile-menu-panel');
    if (panel) {
      panel.classList.toggle('nav-account-ctx', account);

      var hideInStudy = ['nav-m-link-pricing', 'nav-m-link-features', 'mobile-auth-link'];
      var hideInTest = ['nav-m-link-why', 'nav-m-link-features', 'nav-m-link-pricing'];
      var idsToHide = test ? hideInTest : (study ? hideInStudy : []);

      panel.querySelectorAll('.mobile-menu-link').forEach(function (link) {
        var hide = idsToHide.indexOf(link.id) !== -1;
        link.style.display = hide ? 'none' : '';
      });
    }
  }

  function syncNavAuthState() {
    var nav = document.getElementById('nav');
    var authBtn = document.getElementById('auth-btn');
    var mobileAuth = document.getElementById('mobile-auth-link');
    if (!authBtn || !nav) return;

    var path = getPath();
    var state = getRuntimeNavState();
    var isLoggedIn = Boolean(state.isLoggedIn);
    var isLanding = isLandingPage(path);
    var isAccount = isAccountPage(path);
    var nextLabel = isLanding
      ? (isLoggedIn ? 'Study' : 'Log In')
      : (isAccount && isLoggedIn ? 'Study' : (isLoggedIn ? 'Log Out' : 'Log In'));
    var authHref = ((isLanding && isLoggedIn) || (isAccount && isLoggedIn))
      ? '/study.html'
      : '/login.html';

    authBtn.textContent = nextLabel;
    authBtn.onclick = function () {
      if (isLanding) {
        window.location.href = authHref;
        return;
      }
      if (isAccount && isLoggedIn) {
        window.location.href = authHref;
        return;
      }
      if (typeof window.handleAuthButton === 'function') {
        window.handleAuthButton();
      }
    };

    if (mobileAuth) {
      mobileAuth.textContent = nextLabel;
      mobileAuth.setAttribute('href', authHref);
      mobileAuth.onclick = function (event) {
        event.preventDefault();
        if (isLanding) {
          if (typeof window.closeMobileMenu === 'function') {
            window.closeMobileMenu();
          }
          window.location.href = authHref;
          return;
        }
        if (isAccount && isLoggedIn) {
          if (typeof window.closeMobileMenu === 'function') {
            window.closeMobileMenu();
          }
          window.location.href = authHref;
          return;
        }
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
        var currentState = getRuntimeNavState();
        runFallbackAuthAction(Boolean(currentState.isLoggedIn));
      };
    }

    nav.classList.add('nav-auth-ready');
    var menuPanel = document.getElementById('mobile-menu-panel');
    if (menuPanel) menuPanel.classList.add('nav-auth-ready');
    syncNavStartCtas();
  }

  function setNavFallbacks() {

    if (typeof window.toggleMobileMenu !== 'function') {
      window.toggleMobileMenu = function () {
        var panel = document.getElementById('mobile-menu-panel');
        if (!panel) return;
        var isOpen = panel.classList.toggle('open');
        document.body.style.overflow = isOpen ? 'hidden' : '';
        if (isOpen) {
          // Close on ESC
          window.addEventListener('keydown', window._budyNavEscClose = function(e) {
            if (e.key === 'Escape') window.closeMobileMenu();
          });
          // Close on background click
          panel.addEventListener('click', window._budyNavBgClose = function(e) {
            if (e.target === panel) window.closeMobileMenu();
          });
        } else {
          window.removeEventListener('keydown', window._budyNavEscClose);
          panel.removeEventListener('click', window._budyNavBgClose);
        }
      };
    }

    if (typeof window.closeMobileMenu !== 'function') {
      window.closeMobileMenu = function () {
        var panel = document.getElementById('mobile-menu-panel');
        if (panel) panel.classList.remove('open');
        document.body.style.overflow = '';
        window.removeEventListener('keydown', window._budyNavEscClose);
        if (panel) panel.removeEventListener('click', window._budyNavBgClose);
      };
    }

    if (typeof window.openOnboard !== 'function') {
      window.openOnboard = function () {
        window.location.href = '/?start=1';
      };
    }

    if (!didBindScroll) {
      window.addEventListener('scroll', refreshNavChrome);
      didBindScroll = true;
    }

    if (!didBindResize) {
      window.addEventListener('resize', refreshNavChrome);
      didBindResize = true;
    }

    refreshNavChrome();
  }

  function postMount() {
    setNavFallbacks();
    applyNavContext();
    syncNavAuthState();
    syncNavStartCtas();
    updateNavProgress();
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
    updateNavProgress();
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

  ensureBrowserMetadata();
  mountNavbar();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountNavbar);
  }
})();
