/* ============================================================
 *  Content Formatters — markdown-to-HTML and HTML escaping
 * ============================================================ */
(function () {
  'use strict';

  function escapeHTML(str) {
    if (!str) return '';
    var el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function formatMarkdownContent(text) {
    if (!text) return '';
    var html = escapeHTML(text);
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  window.ContentFormatters = {
    escapeHTML: escapeHTML,
    formatMarkdownContent: formatMarkdownContent
  };
})();
