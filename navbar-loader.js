(function () {
  var didMountNavbar = false;

  function injectNavConsistencyStyles() {
    if (document.getElementById('nav-consistency-overrides')) return;

    var style = document.createElement('style');
    style.id = 'nav-consistency-overrides';
    style.textContent = [
      '#nav .nav-inner{min-height:var(--shared-nav-h,64px);}',
      '#nav .nav-right{display:flex;align-items:center;justify-content:flex-end;gap:10px;}',
      '#nav .btn,#nav .mobile-menu-btn{font-synthesis-weight:none;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}',
      '#nav .btn{transition:background-color .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease;transform:none;}',
      '#nav .btn-sm,#nav .mobile-menu-btn{height:40px;min-height:40px;line-height:1;font-size:13.5px;font-weight:700;letter-spacing:.01em;}',
      '#nav .btn-sm{padding:0 20px;}',
      '#nav .mobile-menu-btn{padding:0 14px;}',
      '#nav #nav-link-why{width:110px;}',
      '#nav #nav-link-features{width:106px;}',
      '#nav #nav-link-pricing{width:102px;}',
      '#nav #nav-link-account,#nav #auth-btn{width:118px;}',
      '#nav .btn.btn-primary.btn-sm{width:146px;}',
      '#nav .btn.btn-primary:hover{transform:none;}',
      '#nav #auth-btn,#nav #mobile-auth-link{visibility:hidden;}',
      '#nav.nav-auth-ready #auth-btn,#nav.nav-auth-ready #mobile-auth-link{visibility:visible;}',
      '#nav.nav-account-mode .nav-right,#nav.nav-test-mode .nav-right{width:402px;max-width:100%;justify-content:flex-end;}',
      '#nav.nav-test-mode #nav-link-why,#nav.nav-test-mode #nav-link-features,#nav.nav-test-mode #nav-link-pricing,#nav.nav-test-mode #nav-m-link-why,#nav.nav-test-mode #nav-m-link-features,#nav.nav-test-mode #nav-m-link-pricing{display:none !important;}',
      '#nav.nav-test-mode #nav-link-account,#nav.nav-test-mode #auth-btn,#nav.nav-test-mode .btn.btn-primary.btn-sm{display:inline-flex !important;}',
      '#nav.nav-test-mode .mobile-menu-wrap{display:block !important;}',
      '#nav.nav-account-mode #nav-link-why,#nav.nav-account-mode #nav-link-features,#nav.nav-account-mode #nav-link-pricing,#nav.nav-account-mode #nav-m-link-why,#nav.nav-account-mode #nav-m-link-features,#nav.nav-account-mode #nav-m-link-pricing{display:none !important;}'
    ].join('');

    document.head.appendChild(style);
  }

  function getLocalAuthUser() {
    try {
      var raw = localStorage.getItem('budy_local_auth_user');
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function syncNavAuthFallbackState() {
    var nav = document.getElementById('nav');
    var authBtn = document.getElementById('auth-btn');
    var mobileAuth = document.getElementById('mobile-auth-link');
    if (!authBtn) return;

    if (typeof window.updateAuthUI === 'function') {
      try {
        window.updateAuthUI();
        if (nav) nav.classList.add('nav-auth-ready');
        return;
      } catch (_) {}
    }

    var localUser = getLocalAuthUser();
    var isLoggedIn = Boolean(localUser && localUser.accessToken);
    authBtn.textContent = isLoggedIn ? 'Log Out' : 'Log In';
    if (mobileAuth) mobileAuth.textContent = isLoggedIn ? 'Log Out' : 'Log In';
    if (nav) nav.classList.add('nav-auth-ready');

    if (typeof window.handleAuthButton !== 'function') {
      window.handleAuthButton = function () {
        if (isLoggedIn) {
          try { localStorage.removeItem('budy_local_auth_user'); } catch (_) {}
          window.location.href = '/';
          return;
        }
        window.location.href = '/login.html';
      };
    }
  }

  function applyNavVariant() {
    var path = String(window.location.pathname || '').toLowerCase();
    var isAccountPage = path === '/my-account.html' || path === '/my-account';
    var isDarkPage = path === '/login.html' || path === '/login' || path === '/checkout.html' || path === '/checkout';
    var nav = document.getElementById('nav');
    if (!nav) return;

    var desktopAccount = document.getElementById('nav-link-account');
    var mobileAccount = document.getElementById('nav-m-link-account');

    nav.classList.toggle('nav-account-mode', isAccountPage);
    nav.classList.toggle('nav-dark-mode', isDarkPage && !isAccountPage);
    nav.classList.toggle('nav-default-mode', !isAccountPage && !isDarkPage);

    if (isAccountPage) {
      if (desktopAccount) {
        desktopAccount.textContent = 'Home';
        desktopAccount.setAttribute('href', '/');
      }

      if (mobileAccount) {
        mobileAccount.textContent = 'Home';
        mobileAccount.setAttribute('href', '/');
      }
      return;
    }

    if (desktopAccount) {
      desktopAccount.textContent = 'My Account';
      desktopAccount.setAttribute('href', '/my-account.html');
    }

    if (mobileAccount) {
      mobileAccount.textContent = 'My Account';
      mobileAccount.setAttribute('href', '/my-account.html');
    }
  }

  // Toggle test mode on the navbar (only left 3 info buttons visible)
  window.setNavTestMode = function (enabled) {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var desktopAccount = document.getElementById('nav-link-account');
    var mobileAccount = document.getElementById('nav-m-link-account');
    var isEnabled = !!enabled;

    nav.classList.toggle('nav-test-mode', isEnabled);

    if (isEnabled) {
      if (desktopAccount) {
        desktopAccount.textContent = 'Home';
        desktopAccount.setAttribute('href', '/');
      }
      if (mobileAccount) {
        mobileAccount.textContent = 'Home';
        mobileAccount.setAttribute('href', '/');
      }
      return;
    }

    applyNavVariant();
  };

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

    if (typeof window.handleAuthButton !== 'function') {
      window.handleAuthButton = function () {
        window.location.href = '/login.html';
      };
    }

    window.addEventListener('scroll', function () {
      var nav = document.getElementById('nav');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    });

    var navNow = document.getElementById('nav');
    if (navNow) navNow.classList.toggle('scrolled', window.scrollY > 20);
  }

  function mountNavbar() {
    if (didMountNavbar) return;

    var slot = document.getElementById('navbar-slot');
    if (!slot) return;
    didMountNavbar = true;
    injectNavConsistencyStyles();

    // If the navbar is already inlined in the page, skip the fetch
    if (document.getElementById('nav')) {
      setNavFallbacks();
      applyNavVariant();
      syncNavAuthFallbackState();
      document.dispatchEvent(new CustomEvent('navbar:mounted'));
      return;
    }

    fetch('/navbar.html', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load navbar');
        return res.text();
      })
      .then(function (html) {
        slot.innerHTML = html;
        setNavFallbacks();
        applyNavVariant();
        syncNavAuthFallbackState();
        document.dispatchEvent(new CustomEvent('navbar:mounted'));
      })
      .catch(function () {
        // If navbar fails to load, keep page usable without throwing.
      });
  }

  // Run immediately for deferred scripts; retry on DOMContentLoaded if needed.
  mountNavbar();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountNavbar);
  }
})();
