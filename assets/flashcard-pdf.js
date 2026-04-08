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

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openPrintFallback(topicLabel, deck) {
    var printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      throw new Error('Popup blocked. Allow popups to export or save as PDF.');
    }

    var cardsHtml = deck.length
      ? deck.map(function (card, index) {
          var front = escapeHtml(safeText(card && card.front) || 'No question provided.');
          var back = escapeHtml(safeText(card && card.back) || 'No answer provided.');
          return '<article class="card">'
            + '<div class="cell"><div class="label">QUESTION</div><div class="value">' + front + '</div></div>'
            + '<div class="cell"><div class="label">ANSWER</div><div class="value">' + back + '</div></div>'
            + '<div class="num">' + (index + 1) + '</div>'
            + '</article>';
        }).join('')
      : '<p class="empty">No flashcards are available for this topic yet.</p>';

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Budy.Study Flashcards</title>'
      + '<style>'
      + 'body{font-family:Arial,sans-serif;margin:0;padding:18px;color:#111827}'
      + 'h1{font-size:18px;margin:0 0 6px}h2{font-size:13px;color:#475569;margin:0 0 14px;font-weight:600}'
      + '.card{display:grid;grid-template-columns:1fr 1fr;gap:14px;border-top:1px dashed #94a3b8;padding:12px 0;position:relative;break-inside:avoid;page-break-inside:avoid}'
      + '.card:first-of-type{border-top:none}.cell{padding-right:6px}.cell+.cell{border-left:1px dashed #94a3b8;padding-left:12px}'
      + '.label{font-size:10px;letter-spacing:.08em;color:#64748b;font-weight:700;margin-bottom:6px}'
      + '.value{font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word}'
      + '.num{position:absolute;right:0;top:10px;font-size:10px;color:#94a3b8}'
      + '.empty{margin-top:14px;color:#475569}'
      + '@media print{body{padding:12mm}.card{break-inside:avoid;page-break-inside:avoid}}'
      + '</style></head><body>'
      + '<h1>Budy.Study Flashcards</h1>'
      + '<h2>' + escapeHtml(topicLabel) + ' - ' + deck.length + ' cards</h2>'
      + cardsHtml
      + '</body></html>';

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
      openPrintFallback(topicLabel, deck);
      return;
    }

    try {
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
    } catch (error) {
      console.error('[flashcards] jsPDF export failed, falling back to print', error);
      openPrintFallback(topicLabel, deck);
    }
  }

  window.BudyFlashcardPdf = {
    exportDeckAsPdf: exportDeckAsPdf
  };
})();
