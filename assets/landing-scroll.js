  (() => {
    const isLandingPage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html');
    const scrollKey = 'budy_landing_scroll_y';
    let savedScrollY = 0;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (isLandingPage) {
      try {
        savedScrollY = Math.max(0, parseInt(sessionStorage.getItem(scrollKey) || '0', 10) || 0);
      } catch (_) {
        savedScrollY = 0;
      }

      if (savedScrollY > 0) {
        document.documentElement.style.visibility = 'hidden';
      }
    }

    const saveScrollPosition = () => {
      if (!isLandingPage) return;
      try {
        sessionStorage.setItem(scrollKey, String(Math.max(0, window.scrollY || window.pageYOffset || 0)));
      } catch (_) {}
    };

    window.__budyRestoreLandingScroll = () => {
      if (!isLandingPage) return;
      const targetY = savedScrollY;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, targetY);
      requestAnimationFrame(() => {
        window.scrollTo(0, targetY);
        document.documentElement.style.visibility = '';
        document.documentElement.style.scrollBehavior = '';
      });
    };

    window.addEventListener('scroll', saveScrollPosition, { passive: true });
    window.addEventListener('pagehide', saveScrollPosition);
    window.addEventListener('beforeunload', saveScrollPosition);
  })();
