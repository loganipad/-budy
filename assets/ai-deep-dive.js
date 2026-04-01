(function () {
  'use strict';

  const STYLE_ID = 'budy-ai-deep-dive-style';
  const HINT_KEY = 'budy_ai_deep_dive_hint_seen_v1';
  const MIN_SELECTION_CHARS = 2;
  const MAX_SELECTION_CHARS = 180;
  const MAX_SURROUNDING_CHARS = 560;
  const MAX_TERMS = 120;
  const MAX_HIGHLIGHTS_PER_SURFACE = 48;
  const DEFAULT_TERMS = [
    'inference',
    'central idea',
    'command of evidence',
    'craft and structure',
    'expression of ideas',
    'standard english conventions',
    'rhetorical synthesis',
    'transition',
    'grammar',
    'punctuation',
    'pronoun clarity',
    'parallel structure',
    'verb tense',
    'algebra',
    'linear equations',
    'systems of equations',
    'linear inequalities',
    'linear functions',
    'slope',
    'intercept',
    'quadratics',
    'polynomials',
    'radicals',
    'equivalent expressions',
    'probability',
    'statistics',
    'rates',
    'percentages',
    'ratios',
    'scatterplot',
    'line of best fit',
    'circles',
    'triangles',
    'area',
    'volume',
    'coordinate geometry',
    'trigonometry',
    'evidence',
    'claim',
    'passage',
    'function notation',
    'author\'s purpose'
  ];

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .budy-keyword-highlight {
        display:inline;
        padding:0 .22em;
        margin:0 .02em;
        border-radius:.38em;
        background:linear-gradient(180deg, rgba(26,86,219,.18) 0%, rgba(245,158,11,.14) 100%);
        box-shadow:inset 0 0 0 1px rgba(147,197,253,.24), 0 10px 22px rgba(8,15,32,.16);
        color:inherit;
        cursor:pointer;
        transition:background .18s ease, box-shadow .18s ease;
      }
      .budy-keyword-highlight:hover,
      .budy-keyword-highlight:focus-visible {
        background:linear-gradient(180deg, rgba(37,99,235,.28) 0%, rgba(245,158,11,.2) 100%);
        box-shadow:inset 0 0 0 1px rgba(191,219,254,.44), 0 14px 28px rgba(8,15,32,.2);
        outline:none;
      }
      .budy-deep-dive-launcher {
        position:fixed;
        z-index:1300;
        display:none;
        min-width:168px;
        padding:10px;
        border-radius:18px;
        background:rgba(7,18,37,.96);
        border:1px solid rgba(255,255,255,.1);
        box-shadow:0 22px 60px rgba(0,0,0,.34);
        backdrop-filter:blur(16px);
      }
      .budy-deep-dive-launcher.open { display:grid; gap:6px; }
      .budy-deep-dive-launcher button {
        border:none;
        border-radius:14px;
        padding:10px 12px;
        background:linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%);
        color:#eff6ff;
        font:600 13px/1.2 Sora, system-ui, sans-serif;
        cursor:pointer;
      }
      .budy-deep-dive-launcher span {
        color:rgba(226,232,240,.7);
        font:500 11px/1.35 Sora, system-ui, sans-serif;
      }
      .budy-deep-dive-overlay {
        position:fixed;
        inset:0;
        z-index:1350;
        display:none;
        align-items:flex-end;
        justify-content:flex-end;
        padding:24px;
        background:rgba(3,7,18,.46);
        backdrop-filter:blur(8px);
      }
      .budy-deep-dive-overlay.open { display:flex; }
      .budy-deep-dive-modal {
        width:min(460px, calc(100vw - 32px));
        max-height:min(80vh, 760px);
        overflow:auto;
        border-radius:28px;
        background:linear-gradient(180deg, rgba(10,18,33,.98) 0%, rgba(15,23,42,.98) 100%);
        border:1px solid rgba(255,255,255,.1);
        box-shadow:0 30px 90px rgba(0,0,0,.42);
        color:#f8fafc;
        font-family:Sora, system-ui, sans-serif;
      }
      .budy-deep-dive-head {
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:16px;
        padding:22px 22px 14px;
      }
      .budy-deep-dive-kicker {
        display:inline-flex;
        align-items:center;
        gap:8px;
        font-size:11px;
        font-weight:700;
        letter-spacing:.12em;
        text-transform:uppercase;
        color:#93c5fd;
      }
      .budy-deep-dive-kicker::before {
        content:'';
        width:8px;
        height:8px;
        border-radius:999px;
        background:#f59e0b;
        box-shadow:0 0 0 6px rgba(245,158,11,.14);
      }
      .budy-deep-dive-head h3 {
        margin:10px 0 0;
        font-size:26px;
        line-height:1.08;
        letter-spacing:-.04em;
      }
      .budy-deep-dive-close {
        border:none;
        background:rgba(255,255,255,.06);
        color:#cbd5e1;
        width:40px;
        height:40px;
        border-radius:14px;
        cursor:pointer;
        font-size:18px;
      }
      .budy-deep-dive-meta {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        padding:0 22px 12px;
      }
      .budy-deep-dive-chip {
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:7px 10px;
        border-radius:999px;
        background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.08);
        color:#cbd5e1;
        font-size:12px;
        font-weight:600;
      }
      .budy-deep-dive-body {
        display:grid;
        gap:12px;
        padding:0 22px 22px;
      }
      .budy-deep-dive-card,
      .budy-deep-dive-state {
        border-radius:20px;
        padding:16px;
        background:rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.08);
      }
      .budy-deep-dive-card strong,
      .budy-deep-dive-state strong {
        display:block;
        margin-bottom:8px;
        font-size:13px;
        letter-spacing:.02em;
        color:#f8fafc;
      }
      .budy-deep-dive-card p,
      .budy-deep-dive-state p {
        margin:0;
        color:rgba(226,232,240,.82);
        font-size:14px;
        line-height:1.65;
      }
      .budy-deep-dive-card ul {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        list-style:none;
        padding:0;
        margin:0;
      }
      .budy-deep-dive-card li {
        padding:8px 10px;
        border-radius:999px;
        background:rgba(59,130,246,.14);
        border:1px solid rgba(147,197,253,.18);
        color:#dbeafe;
        font-size:12px;
        font-weight:600;
      }
      .budy-deep-dive-actions {
        display:flex;
        gap:10px;
        padding:0 22px 22px;
      }
      .budy-deep-dive-actions button,
      .budy-deep-dive-actions a {
        flex:1 1 auto;
        border:none;
        border-radius:16px;
        padding:12px 14px;
        text-align:center;
        text-decoration:none;
        font:600 14px/1.2 Sora, system-ui, sans-serif;
        cursor:pointer;
      }
      .budy-deep-dive-primary {
        background:linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
        color:#eff6ff;
      }
      .budy-deep-dive-secondary {
        background:rgba(255,255,255,.06);
        color:#e2e8f0;
      }
      .budy-deep-dive-hint {
        position:fixed;
        left:22px;
        bottom:22px;
        z-index:1250;
        display:flex;
        align-items:center;
        gap:12px;
        max-width:min(340px, calc(100vw - 32px));
        padding:12px 14px;
        border-radius:18px;
        background:rgba(7,18,37,.92);
        border:1px solid rgba(255,255,255,.1);
        box-shadow:0 20px 48px rgba(0,0,0,.28);
        color:#e2e8f0;
        font:500 12px/1.5 Sora, system-ui, sans-serif;
      }
      .budy-deep-dive-hint.hidden { display:none; }
      .budy-deep-dive-hint button {
        border:none;
        background:transparent;
        color:#94a3b8;
        cursor:pointer;
        font-size:16px;
      }
      @media (max-width: 720px) {
        .budy-deep-dive-overlay {
          align-items:flex-end;
          justify-content:center;
          padding:12px;
        }
        .budy-deep-dive-modal {
          width:min(100%, 100%);
          border-radius:24px;
          max-height:84vh;
        }
        .budy-deep-dive-hint {
          left:12px;
          right:12px;
          bottom:12px;
          max-width:none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cleanText(value, maxLength) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!maxLength || text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeTerms(values) {
    const unique = [];
    const seen = new Set();
    values.forEach((value) => {
      const term = cleanText(value, 80).replace(/[.,:;!?]+$/g, '');
      if (term.length < 3) return;
      const lower = term.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      unique.push(term);
    });
    return unique.slice(0, MAX_TERMS).sort((left, right) => right.length - left.length);
  }

  function buildRegex(terms) {
    if (!terms.length) return null;
    return new RegExp(`\\b(${terms.map(escapeRegExp).join('|')})\\b`, 'gi');
  }

  function isVisible(element) {
    return Boolean(element && element.isConnected && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  }

  function mergeConfig(current, next) {
    return {
      ...current,
      ...(next || {}),
      selectors: Array.isArray(next && next.selectors) ? next.selectors.slice() : current.selectors.slice(),
      glossaryTerms: Array.isArray(next && next.glossaryTerms) ? next.glossaryTerms.slice() : current.glossaryTerms.slice()
    };
  }

  function getSurfaces(state) {
    const surfaces = [];
    state.config.selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!surfaces.includes(element)) {
          surfaces.push(element);
        }
      });
    });
    return surfaces;
  }

  function getContainingSurface(state, node) {
    const target = node && node.nodeType === 1 ? node : node && node.parentElement ? node.parentElement : null;
    if (!target) return null;
    return state.surfaces.find((surface) => surface.contains(target)) || null;
  }

  function unwrapHighlights(surface) {
    surface.querySelectorAll('[data-budy-highlight="1"]').forEach((span) => {
      span.replaceWith(document.createTextNode(span.textContent || ''));
    });
    surface.normalize();
  }

  function shouldIgnoreTextNode(node) {
    if (!node || !node.parentElement) return true;
    const parent = node.parentElement;
    if (parent.closest('.budy-deep-dive-overlay, .budy-deep-dive-launcher, .budy-deep-dive-hint')) return true;
    if (parent.closest('[data-budy-highlight="1"]')) return true;
    if (/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|BUTTON|NOSCRIPT)$/i.test(parent.tagName)) return true;
    return !cleanText(node.textContent);
  }

  function highlightSurface(surface, regex) {
    if (!regex || !isVisible(surface)) return;

    const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return shouldIgnoreTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    let replacements = 0;
    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      if (replacements >= MAX_HIGHLIGHTS_PER_SURFACE) return;
      const text = node.textContent || '';
      const localRegex = new RegExp(regex.source, 'gi');
      if (!localRegex.test(text)) return;

      let match = null;
      let lastIndex = 0;
      let changed = false;
      const fragment = document.createDocumentFragment();
      localRegex.lastIndex = 0;
      while ((match = localRegex.exec(text)) && replacements < MAX_HIGHLIGHTS_PER_SURFACE) {
        const value = match[0];
        const start = match.index;
        if (start > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
        }
        const span = document.createElement('span');
        span.className = 'budy-keyword-highlight';
        span.dataset.budyHighlight = '1';
        span.dataset.term = value;
        span.setAttribute('tabindex', '0');
        span.setAttribute('role', 'button');
        span.setAttribute('aria-label', `Open AI Deep Dive for ${value}`);
        span.textContent = value;
        fragment.appendChild(span);
        lastIndex = start + value.length;
        replacements += 1;
        changed = true;
      }

      if (!changed) return;
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      node.replaceWith(fragment);
    });
  }

  function getRangeRect(range) {
    if (!range) return null;
    const rect = range.getBoundingClientRect();
    if (rect && (rect.width || rect.height)) return rect;
    const parent = range.startContainer && range.startContainer.parentElement ? range.startContainer.parentElement : null;
    return parent ? parent.getBoundingClientRect() : null;
  }

  function getSurroundingText(node, text) {
    const element = node && node.nodeType === 1 ? node : node && node.parentElement ? node.parentElement : null;
    if (!element) return '';
    const anchor = element.closest('.guide-preview-card, .guide-page-card, .flashcard-sheet-row, .virtual-card, .review-item, .q-main, .q-text, .q-passage, article, section, p, li, div') || element;
    const raw = cleanText(anchor.innerText || anchor.textContent, 2400);
    if (!raw) return '';

    const term = cleanText(text, 120).toLowerCase();
    if (!term || raw.length <= MAX_SURROUNDING_CHARS) {
      return raw.slice(0, MAX_SURROUNDING_CHARS);
    }

    const index = raw.toLowerCase().indexOf(term);
    if (index === -1) return raw.slice(0, MAX_SURROUNDING_CHARS);

    const start = Math.max(0, index - 180);
    const end = Math.min(raw.length, index + term.length + 220);
    return `${start > 0 ? '...' : ''}${raw.slice(start, end)}${end < raw.length ? '...' : ''}`;
  }

  function getSelectionPayload(state) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const text = cleanText(selection.toString(), MAX_SELECTION_CHARS);
    if (text.length < MIN_SELECTION_CHARS || text.length > MAX_SELECTION_CHARS) return null;

    const range = selection.getRangeAt(0);
    const surface = getContainingSurface(state, range.commonAncestorContainer);
    if (!surface) return null;

    return {
      text,
      rect: getRangeRect(range),
      surface,
      surroundingText: getSurroundingText(range.commonAncestorContainer, text)
    };
  }

  function getKeywordPayload(state, element) {
    if (!element) return null;
    const surface = getContainingSurface(state, element);
    if (!surface) return null;
    return {
      text: cleanText(element.dataset.term || element.textContent, MAX_SELECTION_CHARS),
      rect: element.getBoundingClientRect(),
      surface,
      surroundingText: getSurroundingText(element, element.dataset.term || element.textContent)
    };
  }

  function hideLauncher(state) {
    state.activePayload = null;
    state.ui.launcher.classList.remove('open');
  }

  function positionLauncher(state, rect, point) {
    const launcher = state.ui.launcher;
    launcher.style.left = '0px';
    launcher.style.top = '0px';
    launcher.classList.add('open');

    const width = launcher.offsetWidth || 180;
    const height = launcher.offsetHeight || 76;
    const sourceLeft = point && Number.isFinite(point.x) ? point.x : ((rect && rect.left) || 0) + (((rect && rect.width) || 0) / 2);
    const sourceTop = point && Number.isFinite(point.y) ? point.y : ((rect && rect.top) || 0) - 12;
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, sourceLeft - (width / 2)));
    const top = Math.max(12, Math.min(window.innerHeight - height - 12, sourceTop - height));

    launcher.style.left = `${left}px`;
    launcher.style.top = `${top}px`;
  }

  function showLauncher(state, payload, rect, point) {
    if (!payload || !payload.text) {
      hideLauncher(state);
      return;
    }
    state.activePayload = payload;
    positionLauncher(state, rect, point);
  }

  function closeModal(state) {
    state.ui.overlay.classList.remove('open');
  }

  function renderActionRow(state, primaryLabel, primaryHref, secondaryLabel) {
    state.ui.actions.innerHTML = '';

    const secondary = document.createElement('button');
    secondary.type = 'button';
    secondary.className = 'budy-deep-dive-secondary';
    secondary.textContent = secondaryLabel || 'Close';
    secondary.addEventListener('click', function () {
      closeModal(state);
    });
    state.ui.actions.appendChild(secondary);

    if (primaryLabel && primaryHref) {
      const primary = document.createElement('a');
      primary.className = 'budy-deep-dive-primary';
      primary.href = primaryHref;
      primary.textContent = primaryLabel;
      state.ui.actions.appendChild(primary);
    }
  }

  function renderModalState(state, title, chips, html, actions) {
    state.ui.title.textContent = title;
    state.ui.meta.innerHTML = '';
    (chips || []).forEach((chipText) => {
      if (!chipText) return;
      const chip = document.createElement('div');
      chip.className = 'budy-deep-dive-chip';
      chip.textContent = chipText;
      state.ui.meta.appendChild(chip);
    });
    state.ui.body.innerHTML = html;
    renderActionRow(state, actions && actions.primaryLabel, actions && actions.primaryHref, actions && actions.secondaryLabel);
    state.ui.overlay.classList.add('open');
  }

  function renderLoading(state, term) {
    renderModalState(
      state,
      term,
      ['AI Deep Dive', 'Live AI or preview fallback'],
      '<div class="budy-deep-dive-state"><strong>Building the explanation</strong><p>Pulling together a student-safe definition, the big-picture idea, and why this shows up on the SAT.</p></div>',
      { secondaryLabel: 'Close' }
    );
  }

  function renderError(state, title, body) {
    renderModalState(
      state,
      title,
      ['AI Deep Dive'],
      `<div class="budy-deep-dive-state"><strong>Not available right now</strong><p>${escapeHtml(body)}</p></div>`,
      { secondaryLabel: 'Close' }
    );
  }

  function renderLocked(state, title, body, href, label) {
    renderModalState(
      state,
      title,
      ['AI Deep Dive'],
      `<div class="budy-deep-dive-state"><strong>Pro feature</strong><p>${escapeHtml(body)}</p></div>`,
      { primaryHref: href, primaryLabel: label, secondaryLabel: 'Close' }
    );
  }

  function renderResult(state, payload, result) {
    const chips = [
      result.previewMode ? 'Preview mode' : '',
      result.previewMode ? 'Add your API key later to switch to live AI' : '',
      !result.previewMode && Number.isFinite(result.remainingCredits) && Number.isFinite(result.creditLimit)
        ? `Credits left: ${result.remainingCredits}/${result.creditLimit}`
        : '',
      result.caution ? `Watch for: ${result.caution}` : ''
    ].filter(Boolean);

    const cards = [
      `<div class="budy-deep-dive-card"><strong>Definition</strong><p>${escapeHtml(result.definition)}</p></div>`,
      `<div class="budy-deep-dive-card"><strong>Big-picture explanation</strong><p>${escapeHtml(result.explanation)}</p></div>`,
      `<div class="budy-deep-dive-card"><strong>Why it matters on the SAT</strong><p>${escapeHtml(result.satConnection)}</p></div>`,
      `<div class="budy-deep-dive-card"><strong>Quick example</strong><p>${escapeHtml(result.example)}</p></div>`
    ];

    if (Array.isArray(result.relatedTerms) && result.relatedTerms.length) {
      cards.push(`<div class="budy-deep-dive-card"><strong>Related terms</strong><ul>${result.relatedTerms.map((term) => `<li>${escapeHtml(term)}</li>`).join('')}</ul></div>`);
    }

    renderModalState(
      state,
      result.term || payload.text,
      chips,
      cards.join(''),
      { secondaryLabel: 'Close' }
    );
  }

  async function launchDeepDive(state, payload) {
    if (!payload || !payload.text) return;

    hideLauncher(state);
    state.lastPayload = payload;

    const token = typeof state.config.getAccessToken === 'function'
      ? await Promise.resolve(state.config.getAccessToken())
      : '';

    if (!token) {
      renderLocked(
        state,
        payload.text,
        'Log in to use AI Deep Dive during practice tests, flashcards, and study guides.',
        state.config.loginUrl,
        'Log In'
      );
      return;
    }

    renderLoading(state, payload.text);
    try {
      const response = await fetch('/api/deep-dive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: payload.text,
          surroundingText: payload.surroundingText,
          context: typeof state.config.getRuntimeContext === 'function' ? state.config.getRuntimeContext() : {}
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        renderLocked(state, payload.text, 'Your session expired. Log in again to keep using AI Deep Dive.', state.config.loginUrl, 'Log In');
        return;
      }
      if (response.status === 403) {
        renderLocked(state, payload.text, data && data.error ? data.error : 'AI Deep Dive is included with Pro.', state.config.upgradeUrl, 'Unlock Pro');
        return;
      }
      if (response.status === 429) {
        renderError(state, payload.text, data && data.error ? data.error : 'Your monthly AI Deep Dive credits are used up right now.');
        return;
      }
      if (!response.ok) {
        renderError(state, payload.text, data && data.error ? data.error : 'The explanation could not be generated right now.');
        return;
      }

      renderResult(state, payload, data || {});
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch (_) {}
      state.ui.hint.classList.add('hidden');
    } catch (_) {
      renderError(state, payload.text, 'Network trouble interrupted the request. Try again in a moment.');
    }
  }

  function refreshHighlights(state) {
    if (state.isApplyingHighlights) return;
    state.isApplyingHighlights = true;
    if (state.observer) {
      state.observer.disconnect();
    }
    try {
      state.surfaces = getSurfaces(state);
      const terms = normalizeTerms(DEFAULT_TERMS.concat(state.config.glossaryTerms || []));
      const regex = buildRegex(terms);
      state.surfaces.forEach((surface) => {
        unwrapHighlights(surface);
        highlightSurface(surface, regex);
      });
    } finally {
      state.isApplyingHighlights = false;
      if (state.observer) {
        state.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }
    }
  }

  function scheduleRefresh(state) {
    window.clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(function () {
      refreshHighlights(state);
    }, 90);
  }

  function createUi(state) {
    const launcher = document.createElement('div');
    launcher.className = 'budy-deep-dive-launcher';
    launcher.innerHTML = '<button type="button">AI Deep Dive</button><span>Right-click or highlight a topic word to explain it.</span>';
    launcher.querySelector('button').addEventListener('click', function () {
      void launchDeepDive(state, state.activePayload);
    });
    document.body.appendChild(launcher);

    const overlay = document.createElement('div');
    overlay.className = 'budy-deep-dive-overlay';
    overlay.innerHTML = [
      '<div class="budy-deep-dive-modal" role="dialog" aria-modal="true" aria-labelledby="budy-deep-dive-title">',
      '  <div class="budy-deep-dive-head">',
      '    <div>',
      '      <div class="budy-deep-dive-kicker">AI Deep Dive</div>',
      '      <h3 id="budy-deep-dive-title"></h3>',
      '    </div>',
      '    <button type="button" class="budy-deep-dive-close" aria-label="Close deep dive">x</button>',
      '  </div>',
      '  <div class="budy-deep-dive-meta"></div>',
      '  <div class="budy-deep-dive-body"></div>',
      '  <div class="budy-deep-dive-actions"></div>',
      '</div>'
    ].join('');
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeModal(state);
    });
    overlay.querySelector('.budy-deep-dive-close').addEventListener('click', function () {
      closeModal(state);
    });
    document.body.appendChild(overlay);

    const hint = document.createElement('div');
    hint.className = 'budy-deep-dive-hint';
    hint.innerHTML = '<span>Highlight or right-click a vocab word to open AI Deep Dive.</span><button type="button" aria-label="Dismiss hint">x</button>';
    hint.querySelector('button').addEventListener('click', function () {
      hint.classList.add('hidden');
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch (_) {}
    });
    try {
      if (localStorage.getItem(HINT_KEY) === '1') {
        hint.classList.add('hidden');
      }
    } catch (_) {}
    document.body.appendChild(hint);

    return {
      launcher,
      overlay,
      title: overlay.querySelector('h3'),
      meta: overlay.querySelector('.budy-deep-dive-meta'),
      body: overlay.querySelector('.budy-deep-dive-body'),
      actions: overlay.querySelector('.budy-deep-dive-actions'),
      hint
    };
  }

  function mount(config) {
    ensureStyles();

    const state = {
      config: mergeConfig({
        selectors: [],
        glossaryTerms: [],
        upgradeUrl: '/checkout.html',
        loginUrl: '/login.html',
        getAccessToken: null,
        getRuntimeContext: null
      }, config || {}),
      surfaces: [],
      activePayload: null,
      lastPayload: null,
      refreshTimer: 0,
      isApplyingHighlights: false,
      observer: null,
      ui: null
    };

    state.ui = createUi(state);

    const onMouseUp = function () {
      window.setTimeout(function () {
        const payload = getSelectionPayload(state);
        if (!payload) return;
        showLauncher(state, payload, payload.rect);
      }, 0);
    };

    const onContextMenu = function (event) {
      const keyword = event.target.closest ? event.target.closest('[data-budy-highlight="1"]') : null;
      const selectionPayload = getSelectionPayload(state);
      const payload = selectionPayload || getKeywordPayload(state, keyword);
      if (!payload) return;
      event.preventDefault();
      showLauncher(state, payload, payload.rect, { x: event.clientX, y: event.clientY });
    };

    const onKeywordClick = function (event) {
      const keyword = event.target.closest ? event.target.closest('[data-budy-highlight="1"]') : null;
      if (!keyword) return;
      event.preventDefault();
      const payload = getKeywordPayload(state, keyword);
      showLauncher(state, payload, payload.rect);
    };

    const onKeyDown = function (event) {
      if (event.key === 'Escape') {
        hideLauncher(state);
        closeModal(state);
        return;
      }

      const keyword = event.target.closest ? event.target.closest('[data-budy-highlight="1"]') : null;
      if (!keyword) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const payload = getKeywordPayload(state, keyword);
        showLauncher(state, payload, payload.rect);
      }
    };

    const onDocumentClick = function (event) {
      if (state.ui.overlay.contains(event.target)) return;
      if (state.ui.launcher.contains(event.target)) return;
      if (event.target.closest && event.target.closest('[data-budy-highlight="1"]')) return;
      hideLauncher(state);
    };

    const onSelectionChange = function () {
      const selection = window.getSelection();
      if (selection && selection.rangeCount && !selection.isCollapsed) return;
      hideLauncher(state);
    };

    const onViewportChange = function () {
      hideLauncher(state);
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onMouseUp);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('click', onKeywordClick);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);

    state.observer = new MutationObserver(function () {
      if (state.isApplyingHighlights) return;
      scheduleRefresh(state);
    });
    state.observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    refreshHighlights(state);

    return {
      refresh(nextConfig) {
        state.config = mergeConfig(state.config, nextConfig || {});
        scheduleRefresh(state);
      },
      destroy() {
        hideLauncher(state);
        closeModal(state);
        window.clearTimeout(state.refreshTimer);
        if (state.observer) state.observer.disconnect();
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('keyup', onMouseUp);
        document.removeEventListener('contextmenu', onContextMenu);
        document.removeEventListener('click', onKeywordClick);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('selectionchange', onSelectionChange);
        window.removeEventListener('scroll', onViewportChange, true);
        window.removeEventListener('resize', onViewportChange);
        state.ui.launcher.remove();
        state.ui.overlay.remove();
        state.ui.hint.remove();
      }
    };
  }

  window.BudyAiDeepDive = { mount };
})();