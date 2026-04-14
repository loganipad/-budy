'use strict';

(function () {
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var STORAGE_KEY = 'budy_utm_params';

  function captureUtmParams() {
    try {
      var params = new URLSearchParams(window.location.search);
      var utms = {};
      var hasAny = false;

      UTM_KEYS.forEach(function (key) {
        var val = params.get(key);
        if (val) {
          utms[key] = val.trim().slice(0, 128);
          hasAny = true;
        }
      });

      if (hasAny) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utms));
      }
    } catch (_) {}
  }

  function getUtmParams() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (_) {
      return {};
    }
  }

  captureUtmParams();

  window.BudyUtm = {
    getUtmParams: getUtmParams
  };
})();
