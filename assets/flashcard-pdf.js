(function () {
  'use strict';

  function getJsPdfConstructor() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (window.jsPDF) return window.jsPDF;
    return null;
  }

  function setDash(doc, pattern, phase) {
    if (typeof doc.setLineDashPattern === 'function') {
      doc.setLineDashPattern(pattern, phase || 0);
    }
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'flashcards';
  }

  function safeText(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function truncateLines(lines, maxLines) {
    if (lines.length <= maxLines) return lines;
    var clipped = lines.slice(0, maxLines);
    var last = clipped[maxLines - 1] || '';
    clipped[maxLines - 1] = last.replace(/[.\s]*$/, '') + '...';
    return clipped;
  }

  function drawPageHeader(doc, config) {
    var margin = config.margin;
    var topicLabel = config.topicLabel;
    var totalCards = config.totalCards;

    doc.setFontSize(14);
    doc.setTextColor(13, 17, 23);
    doc.text('Budy.Study Flashcards', margin, margin + 5);

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(topicLabel, margin, margin + 10);

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(totalCards + ' cards - Print and fold on the center line', margin, margin + 15);

    doc.setDrawColor(210, 215, 225);
    doc.setLineDashPattern([], 0);
    doc.line(margin, margin + 18, config.pageWidth - margin, margin + 18);

    return margin + 22;
  }

  function addPageFooters(doc, config) {
    var pageCount = doc.internal.getNumberOfPages();
    for (var page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        config.appName + ' | ' + config.topicLabel + ' | Page ' + page + ' of ' + pageCount,
        config.margin,
        config.pageHeight - 6
      );
    }
  }

  function exportDeckAsPdf(options) {
    var opts = options || {};
    var topic = opts.topic || {};
    var deck = Array.isArray(opts.deck) ? opts.deck.filter(Boolean) : [];
    var topicLabel = safeText(topic.label) || 'Flashcards';

    var JsPdf = getJsPdfConstructor();
    if (!JsPdf) {
      throw new Error('PDF engine failed to load. Refresh the page and try again.');
    }

    var doc = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    var pageWidth = doc.internal && doc.internal.pageSize && typeof doc.internal.pageSize.getWidth === 'function'
      ? doc.internal.pageSize.getWidth()
      : 215.9;
    var pageHeight = doc.internal && doc.internal.pageSize && typeof doc.internal.pageSize.getHeight === 'function'
      ? doc.internal.pageSize.getHeight()
      : 279.4;
    var margin = 12;
    var contentWidth = pageWidth - margin * 2;
    var halfWidth = contentWidth / 2;
    var footerReserve = 12;
    var maxRowHeight = 96;
    var minRowHeight = 30;
    var lineHeight = 4.1;

    var config = {
      appName: opts.appName || 'budy.study',
      topicLabel: topicLabel,
      totalCards: deck.length,
      margin: margin,
      pageWidth: pageWidth,
      pageHeight: pageHeight
    };

    var y = drawPageHeader(doc, config);
    var contentBottom = pageHeight - margin - footerReserve;
    var isFirstRowOnPage = true;

    if (!deck.length) {
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('No flashcards are available for this topic yet.', margin, y + 8);
      doc.text('Try another topic or generate more cards in the Study Hub.', margin, y + 14);
      addPageFooters(doc, config);
      doc.save(opts.filename || ('budy-flashcards-' + slugify(topicLabel) + '.pdf'));
      return;
    }

    deck.forEach(function (card, index) {
      var frontText = safeText(card.front) || 'No question provided.';
      var backText = safeText(card.back) || 'No answer provided.';

      doc.setFontSize(9);
      var frontLines = doc.splitTextToSize(frontText, halfWidth - 8);
      var backLines = doc.splitTextToSize(backText, halfWidth - 8);
      var maxLines = Math.floor((maxRowHeight - 12) / lineHeight);
      frontLines = truncateLines(frontLines, maxLines);
      backLines = truncateLines(backLines, maxLines);

      var textLines = Math.max(frontLines.length, backLines.length);
      var rowHeight = Math.max(minRowHeight, 12 + textLines * lineHeight);

      if (y + rowHeight > contentBottom) {
        doc.addPage();
        y = drawPageHeader(doc, config);
        isFirstRowOnPage = true;
      }

      if (!isFirstRowOnPage) {
        doc.setDrawColor(190, 198, 216);
        setDash(doc, [1, 1.5], 0);
        doc.line(margin, y - 1.2, margin + contentWidth, y - 1.2);
      }

      doc.setDrawColor(100, 120, 200);
      setDash(doc, [3, 2], 0);
      doc.line(margin + halfWidth, y, margin + halfWidth, y + rowHeight);
      setDash(doc, [], 0);

      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('QUESTION', margin + 2, y + 4.5);
      doc.text('ANSWER', margin + halfWidth + 2, y + 4.5);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      var indexText = String(index + 1);
      var indexX = margin + contentWidth - 1.5 - doc.getTextWidth(indexText);
      doc.text(indexText, indexX, y + 4.5);

      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
      doc.text(frontLines, margin + 2, y + 9);

      doc.setTextColor(31, 41, 55);
      doc.text(backLines, margin + halfWidth + 2, y + 9);

      y += rowHeight + 2;
      isFirstRowOnPage = false;
    });

    addPageFooters(doc, config);

    var filename = opts.filename || ('budy-flashcards-' + slugify(topicLabel) + '.pdf');
    doc.save(filename);
  }

  window.BudyFlashcardPdf = {
    exportDeckAsPdf: exportDeckAsPdf
  };
})();
