(function () {
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
        if (typeof window.updateAuthUI === 'function') {
          try { window.updateAuthUI(); } catch (_) {}
        }
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
