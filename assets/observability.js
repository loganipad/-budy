'use strict';

(function () {
  if (window.__BUDY_OBSERVABILITY_LOADED__) {
    return;
  }

  window.__BUDY_OBSERVABILITY_LOADED__ = true;

  var TELEMETRY_ENDPOINT = '/api/telemetry';
  var MAX_ERROR_EVENTS = 8;
  var sentPageView = false;
  var errorCount = 0;

  function truncate(value, maxLength) {
    var text = typeof value === 'string' ? value.trim() : '';
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  }

  function getSessionId() {
    try {
      var existing = sessionStorage.getItem('budy_session_id');
      if (existing) return existing;

      var next = window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);

      sessionStorage.setItem('budy_session_id', next);
      return next;
    } catch (_) {
      return 'session_unavailable';
    }
  }

  function getNavigationType() {
    try {
      var entries = window.performance && typeof window.performance.getEntriesByType === 'function'
        ? window.performance.getEntriesByType('navigation')
        : [];
      if (entries && entries[0] && entries[0].type) {
        return String(entries[0].type);
      }
    } catch (_) {}
    return 'navigate';
  }

  function getTargetLabel(element) {
    if (!element) return '';

    var label = element.getAttribute('data-analytics-label')
      || element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.textContent
      || '';

    return truncate(label.replace(/\s+/g, ' '), 120);
  }

  function getTargetHref(element) {
    if (!element || element.tagName !== 'A') return '';
    var href = element.getAttribute('href') || '';
    if (!href) return '';
    if (href.indexOf('http') === 0) {
      try {
        var url = new URL(href);
        return truncate(url.origin + url.pathname, 180);
      } catch (_) {
        return truncate(href, 180);
      }
    }
    return truncate(href, 180);
  }

  function buildContext() {
    return {
      path: truncate(window.location.pathname || '/', 180),
      title: truncate(document.title || '', 160),
      referrer: truncate(document.referrer || '', 200),
      sessionId: getSessionId(),
      viewport: {
        width: Number(window.innerWidth || 0),
        height: Number(window.innerHeight || 0)
      },
      screen: {
        width: Number(window.screen && window.screen.width ? window.screen.width : 0),
        height: Number(window.screen && window.screen.height ? window.screen.height : 0)
      },
      language: truncate(navigator.language || '', 32),
      navigationType: getNavigationType()
    };
  }

  function dispatch(type, payload, preferBeacon) {
    var body = JSON.stringify({
      type: type,
      payload: payload || {},
      context: buildContext()
    });

    if (preferBeacon && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(TELEMETRY_ENDPOINT, new Blob([body], { type: 'application/json' }));
        return;
      } catch (_) {}
    }

    fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body,
      credentials: 'same-origin',
      keepalive: true
    }).catch(function () {});
  }

  function trackPageView(reason) {
    if (sentPageView) return;
    sentPageView = true;

    dispatch('pageview', {
      reason: reason,
      pageType: document.body ? truncate(document.body.getAttribute('data-page-type') || '', 64) : '',
      navState: document.visibilityState || 'visible'
    }, false);
  }

  function trackPerformance() {
    if (!window.performance || typeof window.performance.getEntriesByType !== 'function') return;

    var entries = window.performance.getEntriesByType('navigation');
    var nav = entries && entries[0] ? entries[0] : null;
    if (!nav) return;

    dispatch('page_timing', {
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd || 0),
      loadMs: Math.round(nav.loadEventEnd || 0),
      transferSize: Number(nav.transferSize || 0),
      encodedBodySize: Number(nav.encodedBodySize || 0)
    }, true);
  }

  function trackClientError(kind, details) {
    if (errorCount >= MAX_ERROR_EVENTS) return;
    errorCount += 1;
    dispatch(kind, details, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackPageView('dom_content_loaded');
    }, { once: true });
  } else {
    trackPageView('ready');
  }

  window.addEventListener('load', function () {
    window.setTimeout(trackPerformance, 0);
  }, { once: true });

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element
      ? event.target.closest('[data-analytics-event],a,button')
      : null;

    if (!target) return;

    var eventName = target.getAttribute('data-analytics-event')
      || (target.tagName === 'A' ? 'link_click' : 'button_click');

    dispatch('interaction', {
      eventName: truncate(eventName, 64),
      label: getTargetLabel(target),
      href: getTargetHref(target),
      id: truncate(target.id || '', 64),
      className: truncate(target.className || '', 120)
    }, false);
  }, true);

  window.addEventListener('error', function (event) {
    trackClientError('client_error', {
      message: truncate(event && event.message ? String(event.message) : 'Unknown client error', 300),
      source: truncate(event && event.filename ? String(event.filename) : '', 240),
      line: Number(event && event.lineno ? event.lineno : 0),
      column: Number(event && event.colno ? event.colno : 0),
      stack: truncate(event && event.error && event.error.stack ? String(event.error.stack) : '', 1600)
    });
  });

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    var message = typeof reason === 'string'
      ? reason
      : (reason && reason.message ? String(reason.message) : 'Unhandled promise rejection');

    trackClientError('unhandled_rejection', {
      message: truncate(message, 300),
      stack: truncate(reason && reason.stack ? String(reason.stack) : '', 1600)
    });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'hidden') return;

    dispatch('session_hidden', {
      hiddenAt: new Date().toISOString()
    }, true);
  });

  window.BudyTelemetry = {
    track: function (eventName, payload) {
      if (!eventName) return;
      dispatch('custom_event', {
        eventName: truncate(String(eventName), 64),
        payload: payload && typeof payload === 'object' ? payload : {}
      }, false);
    }
  };
})();