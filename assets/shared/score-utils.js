(function (root, factory) {
  const scoreUtils = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = scoreUtils;
  }

  if (root && typeof root === 'object') {
    root.BudyScoreUtils = scoreUtils;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getScoreSummaryValue(source, keys) {
    if (!source || typeof source !== 'object') return null;
    for (const key of keys) {
      const value = Number(source[key]);
      if (Number.isFinite(value) && value > 0) return Math.round(value);
    }
    return null;
  }

  function getSectionPerformanceSummary(skillMap) {
    const summary = {
      english: { correct: 0, total: 0 },
      math: { correct: 0, total: 0 }
    };

    Object.values(skillMap || {}).forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const section = String(item.section || '').toLowerCase();
      if (section !== 'english' && section !== 'math') return;
      summary[section].correct += Number(item.correct) || 0;
      summary[section].total += Number(item.total) || 0;
    });

    return summary;
  }

  function estimateSectionScore(correct, total) {
    if (!total) return null;
    const pct = Math.max(0, Math.min(1, (Number(correct) || 0) / total));
    return Math.round(200 + (pct * 600));
  }

  function getSessionScoreBreakdown(session) {
    const skillMap = session && session.skillMap && typeof session.skillMap === 'object' ? session.skillMap : {};
    const scoreSummary = skillMap.__scoreSummary && typeof skillMap.__scoreSummary === 'object' ? skillMap.__scoreSummary : skillMap;
    const total = getScoreSummaryValue(scoreSummary, ['total', 'totalScore']) || Math.round(Number(session && session.total) || 0) || null;
    let english = getScoreSummaryValue(scoreSummary, ['english', 'englishScore', 'readingWriting', 'readingWritingScore', 'rw']);
    let math = getScoreSummaryValue(scoreSummary, ['math', 'mathScore']);

    if (english == null || math == null) {
      const sectionSummary = getSectionPerformanceSummary(skillMap);
      if (english == null) english = estimateSectionScore(sectionSummary.english.correct, sectionSummary.english.total);
      if (math == null) math = estimateSectionScore(sectionSummary.math.correct, sectionSummary.math.total);
    }

    const section = String(session && session.section || '').toLowerCase();
    if (section === 'english' && english == null) english = total;
    if (section === 'math' && math == null) math = total;
    if (section === 'full' && total != null) {
      if (english == null && math != null) english = Math.max(200, total - math);
      if (math == null && english != null) math = Math.max(200, total - english);
    }

    return { english, math, total };
  }

  return {
    estimateSectionScore,
    getScoreSummaryValue,
    getSectionPerformanceSummary,
    getSessionScoreBreakdown
  };
});