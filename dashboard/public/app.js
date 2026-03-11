/* MSX Dashboard — Frontend application */

(function () {
  'use strict';

  // ───── Config ─────
  const WS_URL = `ws://${location.host}/ws`;
  const RECONNECT_DELAY = 2000;
  const MAX_RECONNECT = 10;

  // ───── DOM refs ─────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const chatMessages = $('#chat-messages');
  const chatInput = $('#chat-input');
  const sendBtn = $('#send-btn');
  const connDot = $('.connection-indicator .dot');
  const connLabel = $('.connection-indicator .label');
  const connWrap = $('.connection-indicator');
  const themeToggle = $('#theme-toggle');
  const expandToggle = $('#expand-toggle');
  const mainLayout = $('.main-layout');
  const dashboardTitle = $('#dashboard-title');
  const dashboardSubtitle = $('#dashboard-subtitle');
  const accountInput = $('#account-input');
  const accountList = $('#account-list');
  const meetingDate = $('#meeting-date');

  // ───── State ─────
  let ws = null;
  let reconnectAttempts = 0;
  let isBusy = false;

  // Agent arena state
  const arenaEl = $('#agent-arena');
  const arenaStage = $('#arena-stage');
  const arenaBall = $('#arena-ball');
  const arenaIntent = $('#arena-intent');
  const arenaProgressBar = $('#arena-progress-bar');
  const arenaToolLog = $('#arena-tool-log');
  let arenaStartTime = 0;
  let arenaTimer = null;
  let parallelBounceTimer = null; // random bounce between parallel active agents
  let activeTools = new Map();   // toolCallId → { tool, server }
  let currentHolder = null;      // which agent-slot data-agent currently has the ball

  // ───── WebSocket ─────
  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      reconnectAttempts = 0;
      setConnectionStatus(true);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleServerMessage(msg);
      } catch {
        console.error('Bad WS message:', evt.data);
      }
    };

    ws.onclose = () => {
      setConnectionStatus(false);
      if (reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => { /* onclose will fire */ };
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  function setConnectionStatus(online) {
    if (online) {
      connWrap.classList.add('connected');
      connLabel.textContent = 'Connected';
    } else {
      connWrap.classList.remove('connected');
      connLabel.textContent = 'Reconnecting…';
    }
  }

  // ───── Server message handling ─────
  function handleServerMessage(msg) {
    switch (msg.type) {
      case 'chunk':
        appendChunk(msg.text);
        break;
      case 'done':
        if (!streamingEl && msg.text) {
          addMessage('assistant', renderMarkdown(msg.text));
        } else {
          finishAssistantMessage();
        }
        // Show server-verified tool audit badge
        if (msg.toolAudit) {
          appendToolAuditBadge(msg.toolAudit);
        }
        setBusy(false);
        break;
      case 'error':
        addMessage('error', escapeHtml(msg.text || 'An error occurred.'));
        setBusy(false);
        break;
      case 'status':
        addMessage('status', msg.text);
        break;
      case 'intent':
        arenaSetIntent(msg.text);
        break;
      case 'tool-start':
        arenaToolStart(msg.toolCallId, msg.tool, msg.server);
        break;
      case 'tool-end':
        arenaToolEnd(msg.toolCallId, msg.tool, msg.server, msg.success);
        break;
      case 'tool-progress':
        arenaSetIntent(msg.message);
        break;
      case 'turn-start':
        arenaSetIntent('Processing...');
        break;
      case 'turn-end':
        break;
      default:
        console.warn('Unknown message type:', msg.type);
    }
  }

  // ───── Chat messages ─────
  let streamingEl = null;
  let streamBuffer = '';

  function appendChunk(text) {
    if (!streamingEl) {
      streamingEl = createMessageElement('assistant');
      chatMessages.appendChild(streamingEl);
      streamBuffer = '';
    }
    streamBuffer += text;
    const content = streamingEl.querySelector('.message-content');
    content.innerHTML = renderMarkdown(streamBuffer);
    scrollToBottom();
  }

  function finishAssistantMessage() {
    if (streamingEl) {
      const content = streamingEl.querySelector('.message-content');
      content.innerHTML = renderMarkdown(streamBuffer);
    }
    streamingEl = null;
    streamBuffer = '';
    setBusy(false);
    scrollToBottom();
  }

  function appendToolAuditBadge(audit) {
    const lastMsg = chatMessages.querySelector('.message.assistant:last-child');
    if (!lastMsg) return;
    const badge = document.createElement('div');
    badge.className = 'tool-audit-badge';
    if (audit.total === 0) {
      badge.classList.add('audit-warn');
      badge.innerHTML = '\u26a0\ufe0f <strong>No MCP tools called</strong> \u2014 response based on cached data only';
    } else {
      badge.classList.add('audit-ok');
      const servers = Object.entries(audit.byServer || {})
        .map(([s, n]) => `${s}: ${n}`)
        .join(', ');
      badge.innerHTML = `\u2705 <strong>${audit.total} tool calls</strong> (${servers})`;
    }
    lastMsg.appendChild(badge);
    scrollToBottom();
  }

  function addMessage(role, html, actionLabel) {
    const el = createMessageElement(role);
    const content = el.querySelector('.message-content');
    if (actionLabel) {
      content.innerHTML = `<span class="action-tag">${escapeHtml(actionLabel)}</span><br>` + html;
    } else {
      content.innerHTML = html;
    }
    chatMessages.appendChild(el);
    scrollToBottom();
    return el;
  }

  function createMessageElement(role) {
    const wrap = document.createElement('div');
    wrap.className = `message ${role}`;
    const content = document.createElement('div');
    content.className = 'message-content';
    wrap.appendChild(content);
    return wrap;
  }

  function scrollToBottom() {
    const container = $('.chat-container');
    container.scrollTop = container.scrollHeight;
  }

  // ───── Busy state ─────
  function setBusy(busy) {
    isBusy = busy;
    sendBtn.disabled = busy;
    if (stopBtn) stopBtn.classList.toggle('hidden', !busy);
    $$('.action-btn').forEach(btn => {
      if (!btn.dataset.action) return;
      btn.disabled = busy;
    });
    if (busy) {
      arenaShow();
    } else {
      arenaHide();
    }
  }

  // ───── Agent Arena ─────
  function arenaShow() {
    arenaEl.classList.remove('hidden', 'idle');
    arenaEl.classList.add('working');
    arenaStartTime = Date.now();
    arenaSetIntent('Starting...');
    arenaProgressBar.style.width = '0%';
    arenaToolLog.innerHTML = '';
    activeTools.clear();
    currentHolder = null;

    // Give ball to orchestrator initially
    arenaMoveBall('orchestrator');
    setAllAgentStates('inactive');
    setAgentState('orchestrator', 'active');

    // Animate progress bar (indeterminate: pulse width over time)
    clearInterval(arenaTimer);
    arenaTimer = setInterval(() => {
      const elapsed = (Date.now() - arenaStartTime) / 1000;
      // Logarithmic curve: fast at start, slows down, never reaches 100%
      const pct = Math.min(95, 30 * Math.log10(elapsed + 1));
      arenaProgressBar.style.width = pct + '%';
    }, 500);
  }

  function arenaHide() {
    arenaProgressBar.style.width = '100%';
    arenaSetIntent('Done!');
    clearInterval(arenaTimer);
    stopParallelBounce();
    setAllAgentStates('inactive');

    // Transition to idle state after a moment (animals sleep)
    setTimeout(() => {
      arenaEl.classList.remove('working');
      arenaEl.classList.add('idle');
      arenaSetIntent('');
    }, 1200);
  }

  // Show idle animals on startup
  function arenaShowIdle() {
    arenaEl.classList.remove('hidden', 'working');
    arenaEl.classList.add('idle');
    setAllAgentStates('inactive');
    arenaSetIntent('');
  }

  function arenaSetIntent(text) {
    if (!text) return;
    arenaIntent.textContent = text;
  }

  function arenaMoveBall(agentName) {
    const slot = arenaStage.querySelector(`[data-agent="${agentName}"]`);
    if (!slot) return;

    // Calculate position relative to stage (handles wrapped rows)
    const stageRect = arenaStage.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const left = slotRect.left - stageRect.left + slotRect.width / 2;
    const top = slotRect.top - stageRect.top - 28; // float above the avatar

    arenaBall.style.left = left + 'px';
    arenaBall.style.top = top + 'px';
    arenaBall.classList.add('bouncing');

    // During parallel mode, keep all active agents glowing — only do passing for single-tool
    if (activeTools.size <= 1) {
      if (currentHolder && currentHolder !== agentName) {
        setAgentState(currentHolder, 'passing');
        setTimeout(() => {
          if (currentHolder !== agentName) {
            setAgentState(currentHolder, 'waiting');
          }
        }, 400);
      }
    }

    currentHolder = agentName;
    setAgentState(agentName, 'active');
  }

  function arenaToolStart(toolCallId, toolName, serverName) {
    activeTools.set(toolCallId, { tool: toolName, server: serverName });

    // Move ball to the server's agent
    const agent = serverName || 'orchestrator';
    arenaMoveBall(agent);
    arenaSetIntent(`${friendlyToolName(toolName)}...`);

    // Add tool tag to log
    const tag = document.createElement('span');
    tag.className = 'tool-tag running';
    tag.id = `tool-${toolCallId}`;
    tag.textContent = `${serverIcon(serverName)} ${friendlyToolName(toolName)}`;
    arenaToolLog.appendChild(tag);
    arenaToolLog.scrollTop = arenaToolLog.scrollHeight;

    // Start random parallel bounce if multiple tools are active
    startParallelBounce();
  }

  function arenaToolEnd(toolCallId, toolName, serverName, success) {
    activeTools.delete(toolCallId);

    // Update tool tag
    const tag = document.getElementById(`tool-${toolCallId}`);
    if (tag) {
      tag.classList.remove('running');
      tag.classList.add(success ? 'done' : 'failed');
      tag.textContent = `${success ? '✓' : '✗'} ${friendlyToolName(toolName)}`;
    }

    // If no more active tools, ball goes back to orchestrator
    if (activeTools.size === 0) {
      stopParallelBounce();
      arenaMoveBall('orchestrator');
      arenaSetIntent('Thinking...');
    } else if (activeTools.size === 1) {
      // Only one tool left, stop random bouncing and stick to it
      stopParallelBounce();
      const next = activeTools.values().next().value;
      if (next) arenaMoveBall(next.server || 'orchestrator');
    }
    // If still multiple active tools, parallel bounce continues
  }

  function setAgentState(agentName, state) {
    const slot = arenaStage.querySelector(`[data-agent="${agentName}"]`);
    if (!slot) return;
    slot.classList.remove('active', 'passing', 'waiting', 'inactive');
    slot.classList.add(state);
  }

  function setAllAgentStates(state) {
    $$('.agent-slot').forEach(slot => {
      slot.classList.remove('active', 'passing', 'waiting', 'inactive');
      slot.classList.add(state);
    });
  }

  function friendlyToolName(name) {
    if (!name) return 'unknown';
    // Shorten common tool names
    return name
      .replace(/^msx_crm_/, '')
      .replace(/^outlook_/, '')
      .replace(/^teams_/, '')
      .replace(/_/g, ' ');
  }

  function serverIcon(server) {
    const icons = {
      'msx-crm': '🐘', 'outlook-local': '🦉', 'teams-local': '🐬',
      'calendar': '🐱', 'composer': '🐦', 'analyst': '🐼',
      'browser': '🐙', 'researcher': '🦝', 'sharepoint': '🐢',
      'strategy': '🦁', 'copilot': '🦊'
    };
    return icons[server] || '🦊';
  }

  // ───── Parallel bounce: ball randomly jumps between active agents ─────
  function startParallelBounce() {
    if (activeTools.size < 2 || parallelBounceTimer) return;
    // Mark all active tool agents as active (glowing)
    markAllActiveAgents();
    scheduleBounce();
  }

  function scheduleBounce() {
    // Random interval between 300-700ms for unpredictable bouncing
    const delay = 300 + Math.floor(Math.random() * 400);
    parallelBounceTimer = setTimeout(() => {
      if (activeTools.size < 2) { stopParallelBounce(); return; }
      const agents = [...new Set([...activeTools.values()].map(t => t.server || 'orchestrator'))];
      if (agents.length < 2) { scheduleBounce(); return; }
      // Pick a random agent that isn't the current holder
      let next;
      do {
        next = agents[Math.floor(Math.random() * agents.length)];
      } while (next === currentHolder && agents.length > 1);
      arenaMoveBall(next);
      // Update intent to show the tool running on that agent
      const toolOnAgent = [...activeTools.values()].find(t => (t.server || 'orchestrator') === next);
      if (toolOnAgent) arenaSetIntent(`${friendlyToolName(toolOnAgent.tool)}...`);
      // Keep all parallel agents visually active
      markAllActiveAgents();
      scheduleBounce();
    }, delay);
  }

  function markAllActiveAgents() {
    const activeAgentNames = [...new Set([...activeTools.values()].map(t => t.server || 'orchestrator'))];
    for (const name of activeAgentNames) {
      setAgentState(name, 'active');
    }
  }

  function stopParallelBounce() {
    clearTimeout(parallelBounceTimer);
    parallelBounceTimer = null;
  }

  // ───── Stop button ─────
  const stopBtn = $('#stop-btn');

  function stopGeneration() {
    if (!isBusy) return;
    send({ type: 'stop' });
    setBusy(false);
    addMessage('status', '⛔ Stopped by user');
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', stopGeneration);
  }

  // ───── Send chat ─────
  function sendChat() {
    const text = chatInput.value.trim();
    if (!text || isBusy) return;

    addMessage('user', escapeHtml(text));
    chatInput.value = '';
    chatInput.style.height = 'auto';
    setBusy(true);

    send({
      type: 'chat',
      payload: { message: text }
    });
  }

  // ───── Action handling ─────
  function handleAction(actionId, btn) {
    if (isBusy) return;

    const needs = btn.dataset.needs;
    const params = {};

    // Collect required inputs
    if (needs) {
      const parts = needs.split(',');
      for (const need of parts) {
        const n = need.trim();
        const input = $(`#${n}-input`);
        if (input) {
          const val = input.value.trim();
          if (!val) {
            input.focus();
            input.style.borderColor = 'var(--danger)';
            setTimeout(() => { input.style.borderColor = ''; }, 1500);
            return;
          }
          params[n] = val;
        }
      }
    }

    // Enrich account: override params based on mode
    if (actionId === 'enrich-account') {
      const mode = enrichMode ? enrichMode.value : 'selected';
      params.enrichMode = mode;
      if (mode === 'selected') {
        const val = accountInput.value.trim();
        if (!val) {
          accountInput.focus();
          accountInput.style.borderColor = 'var(--danger)';
          setTimeout(() => { accountInput.style.borderColor = ''; }, 1500);
          return;
        }
        params.account = val;
      } else if (mode === 'tpid') {
        const tpid = enrichTpidInput ? enrichTpidInput.value.trim() : '';
        if (!tpid) {
          if (enrichTpidInput) {
            enrichTpidInput.focus();
            enrichTpidInput.style.borderColor = 'var(--danger)';
            setTimeout(() => { enrichTpidInput.style.borderColor = ''; }, 1500);
          }
          return;
        }
        params.account = tpid;
      } else if (mode === 'all') {
        params.account = 'ALL';
      }
    }

    // Include meeting date if set
    if (meetingDate && meetingDate.value) {
      params.meetingDate = meetingDate.value;
    }

    // Include email filter if set
    const emailFilterInput = $('#email-filter-input');
    if (emailFilterInput && emailFilterInput.value.trim()) {
      params.emailFilter = emailFilterInput.value.trim();
    }

    // Show user action as a message
    const textSpan = btn.querySelector('span:not(.icon)');
    const label = textSpan ? textSpan.textContent.trim() : actionId;
    let desc = label;
    if (params.account) desc += ` — ${params.account}`;
    if (params.meeting) desc += ` — ${params.meeting}`;
    if (params.meetingDate) desc += ` (${params.meetingDate})`;
    if (params.person) desc += ` — ${params.person}`;
    const actionLabel = actionId.replace(/-/g, ' ');
    addMessage('user', escapeHtml(desc), actionLabel);

    setBusy(true);

    send({
      type: 'action',
      payload: { action: actionId, params }
    });
  }

  // ───── Dynamic title ─────
  function updateDashboardContext(account) {
    if (account) {
      dashboardSubtitle.textContent = account;
    }
  }

  // ───── Reset session ─────
  function resetSession() {
    send({ type: 'reset' });
    chatMessages.innerHTML = '';
    addMessage('system',
      `<p><strong>MSX Dashboard</strong></p>` +
      `<p>AccountTracker agent ready. Use the <strong>Quick Actions</strong> panel on the left, or type a message below to start a conversation.</p>` +
      `<p class="hint">Press Enter to send, Shift+Enter for new line.</p>`
    );
    setBusy(false);
    streamingEl = null;
    streamBuffer = '';
    dashboardSubtitle.textContent = '';
  }

  // ───── Theme toggle ─────
  function getTheme() {
    return localStorage.getItem('msx-theme') || 'dark';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('msx-theme', theme);
  }

  // Init theme from localStorage
  setTheme(getTheme());

  themeToggle.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });

  // ───── Expand / Focus Mode ─────
  expandToggle.addEventListener('click', () => {
    const expanded = mainLayout.classList.toggle('expanded');
    document.body.classList.toggle('expanded', expanded);
    expandToggle.title = expanded ? 'Collapse chat (show sidebar)' : 'Expand chat (hide sidebar)';
    localStorage.setItem('msx-expanded', expanded ? '1' : '');
  });
  // Restore expanded state
  if (localStorage.getItem('msx-expanded') === '1') {
    mainLayout.classList.add('expanded');
    document.body.classList.add('expanded');
    expandToggle.title = 'Collapse chat (show sidebar)';
  }

  // ───── Account dropdown population ─────
  async function loadAccounts() {
    try {
      const resp = await fetch('/api/accounts');
      if (!resp.ok) return;
      const accounts = await resp.json();
      accountList.innerHTML = '';
      accounts.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.name;
        if (a.tpid) opt.label = `${a.name} (TPID: ${a.tpid})`;
        accountList.appendChild(opt);
      });
    } catch { /* server may not be ready yet */ }
  }
  loadAccounts();

  // ───── Markdown rendering (simple) ─────
  function renderMarkdown(text) {
    if (!text) return '';

    let html = escapeHtml(text);

    // Code blocks ``` ... ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      return `<pre><code>${code}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');

    // Unordered lists (basic)
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Tables (basic pipe tables)
    html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_m, header, _sep, body) => {
      const thCells = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>`;
    });

    // Paragraphs (double newline)
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    // Fix block elements inside <p>
    html = html.replace(/<p>(<(?:h[2-4]|pre|ul|ol|table|hr)[^>]*>)/g, '$1');
    html = html.replace(/(<\/(?:h[2-4]|pre|ul|ol|table|hr)>)<\/p>/g, '$1');

    // Single newlines → <br>
    html = html.replace(/\n/g, '<br>');

    // Detect .excalidraw file references and add "View Drawing" buttons
    html = html.replace(/([A-Za-z0-9_-]+\.excalidraw)/g, (_m, filename) => {
      return `<button class="view-drawing-btn" data-drawing="${escapeHtml(filename)}" onclick="event.stopPropagation()">📁 ${escapeHtml(filename.replace('.excalidraw', ''))}</button>`;
    });

    return html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ───── Event Listeners ─────

  // Send button
  sendBtn.addEventListener('click', sendChat);

  // Keyboard: Enter to send, Shift+Enter for newline
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
  });

  // Sidebar action buttons
  $$('.action-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      // Update dashboard context when account-scoped action is used
      if (btn.dataset.needs && btn.dataset.needs.includes('account') && accountInput.value.trim()) {
        updateDashboardContext(accountInput.value.trim());
      }
      handleAction(action, btn);
    });
  });

  // Enrich account mode toggle
  const enrichMode = $('#enrich-mode');
  const enrichTpidInput = $('#enrich-tpid-input');
  if (enrichMode && enrichTpidInput) {
    enrichMode.addEventListener('change', () => {
      enrichTpidInput.classList.toggle('hidden', enrichMode.value !== 'tpid');
    });
  }

  // Reset
  const resetBtn = $('[data-action="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSession);
  }

  // ───── Quick CRM (direct, fast, no LLM) ─────
  const crmSearchInput = $('#crm-search-input');
  const crmStatusLine = $('#crm-status-line');

  function setCrmStatus(text, type) {
    if (!crmStatusLine) return;
    crmStatusLine.textContent = text;
    crmStatusLine.className = 'crm-status-line' + (type ? ' ' + type : '');
  }

  async function crmApiFetch(url) {
    const startTime = performance.now();
    const resp = await fetch(url);
    const elapsed = Math.round(performance.now() - startTime);
    const data = await resp.json();
    return { data, elapsed };
  }

  async function crmApiPost(url, body) {
    const startTime = performance.now();
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const elapsed = Math.round(performance.now() - startTime);
    const data = await resp.json();
    return { data, elapsed };
  }

  function statusClass(status) {
    const map = {
      'On Track': 'status-on-track',
      'At Risk': 'status-at-risk',
      'Blocked': 'status-blocked',
      'Completed': 'status-completed',
      'Not Started': 'status-not-started',
      'Cancelled': 'status-completed'
    };
    return map[status] || '';
  }

  function commitmentClass(commitment) {
    const map = {
      'Committed': 'commitment-committed',
      'Uncommitted': 'commitment-uncommitted',
      'De-committed': 'commitment-de-committed'
    };
    return map[commitment] || '';
  }

  function shortDate(iso) {
    if (!iso) return '—';
    return iso.substring(0, 10);
  }

  function truncate(str, max) {
    if (!str) return '—';
    return str.length > max ? str.substring(0, max) + '…' : str;
  }

  const CRM_BASE = 'https://microsoftsales.crm.dynamics.com';
  const MILESTONE_FIELDS = 'msp_engagementmilestoneid,msp_milestonenumber,msp_name,_msp_workloadlkid_value,msp_commitmentrecommendation,msp_milestonecategory,msp_monthlyuse,msp_milestonedate,msp_milestonestatus,_ownerid_value,_msp_opportunityid_value,msp_forecastcomments';

  function crmLink(type, id, label) {
    if (!id) return escapeHtml(label || '—');
    let url;
    switch (type) {
      case 'milestone':
        url = `${CRM_BASE}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=msp_engagementmilestone&id=${id}`;
        break;
      case 'opportunity':
        url = `${CRM_BASE}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=opportunity&id=${id}`;
        break;
      case 'account':
        url = `${CRM_BASE}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=account&id=${id}`;
        break;
      default:
        return escapeHtml(label || id);
    }
    return `<a href="${url}" target="_blank" class="crm-link" title="Open in CRM: ${escapeHtml(id)}">${escapeHtml(label || id.substring(0, 8) + '…')}</a>`;
  }

  function renderAccountsTable(accounts) {
    if (!accounts || accounts.length === 0) return '<div class="crm-empty">No accounts found</div>';
    let html = '<table class="crm-table"><thead><tr><th class="sortable">Name <span class="sort-arrow">⇅</span></th><th>TPID</th><th class="sortable">Segment <span class="sort-arrow">⇅</span></th><th>Actions</th></tr></thead><tbody>';
    for (const a of accounts) {
      html += `<tr>
        <td><span class="crm-editable" data-acct-id="${escapeHtml(a.id)}" data-acct-name="${escapeHtml(a.name || '')}" title="Click for actions">${escapeHtml(truncate(a.name, 40))}</span></td>
        <td>${escapeHtml(a.tpid || '—')}</td>
        <td>${escapeHtml(a.segment || '—')}</td>
        <td><button class="crm-expand-btn" data-acct-id="${escapeHtml(a.id)}" data-acct-name="${escapeHtml(a.name || '')}" title="Click for actions">⋯</button></td>
      </tr>`;
    }
    html += '</tbody></table>';
    return html;
  }

  function renderOpportunitiesTable(opps) {
    if (!opps || opps.length === 0) return '<div class="crm-empty">No opportunities found</div>';
    let html = '<table class="crm-table"><thead><tr><th class="sortable">Account <span class="sort-arrow">⇅</span></th><th>Name</th><th>Number</th><th class="sortable">Owner <span class="sort-arrow">⇅</span></th><th class="sortable">Close Date <span class="sort-arrow">⇅</span></th><th>Sales Play</th><th>Actions</th></tr></thead><tbody>';
    for (const o of opps) {
      html += `<tr>
        <td>${escapeHtml(truncate(o.account, 25))}</td>
        <td title="${escapeHtml(o.name || '')}"><span class="crm-editable" data-opp-id="${escapeHtml(o.id)}" data-opp-name="${escapeHtml(o.name || '')}" title="Click for actions">${escapeHtml(truncate(o.name, 30))}</span></td>
        <td>${escapeHtml(o.number || '—')}</td>
        <td>${escapeHtml(truncate(o.owner, 18))}</td>
        <td>${shortDate(o.closeDate)}</td>
        <td>${escapeHtml(truncate(o.salesPlay, 18))}</td>
        <td><button class="crm-expand-btn" data-opp-id="${escapeHtml(o.id)}" data-opp-name="${escapeHtml(o.name || '')}" title="Click for actions">⋯</button></td>
      </tr>`;
    }
    html += '</tbody></table>';
    return html;
  }

  function renderMilestonesTable(milestones) {
    if (!milestones || milestones.length === 0) return '<div class="crm-empty">No milestones found</div>';
    // Status filter pills
    const statuses = [...new Set(milestones.map(m => m.status).filter(Boolean))];
    let html = '<div class="crm-filter-pills">';
    html += '<span class="crm-filter-pill active" data-status="all">All</span>';
    for (const s of statuses) {
      const pillClass = s === 'On Track' ? 'pill-on-track' : s === 'At Risk' ? 'pill-at-risk' : s === 'Blocked' ? 'pill-blocked' : '';
      html += `<span class="crm-filter-pill ${pillClass}" data-status="${escapeHtml(s)}">${escapeHtml(s)}</span>`;
    }
    html += '</div>';
    html += '<table class="crm-table"><thead><tr><th>Opp/Account</th><th>Number</th><th class="sortable">Name <span class="sort-arrow">⇅</span></th><th class="sortable">Date <span class="sort-arrow">⇅</span></th><th class="sortable">Status <span class="sort-arrow">⇅</span></th><th>Commitment</th><th class="sortable">Owner <span class="sort-arrow">⇅</span></th><th>Actions</th></tr></thead><tbody>';
    for (const m of milestones) {
      html += `<tr>
        <td>${escapeHtml(truncate(m.opportunity || m.account || '—', 22))}</td>
        <td><span class="crm-editable" data-ms-id="${escapeHtml(m.id)}" data-ms-num="${escapeHtml(m.number || '')}" data-ms-name="${escapeHtml(m.name || '')}" title="Click for actions">${escapeHtml(m.number || '—')}</span></td>
        <td title="${escapeHtml(m.name || '')}">${escapeHtml(truncate(m.name, 28))}</td>
        <td>${shortDate(m.date)}</td>
        <td class="${statusClass(m.status)}" data-ms-status="${escapeHtml(m.status || '')}">${escapeHtml(m.status || '—')}</td>
        <td class="${commitmentClass(m.commitment)}">${escapeHtml(m.commitment || '—')}</td>
        <td>${escapeHtml(truncate(m.owner, 16))}</td>
        <td><button class="crm-expand-btn" data-ms-id="${escapeHtml(m.id)}" title="Actions">▸</button></td>
      </tr>`;
    }
    html += '</tbody></table>';
    return html;
  }

  function renderCrmResults(title, sections, elapsed) {
    let html = `<div class="crm-results">
      <div class="crm-results-header">
        <h3>⚡ ${escapeHtml(title)}</h3>
        <span class="crm-results-timing">${elapsed}ms</span>
      </div>`;
    for (const section of sections) {
      const count = section.count || 0;
      html += `<div class="crm-section">
        <h4>${escapeHtml(section.label)} <span class="crm-results-badge">${count}</span></h4>
        ${section.html}
      </div>`;
    }
    html += '</div>';
    return html;
  }

  async function handleCrmAction(action, extraArg) {
    const query = extraArg || (crmSearchInput ? crmSearchInput.value.trim() : '');
    const ownerInput = $('#crm-owner-input');
    const ownerEmail = ownerInput ? ownerInput.value.trim() : '';

    // Auto-redirect: if main search is empty but owner email is filled, route to owner-milestones
    if (action !== 'my-milestones' && action !== 'owner-milestones' && !query && ownerEmail) {
      if (/^[a-zA-Z0-9._%+-]+@microsoft\.com$/i.test(ownerEmail)) {
        action = 'owner-milestones';
      }
    }

    if (action === 'owner-milestones') {
      // Validate email format
      if (!ownerEmail || !/^[a-zA-Z0-9._%+-]+@microsoft\.com$/i.test(ownerEmail)) {
        if (ownerInput) {
          ownerInput.focus();
          ownerInput.style.borderColor = 'var(--danger)';
          setTimeout(() => { ownerInput.style.borderColor = ''; }, 2000);
        }
        addMessage('error', 'Please enter a valid Microsoft email (e.g. <strong>name@microsoft.com</strong>)');
        return;
      }
    } else if (action !== 'my-milestones' && action !== 'pipeline-health' && action !== 'milestones-by-opp' && !query) {
      if (crmSearchInput) {
        crmSearchInput.focus();
        crmSearchInput.style.borderColor = 'var(--danger)';
        setTimeout(() => { crmSearchInput.style.borderColor = ''; }, 1500);
      }
      return;
    }

    setCrmStatus('Querying CRM...', 'loading');
    setCrmDirectBusy(true, action === 'drill' ? `Smart Lookup: ${query}...` : `CRM Query: ${action}...`);

    try {
      let result, elapsed, title, sections;

      switch (action) {
        case 'drill': {
          const r = await crmApiFetch(`/api/crm/drill?q=${encodeURIComponent(query)}`);
          result = r.data; elapsed = r.elapsed;
          if (!result.ok) throw new Error(result.error || 'CRM query failed');
          const d = result.data;
          title = `Smart Lookup: ${query}`;
          sections = [
            { label: 'Accounts', count: d.accounts.length, html: renderAccountsTable(d.accounts) },
            { label: 'Opportunities', count: d.opportunities.length, html: renderOpportunitiesTable(d.opportunities) },
            { label: 'Active Milestones', count: d.milestones.length, html: renderMilestonesTable(d.milestones) }
          ];
          break;
        }

        case 'accounts': {
          const r = await crmApiFetch(`/api/crm/accounts?q=${encodeURIComponent(query)}`);
          result = r.data; elapsed = r.elapsed;
          if (!result.ok) throw new Error(result.error || 'CRM query failed');
          const accounts = (result.data?.value || []).map(a => ({
            id: a.accountid, name: a.name, tpid: a.msp_mstopparentid,
            segment: a['msp_segmentgroup@OData.Community.Display.V1.FormattedValue'] || ''
          }));
          title = `Accounts: ${query}`;
          sections = [{ label: 'Accounts', count: accounts.length, html: renderAccountsTable(accounts) }];
          break;
        }

        case 'opportunities': {
          const r = await crmApiFetch(`/api/crm/opportunities?q=${encodeURIComponent(query)}`);
          result = r.data; elapsed = r.elapsed;
          if (!result.ok) throw new Error(result.error || 'CRM query failed');
          const raw = result.data?.value ? result.data.value : (result.data ? [result.data] : []);
          const opps = raw.map(o => ({
            id: o.opportunityid, name: o.name, number: o.msp_opportunitynumber || '',
            closeDate: o.estimatedclosedate || o.msp_estcompletiondate || '',
            owner: o['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
            account: o['_parentaccountid_value@OData.Community.Display.V1.FormattedValue'] || '',
            salesPlay: o['msp_salesplay@OData.Community.Display.V1.FormattedValue'] || ''
          }));
          title = `Opportunities: ${query}`;
          sections = [{ label: 'Opportunities', count: opps.length, html: renderOpportunitiesTable(opps) }];
          break;
        }

        case 'milestones': {
          const r = await crmApiFetch(`/api/crm/milestones?q=${encodeURIComponent(query)}`);
          result = r.data; elapsed = r.elapsed;
          if (!result.ok) throw new Error(result.error || 'CRM query failed');
          const raw = result.data?.value ? result.data.value : (result.data ? [result.data] : []);
          const milestones = raw.map(m => ({
            id: m.msp_engagementmilestoneid, number: m.msp_milestonenumber || '', name: m.msp_name || '',
            date: m.msp_milestonedate || '',
            status: m['msp_milestonestatus@OData.Community.Display.V1.FormattedValue'] || String(m.msp_milestonestatus || ''),
            commitment: m['msp_commitmentrecommendation@OData.Community.Display.V1.FormattedValue'] || '',
            owner: m['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
            workload: m['_msp_workloadlkid_value@OData.Community.Display.V1.FormattedValue'] || ''
          }));
          title = `Milestones: ${query}`;
          sections = [{ label: 'Milestones', count: milestones.length, html: renderMilestonesTable(milestones) }];
          break;
        }

        case 'my-milestones': {
          // First get current user ID
          const whoami = await crmApiFetch('/api/crm/whoami');
          if (!whoami.data.ok) throw new Error(whoami.data.error || 'WhoAmI failed');
          const userId = whoami.data.data.UserId;
          const r = await crmApiFetch(`/api/crm/milestones?ownerId=${encodeURIComponent(userId)}`);
          result = r.data; elapsed = r.elapsed + whoami.elapsed;
          if (!result.ok) throw new Error(result.error || 'CRM query failed');
          const milestones = (result.data?.value || []).map(m => ({
            id: m.msp_engagementmilestoneid, number: m.msp_milestonenumber || '', name: m.msp_name || '',
            date: m.msp_milestonedate || '',
            status: m['msp_milestonestatus@OData.Community.Display.V1.FormattedValue'] || String(m.msp_milestonestatus || ''),
            commitment: m['msp_commitmentrecommendation@OData.Community.Display.V1.FormattedValue'] || '',
            owner: m['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
            workload: m['_msp_workloadlkid_value@OData.Community.Display.V1.FormattedValue'] || ''
          }));
          title = 'My Active Milestones';
          sections = [{ label: 'Milestones', count: milestones.length, html: renderMilestonesTable(milestones) }];
          break;
        }

        case 'pipeline-health': {
          // Get current user's at-risk and blocked milestones
          const whoami2 = await crmApiFetch('/api/crm/whoami');
          if (!whoami2.data.ok) throw new Error(whoami2.data.error || 'WhoAmI failed');
          const userId2 = whoami2.data.data.UserId;
          // Fetch at-risk (861980001) and blocked (861980002) milestones in parallel
          const [atRiskR, blockedR] = await Promise.all([
            crmApiPost('/api/crm/query', {
              entitySet: 'msp_engagementmilestones',
              filter: `_ownerid_value eq '${userId2}' and msp_milestonestatus eq 861980001`,
              select: MILESTONE_FIELDS,
              orderby: 'msp_milestonedate asc',
              top: 50
            }),
            crmApiPost('/api/crm/query', {
              entitySet: 'msp_engagementmilestones',
              filter: `_ownerid_value eq '${userId2}' and msp_milestonestatus eq 861980002`,
              select: MILESTONE_FIELDS,
              orderby: 'msp_milestonedate asc',
              top: 50
            })
          ]);
          elapsed = whoami2.elapsed + Math.max(atRiskR.elapsed, blockedR.elapsed);
          const mapMs = (raw) => (raw.data?.ok !== false && raw.data?.data?.value || []).map(m => ({
            id: m.msp_engagementmilestoneid, number: m.msp_milestonenumber || '', name: m.msp_name || '',
            date: m.msp_milestonedate || '',
            status: m['msp_milestonestatus@OData.Community.Display.V1.FormattedValue'] || 'At Risk',
            commitment: m['msp_commitmentrecommendation@OData.Community.Display.V1.FormattedValue'] || '',
            owner: m['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
            workload: m['_msp_workloadlkid_value@OData.Community.Display.V1.FormattedValue'] || '',
            opportunity: m['_msp_opportunityid_value@OData.Community.Display.V1.FormattedValue'] || ''
          }));
          const riskMs = mapMs(atRiskR);
          const blockMs = mapMs(blockedR);
          const allHealth = [...riskMs, ...blockMs];
          title = 'Pipeline Health Check';
          sections = [{ label: 'At Risk & Blocked Milestones', count: allHealth.length, html: renderMilestonesTable(allHealth) }];
          break;
        }

        case 'owner-milestones': {
          // Search for the user by email, then get their milestones AND opportunities
          const userResult = await crmApiPost('/api/crm/query', {
            entitySet: 'systemusers',
            filter: `internalemailaddress eq '${ownerEmail}'`,
            select: 'systemuserid,fullname,internalemailaddress',
            top: 1
          });
          if (!userResult.data.ok) throw new Error(userResult.data.error || 'User lookup failed');
          const users = userResult.data.data?.value || [];
          if (users.length === 0) throw new Error(`No CRM user found with email: ${ownerEmail}`);
          const targetUserId = users[0].systemuserid;
          const targetName = users[0].fullname || ownerEmail;

          // Fetch milestones and opportunities in parallel
          const [msR, oppR] = await Promise.all([
            crmApiFetch(`/api/crm/milestones?ownerId=${encodeURIComponent(targetUserId)}`),
            crmApiFetch(`/api/crm/opportunities?q=${encodeURIComponent(targetUserId)}`)
          ]);
          // Also check deal team membership
          const dealTeamR = await crmApiPost('/api/crm/query', {
            entitySet: 'msp_dealteams',
            filter: `_msp_dealteamuserid_value eq '${targetUserId}' and statecode eq 0`,
            select: '_msp_parentopportunityid_value',
            top: 50
          });

          elapsed = msR.elapsed + oppR.elapsed + userResult.elapsed;

          // Milestones
          const ownerMilestones = (msR.data.ok && msR.data.data?.value || []).map(m => ({
            id: m.msp_engagementmilestoneid, number: m.msp_milestonenumber || '', name: m.msp_name || '',
            date: m.msp_milestonedate || '',
            status: m['msp_milestonestatus@OData.Community.Display.V1.FormattedValue'] || String(m.msp_milestonestatus || ''),
            commitment: m['msp_commitmentrecommendation@OData.Community.Display.V1.FormattedValue'] || '',
            owner: m['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
            workload: m['_msp_workloadlkid_value@OData.Community.Display.V1.FormattedValue'] || '',
            opportunity: m['_msp_opportunityid_value@OData.Community.Display.V1.FormattedValue'] || ''
          }));

          // Owned opportunities
          const ownedOpps = (oppR.data.ok && oppR.data.data?.value || []).map(o => ({
            id: o.opportunityid, name: o.name, number: o.msp_opportunitynumber || '',
            closeDate: o.estimatedclosedate || '', owner: o['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
            account: o['_parentaccountid_value@OData.Community.Display.V1.FormattedValue'] || '',
            salesPlay: o['msp_salesplay@OData.Community.Display.V1.FormattedValue'] || ''
          }));

          // Deal team opportunities (fetch details for opp IDs not already in owned list)
          const dealTeamOppIds = (dealTeamR.data.ok && dealTeamR.data.data?.value || [])
            .map(d => d._msp_parentopportunityid_value)
            .filter(id => id && !ownedOpps.some(o => o.id === id));
          let dealOpps = [];
          if (dealTeamOppIds.length > 0) {
            for (let i = 0; i < dealTeamOppIds.length; i += 10) {
              const chunk = dealTeamOppIds.slice(i, i + 10);
              const filter = chunk.map(id => `opportunityid eq '${id}'`).join(' or ');
              const dtR = await crmApiPost('/api/crm/query', {
                entitySet: 'opportunities',
                filter: filter,
                select: 'opportunityid,name,msp_opportunitynumber,estimatedclosedate,_ownerid_value,_parentaccountid_value,msp_salesplay',
                top: 50
              });
              if (dtR.data.ok && dtR.data.data?.value) {
                dealOpps.push(...dtR.data.data.value.map(o => ({
                  id: o.opportunityid, name: o.name, number: o.msp_opportunitynumber || '',
                  closeDate: o.estimatedclosedate || '', owner: o['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
                  account: o['_parentaccountid_value@OData.Community.Display.V1.FormattedValue'] || '',
                  salesPlay: o['msp_salesplay@OData.Community.Display.V1.FormattedValue'] || ''
                })));
              }
            }
          }
          const allOpps = [...ownedOpps, ...dealOpps];

          title = `${targetName} — CRM Overview`;
          sections = [
            { label: 'Active Milestones', count: ownerMilestones.length, html: renderMilestonesTable(ownerMilestones) },
            { label: 'Opportunities (owned + deal team)', count: allOpps.length, html: renderOpportunitiesTable(allOpps) }
          ];
          break;
        }

        default:
          if (action === 'milestones-by-opp') {
            await handleMilestonesByOpp(query);
            return;
          }
          throw new Error(`Unknown CRM action: ${action}`);
      }

      setCrmStatus(`Done in ${elapsed}ms`, '');
      setCrmDirectBusy(false);

      // Check if all sections are empty
      const totalCount = sections.reduce((sum, s) => sum + (s.count || 0), 0);
      if (totalCount === 0) {
        addMessage('assistant', renderCrmResults(title, [
          { label: 'No Results', count: 0, html: `<div class="crm-empty">Nothing found for <strong>${escapeHtml(query || 'your query')}</strong>. Check your input — you can enter an account name, TPID, opportunity number (7-xxx), milestone number, or GUID.</div>` }
        ], elapsed));
      } else {
        addMessage('assistant', renderCrmResults(title, sections, elapsed));
      }

    } catch (err) {
      setCrmDirectBusy(false);
      setCrmStatus(err.message, 'error');
      addMessage('error', escapeHtml(`CRM Error: ${err.message}`));
    }
  }

  // Quick CRM button handlers
  $$('[data-crm-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      handleCrmAction(btn.dataset.crmAction);
    });
  });

  // Enter key on CRM search input → smart auto-detect
  if (crmSearchInput) {
    crmSearchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const val = crmSearchInput.value.trim();
      if (!val) return;
      // Always use drill-down — it auto-detects input type (opp#, milestone#, GUID, TPID, name)
      handleCrmAction('drill');
    });
  }

  // ───── Collapsible CRM panels ─────
  $$('.crm-section-toggle').forEach(toggle => {
    const targetId = toggle.dataset.target;
    const panel = document.getElementById(targetId);
    if (!panel) return;
    // CRM-Direct starts expanded, CRM-MCP starts collapsed
    if (!panel.classList.contains('collapsed')) {
      toggle.classList.add('expanded');
    }
    toggle.addEventListener('click', () => {
      const isExpanded = toggle.classList.toggle('expanded');
      panel.classList.toggle('collapsed', !isExpanded);
    });
  });

  // ───── CRM-MCP prompt injection handlers ─────
  const MCP_PROMPTS = {
    'milestones-needing-tasks': () => {
      const q = crmSearchInput ? crmSearchInput.value.trim() : '';
      return q
        ? `Use find_milestones_needing_tasks with customerKeywords: ["${q}"]. Show all milestones that have no tasks in a table.`
        : 'Use find_milestones_needing_tasks for all my tracked accounts. Show milestones that have no tasks.';
    },
    'create-milestone': () => {
      const q = crmSearchInput ? crmSearchInput.value.trim() : '';
      return q
        ? `Help me create a new engagement milestone for "${q}". Ask me for the milestone name, category, and date.`
        : 'Help me create a new engagement milestone. Ask me which opportunity to create it on.';
    },
    'consumption-trend': () => {
      const q = crmSearchInput ? crmSearchInput.value.trim() : '';
      return q
        ? `Show the monthly consumption trend for opportunity/account "${q}" using view_opportunity_cost_trend.`
        : 'Show the consumption trend for an opportunity. Which account or opportunity should I look up?';
    },
    'milestone-timeline': () => {
      const q = crmSearchInput ? crmSearchInput.value.trim() : '';
      return q
        ? `Show a milestone timeline for "${q}" using view_milestone_timeline.`
        : 'Show a milestone timeline. Which account should I look up?';
    },
    'github-stack': () => {
      const q = crmSearchInput ? crmSearchInput.value.trim() : '';
      return q
        ? `Get the GitHub Stack Summary for "${q}". First try get_github_stack_summary (checks cache). If stale or unavailable, use the powerbi-remote MCP to run a DAX SELECTCOLUMNS query against the MSXI Dim_Metrics table (semantic model a0239518-1109-45a3-a3eb-1872dc10ac15) with Dim_Calendar[RelativeFM] = -1. Show GHCP seats, attach rates, ACR data, and seat breakdown.`
        : 'Get a GitHub Stack Summary. Which customer TPID or name should I look up?';
    },
    'pending-approvals': () => 'List all pending CRM write operations using list_pending_operations. Show them in a table with operation ID, type, entity, and timestamp.'
  };

  $$('[data-mcp-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.mcpAction;
      const promptFn = MCP_PROMPTS[action];
      if (!promptFn) return;
      const prompt = promptFn();
      // Inject into chat input and auto-send
      if (chatInput) {
        chatInput.value = prompt;
        chatInput.focus();
        // Auto-send
        addMessage('user', escapeHtml(prompt));
        send({ type: 'chat', payload: { message: prompt } });
        chatInput.value = '';
        setBusy(true);
      }
    });
  });

  // ───── CRM Context Menu ─────
  let activeContextMenu = null;
  let ctxActions = [];

  function showContextMenu(x, y, items, header) {
    dismissContextMenu();
    ctxActions = [];
    const menu = document.createElement('div');
    menu.className = 'crm-context-menu';
    if (header) {
      menu.innerHTML = `<div class="ctx-header">${escapeHtml(header)}</div>`;
    }
    for (const item of items) {
      if (item.sep) {
        menu.innerHTML += '<div class="ctx-sep"></div>';
        continue;
      }
      const idx = ctxActions.length;
      ctxActions.push(item.action);
      const el = document.createElement('div');
      el.className = 'ctx-item';
      el.dataset.ctxIdx = String(idx);
      el.innerHTML = `<span class="ctx-icon">${item.icon || ''}</span><span>${escapeHtml(item.label)}</span>`;
      menu.appendChild(el);
    }
    // Position: keep within viewport
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 8;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    activeContextMenu = menu;
  }

  // Global click handler for context menu actions + dismiss
  document.addEventListener('click', (e) => {
    if (!activeContextMenu) return;
    const ctxItem = e.target.closest('[data-ctx-idx]');
    if (ctxItem && activeContextMenu.contains(ctxItem)) {
      e.stopPropagation();
      const idx = parseInt(ctxItem.dataset.ctxIdx, 10);
      const fn = ctxActions[idx];
      dismissContextMenu();
      if (fn) { try { fn(); } catch (err) { console.error('[ctx] action error:', err); } }
      return;
    }
    // Outside click — dismiss
    if (!activeContextMenu.contains(e.target)) {
      dismissContextMenu();
    }
  });

  function dismissContextMenu() {
    if (activeContextMenu) {
      activeContextMenu.remove();
      activeContextMenu = null;
    }
  }

  // ───── Inline save toast ─────
  function showSaveToast(message, isError) {
    const existing = document.querySelector('.crm-save-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `crm-save-toast ${isError ? 'error' : 'success'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), isError ? 5000 : 2500);
  }

  // ───── CRM-Direct progress indicator ─────
  function setCrmDirectBusy(busy, text) {
    if (busy) {
      arenaEl.classList.remove('hidden', 'idle');
      arenaEl.classList.add('working', 'direct-mode');
      arenaStartTime = Date.now();
      arenaSetIntent(text || 'Querying CRM...');
      arenaProgressBar.style.width = '0%';
      arenaToolLog.innerHTML = '';
      clearInterval(arenaTimer);
      arenaTimer = setInterval(() => {
        const elapsed = (Date.now() - arenaStartTime) / 1000;
        const pct = Math.min(95, 30 * Math.log10(elapsed + 1));
        arenaProgressBar.style.width = pct + '%';
      }, 200);
    } else {
      arenaProgressBar.style.width = '100%';
      arenaSetIntent('Done!');
      clearInterval(arenaTimer);
      setTimeout(() => {
        arenaEl.classList.remove('working', 'direct-mode');
        arenaEl.classList.add('idle');
        arenaSetIntent('');
      }, 800);
    }
  }

  // ───── Join Deal Team via CRM-Direct ─────
  async function joinDealTeam(opportunityId) {
    console.log('[dealteam] start, oppId:', opportunityId);
    setCrmDirectBusy(true, 'Joining deal team...');
    try {
      const whoami = await crmApiFetch('/api/crm/whoami');
      console.log('[dealteam] whoami ok:', whoami.data?.ok);
      if (!whoami.data.ok) throw new Error(whoami.data.error || 'WhoAmI failed');
      const userId = whoami.data.data.UserId;
      console.log('[dealteam] userId:', userId);
      const resp = await fetch('/api/crm/dealteam/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, opportunityId })
      });
      const data = await resp.json();
      setCrmDirectBusy(false);
      if (data.ok) {
        showSaveToast('Joined deal team \u2713');
        addMessage('assistant', `<div class="crm-results"><div class="crm-results-header"><h3>\u2705 Joined Deal Team</h3></div><p>Successfully added to the deal team.</p></div>`);
      } else {
        showSaveToast('Deal team failed: ' + (data.error || 'Unknown'), true);
        addMessage('error', `Deal team failed: ${escapeHtml(data.error || 'Unknown error')}`);
      }
    } catch (err) {
      setCrmDirectBusy(false);
      showSaveToast('Deal team failed: ' + err.message, true);
      addMessage('error', `Deal team failed: ${escapeHtml(err.message)}`);
    }
  }

  // ───── Interactive context menu on chat output (event delegation) ─────
  chatMessages.addEventListener('click', (e) => {
    // Expand/collapse milestone tasks (only for milestone ▸ buttons)
    const expandBtn = e.target.closest('.crm-expand-btn');
    if (expandBtn) {
      const msId = expandBtn.dataset.msId;
      if (msId) {
        // Show full milestone context menu (same as clicking milestone number)
        e.preventDefault();
        e.stopPropagation();
        const row = expandBtn.closest('tr');
        const msNum = row ? (row.querySelector('[data-ms-num]')?.dataset.msNum || '') : '';
        const msName = row ? (row.querySelector('[data-ms-name]')?.dataset.msName || '') : '';
        showContextMenu(e.clientX, e.clientY, [
          { icon: '\ud83d\udccb', label: 'View Activities', action: () => showActivitiesPopup(msId, msName || msNum) },
          { icon: '\ud83d\udcdd', label: 'Edit Date', action: () => {
            const row = expandBtn.closest('tr');
            const currentDate = row ? (row.children[3]?.textContent?.trim() || '') : '';
            showEditDatePopup(msId, currentDate, expandBtn);
          }},
          { icon: '\ud83d\udcb0', label: 'Edit Monthly Use', action: () => inlineEditMilestone(msId, 'monthlyuse', expandBtn) },
          { icon: '\ud83d\udcac', label: 'Add Comment', action: () => showAddCommentPopup(msId, msName || msNum) },
          { sep: true },
          { icon: '\ud83d\udc65', label: 'Join Milestone Team', action: () => mcpAction(`Add me to the milestone team for milestone ${msNum || msId} using manage_milestone_team.`) },
          { sep: true },
          { icon: '\ud83d\udd17', label: 'Open in CRM', action: () => window.open(`${CRM_BASE}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=msp_engagementmilestone&id=${msId}`, '_blank') },
          { icon: '\ud83d\udccb', label: 'Copy ID', action: () => { navigator.clipboard.writeText(msId); showSaveToast('ID copied'); } }
        ], `Milestone: ${msName || msNum}`);
        return;
      }
      // For acct/opp ⋯ buttons: show context menu via their data attrs
      const oppId = expandBtn.dataset.oppId;
      if (oppId) {
        e.preventDefault();
        e.stopPropagation();
        const name = expandBtn.dataset.oppName || '';
        showContextMenu(e.clientX, e.clientY, [
          { icon: '\ud83c\udfaf', label: 'View Milestones', action: () => handleCrmAction('milestones-by-opp', oppId) },
          { icon: '\ud83d\udc65', label: 'Join Deal Team', action: () => joinDealTeam(oppId) },
          { sep: true },
          { icon: '\ud83d\udd17', label: 'Open in CRM', action: () => window.open(`${CRM_BASE}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=opportunity&id=${oppId}`, '_blank') },
          { icon: '\ud83d\udccb', label: 'Copy ID', action: () => { navigator.clipboard.writeText(oppId); showSaveToast('ID copied'); } }
        ], `Opportunity: ${name}`);
        return;
      }
      const acctId = expandBtn.dataset.acctId;
      if (acctId) {
        e.preventDefault();
        e.stopPropagation();
        const name = expandBtn.dataset.acctName || '';
        showContextMenu(e.clientX, e.clientY, [
          { icon: '\ud83d\udd0d', label: 'Smart Lookup', action: () => { if (crmSearchInput) crmSearchInput.value = name; handleCrmAction('drill'); } },
          { icon: '\ud83d\udd17', label: 'Open in CRM', action: () => window.open(`${CRM_BASE}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=account&id=${acctId}`, '_blank') },
          { icon: '\ud83d\udccb', label: 'Copy ID', action: () => { navigator.clipboard.writeText(acctId); showSaveToast('ID copied'); } }
        ], `Account: ${name}`);
        return;
      }
      return;
    }

    // Context menu for milestone number links (skip expand buttons)
    const msLink = e.target.closest('[data-ms-id]');
    if (msLink && !msLink.classList.contains('crm-expand-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const id = msLink.dataset.msId;
      const num = msLink.dataset.msNum || '';
      const name = msLink.dataset.msName || '';
      showContextMenu(e.clientX, e.clientY, [
        { icon: '📋', label: 'View Activities', action: () => showActivitiesPopup(id, name || num) },
        { icon: '📝', label: 'Edit Date', action: () => {
          const row = msLink.closest('tr');
          const currentDate = row ? (row.children[3]?.textContent?.trim() || '') : '';
          showEditDatePopup(id, currentDate, msLink);
        }},
        { icon: '💰', label: 'Edit Monthly Use', action: () => inlineEditMilestone(id, 'monthlyuse', msLink) },
        { icon: '💬', label: 'Add Comment', action: () => showAddCommentPopup(id, name || num) },
        { sep: true },
        { icon: '👥', label: 'Join Milestone Team', action: () => mcpAction(`Add me to the milestone team for milestone ${num || id} using manage_milestone_team.`) },
        { sep: true },
        { icon: '🔗', label: 'Open in CRM', action: () => window.open(`${CRM_BASE}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=msp_engagementmilestone&id=${id}`, '_blank') },
        { icon: '📋', label: 'Copy ID', action: () => { navigator.clipboard.writeText(id); showSaveToast('ID copied'); } }
      ], `Milestone: ${name || num}`);
      return;
    }

    // Context menu for opportunity links
    const oppLink = e.target.closest('[data-opp-id]');
    if (oppLink) {
      e.preventDefault();
      e.stopPropagation();
      const id = oppLink.dataset.oppId;
      const name = oppLink.dataset.oppName || '';
      showContextMenu(e.clientX, e.clientY, [
        { icon: '🎯', label: 'View Milestones', action: () => handleCrmAction('milestones-by-opp', id) },
        { icon: '👥', label: 'Join Deal Team', action: () => joinDealTeam(id) },
        { sep: true },
        { icon: '🔗', label: 'Open in CRM', action: () => window.open(`${CRM_BASE}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=opportunity&id=${id}`, '_blank') },
        { icon: '📋', label: 'Copy ID', action: () => { navigator.clipboard.writeText(id); showSaveToast('ID copied'); } }
      ], `Opportunity: ${name}`);
      return;
    }

    // Context menu for account links
    const acctLink = e.target.closest('[data-acct-id]');
    if (acctLink) {
      e.preventDefault();
      e.stopPropagation();
      const id = acctLink.dataset.acctId;
      const name = acctLink.dataset.acctName || '';
      showContextMenu(e.clientX, e.clientY, [
        { icon: '🔍', label: 'Drill Down', action: () => { if (crmSearchInput) crmSearchInput.value = name; handleCrmAction('drill'); } },
        { icon: '🔗', label: 'Open in CRM', action: () => window.open(`${CRM_BASE}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=account&id=${id}`, '_blank') },
        { icon: '📋', label: 'Copy ID', action: () => { navigator.clipboard.writeText(id); showSaveToast('ID copied'); } }
      ], `Account: ${name}`);
      return;
    }

    // Status filter pills
    const pill = e.target.closest('.crm-filter-pill');
    if (pill) {
      const container = pill.closest('.crm-results') || pill.closest('.crm-section');
      const allPills = container ? container.querySelectorAll('.crm-filter-pill') : [];
      if (pill.dataset.status === 'all') {
        // "All" clicked: activate it, deactivate others
        allPills.forEach(p => p.classList.toggle('active', p.dataset.status === 'all'));
      } else {
        // Specific status: toggle it, deactivate "All"
        pill.classList.toggle('active');
        allPills.forEach(p => { if (p.dataset.status === 'all') p.classList.remove('active'); });
        // If none active, re-activate "All"
        const anyActive = Array.from(allPills).some(p => p.classList.contains('active') && p.dataset.status !== 'all');
        if (!anyActive) allPills.forEach(p => { if (p.dataset.status === 'all') p.classList.add('active'); });
      }
      applyStatusFilter(container);
      return;
    }

    // Sortable header click
    const sortHeader = e.target.closest('.crm-table th.sortable');
    if (sortHeader) {
      sortTable(sortHeader);
      return;
    }
  });

  // ───── MCP prompt helper ─────
  function mcpAction(prompt) {
    if (chatInput) {
      chatInput.value = prompt;
      chatInput.focus();
      addMessage('user', escapeHtml(prompt));
      send({ type: 'chat', payload: { message: prompt } });
      chatInput.value = '';
      setBusy(true);
    }
  }

  // ───── Activities Popup (replaces inline task expansion) ─────
  async function showActivitiesPopup(milestoneId, milestoneLabel) {
    setCrmDirectBusy(true, 'Loading activities...');
    try {
      const r = await crmApiFetch(`/api/crm/tasks?milestoneId=${milestoneId}`);
      setCrmDirectBusy(false);
      const activities = (r.data.ok && r.data.data?.value) ? r.data.data.value : [];

      if (activities.length === 0) {
        // No activities — show Create Activity form directly
        showCreateTaskPopup(milestoneId, milestoneLabel);
        return;
      }

      // Build activities list HTML
      let listHtml = '<div style="max-height:350px;overflow-y:auto;">';
      for (const t of activities) {
        const isOpen = t.statecode === 0;
        const statusLabel = isOpen ? 'Open' : 'Completed';
        const statusColor = isOpen ? 'var(--accent)' : 'var(--text-muted)';
        const subject = t.subject || 'Untitled';
        const dueDate = t.scheduledend ? t.scheduledend.substring(0, 10) : '—';
        const owner = t['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '';
        const category = t['msp_categorycode@OData.Community.Display.V1.FormattedValue'] || '';
        const taskId = t.activityid;

        listHtml += `<div class="activity-item" style="display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid var(--border-light);${!isOpen ? 'opacity:0.6;' : ''}">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:13px;${!isOpen ? 'text-decoration:line-through;' : ''}">${escapeHtml(subject)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
              ${category ? escapeHtml(category) + ' · ' : ''}Due: ${dueDate} · Owner: ${escapeHtml(owner)}
            </div>
          </div>
          <span style="font-size:11px;font-weight:600;color:${statusColor};">${statusLabel}</span>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            ${isOpen ? `<button class="activity-action-btn" data-act="complete" data-task-id="${taskId}" title="Mark Complete" style="color:var(--success);">✓</button>
            <button class="activity-action-btn" data-act="cancel" data-task-id="${taskId}" title="Cancel" style="color:var(--warning);">✕</button>` : ''}
            <button class="activity-action-btn" data-act="delete" data-task-id="${taskId}" title="Delete" style="color:var(--danger);">🗑</button>
          </div>
        </div>`;
      }
      listHtml += '</div>';

      // Show popup
      const existing = document.querySelector('.crm-popup-overlay');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'crm-popup-overlay';
      overlay.innerHTML = `
        <div class="crm-popup" style="min-width:420px;max-width:560px;">
          <div class="crm-popup-header">
            <span>Activities — ${escapeHtml(milestoneLabel)}</span>
            <button class="crm-popup-close" title="Close">\u2715</button>
          </div>
          <div class="crm-popup-body" style="padding:0;">
            ${listHtml}
          </div>
          <div class="crm-popup-footer">
            <button class="action-btn" id="crm-popup-cancel">Close</button>
            <button class="action-btn accent" id="crm-popup-new-activity">+ New Activity</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      // Close handlers
      overlay.querySelector('.crm-popup-close').onclick = () => overlay.remove();
      overlay.querySelector('#crm-popup-cancel').onclick = () => overlay.remove();
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      // New Activity button
      overlay.querySelector('#crm-popup-new-activity').onclick = () => {
        overlay.remove();
        showCreateTaskPopup(milestoneId, milestoneLabel);
      };

      // Action buttons (complete, cancel, delete)
      overlay.querySelectorAll('.activity-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.act;
          const taskId = btn.dataset.taskId;
          btn.disabled = true;
          btn.textContent = '⏳';
          try {
            let resp;
            if (action === 'complete') {
              resp = await fetch('/api/crm/task/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, statusCode: 5 })
              });
            } else if (action === 'cancel') {
              resp = await fetch('/api/crm/task/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, statusCode: 6 })
              });
            } else if (action === 'delete') {
              if (!confirm('Delete this activity?')) { btn.disabled = false; btn.textContent = '🗑'; return; }
              resp = await fetch(`/api/crm/task/${taskId}`, { method: 'DELETE' });
            }
            const data = await resp.json();
            if (data.ok) {
              showSaveToast(action === 'delete' ? 'Activity deleted' : 'Activity updated \u2713');
              overlay.remove();
              // Refresh the popup
              showActivitiesPopup(milestoneId, milestoneLabel);
            } else {
              showSaveToast('Failed: ' + (data.error || 'Unknown'), true);
              btn.disabled = false;
              btn.textContent = action === 'delete' ? '🗑' : action === 'complete' ? '✓' : '✕';
            }
          } catch (err) {
            showSaveToast('Error: ' + err.message, true);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      setCrmDirectBusy(false);
      showSaveToast('Failed to load activities: ' + err.message, true);
    }
  }

  // ───── Status filter application ─────
  function applyStatusFilter(resultsContainer) {
    if (!resultsContainer) return;
    const pills = resultsContainer.querySelectorAll('.crm-filter-pill');
    const activeStatuses = [];
    pills.forEach(p => { if (p.classList.contains('active') && p.dataset.status) activeStatuses.push(p.dataset.status); });
    const showAll = activeStatuses.length === 0 || activeStatuses.includes('all');
    const rows = resultsContainer.querySelectorAll('.crm-table tbody tr:not(.crm-task-row)');
    rows.forEach(row => {
      if (showAll) { row.style.display = ''; return; }
      const statusCell = row.querySelector('[data-ms-status]');
      if (!statusCell) { row.style.display = ''; return; }
      const status = statusCell.dataset.msStatus;
      row.style.display = activeStatuses.includes(status) ? '' : 'none';
    });
  }

  // ───── Table sorting ─────
  function sortTable(th) {
    const table = th.closest('table');
    if (!table) return;
    const idx = Array.from(th.parentElement.children).indexOf(th);
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr:not(.crm-task-row)'));
    const isAsc = !th.classList.contains('sorted-asc');

    // Clear other sort states
    th.parentElement.querySelectorAll('th').forEach(h => {
      h.classList.remove('sorted', 'sorted-asc', 'sorted-desc');
    });
    th.classList.add('sorted', isAsc ? 'sorted-asc' : 'sorted-desc');
    const arrow = th.querySelector('.sort-arrow');
    if (arrow) arrow.textContent = isAsc ? '▲' : '▼';

    rows.sort((a, b) => {
      const aText = (a.children[idx]?.textContent || '').trim();
      const bText = (b.children[idx]?.textContent || '').trim();
      // Try date comparison
      if (/^\d{4}-\d{2}-\d{2}/.test(aText) && /^\d{4}-\d{2}-\d{2}/.test(bText)) {
        return isAsc ? aText.localeCompare(bText) : bText.localeCompare(aText);
      }
      // Try numeric
      const aNum = parseFloat(aText);
      const bNum = parseFloat(bText);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return isAsc ? aNum - bNum : bNum - aNum;
      }
      return isAsc ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });
    rows.forEach(r => tbody.appendChild(r));
  }

  // ───── CRM-Direct Popup Modal ─────
  function showCrmPopup(title, formHtml, onSave) {
    const existing = document.querySelector('.crm-popup-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'crm-popup-overlay';
    overlay.innerHTML = `
      <div class="crm-popup">
        <div class="crm-popup-header">
          <span>${escapeHtml(title)}</span>
          <button class="crm-popup-close" title="Close">\u2715</button>
        </div>
        <div class="crm-popup-body">${formHtml}</div>
        <div class="crm-popup-footer">
          <button class="action-btn" id="crm-popup-cancel">Cancel</button>
          <button class="action-btn accent" id="crm-popup-save">Save</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    // Close handlers
    overlay.querySelector('.crm-popup-close').onclick = () => overlay.remove();
    overlay.querySelector('#crm-popup-cancel').onclick = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    // Save handler
    overlay.querySelector('#crm-popup-save').onclick = async () => {
      const saveBtn = overlay.querySelector('#crm-popup-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        await onSave(overlay);
        overlay.remove();
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
        showSaveToast('Error: ' + err.message, true);
      }
    };
    // Focus first input
    const firstInput = overlay.querySelector('input,textarea,select');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }

  // ───── Edit Date popup ─────
  function showEditDatePopup(milestoneId, currentDate, triggerEl) {
    showCrmPopup('Edit Milestone Date', `
      <div class="crm-popup-field">
        <label>New Date</label>
        <input type="date" id="popup-date" class="crm-popup-input" value="${currentDate !== '\u2014' ? currentDate : ''}">
      </div>
    `, async (overlay) => {
      const newVal = overlay.querySelector('#popup-date').value;
      if (!newVal) throw new Error('Please select a date');
      setCrmDirectBusy(true, 'Updating date...');
      const resp = await fetch(`/api/crm/milestone/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msp_milestonedate: newVal })
      });
      const data = await resp.json();
      setCrmDirectBusy(false);
      if (!data.ok) throw new Error(data.error || 'Update failed');
      // Update the cell in the table
      const row = triggerEl?.closest('tr');
      if (row && row.children[3]) row.children[3].textContent = newVal;
      showSaveToast('Date updated \u2713');
    });
  }

  // ───── Add Comment popup ─────
  function showAddCommentPopup(milestoneId, milestoneLabel) {
    showCrmPopup(`Add Comment \u2014 ${milestoneLabel}`, `
      <div class="crm-popup-field">
        <label>Your comment</label>
        <textarea id="popup-comment" class="crm-popup-input" rows="4" placeholder="Type your forecast comment..."></textarea>
      </div>
    `, async (overlay) => {
      const comment = overlay.querySelector('#popup-comment').value.trim();
      if (!comment) throw new Error('Please enter a comment');
      setCrmDirectBusy(true, 'Saving comment...');
      // Prepend user initials + date
      const now = new Date();
      const dateStr = `${now.getDate()}/${now.toLocaleString('en', {month:'short'})}`;
      const formatted = `LV - ${dateStr} - ${comment}`;
      const resp = await fetch(`/api/crm/milestone/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msp_forecastcomments: formatted })
      });
      const data = await resp.json();
      setCrmDirectBusy(false);
      if (!data.ok) throw new Error(data.error || 'Update failed');
      showSaveToast('Comment saved \u2713');
      addMessage('assistant', `<div class="crm-results"><div class="crm-results-header"><h3>\ud83d\udcac Comment Added</h3></div><p><strong>${escapeHtml(milestoneLabel)}</strong>: ${escapeHtml(formatted)}</p></div>`);
    });
  }

  // ───── Create Task popup ─────
  function showCreateTaskPopup(milestoneId, milestoneLabel) {
    const catOptions = [
      { value: '', label: 'Select category...' },
      { value: '606820005', label: 'Technical Close/Win Plan (20 days)' },
      { value: '861980004', label: 'Architecture Design Session (10 days)' },
      { value: '861980006', label: 'Blocker Escalation (15 days)' },
      { value: '861980008', label: 'Briefing (15 days)' },
      { value: '861980007', label: 'Consumption Plan (20 days)' },
      { value: '861980002', label: 'Demo (15 days)' },
      { value: '861980005', label: 'PoC/Pilot (60 days)' },
      { value: '861980001', label: 'Workshop (30 days)' }
    ];
    const optionsHtml = catOptions.map(o => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join('');
    showCrmPopup(`Create Activity \u2014 ${milestoneLabel}`, `
      <div class="crm-popup-field">
        <label>Category</label>
        <select id="popup-category" class="crm-popup-input">${optionsHtml}</select>
      </div>
      <div class="crm-popup-field">
        <label>Subject</label>
        <input type="text" id="popup-subject" class="crm-popup-input" placeholder="Task subject...">
      </div>
      <div class="crm-popup-field">
        <label>Due Date (optional \u2014 auto-calculated from category if blank)</label>
        <input type="date" id="popup-duedate" class="crm-popup-input">
      </div>
    `, async (overlay) => {
      const subject = overlay.querySelector('#popup-subject').value.trim();
      const category = overlay.querySelector('#popup-category').value;
      const dueDate = overlay.querySelector('#popup-duedate').value || undefined;
      if (!subject) throw new Error('Please enter a subject');
      setCrmDirectBusy(true, 'Creating task...');
      const resp = await fetch('/api/crm/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId, subject, category: category || undefined, dueDate })
      });
      const data = await resp.json();
      setCrmDirectBusy(false);
      if (!data.ok) throw new Error(data.error || 'Task creation failed');
      showSaveToast('Activity created \u2713');
      addMessage('assistant', `<div class="crm-results"><div class="crm-results-header"><h3>\u2705 Activity Created</h3></div><p><strong>${escapeHtml(milestoneLabel)}</strong>: ${escapeHtml(subject)}</p></div>`);
    });
  }

  // ───── Inline milestone edit ─────
  async function inlineEditMilestone(milestoneId, field, triggerEl) {
    const row = triggerEl.closest('tr');
    if (!row) return;
    // Find the cell to edit based on field
    let cellIdx;
    if (field === 'date') cellIdx = 3; // Date column
    else if (field === 'monthlyuse') cellIdx = -1; // Not in standard columns, handled differently
    else return;

    if (field === 'date') {
      const cell = row.children[cellIdx];
      if (!cell) return;
      const currentVal = cell.textContent.trim();
      const input = document.createElement('input');
      input.type = 'date';
      input.className = 'crm-inline-edit';
      input.value = currentVal !== '—' ? currentVal : '';
      cell.textContent = '';
      cell.appendChild(input);
      input.focus();

      const save = async () => {
        const newVal = input.value;
        if (!newVal || newVal === currentVal) { cell.textContent = currentVal; return; }
        cell.textContent = '⏳';
        try {
          const resp = await fetch(`/api/crm/milestone/${milestoneId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msp_milestonedate: newVal })
          });
          const data = await resp.json();
          if (data.ok) {
            cell.textContent = newVal;
            showSaveToast('Date updated ✓');
          } else {
            cell.textContent = currentVal;
            showSaveToast(`Save failed: ${data.error}`, true);
          }
        } catch (err) {
          cell.textContent = currentVal;
          showSaveToast('Save failed: ' + err.message, true);
        }
      };
      input.addEventListener('change', save);
      input.addEventListener('blur', save);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { cell.textContent = currentVal; }
      });
    } else if (field === 'monthlyuse') {
      showCrmPopup('Edit Monthly Use', `
        <div class="crm-popup-field">
          <label>Monthly Use (number)</label>
          <input type="number" id="popup-monthlyuse" class="crm-popup-input" min="0" step="1" placeholder="e.g. 500">
        </div>
      `, async (overlay) => {
        const val = overlay.querySelector('#popup-monthlyuse').value;
        if (val === '') throw new Error('Please enter a value');
        setCrmDirectBusy(true, 'Updating monthly use...');
        const resp = await fetch(`/api/crm/milestone/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ msp_monthlyuse: Number(val) })
        });
        const data = await resp.json();
        setCrmDirectBusy(false);
        if (!data.ok) throw new Error(data.error || 'Update failed');
        showSaveToast('Monthly use updated \u2713');
      });
    }
  }

  // ───── Milestones by Opportunity (from context menu) ─────
  async function handleMilestonesByOpp(oppId) {
    setCrmStatus('Querying CRM...', 'loading');
    try {
      const r = await crmApiFetch(`/api/crm/milestones?opportunityId=${encodeURIComponent(oppId)}`);
      if (!r.data.ok) throw new Error(r.data.error || 'Query failed');
      const milestones = (r.data.data?.value || []).map(m => ({
        id: m.msp_engagementmilestoneid, number: m.msp_milestonenumber || '', name: m.msp_name || '',
        date: m.msp_milestonedate || '',
        status: m['msp_milestonestatus@OData.Community.Display.V1.FormattedValue'] || String(m.msp_milestonestatus || ''),
        commitment: m['msp_commitmentrecommendation@OData.Community.Display.V1.FormattedValue'] || '',
        owner: m['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
        workload: m['_msp_workloadlkid_value@OData.Community.Display.V1.FormattedValue'] || ''
      }));
      setCrmStatus(`Done in ${r.elapsed}ms`, '');
      addMessage('assistant', renderCrmResults('Milestones for Opportunity', [
        { label: 'Milestones', count: milestones.length, html: renderMilestonesTable(milestones) }
      ], r.elapsed));
    } catch (err) {
      setCrmStatus(err.message, 'error');
      addMessage('error', escapeHtml(`CRM Error: ${err.message}`));
    }
  }

  // ───── Tooltips ─────
  const tooltipPopup = $('#tooltip-popup');
  let tooltipTimer = null;

  $$('[data-tooltip]').forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const text = el.dataset.tooltip;
      if (!text) return;
      clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(() => {
        tooltipPopup.textContent = text;
        tooltipPopup.classList.remove('hidden');
        const rect = el.getBoundingClientRect();
        tooltipPopup.style.left = Math.min(rect.left, window.innerWidth - 280) + 'px';
        tooltipPopup.style.top = (rect.bottom + 6) + 'px';
      }, 400);
    });
    el.addEventListener('mouseleave', () => {
      clearTimeout(tooltipTimer);
      tooltipPopup.classList.add('hidden');
    });
  });

  // ───── Log Viewer ─────
  const logFab = $('#log-fab');
  const logPopup = $('#log-popup');
  const logPopupClose = $('#log-popup-close');
  const logViewBtn = $('#log-view-btn');
  const logToggleBtn = $('#log-toggle-btn');
  const logClearBtn = $('#log-clear-btn');
  const logPopupPath = $('#log-popup-path');
  const logPopupContent = $('#log-popup-content');
  let logIsOpen = false;

  if (logFab) {
    logFab.addEventListener('click', () => {
      logIsOpen = !logIsOpen;
      logPopup.classList.toggle('hidden', !logIsOpen);
    });
  }

  if (logPopupClose) {
    logPopupClose.addEventListener('click', () => {
      logIsOpen = false;
      logPopup.classList.add('hidden');
    });
  }

  if (logViewBtn) {
    logViewBtn.addEventListener('click', async () => {
      try {
        const resp = await fetch('/api/logs');
        const data = await resp.json();
        logPopupPath.textContent = data.logDir || '';
        logPopupContent.classList.remove('hidden');
        if (!data.files || data.files.length === 0) {
          logPopupContent.innerHTML = '<div class="crm-empty">No log files yet</div>';
          return;
        }
        let html = '';
        for (const f of data.files) {
          html += `<div style="margin-bottom:8px;"><strong>${escapeHtml(f.name)}</strong> (${f.lines} entries, ${Math.round(f.size/1024)}KB)</div>`;
          const lines = f.content.split('\n').filter(Boolean).slice(-100);
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              html += `<div class="log-entry ${entry.level}">[${entry.t.substring(11, 19)}] ${entry.level} [${escapeHtml(entry.cat)}] ${escapeHtml(entry.msg)}${entry.data ? ' ' + escapeHtml(String(entry.data).substring(0, 200)) : ''}</div>`;
            } catch {
              html += `<div class="log-entry">${escapeHtml(line)}</div>`;
            }
          }
        }
        logPopupContent.innerHTML = html;
        logPopupContent.scrollTop = logPopupContent.scrollHeight;
      } catch (err) {
        logPopupContent.classList.remove('hidden');
        logPopupContent.innerHTML = `<div class="crm-empty">Error: ${escapeHtml(err.message)}</div>`;
      }
    });
  }

  if (logToggleBtn) {
    let logEnabled = false;
    logToggleBtn.innerHTML = '▶️ Start Logging';
    logToggleBtn.addEventListener('click', async () => {
      logEnabled = !logEnabled;
      await fetch('/api/logs/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: logEnabled })
      });
      logToggleBtn.innerHTML = logEnabled ? '⏸ Pause Logging' : '▶️ Start Logging';
    });
  }

  if (logClearBtn) {
    logClearBtn.addEventListener('click', async () => {
      await fetch('/api/logs', { method: 'DELETE' });
      logPopupContent.innerHTML = '<div class="crm-empty">Logs cleared</div>';
    });
  }

  // ───── Screenshot Paste ─────
  const screenshotPreview = $('#screenshot-preview');
  const screenshotImg = $('#screenshot-img');
  const screenshotSend = $('#screenshot-send');
  const screenshotCancel = $('#screenshot-cancel');
  let pendingScreenshot = null;

  chatInput.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          pendingScreenshot = ev.target.result;
          screenshotImg.src = pendingScreenshot;
          screenshotPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
  });

  if (screenshotCancel) {
    screenshotCancel.addEventListener('click', () => {
      pendingScreenshot = null;
      screenshotPreview.classList.add('hidden');
    });
  }

  if (screenshotSend) {
    screenshotSend.addEventListener('click', () => {
      if (!pendingScreenshot) return;
      const text = chatInput.value.trim() || 'Analyze this screenshot against my account database knowledge and help me draft a response.';
      addMessage('user', `<img src="${pendingScreenshot}" style="max-width:300px;max-height:200px;border-radius:8px;margin-bottom:8px;display:block;"><br>${escapeHtml(text)}`);

      // Send as chat with image context
      setBusy(true);
      send({
        type: 'chat',
        payload: {
          message: `[User pasted a screenshot — they want you to analyze it against the .docs/ knowledge base]\n\n${text}\n\n[Note: The screenshot was pasted in the browser. Read the relevant .docs/ files to provide context-aware analysis. The user likely wants help drafting a response to what's shown in the screenshot.]`
        }
      });

      pendingScreenshot = null;
      screenshotPreview.classList.add('hidden');
      chatInput.value = '';
    });
  }

  // ───── Quit Button ─────
  const quitBtn = $('#quit-btn');
  if (quitBtn) {
    quitBtn.addEventListener('click', async () => {
      if (!confirm('Shut down the dashboard server?')) return;
      try { await fetch('/api/shutdown', { method: 'POST' }); } catch {}
      // Replace page with a "server stopped" screen
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1e1e2e;color:#cdd6f4;font-family:Segoe UI,sans-serif;">
          <div style="font-size:64px;margin-bottom:20px;">🐈</div>
          <h1 style="margin:0 0 10px;">MSX Dashboard stopped</h1>
          <p style="color:#6c7086;">Server has been shut down. You can close this tab.</p>
          <button onclick="window.close();location.href='about:blank'" style="margin-top:20px;padding:10px 24px;border-radius:8px;border:1px solid #45475a;background:#313244;color:#cdd6f4;cursor:pointer;font-size:14px;">Close Tab</button>
        </div>`;
      document.title = 'MSX Dashboard - Stopped';
    });
  }

  // ───── Drawings Viewer ─────
  const drawingsFab = $('#drawings-fab');
  const drawingsPopup = $('#drawings-popup');
  const drawingsPopupClose = $('#drawings-popup-close');
  const drawingsList = $('#drawings-list');
  const drawingModal = $('#drawing-modal');
  const drawingModalBackdrop = $('#drawing-modal-backdrop');
  const drawingModalClose = $('#drawing-modal-close');
  const drawingModalTitle = $('#drawing-modal-title');
  const drawingModalBody = $('#drawing-modal-body');
  const drawingZoomWrapper = $('#drawing-zoom-wrapper');
  const drawingZoomIn = $('#drawing-zoom-in');
  const drawingZoomOut = $('#drawing-zoom-out');
  const drawingZoomFit = $('#drawing-zoom-fit');
  const drawingZoomReset = $('#drawing-zoom-reset');
  const drawingZoomLevel = $('#drawing-zoom-level');
  let drawingsIsOpen = false;

  if (drawingsFab) {
    drawingsFab.addEventListener('click', async () => {
      drawingsIsOpen = !drawingsIsOpen;
      drawingsPopup.classList.toggle('hidden', !drawingsIsOpen);
      if (drawingsIsOpen) await loadDrawingsList();
    });
  }

  if (drawingsPopupClose) {
    drawingsPopupClose.addEventListener('click', () => {
      drawingsIsOpen = false;
      drawingsPopup.classList.add('hidden');
    });
  }

  async function loadDrawingsList() {
    drawingsList.innerHTML = '<div class="drawings-empty">Loading...</div>';
    try {
      const resp = await fetch('/api/drawings');
      const data = await resp.json();
      if (!data.ok || !data.drawings || data.drawings.length === 0) {
        drawingsList.innerHTML = `<div class="drawings-empty">No drawings yet. Ask the agent to create a visual diagram!</div>
          <div class="drawings-actions">
            <button class="action-btn accent" id="drawings-browse-btn">📂 Browse Folder</button>
          </div>`;
        const browseBtn = document.getElementById('drawings-browse-btn');
        if (browseBtn) browseBtn.addEventListener('click', openDrawingsFolder);
        drawingsFab.classList.remove('has-drawings');
        return;
      }
      drawingsFab.classList.add('has-drawings');
      drawingsList.innerHTML = data.drawings.map(d => {
        const name = d.filename.replace('.excalidraw', '');
        const sizeKB = d.size ? Math.round(d.size / 1024) + ' KB' : '';
        const date = d.modified ? new Date(d.modified).toLocaleDateString() : '';
        return `
        <div class="drawing-item" data-drawing="${escapeHtml(d.filename)}">
          <div class="drawing-item-icon">🎨</div>
          <div class="drawing-item-info">
            <div class="drawing-item-name">${escapeHtml(name)}</div>
            <div class="drawing-item-meta">${d.elements} elements${sizeKB ? ' · ' + sizeKB : ''}${date ? ' · ' + date : ''}</div>
          </div>
        </div>
      `;
      }).join('');
      // Always add browse button at the bottom
      drawingsList.innerHTML += `<div class="drawings-actions">
        <button class="action-btn" id="drawings-browse-btn">📂 Browse Folder</button>
      </div>`;
      const browseBtn = document.getElementById('drawings-browse-btn');
      if (browseBtn) browseBtn.addEventListener('click', openDrawingsFolder);
    } catch (err) {
      drawingsList.innerHTML = `<div class="drawings-empty">Error: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function openDrawingsFolder() {
    try {
      const resp = await fetch('/api/drawings/open-folder', { method: 'POST' });
      const data = await resp.json();
      if (!data.ok) addMessage('error', 'Could not open folder: ' + escapeHtml(data.error || ''));
    } catch {
      // Fallback: just show the path
      addMessage('system', 'Drawings folder: <code>.docs/Drawing_Excalidraw/</code>');
    }
  }

  // Click handler for drawing items (event delegation)
  document.addEventListener('click', async (e) => {
    const item = e.target.closest('[data-drawing]');
    if (!item) return;
    const filename = item.dataset.drawing;
    if (filename) {
      await openDrawingViewer(filename);
    }
  });

  async function openDrawingViewer(filename) {
    // Close the popup
    drawingsPopup.classList.add('hidden');
    drawingsIsOpen = false;

    // Show preview in the main chat window
    const name = filename.replace('.excalidraw', '');
    const previewId = 'drawing-inline-' + Date.now();
    addMessage('assistant', `<div class="drawing-preview-container" id="${previewId}" data-filename="${escapeHtml(filename)}">
      <div class="drawing-preview-header">
        <span>🎨 ${escapeHtml(name)}</span>
        <div class="drawing-preview-actions">
          <button class="drawing-preview-btn fullscreen-btn" title="Open fullscreen (zoom & pan)">⛶</button>
          <button class="drawing-preview-btn close-btn" onclick="this.closest('.drawing-preview-container').remove()" title="Close preview">✕</button>
        </div>
      </div>
      <div class="drawing-preview-body">Loading drawing...</div>
      <div class="drawing-preview-grip" title="Drag to resize"></div>
      <div class="drawing-preview-hint">Click diagram to open fullscreen • Drag bottom edge to resize</div>
    </div>`);

    const previewEl = document.getElementById(previewId);
    const container = previewEl ? previewEl.querySelector('.drawing-preview-body') : null;
    if (!container) return;

    try {
      const resp = await fetch(`/api/drawings/${encodeURIComponent(filename)}/svg`);
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load drawing');
      }
      const svg = await resp.text();
      container.innerHTML = svg;
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = '100%';
        svgEl.style.height = 'auto';
        svgEl.style.maxHeight = '500px';
      }
      container.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch (err) {
      container.innerHTML = `<div style="color:#f85149;">Error: ${escapeHtml(err.message)}</div>`;
    }
  }

  // ───── Drawing Fullscreen Modal with Pan & Zoom ─────
  let modalZoom = 1;
  let modalPan = { x: 0, y: 0 };
  let isPanning = false;
  let panStart = { x: 0, y: 0 };

  function updateZoomTransform() {
    if (!drawingZoomWrapper) return;
    drawingZoomWrapper.style.transform = `translate(${modalPan.x}px, ${modalPan.y}px) scale(${modalZoom})`;
    if (drawingZoomLevel) drawingZoomLevel.textContent = Math.round(modalZoom * 100) + '%';
  }

  function resetZoom() {
    modalZoom = 1;
    modalPan = { x: 0, y: 0 };
    updateZoomTransform();
  }

  function fitZoom() {
    if (!drawingZoomWrapper || !drawingModalBody) return;
    const svg = drawingZoomWrapper.querySelector('svg');
    if (!svg) return;
    const bodyRect = drawingModalBody.getBoundingClientRect();
    const svgW = svg.getAttribute('width') || svg.viewBox?.baseVal?.width || bodyRect.width;
    const svgH = svg.getAttribute('height') || svg.viewBox?.baseVal?.height || bodyRect.height;
    const scaleX = (bodyRect.width - 40) / svgW;
    const scaleY = (bodyRect.height - 40) / svgH;
    modalZoom = Math.min(scaleX, scaleY, 3);
    modalPan = { x: 0, y: 0 };
    // Center the SVG
    const scaledW = svgW * modalZoom;
    const scaledH = svgH * modalZoom;
    modalPan.x = (bodyRect.width - scaledW) / 2;
    modalPan.y = (bodyRect.height - scaledH) / 2;
    updateZoomTransform();
  }

  function openDrawingInModal(svgHtml, title) {
    if (!drawingModal || !drawingZoomWrapper) return;
    drawingModalTitle.textContent = title || 'Drawing';
    drawingZoomWrapper.innerHTML = svgHtml;
    const svg = drawingZoomWrapper.querySelector('svg');
    if (svg) {
      svg.style.maxWidth = 'none';
      svg.style.maxHeight = 'none';
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      // Use viewBox dimensions or natural dimensions
      const vb = svg.viewBox?.baseVal;
      if (vb && vb.width) {
        svg.style.width = vb.width + 'px';
        svg.style.height = vb.height + 'px';
      }
    }
    drawingModal.classList.remove('hidden');
    // Delay fit to allow layout
    requestAnimationFrame(() => fitZoom());
  }

  function closeDrawingModal() {
    if (drawingModal) drawingModal.classList.add('hidden');
    resetZoom();
  }

  // Close modal
  if (drawingModalClose) {
    drawingModalClose.addEventListener('click', closeDrawingModal);
  }
  if (drawingModalBackdrop) {
    drawingModalBackdrop.addEventListener('click', closeDrawingModal);
  }

  // Zoom controls
  if (drawingZoomIn) {
    drawingZoomIn.addEventListener('click', () => {
      modalZoom = Math.min(modalZoom * 1.25, 10);
      updateZoomTransform();
    });
  }
  if (drawingZoomOut) {
    drawingZoomOut.addEventListener('click', () => {
      modalZoom = Math.max(modalZoom / 1.25, 0.1);
      updateZoomTransform();
    });
  }
  if (drawingZoomFit) {
    drawingZoomFit.addEventListener('click', fitZoom);
  }
  if (drawingZoomReset) {
    drawingZoomReset.addEventListener('click', resetZoom);
  }

  // Mouse wheel zoom (on modal body)
  if (drawingModalBody) {
    drawingModalBody.addEventListener('wheel', (e) => {
      if (drawingModal.classList.contains('hidden')) return;
      e.preventDefault();
      const rect = drawingModalBody.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const oldZoom = modalZoom;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      modalZoom = Math.max(0.1, Math.min(10, modalZoom * factor));
      // Zoom toward mouse position
      const ratio = modalZoom / oldZoom;
      modalPan.x = mouseX - ratio * (mouseX - modalPan.x);
      modalPan.y = mouseY - ratio * (mouseY - modalPan.y);
      updateZoomTransform();
    }, { passive: false });

    // Pan with mouse drag
    drawingModalBody.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isPanning = true;
      panStart = { x: e.clientX - modalPan.x, y: e.clientY - modalPan.y };
      drawingModalBody.classList.add('panning');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      modalPan.x = e.clientX - panStart.x;
      modalPan.y = e.clientY - panStart.y;
      updateZoomTransform();
    });
    window.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        drawingModalBody.classList.remove('panning');
      }
    });
  }

  // Keyboard shortcuts when modal is open
  document.addEventListener('keydown', (e) => {
    if (drawingModal.classList.contains('hidden')) return;
    if (e.key === 'Escape') { closeDrawingModal(); return; }
    if (e.key === '+' || e.key === '=') { modalZoom = Math.min(modalZoom * 1.25, 10); updateZoomTransform(); }
    if (e.key === '-') { modalZoom = Math.max(modalZoom / 1.25, 0.1); updateZoomTransform(); }
    if (e.key === '0') { resetZoom(); }
    if (e.key === 'f' || e.key === 'F') { fitZoom(); }
  });

  // Double-click to fit
  if (drawingModalBody) {
    drawingModalBody.addEventListener('dblclick', fitZoom);
  }

  // ───── Event delegation: click on inline preview → open modal ─────
  chatMessages.addEventListener('click', (e) => {
    // Click fullscreen button
    const fsBtn = e.target.closest('.drawing-preview-btn.fullscreen-btn');
    if (fsBtn) {
      const container = fsBtn.closest('.drawing-preview-container');
      if (container) {
        const body = container.querySelector('.drawing-preview-body');
        const title = container.querySelector('.drawing-preview-header span');
        if (body && body.innerHTML && !body.textContent.includes('Loading')) {
          openDrawingInModal(body.innerHTML, title ? title.textContent : 'Drawing');
        }
      }
      return;
    }
    // Click on SVG body
    const previewBody = e.target.closest('.drawing-preview-body');
    if (previewBody && previewBody.querySelector('svg')) {
      const container = previewBody.closest('.drawing-preview-container');
      const title = container ? container.querySelector('.drawing-preview-header span') : null;
      openDrawingInModal(previewBody.innerHTML, title ? title.textContent : 'Drawing');
    }
  });

  // Check for drawings on load (for FAB badge)
  (async () => {
    try {
      const resp = await fetch('/api/drawings');
      const data = await resp.json();
      if (data.ok && data.drawings && data.drawings.length > 0) {
        drawingsFab.classList.add('has-drawings');
      }
    } catch { /* server may not be ready */ }
  })();

  // ───── Browse Docs Folder ─────
  const browseDocsBtn = $('#browse-docs-btn');
  if (browseDocsBtn) {
    browseDocsBtn.addEventListener('click', async () => {
      const newPath = prompt('Enter the path to your .docs database folder:\n\n(The folder that contains .docs/_index.md, .docs/_data/, etc.)\n\nLeave empty to use default location.');
      if (newPath === null) return; // cancelled
      try {
        const resp = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docsPath: newPath || '' })
        });
        const data = await resp.json();
        if (data.ok) {
          addMessage('system', `Database path ${data.docsPath ? 'set to: <strong>' + escapeHtml(data.docsPath) + '</strong>' : 'reset to default'}. Refreshing accounts...`);
          // Reload account list
          try {
            const ar = await fetch('/api/accounts');
            const accounts = await ar.json();
            const dl = document.getElementById('account-list');
            if (dl) {
              dl.innerHTML = accounts.map(a => `<option value="${escapeHtml(a.name)}">`).join('');
            }
          } catch {}
        }
      } catch (err) {
        addMessage('error', 'Failed to update settings: ' + escapeHtml(err.message));
      }
    });
  }

  // ───── Matrix Rain Animation ─────
  (function initMatrixRain() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const fontSize = 8;
    const cols = Math.floor(W / fontSize);
    const drops = Array(cols).fill(0);
    const chars = '0123456789ABCDEFabcdef$@#&!?<>{}[]';

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#0f0';
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillStyle = drops[i] * fontSize > H - 10 ? '#fff' : '#0f0';
        ctx.fillText(ch, x, y);
        if (y > H && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    setInterval(draw, 80);
  })();

  // ───── Dashboard Doctor ─────
  const doctorFab = $('#doctor-fab');
  const doctorOverlay = $('#doctor-overlay');
  const doctorMessages = $('#doctor-messages');
  const doctorInput = $('#doctor-input');
  const doctorSendBtn = $('#doctor-send-btn');
  const doctorCloseBtn = $('#doctor-close-btn');
  const doctorResetBtn = $('#doctor-reset-btn');
  const doctorVitalsBtn = $('#doctor-vitals-btn');
  const doctorMaximizeBtn = $('#doctor-maximize-btn');
  const doctorStatus = $('#doctor-status');
  const doctorBadge = $('#doctor-badge');

  let doctorWs = null;
  let doctorOpen = false;
  let doctorBusy = false;
  let doctorStreamEl = null;
  let doctorStreamBuf = '';
  let doctorReconnectAttempts = 0;

  function doctorConnect() {
    doctorWs = new WebSocket(`ws://${location.host}/ws-doctor`);
    doctorWs.onopen = () => {
      doctorReconnectAttempts = 0;
      doctorSetStatus('Ready', 'ok');
    };
    doctorWs.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleDoctorMessage(msg);
      } catch { /* ignore */ }
    };
    doctorWs.onclose = () => {
      doctorSetStatus('Offline', 'error');
      if (doctorReconnectAttempts < 5) {
        doctorReconnectAttempts++;
        setTimeout(doctorConnect, 3000);
      }
    };
    doctorWs.onerror = () => {};
  }

  function doctorSend(obj) {
    if (doctorWs && doctorWs.readyState === WebSocket.OPEN) {
      doctorWs.send(JSON.stringify(obj));
    }
  }

  function doctorSetStatus(text, type) {
    if (!doctorStatus) return;
    doctorStatus.textContent = text;
    doctorStatus.className = 'doctor-chat-status' + (type ? ' ' + type : '');
  }

  function handleDoctorMessage(msg) {
    switch (msg.type) {
      case 'chunk':
        doctorAppendChunk(msg.text);
        break;
      case 'done':
        if (!doctorStreamEl && msg.text) {
          addDoctorMessage('assistant', renderMarkdown(msg.text));
        } else {
          doctorFinishMessage();
        }
        doctorSetBusy(false);
        break;
      case 'error':
        addDoctorMessage('error', escapeHtml(msg.text || 'An error occurred.'));
        doctorSetBusy(false);
        break;
      case 'status':
        addDoctorMessage('status', msg.text);
        break;
      case 'tool-start':
        doctorSetStatus(`Running: ${friendlyToolName(msg.tool)}`, 'working');
        break;
      case 'tool-end':
        doctorSetStatus(msg.success ? 'Analyzing...' : 'Tool failed', msg.success ? 'working' : 'error');
        break;
      case 'intent':
        doctorSetStatus(msg.text, 'working');
        break;
    }
  }

  function doctorAppendChunk(text) {
    if (!doctorStreamEl) {
      doctorStreamEl = createDoctorMsgEl('assistant');
      doctorMessages.appendChild(doctorStreamEl);
      doctorStreamBuf = '';
    }
    doctorStreamBuf += text;
    const content = doctorStreamEl.querySelector('.doctor-msg-content');
    content.innerHTML = renderMarkdown(doctorStreamBuf);
    doctorMessages.scrollTop = doctorMessages.scrollHeight;
  }

  function doctorFinishMessage() {
    if (doctorStreamEl) {
      const content = doctorStreamEl.querySelector('.doctor-msg-content');
      content.innerHTML = renderMarkdown(doctorStreamBuf);
    }
    doctorStreamEl = null;
    doctorStreamBuf = '';
    doctorSetBusy(false);
    doctorMessages.scrollTop = doctorMessages.scrollHeight;
  }

  function addDoctorMessage(role, html) {
    const el = createDoctorMsgEl(role);
    el.querySelector('.doctor-msg-content').innerHTML = html;
    doctorMessages.appendChild(el);
    doctorMessages.scrollTop = doctorMessages.scrollHeight;
  }

  function createDoctorMsgEl(role) {
    const wrap = document.createElement('div');
    wrap.className = `doctor-msg ${role}`;
    const content = document.createElement('div');
    content.className = 'doctor-msg-content';
    wrap.appendChild(content);
    return wrap;
  }

  function doctorSetBusy(busy) {
    doctorBusy = busy;
    doctorSendBtn.disabled = busy;
    const doctorStopBtn = $('#doctor-stop-btn');
    if (doctorStopBtn) doctorStopBtn.classList.toggle('hidden', !busy);
    if (!busy) doctorSetStatus('Ready', 'ok');
  }

  // Doctor stop button
  const doctorStopBtnEl = $('#doctor-stop-btn');
  if (doctorStopBtnEl) {
    doctorStopBtnEl.addEventListener('click', () => {
      // Close the WebSocket to abort the in-flight request, then reconnect
      if (doctorWs && doctorWs.readyState === WebSocket.OPEN) {
        doctorWs.close();
      }
      doctorFinishMessage();
      doctorSetBusy(false);
      addDoctorMessage('system', '<em>Request cancelled.</em>');
      // Reconnect for future messages
      setTimeout(doctorConnect, 500);
    });
  }

  function doctorSendChat() {
    const text = doctorInput.value.trim();
    if (!text || doctorBusy) return;
    addDoctorMessage('user', escapeHtml(text));
    doctorInput.value = '';
    doctorInput.style.height = 'auto';
    doctorSetBusy(true);
    doctorSetStatus('Examining...', 'working');
    doctorSend({ type: 'chat', payload: { message: text } });
  }

  // Toggle overlay
  function toggleDoctor() {
    doctorOpen = !doctorOpen;
    doctorOverlay.classList.toggle('hidden', !doctorOpen);
    doctorFab.classList.toggle('active', doctorOpen);
    if (doctorOpen) {
      doctorInput.focus();
      doctorBadge.classList.add('hidden');
      // Connect on first open
      if (!doctorWs || doctorWs.readyState > 1) {
        doctorConnect();
      }
    } else {
      // Reset maximized state when closing
      doctorOverlay.classList.remove('maximized');
    }
  }

  if (doctorFab) doctorFab.addEventListener('click', toggleDoctor);
  if (doctorCloseBtn) doctorCloseBtn.addEventListener('click', toggleDoctor);

  // Maximize / Restore toggle
  if (doctorMaximizeBtn) {
    doctorMaximizeBtn.addEventListener('click', () => {
      doctorOverlay.classList.toggle('maximized');
    });
  }

  // Close on outside click
  if (doctorOverlay) {
    doctorOverlay.addEventListener('click', (e) => {
      if (e.target === doctorOverlay) toggleDoctor();
    });
  }

  // Send
  if (doctorSendBtn) doctorSendBtn.addEventListener('click', doctorSendChat);
  if (doctorInput) {
    doctorInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doctorSendChat();
      }
    });
    // Doctor screenshot paste
    let doctorPendingScreenshot = null;
    doctorInput.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            doctorPendingScreenshot = ev.target.result;
            // Show preview inline and auto-send
            const prompt = doctorInput.value.trim() || 'Analyze this screenshot and help me fix any issues shown.';
            addDoctorMessage('user', `<img src="${doctorPendingScreenshot}" style="max-width:380px;max-height:200px;border-radius:8px;margin-bottom:8px;display:block;"><br>${escapeHtml(prompt)}`);
            doctorSetBusy(true);
            doctorSetStatus('Examining screenshot...', 'working');
            doctorSend({
              type: 'chat',
              payload: {
                message: `[User pasted a screenshot for diagnosis]\n\n${prompt}\n\n[The screenshot shows a dashboard issue. Read relevant source files to diagnose and fix the problem.]`
              }
            });
            doctorPendingScreenshot = null;
            doctorInput.value = '';
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    });
    doctorInput.addEventListener('input', () => {
      doctorInput.style.height = 'auto';
      doctorInput.style.height = Math.min(doctorInput.scrollHeight, 100) + 'px';
    });
  }

  // Reset doctor session
  if (doctorResetBtn) {
    doctorResetBtn.addEventListener('click', () => {
      doctorSend({ type: 'reset' });
      doctorMessages.innerHTML = '';
      addDoctorMessage('system',
        `<p><strong>Dashboard Doctor</strong> 🩺</p>` +
        `<p>Session reset. How can I help?</p>`
      );
      doctorStreamEl = null;
      doctorStreamBuf = '';
      doctorSetBusy(false);
    });
  }

  // Vitals check
  if (doctorVitalsBtn) {
    doctorVitalsBtn.addEventListener('click', async () => {
      try {
        const resp = await fetch('/api/doctor/vitals');
        const v = await resp.json();
        const html = `<div class="doctor-vitals">
          <h4>💓 Dashboard Vitals</h4>
          <table>
            <tr><td>Server</td><td class="vital-ok">● ${v.server}</td></tr>
            <tr><td>Uptime</td><td>${formatUptime(v.uptime)}</td></tr>
            <tr><td>Memory</td><td>${v.memory} MB</td></tr>
            <tr><td>PID</td><td>${v.pid}</td></tr>
            <tr><td>WS Clients</td><td>${v.wsClients}</td></tr>
            <tr><td>CRM Auth</td><td class="${v.crmAuth === 'ok' ? 'vital-ok' : 'vital-warn'}">● ${v.crmAuth}</td></tr>
            <tr><td>Today's Errors</td><td class="${(v.todayErrors || 0) > 0 ? 'vital-warn' : 'vital-ok'}">${v.todayErrors || 0}</td></tr>
            <tr><td>Log Lines</td><td>${v.todayLogLines || 0}</td></tr>
          </table>
        </div>`;
        addDoctorMessage('assistant', html);
      } catch (err) {
        addDoctorMessage('error', 'Could not fetch vitals: ' + escapeHtml(err.message));
      }
    });
  }

  function formatUptime(seconds) {
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h + 'h ' + m + 'm';
  }

  // ───── Init ─────
  connect();
  arenaShowIdle();
})();
