(function () {
  var didMountFooter = false;
  var FOOTER_CACHE_KEY = 'budy_footer_html_v11';

  function mountFooter() {
    if (didMountFooter) return;

    var slot = document.getElementById('footer-slot');
    if (!slot) return;
    didMountFooter = true;

    if (document.querySelector('footer.site-footer')) return;

    try {
      var cached = sessionStorage.getItem(FOOTER_CACHE_KEY);
      if (cached) {
        slot.innerHTML = cached;
      }
    } catch (_) {}

    fetch('/footer.html', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load footer');
        return res.text();
      })
      .then(function (html) {
        if (slot.innerHTML !== html) {
          slot.innerHTML = html;
        }
        try {
          sessionStorage.setItem(FOOTER_CACHE_KEY, html);
        } catch (_) {}
      })
      .catch(function () {
        // Keep page usable even if footer fetch fails.
      });
  }

  mountFooter();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFooter);
  }
})();
