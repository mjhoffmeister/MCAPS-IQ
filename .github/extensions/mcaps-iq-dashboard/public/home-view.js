/* ============================================================
 *  Home View — Role-contextual landing dashboard
 * ============================================================ */
(function () {
  'use strict';

  var ROLE_CONFIGS = {
    specialist: {
      label: 'Specialist',
      greeting: 'Pipeline builder',
      actions: [
        { icon: '📊', label: 'Pipeline Review', prompt: '/weekly' },
        { icon: '🔍', label: 'Discovery', prompt: '/daily' },
        { icon: '📋', label: 'Milestone Review', prompt: 'Review my milestones' },
        { icon: '💡', label: 'What Next', prompt: '/what-next' }
      ]
    },
    se: {
      label: 'Solution Engineer',
      greeting: 'Technical proof driver',
      actions: [
        { icon: '📋', label: 'Milestone Review', prompt: 'Review my milestones' },
        { icon: '🚀', label: 'Proof Plan', prompt: 'Build a proof plan' },
        { icon: '🔧', label: 'Task Hygiene', prompt: 'Check my task hygiene' },
        { icon: '💡', label: 'What Next', prompt: '/what-next' }
      ]
    },
    csa: {
      label: 'Cloud Solution Architect',
      greeting: 'Execution owner',
      actions: [
        { icon: '📋', label: 'Milestone Review', prompt: 'Review my milestones' },
        { icon: '🏗️', label: 'Architecture Review', prompt: 'Run architecture review' },
        { icon: '📈', label: 'Consumption Plan', prompt: 'Build my consumption plan' },
        { icon: '💡', label: 'What Next', prompt: '/what-next' }
      ]
    },
    csam: {
      label: 'Customer Success AM',
      greeting: 'Outcome orchestrator',
      actions: [
        { icon: '📋', label: 'Milestone Review', prompt: 'Review my milestones' },
        { icon: '📈', label: 'Consumption Plan', prompt: 'Build my consumption plan' },
        { icon: '📊', label: 'Pipeline Review', prompt: '/weekly' },
        { icon: '💡', label: 'What Next', prompt: '/what-next' }
      ]
    },
    ae: {
      label: 'Account Executive',
      greeting: 'Relationship owner',
      actions: [
        { icon: '📊', label: 'Pipeline Review', prompt: '/weekly' },
        { icon: '🔍', label: 'Discovery', prompt: '/daily' },
        { icon: '📋', label: 'Account Plan', prompt: 'Build an account plan' },
        { icon: '💡', label: 'What Next', prompt: '/what-next' }
      ]
    },
    ats: {
      label: 'Account Technology Strategist',
      greeting: 'Technology strategist',
      actions: [
        { icon: '📋', label: 'Account Plan', prompt: 'Build an account plan' },
        { icon: '🗺️', label: 'Solution Mapper', prompt: 'Map technical solution' },
        { icon: '🎯', label: 'Exec Vision', prompt: 'Prepare executive conversation' },
        { icon: '💡', label: 'What Next', prompt: '/what-next' }
      ]
    },
    ia: {
      label: 'Industry Advisor',
      greeting: 'Industry advisor',
      actions: [
        { icon: '📊', label: 'Pipeline Qualification', prompt: 'Qualify my pipeline' },
        { icon: '🔍', label: 'Discovery', prompt: '/daily' },
        { icon: '🏭', label: 'Industry Analysis', prompt: 'Run industry analysis' },
        { icon: '💡', label: 'What Next', prompt: '/what-next' }
      ]
    },
    sd: {
      label: 'Sales Director',
      greeting: 'Team coach',
      actions: [
        { icon: '📊', label: 'Pipeline Governance', prompt: '/weekly' },
        { icon: '📋', label: 'Weekly Review', prompt: '/weekly' },
        { icon: '👥', label: 'Team Coaching', prompt: 'Coach my team' },
        { icon: '💡', label: 'What Next', prompt: '/what-next' }
      ]
    }
  };

  var container = null;
  var summary = null;
  var settings = null;
  var unsubscribe = null;

  // ── Helpers ──────────────────────────────────────────────────

  function getConnectionStatus() {
    if (typeof window.AppState === 'undefined') return 'waiting';
    var state = window.AppState.getState();
    var sessions = state.sessions || {};
    var ids = Object.keys(sessions);
    if (!ids.length) return 'waiting';
    var hasActive = ids.some(function (id) {
      return sessions[id].metadata.status === 'active';
    });
    return hasActive ? 'connected' : 'idle';
  }

  function renderStatusBadge(status) {
    var map = {
      connected: { text: '● Connected', cls: 'mcaps-status--connected' },
      idle:      { text: '◌ Idle',      cls: 'mcaps-status--idle' },
      waiting:   { text: '○ Waiting',   cls: 'mcaps-status--waiting' }
    };
    var s = map[status] || map.waiting;
    return `<span class="mcaps-status-badge ${s.cls}">${s.text}</span>`;
  }

  function renderRoleCard(role, cfg) {
    if (!cfg) {
      return `
        <div class="mcaps-role-card mcaps-role-card--unset">
          <span class="mcaps-role-card__icon">👤</span>
          <div class="mcaps-role-card__body">
            <div class="mcaps-role-card__name">Select your role</div>
            <div class="mcaps-role-card__sub">Configure in Settings to unlock role-specific actions</div>
          </div>
          <button class="mcaps-btn mcaps-btn--secondary mcaps-role-card__cta"
                  onclick="window.location.hash='#/settings'">Configure</button>
        </div>`;
    }
    return `
      <div class="mcaps-role-card mcaps-role-card--set">
        <span class="mcaps-role-card__icon">👤</span>
        <div class="mcaps-role-card__body">
          <div class="mcaps-role-card__name">${cfg.label}</div>
          <div class="mcaps-role-card__sub">${cfg.greeting}</div>
        </div>
        <button class="mcaps-btn mcaps-btn--ghost mcaps-role-card__cta"
                onclick="window.location.hash='#/settings'">Change</button>
      </div>`;
  }

  function renderActionsGrid(cfg) {
    var actions = cfg ? cfg.actions : [
      { icon: '🌅', label: 'Morning Brief',   prompt: 'Give me my morning brief' },
      { icon: '📊', label: 'Pipeline Review', prompt: '/weekly' },
      { icon: '📋', label: 'Milestone Review',prompt: 'Review my milestones' },
      { icon: '💡', label: 'What Next',       prompt: '/what-next' }
    ];
    var cards = actions.map(function (a) {
      return `
        <button class="mcaps-action-card" data-prompt="${a.prompt.replace(/"/g, '&quot;')}">
          <span class="mcaps-action-card__icon">${a.icon}</span>
          <span class="mcaps-action-card__label">${a.label}</span>
        </button>`;
    });
    return `<div class="mcaps-actions-grid">${cards.join('')}</div>`;
  }

  function renderStatsBar(sum) {
    if (!sum) {
      return '<div class="mcaps-stats-bar mcaps-stats-bar--loading">Loading capabilities…</div>';
    }
    return `
      <div class="mcaps-stats-bar">
        <div class="mcaps-stat">
          <span class="mcaps-stat__value">${sum.skillCount || 0}</span>
          <span class="mcaps-stat__label">Skills</span>
        </div>
        <span class="mcaps-stat__divider"></span>
        <div class="mcaps-stat">
          <span class="mcaps-stat__value">${sum.promptCount || 0}</span>
          <span class="mcaps-stat__label">Prompts</span>
        </div>
        <span class="mcaps-stat__divider"></span>
        <div class="mcaps-stat">
          <span class="mcaps-stat__value">${sum.agentCount || 0}</span>
          <span class="mcaps-stat__label">Agents</span>
        </div>
        <span class="mcaps-stat__divider"></span>
        <div class="mcaps-stat">
          <span class="mcaps-stat__value">${sum.roleCount || 0}</span>
          <span class="mcaps-stat__label">Roles</span>
        </div>
      </div>`;
  }

  // ── Render ───────────────────────────────────────────────────

  function render() {
    if (!container) return;
    var role = settings && settings.role ? settings.role : null;
    var cfg = role ? ROLE_CONFIGS[role] : null;
    var status = getConnectionStatus();

    container.innerHTML = `
      <div class="mcaps-home">
        <div class="mcaps-hero">
          <div class="mcaps-hero__content">
            <h1 class="mcaps-hero__title">Welcome to MCAPS IQ</h1>
            <p class="mcaps-hero__subtitle">Your AI-powered account team assistant</p>
          </div>
          <div class="mcaps-hero__meta">
            ${renderStatusBadge(status)}
          </div>
        </div>

        <div class="mcaps-home__body">
          <section class="mcaps-section">
            <h2 class="mcaps-section__title">Your Role</h2>
            ${renderRoleCard(role, cfg)}
          </section>

          <section class="mcaps-section">
            <h2 class="mcaps-section__title">Quick Actions</h2>
            ${renderActionsGrid(cfg)}
          </section>
        </div>

        ${renderStatsBar(summary)}
      </div>`;

    container.querySelectorAll('.mcaps-action-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var prompt = card.dataset.prompt;
        if (!prompt) return;
        if (typeof window.dispatchCopilotAction === 'function') {
          window.dispatchCopilotAction(prompt);
        } else {
          window.location.hash = '#/sessions';
        }
      });
    });
  }

  // ── Data loading ─────────────────────────────────────────────

  function loadData() {
    return Promise.all([
      fetch('/api/capabilities/summary').then(function (r) { return r.ok ? r.json() : null; }),
      fetch('/api/settings').then(function (r) { return r.ok ? r.json() : null; })
    ]).then(function (results) {
      summary = results[0];
      settings = results[1];
    }).catch(function () {
      // render with whatever we have
    }).then(render);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function mount(el) {
    container = el;
    container.innerHTML = '<div class="mcaps-home mcaps-loading-state"><span class="mcaps-spinner"></span>Loading…</div>';
    loadData();

    if (typeof window.AppState !== 'undefined' && typeof window.AppState.subscribe === 'function') {
      unsubscribe = window.AppState.subscribe(function () {
        if (container) render();
      });
    }
  }

  function unmount() {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
      unsubscribe = null;
    }
    container = null;
  }

  function onActivate() {
    // Re-fetch settings in case role was changed via settings view
    if (container) {
      fetch('/api/settings')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (s) { if (s) { settings = s; render(); } })
        .catch(function () {});
    }
  }

  window.homeView = { mount: mount, unmount: unmount, onActivate: onActivate };
})();
