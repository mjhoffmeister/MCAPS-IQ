/* ============================================================
 *  Mission Control View — Session history browser + delegation
 *  Browse all past Copilot CLI sessions, inspect turns, search
 *  across history, and delegate prompts to past session contexts.
 * ============================================================ */
(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────

  var container = null;
  var unsubscribe = null;
  var sessions = [];
  var stats = null;
  var totalSessions = 0;
  var currentPage = 0;
  var pageSize = 30;
  var searchQuery = '';
  var repoFilter = '';
  var selectedSessionId = null;
  var selectedDetail = null;
  var delegateModalOpen = false;
  var searchDebounceTimer = null;
  var isLoading = false;

  // ── Helpers ──────────────────────────────────────────────────

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(ts) {
    if (!ts) return '';
    var d = Date.now() - new Date(ts).getTime();
    var s = Math.floor(d / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  function shortDate(ts) {
    if (!ts) return '';
    try {
      var d = new Date(ts);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  }

  function shortId(id) {
    return id ? id.slice(0, 8) : '--------';
  }

  function repoName(repo) {
    if (!repo) return '';
    var parts = repo.split('/');
    return parts.length > 1 ? parts[parts.length - 1] : repo;
  }

  function cwdShort(cwd) {
    if (!cwd) return '';
    var parts = cwd.split('/');
    return parts.length > 2 ? '…/' + parts.slice(-2).join('/') : cwd;
  }

  // ── Data fetching ────────────────────────────────────────────

  function fetchSessions() {
    isLoading = true;
    renderList();

    var params = new URLSearchParams();
    params.set('limit', String(pageSize));
    params.set('offset', String(currentPage * pageSize));
    if (searchQuery) params.set('search', searchQuery);
    if (repoFilter) params.set('repository', repoFilter);

    fetch('/api/session-history?' + params.toString())
      .then(function (r) { return r.ok ? r.json() : { sessions: [], total: 0 }; })
      .then(function (data) {
        sessions = data.sessions || [];
        totalSessions = data.total || 0;
        isLoading = false;
        renderList();
      })
      .catch(function () {
        isLoading = false;
        renderList();
      });
  }

  function fetchStats() {
    fetch('/api/session-history/stats')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        stats = data;
        renderStatsBar();
      })
      .catch(function () {});
  }

  function fetchDetail(sessionId) {
    selectedSessionId = sessionId;
    selectedDetail = null;
    renderDetail();

    fetch('/api/session-history/' + encodeURIComponent(sessionId))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        selectedDetail = data;
        renderDetail();
      })
      .catch(function () {
        renderDetail();
      });
  }

  function searchHistory(query) {
    if (!query) { fetchSessions(); return; }

    isLoading = true;
    renderList();

    fetch('/api/session-history/search?q=' + encodeURIComponent(query))
      .then(function (r) { return r.ok ? r.json() : { results: [] }; })
      .then(function (data) {
        sessions = data.results || [];
        totalSessions = sessions.length;
        currentPage = 0;
        isLoading = false;
        renderList();
      })
      .catch(function () {
        isLoading = false;
        renderList();
      });
  }

  function delegateToSession(sessionId, prompt) {
    return fetch('/api/session-history/' + encodeURIComponent(sessionId) + '/delegate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.dispatched) {
          showToast('Prompt delegated to session ' + shortId(sessionId));
        } else {
          showToast('Delegation failed: ' + (data.error || 'unknown'), 'error');
        }
        return data;
      })
      .catch(function (err) {
        showToast('Delegation error: ' + err.message, 'error');
      });
  }

  // ── Toast ────────────────────────────────────────────────────

  function showToast(msg, type) {
    var toast = document.createElement('div');
    toast.className = 'mc-toast ' + (type === 'error' ? 'mc-toast--error' : 'mc-toast--success');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('mc-toast--visible'); }, 10);
    setTimeout(function () {
      toast.classList.remove('mc-toast--visible');
      setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
  }

  // ── Render: Stats bar ────────────────────────────────────────

  function renderStatsBar() {
    var el = container && container.querySelector('.mc-stats-bar');
    if (!el || !stats) return;

    var recentCount = (stats.recentActivity || []).reduce(function (sum, d) { return sum + d.sessionCount; }, 0);

    el.innerHTML =
      '<div class="mc-stat">' +
        '<span class="mc-stat__value">' + (stats.totalSessions || 0) + '</span>' +
        '<span class="mc-stat__label">Sessions</span>' +
      '</div>' +
      '<div class="mc-stat">' +
        '<span class="mc-stat__value">' + (stats.totalTurns || 0) + '</span>' +
        '<span class="mc-stat__label">Turns</span>' +
      '</div>' +
      '<div class="mc-stat">' +
        '<span class="mc-stat__value">' + (stats.repositories || []).length + '</span>' +
        '<span class="mc-stat__label">Repos</span>' +
      '</div>' +
      '<div class="mc-stat">' +
        '<span class="mc-stat__value">' + recentCount + '</span>' +
        '<span class="mc-stat__label">Last 30d</span>' +
      '</div>';
  }

  // ── Render: Session list ─────────────────────────────────────

  function renderSessionRow(s) {
    var isActive = s.sessionId === selectedSessionId;
    var canResume = s.canResume !== false;
    var summaryText = s.summary || s.matchedContent || '(no summary)';
    if (summaryText.length > 120) summaryText = summaryText.slice(0, 120) + '…';
    var loc = s.repository ? repoName(s.repository) : cwdShort(s.cwd);

    return '' +
      '<div class="mc-session-row' + (isActive ? ' mc-session-row--active' : '') + '" ' +
           'data-session-id="' + esc(s.sessionId) + '">' +
        '<div class="mc-session-row__main">' +
          '<div class="mc-session-row__header">' +
            '<span class="mc-session-row__id">' + esc(shortId(s.sessionId)) + '</span>' +
            (s.matchType ? '<span class="mc-badge mc-badge--' + s.matchType + '">' + esc(s.matchType) + '</span>' : '') +
            (s.hostType ? '<span class="mc-badge mc-badge--host">' + esc(s.hostType) + '</span>' : '') +
            (canResume ? '<span class="mc-badge mc-badge--resume">resumable</span>' : '') +
          '</div>' +
          '<div class="mc-session-row__summary">' + esc(summaryText) + '</div>' +
          '<div class="mc-session-row__meta">' +
            (loc ? '<span class="mc-meta-chip">' + esc(loc) + '</span>' : '') +
            (s.branch ? '<span class="mc-meta-chip">' + esc(s.branch) + '</span>' : '') +
            (s.turnCount ? '<span class="mc-meta-chip">' + s.turnCount + ' turns</span>' : '') +
            '<span class="mc-meta-chip mc-meta-chip--time">' + timeAgo(s.updatedAt || s.modifiedTime) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="mc-session-row__actions">' +
          (canResume ? '<button class="mc-btn mc-btn--sm mc-btn--delegate" data-action="delegate" data-sid="' + esc(s.sessionId) + '" title="Delegate prompt to this session">▶ Delegate</button>' : '') +
        '</div>' +
      '</div>';
  }

  function renderList() {
    var el = container && container.querySelector('.mc-session-list');
    if (!el) return;

    if (isLoading) {
      el.innerHTML = '<div class="mc-loading">Loading sessions…</div>';
      return;
    }

    if (sessions.length === 0) {
      el.innerHTML = '<div class="mc-empty">No sessions found.' +
        (searchQuery ? ' Try a different search.' : '') + '</div>';
      return;
    }

    var rows = sessions.map(renderSessionRow).join('');

    var totalPages = Math.ceil(totalSessions / pageSize);
    var pager = '';
    if (totalPages > 1) {
      pager = '<div class="mc-pager">' +
        '<button class="mc-btn mc-btn--sm" data-action="prev-page"' + (currentPage === 0 ? ' disabled' : '') + '>← Prev</button>' +
        '<span class="mc-pager__info">Page ' + (currentPage + 1) + ' of ' + totalPages + ' (' + totalSessions + ' total)</span>' +
        '<button class="mc-btn mc-btn--sm" data-action="next-page"' + (currentPage >= totalPages - 1 ? ' disabled' : '') + '>Next →</button>' +
      '</div>';
    }

    el.innerHTML = rows + pager;
  }

  // ── Render: Session detail panel ─────────────────────────────

  function renderDetail() {
    var el = container && container.querySelector('.mc-detail-panel');
    if (!el) return;

    if (!selectedSessionId) {
      el.innerHTML = '<div class="mc-detail-empty">' +
        '<div class="mc-detail-empty__icon">🎯</div>' +
        '<div class="mc-detail-empty__text">Select a session to inspect</div>' +
        '<div class="mc-detail-empty__hint">Browse history, view turns, and delegate new prompts</div>' +
      '</div>';
      return;
    }

    if (!selectedDetail) {
      el.innerHTML = '<div class="mc-loading">Loading session detail…</div>';
      return;
    }

    var d = selectedDetail;
    var turnsHtml = (d.turns || []).map(function (t) {
      return '<div class="mc-turn">' +
        '<div class="mc-turn__header">' +
          '<span class="mc-turn__index">Turn ' + t.turnIndex + '</span>' +
          '<span class="mc-turn__time">' + shortDate(t.timestamp) + '</span>' +
        '</div>' +
        '<div class="mc-turn__user">' +
          '<span class="mc-turn__role">You</span>' +
          '<div class="mc-turn__content">' + esc(t.userMessage || '(empty)') + '</div>' +
        '</div>' +
        (t.assistantResponse ? '<div class="mc-turn__assistant">' +
          '<span class="mc-turn__role">Assistant</span>' +
          '<div class="mc-turn__content">' + esc(t.assistantResponse) + '</div>' +
        '</div>' : '') +
      '</div>';
    }).join('');

    el.innerHTML =
      '<div class="mc-detail-header">' +
        '<div class="mc-detail-header__title">' +
          '<h3>' + esc(d.summary || 'Session ' + shortId(d.sessionId)) + '</h3>' +
          '<button class="mc-btn mc-btn--icon mc-detail-close" data-action="close-detail">✕</button>' +
        '</div>' +
        '<div class="mc-detail-header__meta">' +
          '<span class="mc-meta-chip">ID: ' + esc(shortId(d.sessionId)) + '</span>' +
          (d.repository ? '<span class="mc-meta-chip">' + esc(d.repository) + '</span>' : '') +
          (d.branch ? '<span class="mc-meta-chip">' + esc(d.branch) + '</span>' : '') +
          (d.cwd ? '<span class="mc-meta-chip">' + esc(cwdShort(d.cwd)) + '</span>' : '') +
          '<span class="mc-meta-chip">Created: ' + shortDate(d.createdAt) + '</span>' +
          '<span class="mc-meta-chip">Updated: ' + shortDate(d.updatedAt) + '</span>' +
          (d.stateFiles ? '<span class="mc-meta-chip">' + d.stateFiles.length + ' state files</span>' : '') +
        '</div>' +
        (d.canResume ? '<div class="mc-detail-actions">' +
          '<button class="mc-btn mc-btn--primary mc-btn--delegate-detail" data-action="delegate" data-sid="' + esc(d.sessionId) + '">▶ Delegate Prompt to This Session</button>' +
          '<button class="mc-btn mc-btn--secondary" data-action="copy-id" data-sid="' + esc(d.sessionId) + '">Copy Session ID</button>' +
        '</div>' : '') +
      '</div>' +
      '<div class="mc-detail-turns">' +
        '<h4 class="mc-detail-section-title">Conversation (' + (d.turns || []).length + ' turns)</h4>' +
        (turnsHtml || '<div class="mc-empty">No turns recorded.</div>') +
      '</div>';
  }

  // ── Render: Delegate modal ───────────────────────────────────

  function showDelegateModal(sessionId) {
    var detail = sessions.find(function (s) { return s.sessionId === sessionId; });
    var title = detail ? (detail.summary || shortId(sessionId)) : shortId(sessionId);

    var overlay = document.createElement('div');
    overlay.className = 'mc-modal-overlay';
    overlay.innerHTML =
      '<div class="mc-modal">' +
        '<div class="mc-modal__header">' +
          '<h3>Delegate to Session</h3>' +
          '<button class="mc-btn mc-btn--icon mc-modal__close">✕</button>' +
        '</div>' +
        '<div class="mc-modal__body">' +
          '<div class="mc-modal__target">' +
            '<span class="mc-meta-chip">' + esc(shortId(sessionId)) + '</span>' +
            '<span>' + esc(title.length > 60 ? title.slice(0, 60) + '…' : title) + '</span>' +
          '</div>' +
          '<label class="mc-modal__label">Prompt to send</label>' +
          '<textarea class="mc-modal__textarea" rows="4" placeholder="Enter the prompt to delegate…" autofocus></textarea>' +
          '<div class="mc-modal__hint">The session will resume with its prior context and execute your prompt.</div>' +
        '</div>' +
        '<div class="mc-modal__footer">' +
          '<button class="mc-btn mc-btn--secondary mc-modal__cancel">Cancel</button>' +
          '<button class="mc-btn mc-btn--primary mc-modal__send">▶ Send</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var textarea = overlay.querySelector('.mc-modal__textarea');
    var sendBtn = overlay.querySelector('.mc-modal__send');
    var cancelBtn = overlay.querySelector('.mc-modal__cancel');
    var closeBtn = overlay.querySelector('.mc-modal__close');

    function close() { overlay.remove(); }

    function send() {
      var prompt = textarea.value.trim();
      if (!prompt) return;
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending…';
      delegateToSession(sessionId, prompt).then(close);
    }

    cancelBtn.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    sendBtn.addEventListener('click', send);
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
      if (e.key === 'Escape') close();
    });

    setTimeout(function () { textarea.focus(); }, 50);
  }

  // ── Main render ──────────────────────────────────────────────

  function renderShell() {
    if (!container) return;

    container.innerHTML =
      '<div class="mc-view">' +
        '<div class="mc-header">' +
          '<div class="mc-header__title">' +
            '<h2>🎯 Mission Control</h2>' +
            '<span class="mc-header__subtitle">Session History & Delegation</span>' +
          '</div>' +
          '<div class="mc-stats-bar"></div>' +
        '</div>' +
        '<div class="mc-toolbar">' +
          '<div class="mc-search-box">' +
            '<svg class="mc-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3.5 3.5"/></svg>' +
            '<input class="mc-search-input" type="text" placeholder="Search sessions by content…" value="' + esc(searchQuery) + '">' +
          '</div>' +
          '<select class="mc-repo-filter">' +
            '<option value="">All repos</option>' +
          '</select>' +
        '</div>' +
        '<div class="mc-body">' +
          '<div class="mc-list-panel">' +
            '<div class="mc-session-list"></div>' +
          '</div>' +
          '<div class="mc-detail-panel"></div>' +
        '</div>' +
      '</div>';

    // Populate repo filter from stats
    if (stats && stats.repositories) {
      var select = container.querySelector('.mc-repo-filter');
      stats.repositories.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.repository;
        opt.textContent = repoName(r.repository) + ' (' + r.sessionCount + ')';
        select.appendChild(opt);
      });
      if (repoFilter) select.value = repoFilter;
    }
  }

  // ── Event handlers ───────────────────────────────────────────

  function handleClick(e) {
    var target = e.target;

    // Delegate buttons
    var delegateBtn = target.closest('[data-action="delegate"]');
    if (delegateBtn) {
      e.stopPropagation();
      showDelegateModal(delegateBtn.dataset.sid);
      return;
    }

    // Close detail
    var closeBtn = target.closest('[data-action="close-detail"]');
    if (closeBtn) {
      selectedSessionId = null;
      selectedDetail = null;
      renderDetail();
      renderList();
      return;
    }

    // Copy session ID
    var copyBtn = target.closest('[data-action="copy-id"]');
    if (copyBtn) {
      navigator.clipboard.writeText(copyBtn.dataset.sid).then(function () {
        showToast('Session ID copied');
      });
      return;
    }

    // Pagination
    var prevBtn = target.closest('[data-action="prev-page"]');
    if (prevBtn && currentPage > 0) {
      currentPage--;
      fetchSessions();
      return;
    }

    var nextBtn = target.closest('[data-action="next-page"]');
    if (nextBtn) {
      currentPage++;
      fetchSessions();
      return;
    }

    // Session row click → show detail
    var row = target.closest('.mc-session-row');
    if (row && row.dataset.sessionId) {
      fetchDetail(row.dataset.sessionId);
      // Update active state in list
      container.querySelectorAll('.mc-session-row').forEach(function (r) {
        r.classList.toggle('mc-session-row--active', r === row);
      });
      return;
    }
  }

  function handleSearch(e) {
    clearTimeout(searchDebounceTimer);
    var val = e.target.value.trim();
    searchDebounceTimer = setTimeout(function () {
      searchQuery = val;
      currentPage = 0;
      if (val.length >= 2) {
        searchHistory(val);
      } else if (val.length === 0) {
        fetchSessions();
      }
    }, 400);
  }

  function handleRepoFilter(e) {
    repoFilter = e.target.value;
    currentPage = 0;
    fetchSessions();
  }

  // ── View API ─────────────────────────────────────────────────

  function mount(el) {
    container = el;
    renderShell();
    fetchStats();
    fetchSessions();
    renderDetail();

    container.addEventListener('click', handleClick);
    var searchInput = container.querySelector('.mc-search-input');
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    var repoSelect = container.querySelector('.mc-repo-filter');
    if (repoSelect) repoSelect.addEventListener('change', handleRepoFilter);

    // Listen for delegation events from WebSocket
    unsubscribe = window.AppState.subscribe(function (type, data) {
      if (type === 'delegation:complete' || type === 'delegation:error') {
        fetchSessions(); // Refresh list
      }
    });
  }

  function unmount() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    container = null;
  }

  function onActivate() {
    fetchStats();
    fetchSessions();
  }

  window.missionControlView = { mount: mount, unmount: unmount, onActivate: onActivate };
})();
