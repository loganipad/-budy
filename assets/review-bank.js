(function () {
  'use strict';

  const REVIEW_TEST_STORAGE_KEY = 'budy_review_test_v1';
  const QUESTION_BANK_URL = '/api/question-bank';
  const SAT_SECONDS_PER_QUESTION = {
    english: (32 * 60) / 27,
    math: (35 * 60) / 22
  };

  let questionBankPromise = null;
  let questionBankItems = null;

  function normalizeSection(section) {
    if (section === 'reading_writing') return 'english';
    if (section === 'english' || section === 'math') return section;
    return '';
  }

  function inferQuestionType(entry) {
    if (entry && entry.questionType) return String(entry.questionType);
    const options = Array.isArray(entry && entry.options) ? entry.options : [];
    return options.length ? 'mc' : 'spr';
  }

  function defaultQuestionSeconds(section) {
    return Math.round(SAT_SECONDS_PER_QUESTION[section] || SAT_SECONDS_PER_QUESTION.math);
  }

  function normalizeBankQuestion(item) {
    if (!item || typeof item !== 'object') return null;
    const section = normalizeSection(item.section);
    if (!section) return null;
    const isSpr = item.type === 'spr' || item.format === 'spr';
    return {
      id: String(item.id || ''),
      section,
      domain: item.domain || '',
      skill: item.skill || 'General',
      difficulty: item.difficulty || 'medium',
      type: isSpr ? 'spr' : 'mc',
      questionType: isSpr ? 'spr' : 'mc',
      prompt: item.question || item.prompt || '',
      question: item.question || item.prompt || '',
      passage: item.passage || '',
      options: isSpr ? [] : (Array.isArray(item.options) ? item.options.filter(Boolean) : []),
      answer: item.answer != null ? String(item.answer) : '',
      correctAnswer: item.answer != null ? String(item.answer) : '',
      acceptableAnswers: isSpr && item.answer != null ? [String(item.answer)] : undefined,
      rationale: item.rationale || '',
      explanation: item.rationale || '',
      distractor_rationales: item.distractor_rationales && typeof item.distractor_rationales === 'object' ? item.distractor_rationales : {},
      estimated_time_seconds: Number(item.estimated_time_seconds || defaultQuestionSeconds(section)),
      calculator_allowed: Object.prototype.hasOwnProperty.call(item, 'calculator_allowed') ? item.calculator_allowed : section === 'math',
      tags: Array.isArray(item.tags) ? item.tags : [],
      source_context: item.source_context || ''
    };
  }

  async function loadQuestionBank() {
    if (questionBankItems) return questionBankItems;
    if (questionBankPromise) return questionBankPromise;

    questionBankPromise = fetch(QUESTION_BANK_URL, { cache: 'force-cache' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Question bank request failed with status ' + response.status);
        }
        const payload = await response.json();
        const items = [
          ...(Array.isArray(payload && payload.english) ? payload.english : []),
          ...(Array.isArray(payload && payload.math) ? payload.math : [])
        ]
          .map((entry) => normalizeBankQuestion(entry))
          .filter(Boolean);
        questionBankItems = items;
        return items;
      })
      .catch((error) => {
        questionBankPromise = null;
        throw error;
      });

    return questionBankPromise;
  }

  function getDayKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function formatDisplayDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function sectionLabel(section) {
    return section === 'english' ? 'Reading & Writing' : section === 'math' ? 'Math' : 'Mixed';
  }

  function uniqueBy(items, keyBuilder) {
    const seen = new Set();
    const output = [];
    items.forEach((item, index) => {
      const key = keyBuilder(item, index);
      if (!key || seen.has(key)) return;
      seen.add(key);
      output.push(item);
    });
    return output;
  }

  function getSavedDateValue(entry) {
    return entry && (entry.sourceAttemptedAt || entry.updatedAt || entry.lastSeenAt) ? (entry.sourceAttemptedAt || entry.updatedAt || entry.lastSeenAt) : '';
  }

  function normalizeSavedQuestion(entry, index) {
    if (!entry || typeof entry !== 'object') return null;
    const section = normalizeSection(entry.section);
    if (!section) return null;
    const type = inferQuestionType(entry);
    const options = Array.isArray(entry.options) ? entry.options.filter(Boolean) : [];
    return {
      id: String(entry.questionId || entry.id || entry.key || ('saved-' + (index + 1))),
      key: String(entry.key || entry.questionId || entry.id || ('saved-' + (index + 1))),
      section,
      domain: entry.domain || '',
      skill: entry.skill || 'Review',
      type,
      questionType: type,
      question: entry.prompt || entry.question || 'Saved question',
      prompt: entry.prompt || entry.question || 'Saved question',
      passage: entry.passage || '',
      options: type === 'spr' ? [] : options,
      answer: entry.correctAnswer != null ? String(entry.correctAnswer) : '',
      correctAnswer: entry.correctAnswer != null ? String(entry.correctAnswer) : '',
      acceptableAnswers: type === 'spr' ? (Array.isArray(entry.acceptableAnswers) && entry.acceptableAnswers.length ? entry.acceptableAnswers.map(String) : [String(entry.correctAnswer || '')]) : undefined,
      rationale: entry.rationale || entry.explanation || '',
      explanation: entry.rationale || entry.explanation || '',
      distractor_rationales: entry.distractor_rationales && typeof entry.distractor_rationales === 'object' ? entry.distractor_rationales : {},
      estimated_time_seconds: Number(entry.estimated_time_seconds || defaultQuestionSeconds(section)),
      calculator_allowed: Object.prototype.hasOwnProperty.call(entry, 'calculator_allowed') ? entry.calculator_allowed : section === 'math',
      isFlagged: Boolean(entry.isFlagged),
      wasAnsweredWrong: Boolean(entry.wasAnsweredWrong),
      userAnswer: entry.userAnswer ? String(entry.userAnswer) : '',
      saveCount: Number(entry.saveCount || 1),
      sourceAttemptedAt: getSavedDateValue(entry),
      tags: Array.isArray(entry.tags) ? entry.tags : []
    };
  }

  function buildQuestionForRunner(item) {
    const type = item.type || inferQuestionType(item);
    const answer = item.answer != null ? String(item.answer) : String(item.correctAnswer || '');
    return {
      id: String(item.id || item.key || ''),
      type,
      section: normalizeSection(item.section),
      domain: item.domain || '',
      skill: item.skill || 'Review',
      difficulty: item.difficulty || 'medium',
      tags: Array.isArray(item.tags) ? item.tags : [],
      source_context: item.source_context || 'review',
      calculator_allowed: Object.prototype.hasOwnProperty.call(item, 'calculator_allowed') ? item.calculator_allowed : normalizeSection(item.section) === 'math',
      estimated_time_seconds: Number(item.estimated_time_seconds || defaultQuestionSeconds(normalizeSection(item.section))),
      passage: item.passage || null,
      question: item.question || item.prompt || '',
      options: type === 'spr' ? null : (Array.isArray(item.options) ? item.options.slice() : []),
      answer,
      acceptableAnswers: type === 'spr'
        ? (Array.isArray(item.acceptableAnswers) && item.acceptableAnswers.length ? item.acceptableAnswers.map(String) : [answer])
        : undefined,
      explanation: item.explanation || item.rationale || '',
      rationale: item.rationale || item.explanation || '',
      distractor_rationales: item.distractor_rationales && typeof item.distractor_rationales === 'object' ? item.distractor_rationales : {}
    };
  }

  function inferSectionFromQuestions(items) {
    const sections = [...new Set(items.map((item) => normalizeSection(item.section)).filter(Boolean))];
    if (sections.length === 1) return sections[0];
    return 'full';
  }

  function calculateTimeLimitSeconds(items) {
    const totalSeconds = items.reduce((sum, item) => {
      const fallback = defaultQuestionSeconds(normalizeSection(item.section));
      const value = Number(item.estimated_time_seconds || fallback);
      return sum + (Number.isFinite(value) && value > 0 ? value : fallback);
    }, 0);
    return Math.max(60, Math.ceil(totalSeconds / 60) * 60);
  }

  function formatMinutes(seconds) {
    return Math.max(1, Math.round((Number(seconds) || 0) / 60));
  }

  function buildDateOptions(savedQuestions, sessions) {
    const sessionDates = (Array.isArray(sessions) ? sessions : []).map((entry) => ({
      key: getDayKey(entry && entry.date),
      label: formatDisplayDate(entry && entry.date)
    })).filter((entry) => entry.key);
    const savedDates = (Array.isArray(savedQuestions) ? savedQuestions : []).map((entry) => ({
      key: getDayKey(getSavedDateValue(entry)),
      label: formatDisplayDate(getSavedDateValue(entry))
    })).filter((entry) => entry.key);

    return uniqueBy([...sessionDates, ...savedDates].sort((left, right) => right.key.localeCompare(left.key)), (entry) => entry.key);
  }

  function filterSavedQuestions(savedQuestions, filters) {
    return savedQuestions
      .map(normalizeSavedQuestion)
      .filter(Boolean)
      .filter((item) => {
        const wantsFlagged = Boolean(filters.flagged);
        const wantsWrong = Boolean(filters.wrong);
        if (!wantsFlagged && !wantsWrong) return false;
        const matchesType = (wantsFlagged && item.isFlagged) || (wantsWrong && item.wasAnsweredWrong);
        if (!matchesType) return false;
        if (!filters.date || filters.date === 'all') return true;
        return getDayKey(item.sourceAttemptedAt) === filters.date;
      })
      .sort((left, right) => new Date(right.sourceAttemptedAt || 0).getTime() - new Date(left.sourceAttemptedAt || 0).getTime());
  }

  function getSimilarQuestions(entry, bankItems, limit) {
    const normalizedSection = normalizeSection(entry.section);
    const normalizedSkill = String(entry.skill || '').trim().toLowerCase();
    const prompt = String(entry.prompt || entry.question || '').trim().toLowerCase();
    const id = String(entry.questionId || entry.id || entry.key || '');

    return uniqueBy(
      (Array.isArray(bankItems) ? bankItems : []).filter((item) => {
        if (!item || normalizeSection(item.section) !== normalizedSection) return false;
        if (normalizedSkill && String(item.skill || '').trim().toLowerCase() !== normalizedSkill) return false;
        if (id && String(item.id || '') === id) return false;
        if (prompt && String(item.prompt || item.question || '').trim().toLowerCase() === prompt) return false;
        return true;
      }),
      (item) => String(item.id || item.prompt || '')
    ).slice(0, limit || 3);
  }

  function buildReviewCandidates(filteredSaved, bankItems, includeSimilar) {
    const base = uniqueBy(filteredSaved.map(buildQuestionForRunner), (item) => String(item.id || item.question));
    if (!includeSimilar) return { base, similarPool: [] };

    const similarPool = [];
    filteredSaved.forEach((entry) => {
      getSimilarQuestions(entry, bankItems, 5).forEach((item) => {
        similarPool.push(buildQuestionForRunner(item));
      });
    });

    return {
      base,
      similarPool: uniqueBy(similarPool, (item) => String(item.id || item.question)).filter((item) => !base.some((saved) => String(saved.id || saved.question) === String(item.id || item.question)))
    };
  }

  function buildReviewLabel(filters) {
    const labels = [];
    if (filters.flagged) labels.push('Flagged');
    if (filters.wrong) labels.push('Wrong');
    return labels.length === 2 ? 'Flagged + Wrong Review Test' : labels.length === 1 ? labels[0] + ' Review Test' : 'Review Test';
  }

  function queueReviewTest(config, testUrl) {
    localStorage.setItem(REVIEW_TEST_STORAGE_KEY, JSON.stringify(config));
    if (typeof testUrl === 'function') {
      testUrl(config);
      return;
    }
    window.location.href = testUrl || '/?review=1';
  }

  async function startReviewSession(options, state, desiredCount) {
    const safeCount = Math.max(1, Math.min(state.modalMaxCount || 1, Number(desiredCount || state.modalMaxCount || 1)));
    let bankItems = [];
    if (state.filters.includeSimilar) {
      try {
        bankItems = await loadQuestionBank();
      } catch (error) {
        notifyWithFallback(options, 'Could not load similar questions right now. Try again in a moment.', 'er');
        return false;
      }
    }

    const candidateSet = buildReviewCandidates(state.filteredQuestions, bankItems, state.filters.includeSimilar);
    const selected = candidateSet.base.slice(0, safeCount);
    if (selected.length < safeCount) {
      const needed = safeCount - selected.length;
      selected.push(...candidateSet.similarPool.slice(0, needed));
    }

    if (!selected.length) {
      notifyWithFallback(options, 'No review questions matched the current filters.', 'wn');
      return false;
    }

    const section = inferSectionFromQuestions(selected);
    const timeLimitSeconds = calculateTimeLimitSeconds(selected);
    queueReviewTest({
      label: buildReviewLabel(state.filters),
      section,
      timeLimitSeconds,
      questions: selected,
      metadata: {
        flagged: state.filters.flagged,
        wrong: state.filters.wrong,
        date: state.filters.date,
        includeSimilar: state.filters.includeSimilar
      }
    }, options.testUrl);
    return true;
  }

  function estimatePreviewTimeSeconds(previewQuestions, desiredCount) {
    if (!Array.isArray(previewQuestions) || !previewQuestions.length) return 60;
    const safeCount = Math.max(1, Number(desiredCount || 1));
    const baseQuestions = previewQuestions.slice(0, Math.min(safeCount, previewQuestions.length));
    let seconds = calculateTimeLimitSeconds(baseQuestions);
    if (safeCount > baseQuestions.length && baseQuestions.length) {
      const averageSeconds = seconds / baseQuestions.length;
      seconds += Math.round(averageSeconds * (safeCount - baseQuestions.length));
    }
    return Math.max(60, seconds);
  }

  function notifyWithFallback(options, message, tone) {
    if (typeof options.notify === 'function') {
      options.notify(message, tone || '');
      return;
    }
    window.alert(message);
  }

  function ensureModal(root, options, state) {
    let modal = root.querySelector('.review-builder-overlay');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'review-builder-overlay';
    modal.innerHTML = [
      '<div class="review-builder-modal">',
      '  <button class="review-builder-close" type="button" data-review-modal-close aria-label="Close">×</button>',
      '  <div class="review-builder-kicker">Review Builder</div>',
      '  <h3>Build your review test</h3>',
      '  <p class="review-builder-copy">Choose how many questions to include. The timer updates automatically using SAT-style pacing for the section mix in this review set.</p>',
      '  <div class="review-builder-grid">',
      '    <label class="review-builder-field">',
      '      <span>Questions</span>',
      '      <input type="number" min="1" step="1" data-review-modal-count>',
      '    </label>',
      '    <div class="review-builder-metric">',
      '      <span>Time limit</span>',
      '      <strong data-review-modal-time>0 min</strong>',
      '    </div>',
      '  </div>',
      '  <div class="review-builder-meta" data-review-modal-meta></div>',
      '  <div class="review-builder-actions">',
      '    <button class="review-builder-secondary" type="button" data-review-modal-close>Cancel</button>',
      '    <button class="review-builder-primary" type="button" data-review-modal-confirm>Start review test</button>',
      '  </div>',
      '</div>'
    ].join('');

    root.appendChild(modal);

    modal.querySelectorAll('[data-review-modal-close]').forEach((button) => {
      button.addEventListener('click', function () {
        modal.classList.remove('open');
      });
    });

    modal.addEventListener('click', function (event) {
      if (event.target === modal) modal.classList.remove('open');
    });

    modal.querySelector('[data-review-modal-confirm]').addEventListener('click', async function () {
      const countInput = modal.querySelector('[data-review-modal-count]');
      const didStart = await startReviewSession(options, state, countInput.value || state.modalMaxCount);
      if (didStart) {
        modal.classList.remove('open');
      }
    });

    return modal;
  }

  function renderModalContent(modal, state) {
    const countInput = modal.querySelector('[data-review-modal-count]');
    const timeEl = modal.querySelector('[data-review-modal-time]');
    const metaEl = modal.querySelector('[data-review-modal-meta]');

    countInput.max = String(state.modalMaxCount);
    countInput.value = String(Math.min(state.modalMaxCount, Math.max(1, state.filteredQuestions.length, 10)));

    const updateTime = function () {
      const desiredCount = Math.max(1, Math.min(state.modalMaxCount, Number(countInput.value || 1)));
      timeEl.textContent = formatMinutes(estimatePreviewTimeSeconds(state.previewQuestions, desiredCount)) + ' min';
    };

    countInput.oninput = updateTime;
    updateTime();

    const similarNote = state.filters.includeSimilar ? 'Similar-question top-ups enabled.' : 'Saved questions only.';
    metaEl.textContent = state.filteredQuestions.length + ' saved question' + (state.filteredQuestions.length === 1 ? '' : 's') + ' available. ' + similarNote;
  }

  function createCard(item, state, options) {
    const article = document.createElement('article');
    article.className = 'review-bank-card';

    const top = document.createElement('div');
    top.className = 'review-bank-top';

    const badges = document.createElement('div');
    badges.className = 'review-bank-badges';
    if (item.isFlagged) {
      const badge = document.createElement('span');
      badge.className = 'review-bank-badge flagged';
      badge.textContent = 'Flagged';
      badges.appendChild(badge);
    }
    if (item.wasAnsweredWrong) {
      const badge = document.createElement('span');
      badge.className = 'review-bank-badge wrong';
      badge.textContent = 'Wrong';
      badges.appendChild(badge);
    }

    const date = document.createElement('div');
    date.className = 'review-bank-date';
    date.textContent = formatDisplayDate(item.sourceAttemptedAt);

    top.appendChild(badges);
    top.appendChild(date);
    article.appendChild(top);

    const meta = document.createElement('div');
    meta.className = 'review-bank-meta';
    meta.textContent = item.skill ? sectionLabel(item.section) + ' · ' + item.skill : sectionLabel(item.section);
    article.appendChild(meta);

    const prompt = document.createElement('div');
    prompt.className = 'review-bank-prompt';
    prompt.textContent = item.prompt;
    article.appendChild(prompt);

    if (item.passage) {
      const passage = document.createElement('div');
      passage.className = 'review-bank-passage';
      passage.textContent = item.passage.length > 220 ? item.passage.slice(0, 220) + '…' : item.passage;
      article.appendChild(passage);
    }

    const footer = document.createElement('div');
    footer.className = 'review-bank-footer';

    const answerMeta = document.createElement('div');
    answerMeta.className = 'review-bank-answer-meta';
    if (item.userAnswer) {
      const yoursSpan = document.createElement('span');
      const yoursLabel = document.createElement('strong');
      yoursLabel.textContent = 'Yours: ';
      yoursSpan.appendChild(yoursLabel);
      yoursSpan.appendChild(document.createTextNode(item.userAnswer));
      answerMeta.appendChild(yoursSpan);
    }
    if (item.correctAnswer) {
      const correctSpan = document.createElement('span');
      const correctLabel = document.createElement('strong');
      correctLabel.textContent = 'Correct: ';
      correctSpan.appendChild(correctLabel);
      correctSpan.appendChild(document.createTextNode(item.correctAnswer));
      answerMeta.appendChild(correctSpan);
    }
    footer.appendChild(answerMeta);

    const actions = document.createElement('div');
    actions.className = 'review-bank-actions';
    const similarButton = document.createElement('button');
    similarButton.type = 'button';
    similarButton.className = 'review-bank-link';
    similarButton.textContent = 'View similar questions';
    actions.appendChild(similarButton);
    footer.appendChild(actions);

    article.appendChild(footer);

    const similarWrap = document.createElement('div');
    similarWrap.className = 'review-similar-list hidden';
    article.appendChild(similarWrap);

    similarButton.addEventListener('click', async function () {
      const isOpen = !similarWrap.classList.contains('hidden');
      if (isOpen) {
        similarWrap.classList.add('hidden');
        similarButton.textContent = 'View similar questions';
        return;
      }

      similarWrap.innerHTML = '<div class="review-similar-loading">Loading similar questions...</div>';
      similarWrap.classList.remove('hidden');
      similarButton.textContent = 'Hide similar questions';

      try {
        const bankItems = await loadQuestionBank();
        const similars = getSimilarQuestions(item, bankItems, 3);
        similarWrap.replaceChildren();
        if (!similars.length) {
          const empty = document.createElement('div');
          empty.className = 'review-similar-empty';
          empty.textContent = 'No close skill matches available yet.';
          similarWrap.appendChild(empty);
          return;
        }

        similars.forEach((question) => {
          const block = document.createElement('div');
          block.className = 'review-similar-item';
          const title = document.createElement('strong');
          title.textContent = question.skill || 'Similar question';
          const text = document.createElement('span');
          text.textContent = question.question.length > 160 ? question.question.slice(0, 160) + '…' : question.question;
          block.appendChild(title);
          block.appendChild(text);
          similarWrap.appendChild(block);
        });
      } catch (error) {
        similarWrap.replaceChildren();
        const empty = document.createElement('div');
        empty.className = 'review-similar-empty';
        empty.textContent = 'Could not load similar questions right now.';
        similarWrap.appendChild(empty);
      }
    });

    return article;
  }

  function mount(options) {
    const root = typeof options.root === 'string' ? document.getElementById(options.root) : options.root;
    if (!root) return null;

    const state = {
      filters: {
        flagged: true,
        wrong: true,
        date: 'all',
        includeSimilar: false
      },
      filteredQuestions: [],
      modalMaxCount: 1,
      previewQuestions: []
    };

    const elements = {
      flagged: root.querySelector('[data-review-filter="flagged"]'),
      wrong: root.querySelector('[data-review-filter="wrong"]'),
      date: root.querySelector('[data-review-filter="date"]'),
      includeSimilar: root.querySelector('[data-review-filter="include-similar"]'),
      questionCount: root.querySelector('[data-review-question-count]'),
      estimatedTime: root.querySelector('[data-review-estimated-time]'),
      count: root.querySelector('[data-review-count]'),
      list: root.querySelector('[data-review-list]'),
      empty: root.querySelector('[data-review-empty]'),
      launch: root.querySelector('[data-review-launch]')
    };

    const readSavedQuestions = function () {
      return typeof options.getSavedQuestions === 'function' ? options.getSavedQuestions() : [];
    };
    const readSessions = function () {
      return typeof options.getSessions === 'function' ? options.getSessions() : [];
    };

    const clampInlineCount = function (value) {
      return Math.max(1, Math.min(state.modalMaxCount || 1, Number(value || state.modalMaxCount || 1)));
    };

    const syncInlineControls = function () {
      if (!elements.questionCount && !elements.estimatedTime) return;

      const previewQuestions = state.filteredQuestions.map(buildQuestionForRunner);
      state.previewQuestions = previewQuestions;
      state.modalMaxCount = state.filteredQuestions.length
        ? (state.filters.includeSimilar ? 50 : Math.max(1, Math.min(50, previewQuestions.length || 1)))
        : 1;

      if (elements.questionCount) {
        const fallbackValue = Math.min(state.modalMaxCount, Math.max(1, state.filteredQuestions.length, 10));
        const nextValue = clampInlineCount(elements.questionCount.value || fallbackValue);
        elements.questionCount.min = '1';
        elements.questionCount.max = String(state.modalMaxCount);
        elements.questionCount.value = String(nextValue);
        elements.questionCount.disabled = !state.filteredQuestions.length;
      }

      if (elements.estimatedTime) {
        const desiredCount = elements.questionCount ? clampInlineCount(elements.questionCount.value) : Math.min(state.modalMaxCount, Math.max(1, previewQuestions.length, 10));
        elements.estimatedTime.textContent = state.filteredQuestions.length
          ? formatMinutes(estimatePreviewTimeSeconds(previewQuestions, desiredCount)) + ' min'
          : '0 min';
      }
    };

    const render = function () {
      const savedQuestions = Array.isArray(readSavedQuestions()) ? readSavedQuestions() : [];
      const sessions = Array.isArray(readSessions()) ? readSessions() : [];
      const dateOptions = buildDateOptions(savedQuestions, sessions);

      if (elements.date) {
        const currentValue = state.filters.date;
        elements.date.replaceChildren();
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All time';
        elements.date.appendChild(allOption);
        dateOptions.forEach((entry) => {
          const option = document.createElement('option');
          option.value = entry.key;
          option.textContent = entry.label;
          elements.date.appendChild(option);
        });
        elements.date.value = dateOptions.some((entry) => entry.key === currentValue) ? currentValue : 'all';
        state.filters.date = elements.date.value;
      }

      state.filteredQuestions = filterSavedQuestions(savedQuestions, state.filters);
      if (elements.count) {
        elements.count.textContent = state.filteredQuestions.length + ' question' + (state.filteredQuestions.length === 1 ? '' : 's');
      }
      syncInlineControls();

      if (elements.list) elements.list.replaceChildren();
      const hasActiveTypeFilter = state.filters.flagged || state.filters.wrong;
      if (!hasActiveTypeFilter || !state.filteredQuestions.length) {
        if (elements.empty) {
          elements.empty.classList.remove('hidden');
          elements.empty.textContent = hasActiveTypeFilter
            ? 'No saved questions match the current filters yet.'
            : 'Select Flagged, Wrong, or both to build a review bank.';
        }
        if (elements.launch) elements.launch.disabled = true;
        return;
      }

      if (elements.empty) elements.empty.classList.add('hidden');
      state.filteredQuestions.forEach((item) => {
        if (elements.list) elements.list.appendChild(createCard(item, state, options));
      });
      if (elements.launch) elements.launch.disabled = false;
    };

    if (elements.flagged) {
      elements.flagged.checked = true;
      elements.flagged.addEventListener('change', function () {
        state.filters.flagged = Boolean(elements.flagged.checked);
        render();
      });
    }
    if (elements.wrong) {
      elements.wrong.checked = true;
      elements.wrong.addEventListener('change', function () {
        state.filters.wrong = Boolean(elements.wrong.checked);
        render();
      });
    }
    if (elements.date) {
      elements.date.addEventListener('change', function () {
        state.filters.date = elements.date.value || 'all';
        render();
      });
    }
    if (elements.includeSimilar) {
      elements.includeSimilar.checked = false;
      elements.includeSimilar.addEventListener('change', function () {
        state.filters.includeSimilar = Boolean(elements.includeSimilar.checked);
        syncInlineControls();
      });
    }

    if (elements.questionCount) {
      elements.questionCount.addEventListener('input', function () {
        syncInlineControls();
      });
    }

    const modal = ensureModal(root, options, state);

    if (elements.launch) {
      elements.launch.addEventListener('click', async function () {
        if (!state.filteredQuestions.length) {
          notifyWithFallback(options, 'No review questions match the current filters.', 'wn');
          return;
        }

        if (elements.questionCount) {
          await startReviewSession(options, state, elements.questionCount.value || state.modalMaxCount);
          return;
        }

        let bankItems = [];
        if (state.filters.includeSimilar) {
          try {
            bankItems = await loadQuestionBank();
          } catch (error) {
            notifyWithFallback(options, 'Could not load similar questions right now. Try again in a moment.', 'er');
            return;
          }
        }

        const candidateSet = buildReviewCandidates(state.filteredQuestions, bankItems, state.filters.includeSimilar);
        const previewQuestions = candidateSet.base.concat(candidateSet.similarPool);
        state.previewQuestions = previewQuestions.length ? previewQuestions : candidateSet.base;
        state.modalMaxCount = Math.max(1, Math.min(50, state.previewQuestions.length || candidateSet.base.length));
        renderModalContent(modal, state);
        modal.classList.add('open');
      });
    }

    void loadQuestionBank().catch(function (err) {
      var errorEl = root.querySelector('[data-review-empty]');
      if (errorEl) {
        errorEl.textContent = 'Could not load the question bank. Please refresh the page to try again.';
        errorEl.classList.remove('hidden');
      }
      if (typeof window.BudyTelemetry === 'object' && typeof window.BudyTelemetry.trackError === 'function') {
        window.BudyTelemetry.trackError('review_bank_load_failed', err);
      }
    });
    render();

    return {
      refresh: render
    };
  }

  window.BudyReviewBank = {
    mount,
    loadQuestionBank
  };
})();
