(function () {
  var didMountNavbar = false;
  var didBindScroll = false;
  var NAV_CACHE_KEY = 'budy_navbar_html_v2';

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

    if (typeof window.updateAuthUI === 'function') {
      try {
        window.updateAuthUI();
        nav.classList.add('nav-auth-ready');
        return;
      } catch (_) {}
    }

    var localUser = getLocalAuthUser();
    var isLoggedIn = Boolean(localUser && (localUser.accessToken || localUser.sub));
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
  };

  mountNavbar();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountNavbar);
  }
})();
