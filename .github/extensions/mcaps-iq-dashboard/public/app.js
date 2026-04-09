/* ============================================================
 *  MCAPS IQ Dashboard — App Shell
 *  Global state, WebSocket connection, router init, nav controls.
 * ============================================================ */
(function () {
  'use strict';

  // ── Global App State ───────────────────────────────────────

  var listeners = new Set();

  var state = {
    sessions: {},
    activeSessionId: null,
    ui: {
      showCode: false,
      verbosity: 'normal'
    }
  };

  function emit(type, data) {
    listeners.forEach(function (cb) {
      try { cb(type, data, state); } catch (e) { /* swallow */ }
    });
  }

  function getState() { return state; }

  function subscribe(eventNameOrCb, maybeCb) {
    if (typeof eventNameOrCb === 'string' && typeof maybeCb === 'function') {
      var wrapped = function (type, data, s) { if (type === eventNameOrCb) maybeCb(data, s); };
      listeners.add(wrapped);
      return function () { listeners.delete(wrapped); };
    }
    if (typeof eventNameOrCb !== 'function') return function () {};
    listeners.add(eventNameOrCb);
    return function () { listeners.delete(eventNameOrCb); };
  }

  function ensureSession(sessionId) {
    if (!state.sessions[sessionId]) {
      state.sessions[sessionId] = {
        metadata: { startTime: Date.now(), status: 'active', lastSeen: Date.now() },
        responses: [],
        toolCalls: [],
        backgroundTasks: [],
        thinking: [],
        session: {
          startTime: Date.now(),
          isIdle: true,
          errorCount: 0,
          turnCount: 0,
          responseCount: 0,
          taskCount: 0,
          currentIntent: null,
          title: null,
          derivedTitle: null,
          model: null,
          firstUserMessage: null
        }
      };
    }
    return state.sessions[sessionId];
  }

  function applyMessage(msg) {
    if (!msg || !msg.type) return;
    var sessionId = msg.sessionId;

    switch (msg.type) {
      case 'state:snapshot':
        if (msg.sessions) {
          state.sessions = msg.sessions;
          var ids = Object.keys(state.sessions);
          if (ids.length > 0 && !state.activeSessionId) {
            state.activeSessionId = ids[0];
          }
        }
        emit('state:snapshot', state);
        break;

      case 'session:new':
        ensureSession(sessionId);
        state.activeSessionId = sessionId;
        emit('session:new', { sessionId: sessionId });
        break;

      case 'session:end':
        if (state.sessions[sessionId]) {
          state.sessions[sessionId].metadata.status = 'ended';
          state.sessions[sessionId].metadata.endedAt = Date.now();
        }
        emit('session:end', { sessionId: sessionId });
        break;

      case 'response': {
        var s1 = ensureSession(sessionId);
        s1.responses.push({ id: msg.id, timestamp: msg.timestamp || Date.now(), content: msg.content, agentName: msg.agentName, raw: msg.raw });
        s1.session.responseCount++;
        if (s1.responses.length > 200) s1.responses.shift();
        emit('response', { sessionId: sessionId });
        updateFooterCounts();
        break;
      }

      case 'tool:start': {
        var s2 = ensureSession(sessionId);
        s2.toolCalls.push({ id: msg.id, toolName: msg.toolName, detail: msg.detail, startTime: msg.startTime || Date.now(), endTime: null, success: null });
        if (s2.toolCalls.length > 100) s2.toolCalls.shift();
        emit('tool:start', { sessionId: sessionId, toolName: msg.toolName });
        updateFooterCounts();
        break;
      }

      case 'tool:complete': {
        var s3 = ensureSession(sessionId);
        var tc = s3.toolCalls.find(function (t) { return t.id === msg.id; });
        if (tc) { tc.endTime = Date.now(); tc.success = msg.success !== false; }
        emit('tool:complete', { sessionId: sessionId, toolName: msg.toolName });
        updateFooterCounts();
        break;
      }

      case 'task:start': {
        var s4 = ensureSession(sessionId);
        s4.backgroundTasks.push({ id: msg.id, agentName: msg.agentName, description: msg.description, emoji: msg.emoji, startTime: msg.startTime, status: 'running' });
        s4.session.taskCount++;
        emit('task:start', { sessionId: sessionId });
        break;
      }

      case 'task:complete': {
        var s5 = ensureSession(sessionId);
        var task = s5.backgroundTasks.find(function (t) { return t.id === msg.id; });
        if (task) { task.status = msg.status || 'complete'; task.output = msg.output; task.endTime = Date.now(); }
        emit('task:complete', { sessionId: sessionId });
        break;
      }

      case 'thinking': {
        var s6 = ensureSession(sessionId);
        s6.thinking.push({ id: msg.id, content: msg.content, timestamp: msg.timestamp });
        if (s6.thinking.length > 50) s6.thinking.shift();
        emit('thinking', { sessionId: sessionId });
        break;
      }

      case 'thinking:delta': {
        var s7 = ensureSession(sessionId);
        var th = s7.thinking.find(function (t) { return t.id === msg.id; });
        if (th) th.content = (th.content || '') + (msg.deltaContent || '');
        emit('thinking:delta', { sessionId: sessionId });
        break;
      }

      case 'intent': {
        var s8 = ensureSession(sessionId);
        s8.session.currentIntent = msg.intent;
        emit('intent', { sessionId: sessionId, intent: msg.intent });
        break;
      }

      case 'session:idle': {
        var s9 = ensureSession(sessionId);
        s9.session.isIdle = true;
        emit('session:idle', { sessionId: sessionId });
        break;
      }

      case 'session:error': {
        var s10 = ensureSession(sessionId);
        s10.session.errorCount++;
        emit('session:error', { sessionId: sessionId, message: msg.message });
        updateFooterCounts();
        break;
      }

      case 'session:turn': {
        var s11 = ensureSession(sessionId);
        s11.session.turnCount++;
        s11.session.isIdle = false;
        emit('session:turn', { sessionId: sessionId });
        break;
      }
    }
  }

  window.AppState = {
    getState: getState,
    subscribe: subscribe,
    applyMessage: applyMessage,
    ensureSession: ensureSession,
    emit: emit
  };

  // ── WebSocket Connection ───────────────────────────────────

  var ws = null;
  var reconnectDelay = 1000;
  var MAX_DELAY = 30000;
  var pingTimer = null;

  function connectWS() {
    var port = new URLSearchParams(window.location.search).get('port') || 3850;
    try {
      ws = new WebSocket('ws://127.0.0.1:' + port);
    } catch (e) {
      scheduleReconnect();
      return;
    }

    ws.onopen = function () {
      reconnectDelay = 1000;
      updateConnectionBadge(true);
      ws.send(JSON.stringify({ type: 'request:state' }));
      pingTimer = setInterval(function () {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'pong') return;
        applyMessage(msg);
      } catch (e) { /* ignore */ }
    };

    ws.onclose = function () {
      updateConnectionBadge(false);
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      scheduleReconnect();
    };

    ws.onerror = function () {
      updateConnectionBadge(false);
    };
  }

  function scheduleReconnect() {
    setTimeout(function () {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
      connectWS();
    }, reconnectDelay);
  }

  function updateConnectionBadge(connected) {
    var badge = document.getElementById('connection-badge');
    if (!badge) return;
    badge.className = 'connection-badge ' + (connected ? 'badge-connected' : 'badge-disconnected');
    badge.querySelector('.conn-dot');
    badge.childNodes[badge.childNodes.length - 1].textContent = connected ? ' Connected' : ' Disconnected';
  }

  window.AppConnection = {
    _ws: null,
    send: function (msg) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }
  };

  // ── Dispatch Copilot Action ────────────────────────────────

  window.dispatchCopilotAction = function (prompt) {
    if (!prompt) return;
    if (window.SessionPicker && window.SessionPicker.isVisible && window.SessionPicker.isVisible()) return;

    var sessions = Object.keys(state.sessions).filter(function (id) {
      return state.sessions[id].metadata.status !== 'ended';
    });

    if (sessions.length === 0) {
      // No active sessions — show a message
      alert('No active Copilot CLI sessions. Start one in your terminal first.');
      return;
    }

    if (sessions.length === 1 || !window.SessionPicker) {
      // Single session — send directly
      var targetId = state.activeSessionId || sessions[0];
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'chat:send',
          sessionId: targetId,
          data: { message: prompt }
        }));
      }
      window.location.hash = '#/sessions';
      return;
    }

    // Multiple sessions — show picker
    window.SessionPicker.show(prompt);
  };

  // ── Footer Counts ──────────────────────────────────────────

  function updateFooterCounts() {
    var toolCount = 0, errorCount = 0;
    Object.values(state.sessions).forEach(function (s) {
      toolCount += s.toolCalls ? s.toolCalls.length : 0;
      errorCount += s.session ? s.session.errorCount : 0;
    });
    var toolEl = document.getElementById('tool-count');
    var errorEl = document.getElementById('error-count');
    if (toolEl) toolEl.textContent = toolCount;
    if (errorEl) errorEl.textContent = errorCount;
  }

  // ── Session Timer ──────────────────────────────────────────

  var startTime = Date.now();
  setInterval(function () {
    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    var h = Math.floor(elapsed / 3600);
    var m = Math.floor((elapsed % 3600) / 60);
    var s = elapsed % 60;
    var el = document.getElementById('session-timer');
    if (el) {
      el.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
  }, 1000);

  // ── Filter Controls ────────────────────────────────────────

  document.getElementById('filter-code')?.addEventListener('change', function (e) {
    state.ui.showCode = e.target.checked;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'filter:update', data: { showCode: state.ui.showCode } }));
    }
  });

  document.getElementById('filter-verbosity')?.addEventListener('change', function (e) {
    state.ui.verbosity = e.target.value;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'filter:update', data: { verbosity: state.ui.verbosity } }));
    }
  });

  // ── Nav Toggle ─────────────────────────────────────────────

  document.getElementById('nav-toggle')?.addEventListener('click', function () {
    var nav = document.getElementById('left-nav');
    if (nav) {
      nav.classList.toggle('nav-collapsed');
      nav.classList.toggle('nav-expanded');
    }
  });

  // ── Router Init ────────────────────────────────────────────

  var router = window.Router.createRouter({
    containerId: 'view-container',
    defaultRoute: 'home',
    views: {
      home: window.homeView || { mount: function (c) { c.innerHTML = '<div class="placeholder">Home loading…</div>'; } },
      sessions: window.sessionsView || { mount: function (c) { c.innerHTML = '<div class="placeholder">Sessions loading…</div>'; } },
      opportunities: window.opportunitiesView || { mount: function (c) { c.innerHTML = '<div class="placeholder"><h2>📋 Opportunities</h2><p>Loading…</p></div>'; } },
      accounts: { mount: function (c) { c.innerHTML = '<div class="placeholder"><h2>🏢 Accounts</h2><p>Coming in Phase 3 — priority account view.</p></div>'; } },
      skills: window.skillsView || { mount: function (c) { c.innerHTML = '<div class="placeholder">Skills loading…</div>'; } },
      settings: window.settingsView || { mount: function (c) { c.innerHTML = '<div class="placeholder">Settings loading…</div>'; } }
    }
  });

  router.start();
  connectWS();
})();
