/* ============================================================
 *  Opportunities View — Pipeline Health Dashboard
 *  Live CRM data via MCP Client bridge. Sortable table, MCEM
 *  stage badges, health indicators, milestone drill-down.
 * ============================================================ */
(function () {
  'use strict';

  var _el = null;
  var _data = { opportunities: [], summary: {} };
  var _milestoneCache = {};
  var _sortCol = 'estimated_close';
  var _sortDir = 'asc';
  var _expanded = new Set();
  var _loading = false;
  var _error = null;
  var _filters = { stage: '', health: '', search: '' };

  var STAGE_COLORS = {
    '1': { bg: '#dbeafe', text: '#1e40af', label: 'S1 — Listen & Consult' },
    '2': { bg: '#e0e7ff', text: '#3730a3', label: 'S2 — Inspire & Design' },
    '3': { bg: '#ede9fe', text: '#5b21b6', label: 'S3 — Empower & Achieve' },
    '4': { bg: '#fae8ff', text: '#86198f', label: 'S4 — Realize Value' },
    '5': { bg: '#fce7f3', text: '#9d174d', label: 'S5 — Manage & Optimize' }
  };

  var MS_STATUS = {
    861980000: { label: 'On Track', cls: 'ms-on-track' },
    861980001: { label: 'At Risk', cls: 'ms-at-risk' },
    861980002: { label: 'Blocked', cls: 'ms-blocked' },
    861980003: { label: 'Completed', cls: 'ms-completed' },
    861980004: { label: 'Cancelled', cls: 'ms-cancelled' },
    861980005: { label: 'Not Started', cls: 'ms-not-started' },
    861980007: { label: 'Closed Incomplete', cls: 'ms-closed' }
  };

  var COMMITMENT = { 861980000: 'Uncommitted', 861980003: 'Committed', 861980002: 'Pipeline' };

  // ── Helpers ──────────────────────────────────────────────────

  function esc(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function currency(val) {
    if (val == null || val === 0) return '$0';
    if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return '$' + Math.round(val / 1000) + 'K';
    return '$' + Math.round(val);
  }

  function fmtDate(d) {
    if (!d) return '—';
    var p = d.slice(0, 10).split('-');
    return p.length === 3 ? p[1] + '/' + p[2] + '/' + p[0] : d;
  }

  function stageNum(stage) {
    if (!stage) return '?';
    var m = String(stage).match(/(\d)/);
    return m ? m[1] : '?';
  }

  function crmLink(opp) {
    var id = opp.id || opp.opportunityId || '';
    return 'https://microsoftsales.crm.dynamics.com/main.aspx?etn=opportunity&id=' +
      encodeURIComponent(id) + '&pagetype=entityrecord';
  }

  function healthFromMilestones(milestones) {
    if (!milestones || !milestones.length) return 'green';
    var hasBlocked = milestones.some(function (m) { return m.status === 861980002; });
    var hasAtRisk = milestones.some(function (m) { return m.status === 861980001; });
    if (hasBlocked) return 'red';
    if (hasAtRisk) return 'yellow';
    return 'green';
  }

  function healthIcon(h) {
    return h === 'red' ? '🔴' : h === 'yellow' ? '🟡' : '🟢';
  }

  // ── Normalize CRM data ──────────────────────────────────────

  function normalizeOpp(raw) {
    return {
      id: raw.id || raw.opportunityId || '',
      name: raw.name || raw.opportunityName || '',
      number: raw.opportunityNumber || raw.number || '',
      account: raw.accountName || raw.account || '',
      stage: raw.stageName || raw.stage || '',
      stageNum: stageNum(raw.stageName || raw.stage || ''),
      estimatedValue: raw.estimatedValue || raw.estimatedvalue || 0,
      monthlyUse: raw.totalMonthlyUse || raw.monthlyUse || 0,
      estimatedClose: raw.estimatedCloseDate || raw.estimated_close || '',
      health: raw.health || 'green',
      relationship: raw.relationship || '',
      dealTeam: raw.dealTeam || [],
      milestones: [],
      _raw: raw
    };
  }

  // ── Data loading ────────────────────────────────────────────

  function loadData() {
    _loading = true;
    _error = null;
    render();

    fetch('/api/crm/opportunities')
      .then(function (r) {
        if (!r.ok) throw new Error('CRM returned ' + r.status);
        return r.json();
      })
      .then(function (data) {
        // Handle various response shapes from the MCP server
        var opps = [];
        if (Array.isArray(data)) {
          opps = data;
        } else if (data.opportunities) {
          opps = data.opportunities;
        } else if (data.content) {
          // MCP text content — try to parse
          try {
            var parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            opps = Array.isArray(parsed) ? parsed : parsed.opportunities || [];
          } catch { opps = []; }
        }

        _data.opportunities = opps.map(normalizeOpp);
        _data.summary = buildSummary(_data.opportunities);
        _loading = false;
        render();
      })
      .catch(function (err) {
        _error = err.message;
        _loading = false;
        render();
      });
  }

  function loadMilestones(oppId) {
    if (_milestoneCache[oppId]) return;
    _milestoneCache[oppId] = 'loading';
    render();

    fetch('/api/crm/milestones?opportunityId=' + encodeURIComponent(oppId))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var milestones = [];
        if (Array.isArray(data)) milestones = data;
        else if (data?.milestones) milestones = data.milestones;
        else if (data?.content) {
          try {
            var p = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            milestones = Array.isArray(p) ? p : p.milestones || [];
          } catch { milestones = []; }
        }
        _milestoneCache[oppId] = milestones;

        // Update health based on actual milestones
        var opp = _data.opportunities.find(function (o) { return o.id === oppId; });
        if (opp) opp.health = healthFromMilestones(milestones);

        render();
      })
      .catch(function () {
        _milestoneCache[oppId] = [];
        render();
      });
  }

  // ── Summary ─────────────────────────────────────────────────

  function buildSummary(opps) {
    var accounts = new Set();
    var totalValue = 0, totalMonthly = 0;
    opps.forEach(function (o) {
      accounts.add(o.account);
      totalValue += o.estimatedValue || 0;
      totalMonthly += o.monthlyUse || 0;
    });
    return {
      count: opps.length,
      accountCount: accounts.size,
      totalValue: totalValue,
      totalMonthly: totalMonthly
    };
  }

  // ── Filtering & Sorting ─────────────────────────────────────

  function applyFilters(opps) {
    return opps.filter(function (o) {
      if (_filters.stage && o.stageNum !== _filters.stage) return false;
      if (_filters.health && o.health !== _filters.health) return false;
      if (_filters.search) {
        var q = _filters.search.toLowerCase();
        var hay = [o.name, o.account, o.number].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function sortOpps(opps) {
    var dir = _sortDir === 'asc' ? 1 : -1;
    return opps.slice().sort(function (a, b) {
      var av, bv;
      switch (_sortCol) {
        case 'name': av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); break;
        case 'account': av = (a.account || '').toLowerCase(); bv = (b.account || '').toLowerCase(); break;
        case 'stage': av = a.stageNum; bv = b.stageNum; break;
        case 'estimated_close': av = a.estimatedClose || '9999'; bv = b.estimatedClose || '9999'; break;
        case 'monthly_use': av = a.monthlyUse || 0; bv = b.monthlyUse || 0; break;
        case 'health': av = { red: 0, yellow: 1, green: 2 }[a.health] ?? 3; bv = { red: 0, yellow: 1, green: 2 }[b.health] ?? 3; break;
        default: av = 0; bv = 0;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  // ── Render ──────────────────────────────────────────────────

  function render() {
    if (!_el) return;
    var html = '<div class="opps-view">';

    // Header
    html += '<div class="opps-header">' +
      '<h2>📋 My Opportunities</h2>' +
      '<div class="opps-actions">' +
        '<button class="opps-refresh-btn" data-action="refresh">🔄 Refresh</button>' +
      '</div>' +
    '</div>';

    // Loading / Error
    if (_loading) {
      html += '<div class="opps-loading"><div class="spinner"></div><p>Loading opportunities from CRM…</p></div>';
      html += '</div>';
      _el.innerHTML = html;
      bindEvents();
      return;
    }

    if (_error) {
      html += '<div class="opps-error">' +
        '<p>⚠️ ' + esc(_error) + '</p>' +
        '<p class="opps-error-hint">Make sure you are authenticated with <code>az login</code> and have access to MSX CRM.</p>' +
        '<button class="opps-refresh-btn" data-action="refresh">Retry</button>' +
      '</div>';
      html += '</div>';
      _el.innerHTML = html;
      bindEvents();
      return;
    }

    if (_data.opportunities.length === 0) {
      html += '<div class="opps-empty">' +
        '<p>No opportunities found on your deal team.</p>' +
        '<button class="opps-refresh-btn" data-action="refresh">Refresh from CRM</button>' +
      '</div>';
      html += '</div>';
      _el.innerHTML = html;
      bindEvents();
      return;
    }

    // Summary cards
    var s = _data.summary;
    html += '<div class="opps-summary">' +
      '<div class="summary-card"><span class="summary-val">' + s.count + '</span><span class="summary-label">Opportunities</span></div>' +
      '<div class="summary-card"><span class="summary-val">' + currency(s.totalValue) + '</span><span class="summary-label">Pipeline Value</span></div>' +
      '<div class="summary-card"><span class="summary-val">' + currency(s.totalMonthly) + '</span><span class="summary-label">Monthly Use</span></div>' +
      '<div class="summary-card"><span class="summary-val">' + s.accountCount + '</span><span class="summary-label">Accounts</span></div>' +
    '</div>';

    // Filters
    html += '<div class="opps-filters">';
    html += '<div class="filter-pills">';
    ['1', '2', '3', '4', '5'].forEach(function (st) {
      var sc = STAGE_COLORS[st] || {};
      var active = _filters.stage === st ? ' active' : '';
      html += '<button class="stage-pill' + active + '" data-stage="' + st + '" style="--pill-bg:' + (sc.bg || '#eee') + ';--pill-text:' + (sc.text || '#333') + '">S' + st + '</button>';
    });
    html += '</div>';
    html += '<div class="filter-pills">';
    [{ k: 'green', i: '🟢' }, { k: 'yellow', i: '🟡' }, { k: 'red', i: '🔴' }].forEach(function (h) {
      var active = _filters.health === h.k ? ' active' : '';
      html += '<button class="health-pill' + active + '" data-health="' + h.k + '">' + h.i + '</button>';
    });
    html += '</div>';
    html += '<input type="text" class="opps-search" placeholder="Search opportunities…" value="' + esc(_filters.search) + '">';
    html += '</div>';

    // Table
    var filtered = applyFilters(_data.opportunities);
    var sorted = sortOpps(filtered);

    html += '<div class="opps-table-wrap"><table class="opps-table">';
    html += '<thead><tr>';
    var cols = [
      { key: 'name', label: 'Opportunity' },
      { key: 'account', label: 'Account' },
      { key: 'stage', label: 'Stage' },
      { key: 'health', label: 'Health' },
      { key: 'estimated_close', label: 'Close Date' },
      { key: 'monthly_use', label: 'Monthly Use' },
      { key: 'actions', label: '' }
    ];
    cols.forEach(function (c) {
      var arrow = _sortCol === c.key ? (_sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      var sortable = c.key !== 'actions' ? ' data-sort="' + c.key + '"' : '';
      html += '<th' + sortable + '>' + c.label + arrow + '</th>';
    });
    html += '</tr></thead><tbody>';

    if (sorted.length === 0) {
      html += '<tr><td colspan="7" class="empty-state">No matches for current filters</td></tr>';
    }

    sorted.forEach(function (opp) {
      var isOpen = _expanded.has(opp.id);
      var sn = opp.stageNum;
      var sc = STAGE_COLORS[sn] || { bg: '#f1f5f9', text: '#475569', label: 'Stage ' + sn };
      var rel = opp.relationship ? '<span class="rel-badge">' + esc(opp.relationship) + '</span>' : '';

      html += '<tr class="opp-row' + (isOpen ? ' expanded' : '') + '" data-opp-id="' + esc(opp.id) + '">';
      html += '<td><a href="' + crmLink(opp) + '" target="_blank" class="opp-link">' + esc(opp.name || opp.number) + '</a> ' + rel + '</td>';
      html += '<td>' + esc(opp.account) + '</td>';
      html += '<td><span class="stage-badge" style="background:' + sc.bg + ';color:' + sc.text + '" title="' + esc(sc.label) + '">S' + sn + '</span></td>';
      html += '<td>' + healthIcon(opp.health) + '</td>';
      html += '<td>' + fmtDate(opp.estimatedClose) + '</td>';
      html += '<td>' + currency(opp.monthlyUse) + '</td>';
      html += '<td><button class="opp-action-btn" data-action="expand" data-opp="' + esc(opp.id) + '" title="' + (isOpen ? 'Collapse' : 'Expand milestones') + '">' + (isOpen ? '▼' : '▶') + '</button></td>';
      html += '</tr>';

      // Milestone expansion
      if (isOpen) {
        var ms = _milestoneCache[opp.id];
        html += '<tr class="milestone-row"><td colspan="7"><div class="milestone-panel">';

        if (ms === 'loading') {
          html += '<div class="ms-loading">Loading milestones…</div>';
        } else if (!ms || ms.length === 0) {
          html += '<div class="ms-empty">No milestones found</div>';
        } else {
          html += '<table class="ms-table"><thead><tr><th>Milestone</th><th>Status</th><th>Commitment</th><th>Due Date</th><th>Monthly Use</th><th>Owner</th></tr></thead><tbody>';
          ms.forEach(function (m) {
            var statusCode = m.status || m.milestoneStatus || m.msp_milestonestatus;
            var statusInfo = MS_STATUS[statusCode] || { label: String(statusCode), cls: '' };
            var commit = COMMITMENT[m.commitment || m.commitmentRecommendation || m.msp_commitmentrecommendation] || '—';
            var mDate = m.milestoneDate || m.msp_milestonedate || m.date || '';
            var mUse = m.monthlyUse || m.msp_monthlyuse || 0;
            var mOwner = m.ownerName || m.owner || '—';
            var mName = m.name || m.milestoneName || m.msp_name || '—';

            html += '<tr>';
            html += '<td>' + esc(mName) + '</td>';
            html += '<td><span class="ms-status ' + statusInfo.cls + '">' + esc(statusInfo.label) + '</span></td>';
            html += '<td>' + esc(commit) + '</td>';
            html += '<td>' + fmtDate(mDate) + '</td>';
            html += '<td>' + currency(mUse) + '</td>';
            html += '<td>' + esc(mOwner) + '</td>';
            html += '</tr>';
          });
          html += '</tbody></table>';
        }

        html += '<div class="ms-actions">' +
          '<button class="ms-action" data-action="deep-dive" data-opp-name="' + esc(opp.name) + '">🔍 Deep Dive</button>' +
          '<button class="ms-action" data-action="prep" data-opp-name="' + esc(opp.name) + '">📋 Prep Me</button>' +
        '</div>';
        html += '</div></td></tr>';
      }
    });

    html += '</tbody></table></div>';
    html += '</div>';

    _el.innerHTML = html;
    bindEvents();
  }

  // ── Events ──────────────────────────────────────────────────

  function bindEvents() {
    if (!_el) return;

    _el.querySelectorAll('[data-action="refresh"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _milestoneCache = {};
        _expanded.clear();
        fetch('/api/crm/refresh', { method: 'POST' }).then(loadData).catch(loadData);
      });
    });

    _el.querySelectorAll('[data-action="expand"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var oppId = btn.dataset.opp;
        if (_expanded.has(oppId)) {
          _expanded.delete(oppId);
        } else {
          _expanded.add(oppId);
          loadMilestones(oppId);
        }
        render();
      });
    });

    _el.querySelectorAll('[data-sort]').forEach(function (th) {
      th.style.cursor = 'pointer';
      th.addEventListener('click', function () {
        var col = th.dataset.sort;
        if (_sortCol === col) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        else { _sortCol = col; _sortDir = 'asc'; }
        render();
      });
    });

    _el.querySelectorAll('.stage-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _filters.stage = _filters.stage === btn.dataset.stage ? '' : btn.dataset.stage;
        render();
      });
    });

    _el.querySelectorAll('.health-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _filters.health = _filters.health === btn.dataset.health ? '' : btn.dataset.health;
        render();
      });
    });

    var searchInput = _el.querySelector('.opps-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        _filters.search = searchInput.value.trim();
        render();
        var newInput = _el.querySelector('.opps-search');
        if (newInput) { newInput.focus(); newInput.selectionStart = newInput.selectionEnd = newInput.value.length; }
      });
    }

    _el.querySelectorAll('[data-action="deep-dive"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (window.dispatchCopilotAction) {
          window.dispatchCopilotAction('Deep dive on opportunity: ' + btn.dataset.oppName);
        }
      });
    });

    _el.querySelectorAll('[data-action="prep"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (window.dispatchCopilotAction) {
          window.dispatchCopilotAction('Prep me for ' + btn.dataset.oppName);
        }
      });
    });
  }

  // ── Public API ──────────────────────────────────────────────

  function mount(c) { _el = c; render(); loadData(); }
  function unmount() { _el = null; }
  function onActivate() { if (_data.opportunities.length === 0 && !_loading) loadData(); }

  window.opportunitiesView = { mount: mount, unmount: unmount, onActivate: onActivate };
})();
