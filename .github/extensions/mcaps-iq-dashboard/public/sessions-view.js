/* ============================================================
 *  Sessions View — Live activity stream for CLI sessions
 * ============================================================ */
(function () {
  'use strict';

  var container = null;
  var unsubscribe = null;
  var selectedSessionId = null;
  var durationTimer = null;
  var isPinnedToBottom = true;

  // ── Time helpers ─────────────────────────────────────────────

  function timeAgo(ts) {
    if (!ts) return '';
    var delta = Math.floor((Date.now() - ts) / 1000);
    if (delta < 60) return delta + 's ago';
    if (delta < 3600) return Math.floor(delta / 60) + 'm ago';
    if (delta < 86400) return Math.floor(delta / 3600) + 'h ago';
    return Math.floor(delta / 86400) + 'd ago';
  }

  function formatDuration(startTs) {
    if (!startTs) return '0s';
    var s = Math.floor((Date.now() - startTs) / 1000);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    if (h > 0) return h + 'h ' + (m % 60) + 'm';
    if (m > 0) return m + 'm ' + (s % 60) + 's';
    return s + 's';
  }

  function shortId(id) {
    return id ? id.slice(0, 8) : '--------';
  }

  // ── State helpers ─────────────────────────────────────────────

  function getSessions() {
    if (typeof window.AppState === 'undefined') return {};
    return window.AppState.getState().sessions || {};
  }

  function getSelectedSession() {
    var sessions = getSessions();
    if (!selectedSessionId || !sessions[selectedSessionId]) {
      // Auto-pick: prefer active, else most recent
      var ids = Object.keys(sessions);
      if (!ids.length) return null;
      ids.sort(function (a, b) {
        var sa = sessions[a], sb = sessions[b];
        var aActive = sa.metadata.status === 'active' ? 1 : 0;
        var bActive = sb.metadata.status === 'active' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return (sb.metadata.lastSeen || 0) - (sa.metadata.lastSeen || 0);
      });
      selectedSessionId = ids[0];
    }
    return sessions[selectedSessionId] || null;
  }

  // ── Activity stream builder ───────────────────────────────────

  function buildTimeline(sessionData) {
    var items = [];

    (sessionData.responses || []).forEach(function (r) {
      items.push({ type: 'response', ts: r.timestamp || 0, data: r });
    });

    (sessionData.toolCalls || []).forEach(function (t) {
      items.push({ type: 'tool', ts: t.startTime || 0, data: t });
    });

    (sessionData.thinking || []).forEach(function (th) {
      items.push({ type: 'thinking', ts: th.timestamp || 0, data: th });
    });

    (sessionData.backgroundTasks || []).forEach(function (task) {
      items.push({ type: 'task', ts: task.startTime || 0, data: task });
    });

    items.sort(function (a, b) { return a.ts - b.ts; });
    return items;
  }

  // ── Entry renderers ───────────────────────────────────────────

  function renderResponseEntry(r) {
    var fmt = (window.ContentFormatters && typeof window.ContentFormatters.formatMarkdownContent === 'function')
      ? window.ContentFormatters.formatMarkdownContent(r.content || '')
      : (r.content || '');
    var agentLabel = r.agentName && r.agentName !== 'assistant'
      ? `<span class="mcaps-entry__agent-badge">${r.agentName}</span>`
      : '';
    return `
      <div class="mcaps-entry mcaps-entry--response">
        <div class="mcaps-entry__header">
          <span class="mcaps-entry__type-icon">💬</span>
          ${agentLabel}
          <span class="mcaps-entry__time">${timeAgo(r.timestamp)}</span>
        </div>
        <div class="mcaps-entry__body mcaps-entry__body--response">${fmt}</div>
      </div>`;
  }

  function renderToolEntry(t) {
    var dur = (t.endTime && t.startTime) ? ((t.endTime - t.startTime) + 'ms') : '';
    var statusIcon = t.success === null ? '⏳'
      : t.success ? '✅' : '❌';
    var detail = t.detail
      ? `<span class="mcaps-tool-detail">${t.detail}</span>`
      : '';
    return `
      <div class="mcaps-entry mcaps-entry--tool">
        <details class="mcaps-tool-details">
          <summary class="mcaps-entry__header mcaps-entry__header--tool">
            <span class="mcaps-entry__type-icon">🔧</span>
            <span class="mcaps-tool-name">${t.toolName || 'tool'}</span>
            ${detail}
            <span class="mcaps-tool-status">${statusIcon}</span>
            ${dur ? `<span class="mcaps-tool-dur">${dur}</span>` : ''}
            <span class="mcaps-entry__time">${timeAgo(t.startTime)}</span>
          </summary>
          <div class="mcaps-entry__body mcaps-entry__body--tool">
            <code>id: ${t.id || ''}</code>
          </div>
        </details>
      </div>`;
  }

  function renderThinkingEntry(th) {
    var preview = (th.content || '').slice(0, 80).replace(/\n/g, ' ');
    return `
      <div class="mcaps-entry mcaps-entry--thinking">
        <details class="mcaps-thinking-details">
          <summary class="mcaps-entry__header">
            <span class="mcaps-entry__type-icon">🤔</span>
            <span class="mcaps-thinking-preview">${preview}…</span>
            <span class="mcaps-entry__time">${timeAgo(th.timestamp)}</span>
          </summary>
          <div class="mcaps-entry__body mcaps-entry__body--thinking">${th.content || ''}</div>
        </details>
      </div>`;
  }

  function renderTaskEntry(task) {
    var statusCls = 'mcaps-task--' + (task.status || 'running');
    var statusIcon = task.status === 'complete' ? '✅'
      : task.status === 'failed' ? '❌' : '⚙️';
    return `
      <div class="mcaps-entry mcaps-entry--task ${statusCls}">
        <div class="mcaps-entry__header">
          <span class="mcaps-entry__type-icon">${task.emoji || '⚙️'}</span>
          <span class="mcaps-task-agent">${task.agentName || 'agent'}</span>
          <span class="mcaps-task-desc">${task.description || ''}</span>
          <span class="mcaps-task-status">${statusIcon}</span>
          <span class="mcaps-entry__time">${timeAgo(task.startTime)}</span>
        </div>
        ${task.output ? `<div class="mcaps-entry__body mcaps-entry__body--task">${task.output}</div>` : ''}
      </div>`;
  }

  function renderIntentBadge(intent) {
    if (!intent) return '';
    return `
      <div class="mcaps-entry mcaps-entry--intent">
        <span class="mcaps-intent-pill">🎯 ${intent}</span>
      </div>`;
  }

  function renderEntry(item) {
    switch (item.type) {
      case 'response': return renderResponseEntry(item.data);
      case 'tool':     return renderToolEntry(item.data);
      case 'thinking': return renderThinkingEntry(item.data);
      case 'task':     return renderTaskEntry(item.data);
      default:         return '';
    }
  }

  // ── Session tab bar ───────────────────────────────────────────

  function renderSessionTabs(sessions) {
    var ids = Object.keys(sessions);
    if (ids.length <= 1) return '';
    var tabs = ids.map(function (id) {
      var s = sessions[id];
      var isActive = id === selectedSessionId;
      var label = s.session.derivedTitle || s.session.title || shortId(id);
      var statusDot = s.metadata.status === 'active' ? '🟢' : '⚫';
      return `
        <button class="mcaps-session-tab ${isActive ? 'mcaps-session-tab--active' : ''}"
                data-session-id="${id}">
          <span class="mcaps-session-tab__dot">${statusDot}</span>
          <span class="mcaps-session-tab__label">${label}</span>
        </button>`;
    });
    return `<div class="mcaps-session-tabs">${tabs.join('')}</div>`;
  }

  // ── Session info bar ──────────────────────────────────────────

  function renderInfoBar(sessionData, sessionId) {
    if (!sessionData) {
      return '<div class="mcaps-session-info-bar mcaps-session-info-bar--empty">No active session</div>';
    }
    var meta = sessionData.metadata || {};
    var sess = sessionData.session || {};
    var toolCount = (sessionData.toolCalls || []).length;
    var errCount = sess.errorCount || 0;
    return `
      <div class="mcaps-session-info-bar">
        <span class="mcaps-info-item mcaps-info-item--id" title="${sessionId}">
          <span class="mcaps-info-label">ID</span>
          <code class="mcaps-info-value">${shortId(sessionId)}</code>
        </span>
        ${meta.branch ? `
        <span class="mcaps-info-item">
          <span class="mcaps-info-label">Branch</span>
          <span class="mcaps-info-value">${meta.branch}</span>
        </span>` : ''}
        <span class="mcaps-info-item mcaps-info-item--duration" data-start="${meta.startTime || 0}">
          <span class="mcaps-info-label">Duration</span>
          <span class="mcaps-info-value mcaps-duration-live">${formatDuration(meta.startTime)}</span>
        </span>
        <span class="mcaps-info-item">
          <span class="mcaps-info-label">Turns</span>
          <span class="mcaps-info-value">${sess.turnCount || 0}</span>
        </span>
        ${sess.model ? `
        <span class="mcaps-info-item">
          <span class="mcaps-info-label">Model</span>
          <span class="mcaps-info-value">${sess.model}</span>
        </span>` : ''}
        <span class="mcaps-info-item mcaps-info-item--tools">
          <span class="mcaps-info-label">Tools</span>
          <span class="mcaps-info-value">${toolCount}</span>
        </span>
        ${errCount > 0 ? `
        <span class="mcaps-info-item mcaps-info-item--errors">
          <span class="mcaps-info-label">Errors</span>
          <span class="mcaps-info-value mcaps-info-value--error">${errCount}</span>
        </span>` : ''}
        ${sess.currentIntent ? renderIntentBadge(sess.currentIntent) : ''}
      </div>`;
  }

  // ── Full render ───────────────────────────────────────────────

  function render() {
    if (!container) return;
    var sessions = getSessions();
    var sessionData = getSelectedSession();

    var scrollEl = container.querySelector('.mcaps-activity-stream');
    var wasAtBottom = !scrollEl || (scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 40);

    var entries = sessionData ? buildTimeline(sessionData).map(renderEntry).join('') : '';
    var emptyMsg = !sessionData
      ? '<div class="mcaps-stream-empty">Waiting for a CLI session to connect…</div>'
      : (!entries ? '<div class="mcaps-stream-empty">No activity yet — start a conversation</div>' : '');

    container.innerHTML = `
      <div class="mcaps-sessions-view">
        ${renderSessionTabs(sessions)}
        ${renderInfoBar(sessionData, selectedSessionId)}
        <div class="mcaps-activity-stream">
          <div class="mcaps-activity-entries">
            ${entries || emptyMsg}
          </div>
        </div>
        <div class="mcaps-chat-bar">
          <input type="text" class="mcaps-chat-input" placeholder="Send a message to the active session…" />
          <button class="mcaps-btn mcaps-btn--primary mcaps-chat-send">Send</button>
        </div>
      </div>`;

    // Restore scroll position
    var newScrollEl = container.querySelector('.mcaps-activity-stream');
    if (newScrollEl) {
      if (isPinnedToBottom || wasAtBottom) {
        newScrollEl.scrollTop = newScrollEl.scrollHeight;
      }
      newScrollEl.addEventListener('scroll', function () {
        isPinnedToBottom = (newScrollEl.scrollHeight - newScrollEl.scrollTop - newScrollEl.clientHeight < 40);
      });
    }

    // Session tab clicks
    container.querySelectorAll('.mcaps-session-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        selectedSessionId = tab.dataset.sessionId;
        isPinnedToBottom = true;
        render();
      });
    });

    // Chat input
    var input = container.querySelector('.mcaps-chat-input');
    var sendBtn = container.querySelector('.mcaps-chat-send');

    function sendChat() {
      if (!input) return;
      var msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      if (typeof window.dispatchCopilotAction === 'function') {
        window.dispatchCopilotAction(msg);
      }
    }

    if (sendBtn) sendBtn.addEventListener('click', sendChat);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
      });
    }
  }

  // ── Duration tick ─────────────────────────────────────────────

  function startDurationTick() {
    stopDurationTick();
    durationTimer = setInterval(function () {
      if (!container) return;
      container.querySelectorAll('.mcaps-duration-live').forEach(function (el) {
        var infoItem = el.closest('.mcaps-info-item--duration');
        if (!infoItem) return;
        var startTs = parseInt(infoItem.dataset.start, 10);
        if (startTs) el.textContent = formatDuration(startTs);
      });
    }, 1000);
  }

  function stopDurationTick() {
    if (durationTimer) { clearInterval(durationTimer); durationTimer = null; }
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function mount(el) {
    container = el;
    isPinnedToBottom = true;
    render();
    startDurationTick();

    if (typeof window.AppState !== 'undefined' && typeof window.AppState.subscribe === 'function') {
      unsubscribe = window.AppState.subscribe(function () {
        if (container) render();
      });
    }
  }

  function unmount() {
    if (typeof unsubscribe === 'function') { unsubscribe(); unsubscribe = null; }
    stopDurationTick();
    container = null;
  }

  function onActivate() {
    isPinnedToBottom = true;
    if (container) render();
  }

  window.sessionsView = { mount: mount, unmount: unmount, onActivate: onActivate };
})();
