'use strict';

(function () {
  var ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  var ESCAPE_RE = /[&<>"']/g;

  function escapeHtml(value) {
    var text = value == null ? '' : String(value);
    if (!text) return '';
    return text.replace(ESCAPE_RE, function (ch) {
      return ESCAPE_MAP[ch];
    });
  }

  window.BudyEscapeHtml = escapeHtml;
})();
