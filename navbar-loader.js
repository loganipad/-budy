(function () {
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
    var authBtn = document.getElementById('auth-btn');
    var mobileAuth = document.getElementById('mobile-auth-link');
    if (!authBtn) return;

    if (typeof window.updateAuthUI === 'function') {
      try {
        window.updateAuthUI();
        return;
      } catch (_) {}
    }

    var localUser = getLocalAuthUser();
    var isLoggedIn = Boolean(localUser && localUser.accessToken);
    authBtn.textContent = isLoggedIn ? 'Log Out' : 'Log In';
    if (mobileAuth) mobileAuth.textContent = isLoggedIn ? 'Log Out' : 'Log In';

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
    var nav = document.getElementById('nav');

    var desktopWhy = document.getElementById('nav-link-why');
    var desktopFeatures = document.getElementById('nav-link-features');
    var desktopPricing = document.getElementById('nav-link-pricing');
    var desktopAccount = document.getElementById('nav-link-account');
    var mobileWhy = document.getElementById('nav-m-link-why');
    var mobileFeatures = document.getElementById('nav-m-link-features');
    var mobilePricing = document.getElementById('nav-m-link-pricing');
    var mobileAccount = document.getElementById('nav-m-link-account');

    if (isAccountPage) {
      if (nav) {
        nav.classList.add('nav-account-mode');
        nav.classList.remove('nav-default-mode');
      }

      [desktopWhy, desktopFeatures, desktopPricing, mobileWhy, mobileFeatures, mobilePricing].forEach(function (el) {
        if (!el) return;
        el.style.display = 'none';
      });

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

    if (nav) {
      nav.classList.add('nav-default-mode');
      nav.classList.remove('nav-account-mode');
    }

    [desktopWhy, desktopFeatures, desktopPricing, mobileWhy, mobileFeatures, mobilePricing].forEach(function (el) {
      if (!el) return;
      el.style.display = '';
    });

    if (desktopAccount) {
      desktopAccount.textContent = 'My Account';
      desktopAccount.setAttribute('href', '/my-account.html');
    }

    if (mobileAccount) {
      mobileAccount.textContent = 'My Account';
      mobileAccount.setAttribute('href', '/my-account.html');
    }
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
    var slot = document.getElementById('navbar-slot');
    if (!slot) return;

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountNavbar);
  } else {
    mountNavbar();
  }
})();
