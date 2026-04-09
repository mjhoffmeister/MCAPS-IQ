/* ============================================================
 *  Sessions View — Frontier-style split panel activity stream
 * ============================================================ */
(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────

  var SESSION_COLORS = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6',
    '#ef4444', '#06b6d4', '#f97316', '#14b8a6', '#a855f7'
  ];

  var TOOL_NAMES = {
    bash:             'Running command',
    powershell:       'Running command',
    execute_command:  'Running command',
    run_command:      'Running command',
    shell:            'Running command',
    edit:             'Editing file',
    create:           'Creating file',
    view:             'Reading file',
    read_file:        'Reading file',
    write_file:       'Writing file',
    delete_file:      'Deleting file',
    glob:             'Finding files',
    grep:             'Searching code',
    find:             'Searching files',
    sql:              'Running SQL',
    task:             'Spawning agent',
    store_memory:     'Storing memory',
    web_fetch:        'Fetching URL',
    web_search:       'Searching web',
    report_intent:    'Reporting intent',
  };

  var PANEL_STORAGE_KEY = 'mcaps-iq-session-panel-collapsed';
  var ALL_SESSIONS_ID   = '__all__';

  // ── Module state ─────────────────────────────────────────────

  var container      = null;
  var unsubscribe    = null;
  var selectedId     = ALL_SESSIONS_ID;
  var panelCollapsed = false;
  var isPinned       = true;
  var tickTimer      = null;

  // ── localStorage helpers ──────────────────────────────────────

  function loadPanelState() {
    try { panelCollapsed = localStorage.getItem(PANEL_STORAGE_KEY) === 'true'; } catch (_) {}
  }

  function savePanelState() {
    try { localStorage.setItem(PANEL_STORAGE_KEY, String(panelCollapsed)); } catch (_) {}
  }

  // ── Color helpers ─────────────────────────────────────────────

  function hashColor(id) {
    if (!id || id === ALL_SESSIONS_ID) return '#2563eb';
    var h = 0;
    for (var i = 0; i < id.length; i++) h = Math.imul(h, 31) + id.charCodeAt(i) | 0;
    return SESSION_COLORS[Math.abs(h) % SESSION_COLORS.length];
  }

  function hexAlpha(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  // ── HTML escape ───────────────────────────────────────────────

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Time helpers ─────────────────────────────────────────────

  function timeAgo(ts) {
    if (!ts) return '';
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60)    return d + 's ago';
    if (d < 3600)  return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  }

  function formatDur(startTs) {
    if (!startTs) return '0s';
    var s = Math.floor((Date.now() - startTs) / 1000);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    if (h > 0) return h + 'h ' + (m % 60) + 'm';
    if (m > 0) return m + 'm ' + (s % 60) + 's';
    return s + 's';
  }

  function shortId(id) {
    if (!id) return '--------';
    var m = id.match(/\d{4,}/);
    return m ? m[0] : id.slice(0, 8).toUpperCase();
  }

  // ── AppState accessors ────────────────────────────────────────

  function getSessions() {
    if (typeof window.AppState === 'undefined') return {};
    return window.AppState.getState().sessions || {};
  }

  function getSmartName(id, data) {
    if (!data) return shortId(id);
    var s = data.session || {};
    return s.derivedTitle || s.title || s.currentIntent || ('Session ' + shortId(id));
  }

  function validateSelection(sessions) {
    if (selectedId === ALL_SESSIONS_ID) return;
    if (!sessions[selectedId]) selectedId = ALL_SESSIONS_ID;
  }

  // ── Timeline builders ─────────────────────────────────────────

  function buildTimeline(data, sid) {
    var items = [];
    (data.responses     || []).forEach(function (r,  i) { items.push({ type: 'response', ts: r.timestamp   || 0, data: r,    sid: sid, ord: i }); });
    (data.toolCalls     || []).forEach(function (t,  i) { items.push({ type: 'tool',     ts: t.startTime   || 0, data: t,    sid: sid, ord: i }); });
    (data.thinking      || []).forEach(function (th, i) { items.push({ type: 'thinking', ts: th.timestamp  || 0, data: th,   sid: sid, ord: i }); });
    (data.backgroundTasks || []).forEach(function (tk, i) { items.push({ type: 'task',  ts: tk.startTime  || 0, data: tk,   sid: sid, ord: i }); });
    items.sort(function (a, b) {
      if (a.ts !== b.ts) return a.ts - b.ts;
      if (a.sid !== b.sid) return a.sid < b.sid ? -1 : 1;
      return a.ord - b.ord;
    });
    return items;
  }

  function buildMergedTimeline(sessions) {
    var items = [];
    Object.keys(sessions).forEach(function (sid) {
      buildTimeline(sessions[sid], sid).forEach(function (item) { items.push(item); });
    });
    items.sort(function (a, b) {
      if (a.ts !== b.ts) return a.ts - b.ts;
      if (a.sid !== b.sid) return a.sid < b.sid ? -1 : 1;
      return a.ord - b.ord;
    });
    return items;
  }

  // ── Tool name resolver ────────────────────────────────────────

  function resolveToolName(raw) {
    if (!raw) return 'Tool call';
    var lower = raw.toLowerCase().replace(/[-:]/g, '_');
    for (var key in TOOL_NAMES) {
      if (lower.indexOf(key) !== -1) return TOOL_NAMES[key];
    }
    return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // ── Session badge pill ────────────────────────────────────────

  function sessionBadge(sid) {
    var c = hashColor(sid);
    var label = 'SESSION · ' + shortId(sid);
    return '<span class="sv-session-badge" style="background:' + hexAlpha(c, 0.12) + ';color:' + c + ';border:1px solid ' + hexAlpha(c, 0.3) + '">' + esc(label) + '</span>';
  }

  // ── Entry renderers ───────────────────────────────────────────

  function renderResponseEntry(item, showBadge) {
    var r   = item.data;
    var c   = hashColor(item.sid);
    var fmt = (window.ContentFormatters && typeof window.ContentFormatters.formatMarkdownContent === 'function')
      ? window.ContentFormatters.formatMarkdownContent(r.content || '')
      : esc(r.content || '');
    var agentName = (r.agentName && r.agentName !== 'assistant') ? esc(r.agentName) : 'MCAPS IQ';
    return '<div class="sv-entry sv-entry--response" style="border-left-color:' + c + '">'
      + '<div class="sv-entry__header">'
      + (showBadge ? sessionBadge(item.sid) : '')
      + '<span class="sv-agent-badge">🤖 ' + agentName + '</span>'
      + '<span class="sv-entry__time">' + timeAgo(r.timestamp) + '</span>'
      + '</div>'
      + '<div class="sv-entry__body sv-entry__body--response">' + fmt + '</div>'
      + '</div>';
  }

  function renderToolEntry(item, showBadge) {
    var t    = item.data;
    var c    = hashColor(item.sid);
    var dur  = (t.endTime && t.startTime) ? ((t.endTime - t.startTime) + 'ms') : '';
    var icon = (t.success === null || t.success === undefined) ? '⏳' : (t.success ? '✅' : '❌');
    var name = resolveToolName(t.toolName);
    var detail = t.detail ? '<span class="sv-tool-detail">' + esc(t.detail) + '</span>' : '';
    return '<div class="sv-entry sv-entry--tool" style="border-left-color:' + c + '">'
      + '<details class="sv-tool-details">'
      + '<summary class="sv-entry__header sv-entry__header--tool">'
      + (showBadge ? sessionBadge(item.sid) : '')
      + '<span class="sv-tool-icon">⚡</span>'
      + '<span class="sv-tool-name">' + esc(name) + '</span>'
      + detail
      + '<span class="sv-tool-status">' + icon + '</span>'
      + (dur ? '<span class="sv-tool-dur">' + esc(dur) + '</span>' : '')
      + '<span class="sv-entry__time">' + timeAgo(t.startTime) + '</span>'
      + '</summary>'
      + '<div class="sv-entry__body sv-entry__body--tool">'
      + '<code>' + esc(t.toolName || '') + (t.id ? ' · id:' + esc(t.id) : '') + '</code>'
      + '</div>'
      + '</details>'
      + '</div>';
  }

  function renderThinkingEntry(item, showBadge) {
    var th      = item.data;
    var c       = hashColor(item.sid);
    var preview = (th.content || '').slice(0, 80).replace(/\n/g, ' ');
    return '<div class="sv-entry sv-entry--thinking" style="border-left-color:' + c + '">'
      + '<details class="sv-thinking-details">'
      + '<summary class="sv-entry__header">'
      + (showBadge ? sessionBadge(item.sid) : '')
      + '<span class="sv-tool-icon">🤔</span>'
      + '<span class="sv-thinking-preview">' + esc(preview) + '…</span>'
      + '<span class="sv-entry__time">' + timeAgo(th.timestamp) + '</span>'
      + '</summary>'
      + '<div class="sv-entry__body sv-entry__body--thinking">' + esc(th.content || '') + '</div>'
      + '</details>'
      + '</div>';
  }

  function renderTaskEntry(item, showBadge) {
    var t    = item.data;
    var c    = hashColor(item.sid);
    var icon = t.status === 'complete' ? '✅' : (t.status === 'failed' ? '❌' : '⚙️');
    return '<div class="sv-entry sv-entry--task" style="border-left-color:' + c + '">'
      + '<div class="sv-entry__header">'
      + (showBadge ? sessionBadge(item.sid) : '')
      + '<span class="sv-tool-icon">' + esc(t.emoji || '⚙️') + '</span>'
      + '<span class="sv-task-agent">' + esc(t.agentName || 'agent') + '</span>'
      + (t.description ? '<span class="sv-task-desc">' + esc(t.description) + '</span>' : '')
      + '<span class="sv-tool-status">' + icon + '</span>'
      + '<span class="sv-entry__time">' + timeAgo(t.startTime) + '</span>'
      + '</div>'
      + (t.output ? '<div class="sv-entry__body sv-entry__body--task">' + esc(t.output) + '</div>' : '')
      + '</div>';
  }

  function renderItem(item, showBadge) {
    switch (item.type) {
      case 'response': return renderResponseEntry(item, showBadge);
      case 'tool':     return renderToolEntry(item, showBadge);
      case 'thinking': return renderThinkingEntry(item, showBadge);
      case 'task':     return renderTaskEntry(item, showBadge);
      default:         return '';
    }
  }

  // ── Active agents bar ─────────────────────────────────────────

  function renderAgentsBar(sessions) {
    var running = [];
    Object.keys(sessions).forEach(function (sid) {
      var c = hashColor(sid);
      (sessions[sid].backgroundTasks || []).forEach(function (t) {
        if (t.status === 'running' || t.status === 'pending') {
          running.push({ emoji: t.emoji || '⚙️', name: t.agentName || 'agent', color: c });
        }
      });
    });
    if (!running.length) return '';
    var pills = running.map(function (a) {
      return '<span class="sv-active-agent" style="border-color:' + a.color + ';color:' + a.color + '">'
        + esc(a.emoji) + ' ' + esc(a.name)
        + '</span>';
    }).join('');
    return '<div class="sv-agents-bar">'
      + '<span class="sv-agents-bar__label">Active agents</span>'
      + pills
      + '</div>';
  }

  // ── Left session panel ────────────────────────────────────────

  function renderPanel(sessions) {
    var ids = Object.keys(sessions);
    if (panelCollapsed) {
      return '<div class="sv-panel sv-panel--collapsed" aria-label="Sessions panel">'
        + '<div class="sv-panel__header">'
        + '<button class="sv-panel__toggle" aria-label="Expand session panel" aria-expanded="false">▶</button>'
        + '</div>'
        + '</div>';
    }

    var allActive = selectedId === ALL_SESSIONS_ID;
    var allCard = '<div class="sv-session-card' + (allActive ? ' sv-session-card--active' : '') + '" '
      + 'data-sv-sid="' + ALL_SESSIONS_ID + '" style="border-left-color:#2563eb" '
      + 'role="button" tabindex="0" aria-selected="' + allActive + '">'
      + '<div class="sv-session-card__row">'
      + '<span class="sv-status-dot sv-status-dot--active" title="All sessions"></span>'
      + '<span class="sv-session-card__name">All Sessions</span>'
      + '</div>'
      + '<div class="sv-session-card__meta">'
      + '<span class="sv-session-card__count">' + ids.length + ' session' + (ids.length !== 1 ? 's' : '') + '</span>'
      + '</div>'
      + '</div>';

    var cards = ids.map(function (sid) {
      var data    = sessions[sid];
      var meta    = data.metadata || {};
      var c       = hashColor(sid);
      var status  = meta.status || 'ended';
      var dotCls  = 'sv-status-dot--' + (status === 'active' ? 'active' : status === 'idle' ? 'idle' : 'ended');
      var name    = getSmartName(sid, data);
      var isActive = sid === selectedId;
      var runCnt  = (data.backgroundTasks || []).filter(function (t) { return t.status === 'running'; }).length;
      return '<div class="sv-session-card' + (isActive ? ' sv-session-card--active' : '') + '" '
        + 'data-sv-sid="' + esc(sid) + '" style="border-left-color:' + c + '" '
        + 'role="button" tabindex="0" aria-selected="' + isActive + '">'
        + '<div class="sv-session-card__row">'
        + '<span class="sv-status-dot ' + dotCls + '" title="' + esc(status) + '"></span>'
        + '<span class="sv-session-card__name" title="' + esc(name) + '">' + esc(name) + '</span>'
        + '</div>'
        + '<div class="sv-session-card__meta">'
        + '<span class="sv-session-card__status">' + esc(status) + '</span>'
        + (meta.lastSeen ? '<span class="sv-session-card__time">' + timeAgo(meta.lastSeen) + '</span>' : '')
        + (runCnt > 0 ? '<span class="sv-session-running">' + runCnt + ' running</span>' : '')
        + '</div>'
        + '</div>';
    }).join('');

    return '<div class="sv-panel" aria-label="Sessions panel">'
      + '<div class="sv-panel__header">'
      + '<span class="sv-panel__title">SESSIONS</span>'
      + '<button class="sv-panel__toggle" aria-label="Collapse session panel" aria-expanded="true">◀</button>'
      + '</div>'
      + '<div class="sv-panel__cards">' + allCard + cards + '</div>'
      + '</div>';
  }

  // ── Main stream area ──────────────────────────────────────────

  function renderMainArea(sessions) {
    var isAll   = (selectedId === ALL_SESSIONS_ID);
    var timeline = isAll
      ? buildMergedTimeline(sessions)
      : buildTimeline(sessions[selectedId] || { responses: [], toolCalls: [], thinking: [], backgroundTasks: [] }, selectedId);

    var count   = timeline.length;
    var entries = timeline.map(function (item) { return renderItem(item, isAll); }).join('');
    var agentsBar = renderAgentsBar(sessions);

    var streamContent = entries
      || '<div class="sv-stream-empty">' + (Object.keys(sessions).length === 0
          ? 'Waiting for a CLI session to connect…'
          : 'No activity yet — start a conversation') + '</div>';

    var chatDisabled = isAll ? ' disabled' : '';
    var chatPlaceholder = isAll ? 'Select a session to send a message' : 'Send a message…';

    return '<div class="sv-main">'
      + '<div class="sv-main__header">'
      + '<span class="sv-main__title">Activity Stream</span>'
      + (count > 0 ? '<span class="sv-stream-count">' + count + '</span>' : '')
      + '<button class="sv-pin-btn' + (isPinned ? ' sv-pin-btn--active' : '') + '" title="Auto-scroll to bottom" aria-pressed="' + isPinned + '">⬇</button>'
      + '</div>'
      + agentsBar
      + '<div class="sv-stream">'
      + '<div class="sv-stream__entries">' + streamContent + '</div>'
      + '</div>'
      + '<div class="sv-chat-bar">'
      + '<input class="sv-chat-input" type="text" placeholder="' + esc(chatPlaceholder) + '"' + chatDisabled + ' />'
      + '<button class="sv-chat-send"' + chatDisabled + '>Send</button>'
      + '</div>'
      + '</div>';
  }

  // ── Full render ───────────────────────────────────────────────

  function render() {
    if (!container) return;

    var sessions = getSessions();
    validateSelection(sessions);

    // Persist transient UI state before replacing DOM
    var prevDraft = '';
    var openDetails = [];
    var streamEl = container.querySelector('.sv-stream');
    var wasAtBottom = !streamEl || (streamEl.scrollHeight - streamEl.scrollTop - streamEl.clientHeight < 40);
    var prevInput = container.querySelector('.sv-chat-input');
    if (prevInput) prevDraft = prevInput.value;
    container.querySelectorAll('details[open]').forEach(function (d) {
      var key = d.querySelector('code');
      if (key) openDetails.push(key.textContent);
    });

    container.innerHTML = '<div class="sv-layout">'
      + renderPanel(sessions)
      + renderMainArea(sessions)
      + '</div>';

    // Restore draft text and focus
    var newInput = container.querySelector('.sv-chat-input');
    if (newInput && prevDraft) {
      newInput.value = prevDraft;
    }

    // Restore open <details> by key
    if (openDetails.length) {
      container.querySelectorAll('details').forEach(function (d) {
        var key = d.querySelector('code');
        if (key && openDetails.indexOf(key.textContent) !== -1) d.open = true;
      });
    }

    // Scroll position
    var newStreamEl = container.querySelector('.sv-stream');
    if (newStreamEl) {
      if (isPinned || wasAtBottom) newStreamEl.scrollTop = newStreamEl.scrollHeight;
      newStreamEl.addEventListener('scroll', function () {
        isPinned = (newStreamEl.scrollHeight - newStreamEl.scrollTop - newStreamEl.clientHeight < 40);
        var pinBtn = container.querySelector('.sv-pin-btn');
        if (pinBtn) {
          pinBtn.classList.toggle('sv-pin-btn--active', isPinned);
          pinBtn.setAttribute('aria-pressed', String(isPinned));
        }
      });
    }

    // Panel toggle
    var toggleBtn = container.querySelector('.sv-panel__toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        panelCollapsed = !panelCollapsed;
        savePanelState();
        render();
      });
    }

    // Session card clicks (mouse + keyboard)
    container.querySelectorAll('.sv-session-card').forEach(function (card) {
      function select() {
        selectedId = card.dataset.svSid;
        isPinned = true;
        render();
      }
      card.addEventListener('click', select);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
    });

    // Pin button
    var pinBtn = container.querySelector('.sv-pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', function () {
        isPinned = !isPinned;
        pinBtn.classList.toggle('sv-pin-btn--active', isPinned);
        pinBtn.setAttribute('aria-pressed', String(isPinned));
        if (isPinned && newStreamEl) newStreamEl.scrollTop = newStreamEl.scrollHeight;
      });
    }

    // Chat input
    var chatInput = container.querySelector('.sv-chat-input');
    var sendBtn   = container.querySelector('.sv-chat-send');

    function sendChat() {
      if (!chatInput || chatInput.disabled) return;
      var msg = chatInput.value.trim();
      if (!msg) return;
      chatInput.value = '';
      if (typeof window.dispatchCopilotAction === 'function') window.dispatchCopilotAction(msg);
    }

    if (sendBtn)   sendBtn.addEventListener('click', sendChat);
    if (chatInput) chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
  }

  // ── Tick (refresh timeAgo labels every 30s) ───────────────────

  function startTick() {
    stopTick();
    tickTimer = setInterval(function () { if (container) render(); }, 30000);
  }

  function stopTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  function mount(el) {
    container = el;
    container.classList.add('sv-host');
    isPinned = true;
    loadPanelState();
    render();
    startTick();
    if (typeof window.AppState !== 'undefined' && typeof window.AppState.subscribe === 'function') {
      unsubscribe = window.AppState.subscribe(function () { if (container) render(); });
    }
  }

  function unmount() {
    if (typeof unsubscribe === 'function') { unsubscribe(); unsubscribe = null; }
    stopTick();
    if (container) container.classList.remove('sv-host');
    container = null;
  }

  function onActivate() {
    isPinned = true;
    if (container) render();
  }

  window.sessionsView = { mount: mount, unmount: unmount, onActivate: onActivate };
})();
