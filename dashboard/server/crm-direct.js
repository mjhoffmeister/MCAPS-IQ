// Direct CRM access layer — bypasses MCP/Copilot SDK for fast read-only operations
// Modeled after msx-helper's direct OData approach with auth from mcp/msx/src/auth.js

import { createAuthService } from '../../mcp/msx/src/auth.js';

const API_VERSION = 'v9.2';
const DEFAULT_CRM_URL = 'https://microsoftsales.crm.dynamics.com';
const DEFAULT_TENANT_ID = '72f988bf-86f1-41af-91ab-2d7cd011db47';
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Field selections (from msx-helper) ───

const MILESTONE_SELECT = [
  'msp_engagementmilestoneid',
  'msp_milestonenumber',
  'msp_name',
  '_msp_workloadlkid_value',
  'msp_commitmentrecommendation',
  'msp_milestonecategory',
  'msp_monthlyuse',
  'msp_milestonedate',
  'msp_milestonestatus',
  '_ownerid_value',
  '_msp_opportunityid_value',
  'msp_forecastcommentsjsonfield',
  'msp_forecastcomments'
].join(',');

const OPP_SELECT = [
  'opportunityid',
  'name',
  'msp_opportunitynumber',
  'estimatedclosedate',
  'msp_estcompletiondate',
  'msp_consumptionconsumedrecurring',
  '_ownerid_value',
  '_parentaccountid_value',
  'msp_salesplay'
].join(',');

const ACCOUNT_SELECT = [
  'accountid',
  'name',
  'msp_mstopparentid',
  '_parentaccountid_value',
  'msp_segmentgroup',
  'msp_endcustomersegmentcode'
].join(',');

const TASK_SELECT = [
  'activityid',
  'subject',
  'description',
  'statuscode',
  'statecode',
  'scheduledstart',
  'scheduledend',
  'msp_taskcategory',
  '_ownerid_value',
  '_regardingobjectid_value'
].join(',');

// ─── OData string sanitization ───

function sanitizeODataString(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/'/g, "''");
}

function isValidGuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
}

function isValidTpid(value) {
  return /^\d+$/.test(value || '');
}

// ─── Status label maps ───

const MILESTONE_STATUS = {
  861980000: 'On Track',
  861980001: 'At Risk',
  861980002: 'Blocked',
  861980003: 'Completed',
  861980004: 'Cancelled',
  861980005: 'Not Started'
};

const COMMITMENT_STATUS = {
  861980000: 'Uncommitted',
  861980001: 'Committed',
  861980002: 'De-committed'
};

// ─── CRM Direct Client ───

export function createCrmDirect() {
  const authService = createAuthService({
    crmUrl: DEFAULT_CRM_URL,
    tenantId: DEFAULT_TENANT_ID
  });

  function buildUrl(entityPath, query) {
    const url = new URL(`${DEFAULT_CRM_URL}/api/data/${API_VERSION}/${entityPath}`);
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    return url;
  }

  async function crmFetch(entityPath, query = {}) {
    const authResult = await authService.ensureAuth();
    if (!authResult.success) {
      return { ok: false, status: 401, error: authResult.error || 'Not authenticated' };
    }

    const token = authService.getToken();
    const url = buildUrl(entityPath, query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          Accept: 'application/json',
          Prefer: 'odata.include-annotations="*"',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try {
          const data = await response.json();
          msg = data?.error?.message || msg;
        } catch { /* ignore */ }

        // On 401, clear token and retry once
        if (response.status === 401) {
          authService.clearToken();
          const retry = await authService.ensureAuth();
          if (retry.success) {
            return crmFetch(entityPath, query);
          }
        }

        return { ok: false, status: response.status, error: msg };
      }

      const data = await response.json();
      return { ok: true, status: 200, data };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        return { ok: false, status: 408, error: 'Request timed out (30s) — try narrowing your search' };
      }
      return { ok: false, status: 500, error: err.message };
    }
  }

  // ─── High-level query functions ───

  async function getAuthStatus() {
    const result = await authService.ensureAuth();
    if (!result.success) {
      return { ok: false, authenticated: false, error: result.error };
    }
    const status = authService.getAuthStatus();
    return { ok: true, authenticated: true, ...status };
  }

  async function whoAmI() {
    const result = await crmFetch('WhoAmI');
    if (!result.ok) return result;
    return { ok: true, data: result.data };
  }

  async function searchAccounts(keyword) {
    const sanitized = sanitizeODataString(keyword);
    const filter = isValidTpid(keyword)
      ? `msp_mstopparentid eq '${sanitized}'`
      : `contains(name,'${sanitized}')`;

    return crmFetch('accounts', {
      $filter: filter,
      $select: ACCOUNT_SELECT,
      $orderby: 'name',
      $top: '50'
    });
  }

  async function getAccountsByTpids(tpids) {
    if (!Array.isArray(tpids) || tpids.length === 0) {
      return { ok: false, error: 'No TPIDs provided' };
    }
    // Chunk into groups of 25 to keep URL short
    const allAccounts = [];
    for (let i = 0; i < tpids.length; i += 25) {
      const chunk = tpids.slice(i, i + 25);
      const filter = chunk.map(t => `msp_mstopparentid eq '${sanitizeODataString(String(t))}'`).join(' or ');
      const result = await crmFetch('accounts', {
        $filter: filter,
        $select: ACCOUNT_SELECT,
        $orderby: 'name'
      });
      if (result.ok && result.data?.value) {
        allAccounts.push(...result.data.value);
      }
    }
    return { ok: true, data: { value: allAccounts } };
  }

  async function searchOpportunities(searchTerm) {
    const sanitized = sanitizeODataString(searchTerm);
    let filter;
    if (/^7-\d+$/.test(searchTerm)) {
      filter = `msp_opportunitynumber eq '${sanitized}'`;
    } else if (isValidGuid(searchTerm)) {
      return crmFetch(`opportunities(${searchTerm})`, { $select: OPP_SELECT });
    } else if (isValidTpid(searchTerm)) {
      // TPID: find accounts first, then get their opportunities
      const acctResult = await searchAccounts(searchTerm);
      if (!acctResult.ok) return acctResult;
      const accounts = acctResult.data?.value || [];
      if (accounts.length === 0) return { ok: true, data: { value: [] } };
      const all = [];
      for (const a of accounts) {
        const r = await getOpportunitiesByAccount(a.accountid);
        if (r.ok && r.data?.value) all.push(...r.data.value);
      }
      return { ok: true, data: { value: all } };
    } else {
      // Name search: find accounts first, then get their opportunities
      const acctResult = await searchAccounts(searchTerm);
      if (acctResult.ok && acctResult.data?.value?.length > 0) {
        const all = [];
        for (const a of acctResult.data.value.slice(0, 10)) {
          const r = await getOpportunitiesByAccount(a.accountid);
          if (r.ok && r.data?.value) all.push(...r.data.value);
        }
        return { ok: true, data: { value: all } };
      }
      // Fallback: direct opp name search
      filter = `contains(name,'${sanitized}')`;
    }

    return crmFetch('opportunities', {
      $filter: filter,
      $select: OPP_SELECT,
      $top: '50'
    });
  }

  async function getOpportunitiesByAccount(accountId) {
    if (!isValidGuid(accountId)) {
      return { ok: false, error: 'Invalid account GUID' };
    }
    return crmFetch('opportunities', {
      $filter: `_parentaccountid_value eq '${accountId}'`,
      $select: OPP_SELECT,
      $orderby: 'name',
      $top: '100'
    });
  }

  async function searchMilestones(searchTerm) {
    const sanitized = sanitizeODataString(searchTerm);
    let filter;
    if (/^7-\d+$/.test(searchTerm)) {
      filter = `msp_milestonenumber eq '${sanitized}'`;
    } else if (isValidGuid(searchTerm)) {
      return crmFetch(`msp_engagementmilestones(${searchTerm})`, { $select: MILESTONE_SELECT });
    } else {
      filter = `contains(msp_name,'${sanitized}')`;
    }

    return crmFetch('msp_engagementmilestones', {
      $filter: filter,
      $select: MILESTONE_SELECT,
      $top: '50'
    });
  }

  async function getMilestonesByOpportunity(opportunityId) {
    if (!isValidGuid(opportunityId)) {
      return { ok: false, error: 'Invalid opportunity GUID' };
    }
    return crmFetch('msp_engagementmilestones', {
      $filter: `_msp_opportunityid_value eq '${opportunityId}'`,
      $select: MILESTONE_SELECT,
      $orderby: 'msp_milestonedate desc',
      $top: '100'
    });
  }

  async function getMilestonesByStatus(status, ownerId) {
    const filters = [];
    if (status !== undefined && status !== null) {
      filters.push(`msp_milestonestatus eq ${Number(status)}`);
    } else {
      // Default: exclude completed
      filters.push(`msp_milestonestatus ne 861980003`);
    }
    if (ownerId && isValidGuid(ownerId)) {
      filters.push(`_ownerid_value eq '${ownerId}'`);
    }

    return crmFetch('msp_engagementmilestones', {
      $filter: filters.join(' and '),
      $select: MILESTONE_SELECT,
      $orderby: 'msp_milestonedate asc',
      $top: '50'
    });
  }

  async function getTasksByMilestone(milestoneId) {
    if (!isValidGuid(milestoneId)) {
      return { ok: false, error: 'Invalid milestone GUID' };
    }
    return crmFetch('tasks', {
      $filter: `_regardingobjectid_value eq '${milestoneId}'`,
      $select: TASK_SELECT,
      $orderby: 'scheduledend asc',
      $top: '50'
    });
  }

  async function runCustomQuery(entitySet, options = {}) {
    const query = {};
    if (options.filter) query.$filter = options.filter;
    if (options.select) query.$select = options.select;
    if (options.orderby) query.$orderby = options.orderby;
    if (options.top) query.$top = String(options.top);
    if (options.expand) query.$expand = options.expand;

    return crmFetch(entitySet, query);
  }

  // ─── Composite: full account drill-down ───

  async function drillDownAccount(keyword) {
    // Smart input detection: if keyword looks like an opp/milestone number (7-xxx),
    // resolve it to its parent account first, then drill from there.
    if (/^7-\S+$/i.test(keyword)) {
      const sanitized = sanitizeODataString(keyword);

      // Try opportunity number and milestone number in parallel
      const [oppResult, msResult] = await Promise.all([
        crmFetch('opportunities', {
          $filter: `msp_opportunitynumber eq '${sanitized}'`,
          $select: OPP_SELECT,
          $top: '1'
        }),
        crmFetch('msp_engagementmilestones', {
          $filter: `msp_milestonenumber eq '${sanitized}'`,
          $select: MILESTONE_SELECT,
          $top: '1'
        })
      ]);

      // If we found an opportunity, drill from its parent account
      const foundOpp = oppResult.ok && oppResult.data?.value?.[0];
      if (foundOpp) {
        const accountId = foundOpp._parentaccountid_value;
        const opportunities = [foundOpp];

        // Get parent account details
        let accounts = [];
        if (accountId && isValidGuid(accountId)) {
          const acctR = await crmFetch(`accounts(${accountId})`, { $select: ACCOUNT_SELECT });
          if (acctR.ok && acctR.data) accounts = [acctR.data];
        }

        // Get milestones for this opportunity
        const milestones = [];
        const msByOpp = await crmFetch('msp_engagementmilestones', {
          $filter: `_msp_opportunityid_value eq '${foundOpp.opportunityid}' and msp_milestonestatus ne 861980003`,
          $select: MILESTONE_SELECT,
          $orderby: 'msp_milestonedate asc',
          $top: '100'
        });
        if (msByOpp.ok && msByOpp.data?.value) milestones.push(...msByOpp.data.value);

        return {
          ok: true,
          data: {
            accounts: accounts.map(a => formatAccount(a)),
            opportunities: opportunities.map(o => formatOpportunity(o)),
            milestones: milestones.map(m => formatMilestone(m))
          }
        };
      }

      // If we found a milestone, drill from its opportunity's parent account
      const foundMs = msResult.ok && msResult.data?.value?.[0];
      if (foundMs) {
        const oppId = foundMs._msp_opportunityid_value;
        let accounts = [];
        let opportunities = [];
        const milestones = [foundMs];

        if (oppId && isValidGuid(oppId)) {
          const oppR = await crmFetch(`opportunities(${oppId})`, { $select: OPP_SELECT });
          if (oppR.ok && oppR.data) {
            opportunities = [oppR.data];
            const acctId = oppR.data._parentaccountid_value;
            if (acctId && isValidGuid(acctId)) {
              const acctR = await crmFetch(`accounts(${acctId})`, { $select: ACCOUNT_SELECT });
              if (acctR.ok && acctR.data) accounts = [acctR.data];
            }
          }
        }

        return {
          ok: true,
          data: {
            accounts: accounts.map(a => formatAccount(a)),
            opportunities: opportunities.map(o => formatOpportunity(o)),
            milestones: milestones.map(m => formatMilestone(m))
          }
        };
      }
      // If neither found, fall through to account name search
    }

    // Handle GUID input — try opportunity or milestone direct lookup
    if (isValidGuid(keyword)) {
      // Try opportunity first
      const oppR = await crmFetch(`opportunities(${keyword})`, { $select: OPP_SELECT });
      if (oppR.ok && oppR.data?.opportunityid) {
        const opp = oppR.data;
        let accounts = [];
        if (opp._parentaccountid_value && isValidGuid(opp._parentaccountid_value)) {
          const acctR = await crmFetch(`accounts(${opp._parentaccountid_value})`, { $select: ACCOUNT_SELECT });
          if (acctR.ok && acctR.data) accounts = [acctR.data];
        }
        const milestones = [];
        const msByOpp = await crmFetch('msp_engagementmilestones', {
          $filter: `_msp_opportunityid_value eq '${opp.opportunityid}' and msp_milestonestatus ne 861980003`,
          $select: MILESTONE_SELECT,
          $orderby: 'msp_milestonedate asc',
          $top: '100'
        });
        if (msByOpp.ok && msByOpp.data?.value) milestones.push(...msByOpp.data.value);
        return {
          ok: true,
          data: {
            accounts: accounts.map(a => formatAccount(a)),
            opportunities: [opp].map(o => formatOpportunity(o)),
            milestones: milestones.map(m => formatMilestone(m))
          }
        };
      }
      // Fall through to account search (might be an account GUID)
    }

    // Step 1: Find accounts by name or TPID
    const accountResult = await searchAccounts(keyword);
    if (!accountResult.ok) return accountResult;
    const accounts = accountResult.data?.value || [];
    if (accounts.length === 0) {
      return { ok: true, data: { accounts: [], opportunities: [], milestones: [] } };
    }

    // Step 2: Get opportunities for all accounts (parallel)
    const oppPromises = accounts.map(a => getOpportunitiesByAccount(a.accountid));
    const oppResults = await Promise.all(oppPromises);
    const opportunities = oppResults.flatMap(r => r.ok && r.data?.value ? r.data.value : []);

    // Step 3: Get milestones for all opportunities (parallel, chunked)
    const milestones = [];
    if (opportunities.length > 0) {
      // Chunk opportunity IDs into groups for filter
      const oppIds = opportunities.map(o => o.opportunityid);
      for (let i = 0; i < oppIds.length; i += 10) {
        const chunk = oppIds.slice(i, i + 10);
        const filter = chunk.map(id => `_msp_opportunityid_value eq '${id}'`).join(' or ');
        const msResult = await crmFetch('msp_engagementmilestones', {
          $filter: `(${filter}) and msp_milestonestatus ne 861980003`,
          $select: MILESTONE_SELECT,
          $orderby: 'msp_milestonedate asc',
          $top: '100'
        });
        if (msResult.ok && msResult.data?.value) {
          milestones.push(...msResult.data.value);
        }
      }
    }

    return {
      ok: true,
      data: {
        accounts: accounts.map(a => formatAccount(a)),
        opportunities: opportunities.map(o => formatOpportunity(o)),
        milestones: milestones.map(m => formatMilestone(m))
      }
    };
  }

  // ─── Format helpers (add human-readable labels) ───

  function formatAccount(a) {
    return {
      id: a.accountid,
      name: a.name,
      tpid: a.msp_mstopparentid,
      segment: a['msp_segmentgroup@OData.Community.Display.V1.FormattedValue'] || a.msp_segmentgroup || '',
      parentAccount: a['_parentaccountid_value@OData.Community.Display.V1.FormattedValue'] || ''
    };
  }

  function formatOpportunity(o) {
    return {
      id: o.opportunityid,
      name: o.name,
      number: o.msp_opportunitynumber || '',
      closeDate: o.estimatedclosedate || o.msp_estcompletiondate || '',
      owner: o['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
      account: o['_parentaccountid_value@OData.Community.Display.V1.FormattedValue'] || '',
      salesPlay: o['msp_salesplay@OData.Community.Display.V1.FormattedValue'] || ''
    };
  }

  function formatMilestone(m) {
    return {
      id: m.msp_engagementmilestoneid,
      number: m.msp_milestonenumber || '',
      name: m.msp_name || '',
      date: m.msp_milestonedate || '',
      status: MILESTONE_STATUS[m.msp_milestonestatus] || `Unknown (${m.msp_milestonestatus})`,
      statusCode: m.msp_milestonestatus,
      commitment: COMMITMENT_STATUS[m.msp_commitmentrecommendation] || '',
      commitmentCode: m.msp_commitmentrecommendation,
      owner: m['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || '',
      workload: m['_msp_workloadlkid_value@OData.Community.Display.V1.FormattedValue'] || '',
      opportunityId: m._msp_opportunityid_value || '',
      opportunity: m['_msp_opportunityid_value@OData.Community.Display.V1.FormattedValue'] || '',
      forecastComments: m.msp_forecastcomments || '',
      category: m['msp_milestonecategory@OData.Community.Display.V1.FormattedValue'] || ''
    };
  }

  // ─── Write: join deal team ───

  const OPP_TEAM_TEMPLATE_ID = 'cc923a9d-7651-e311-9405-00155db3ba1e';

  async function joinDealTeam(userId, opportunityId) {
    if (!isValidGuid(userId)) return { ok: false, error: 'Invalid user GUID' };
    if (!isValidGuid(opportunityId)) return { ok: false, error: 'Invalid opportunity GUID' };

    const authResult = await authService.ensureAuth();
    if (!authResult.success) {
      return { ok: false, status: 401, error: authResult.error || 'Not authenticated' };
    }
    const token = authService.getToken();
    const url = `${DEFAULT_CRM_URL}/api/data/${API_VERSION}/systemusers(${userId})/Microsoft.Dynamics.CRM.AddUserToRecordTeam`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Record: {
            '@odata.type': 'Microsoft.Dynamics.CRM.opportunity',
            opportunityid: opportunityId
          },
          TeamTemplate: {
            '@odata.type': 'Microsoft.Dynamics.CRM.teamtemplate',
            teamtemplateid: OPP_TEAM_TEMPLATE_ID
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.status === 200 || response.status === 204) {
        return { ok: true };
      }
      let msg = `HTTP ${response.status}`;
      try { const d = await response.json(); msg = d?.error?.message || msg; } catch {}
      return { ok: false, status: response.status, error: msg };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, status: 500, error: err.message };
    }
  }

  // ─── Write: create task on milestone ───

  const TASK_CATEGORIES = {
    606820005: { label: 'Technical Close/Win Plan', dueDays: 20 },
    861980004: { label: 'Architecture Design Session', dueDays: 10 },
    861980006: { label: 'Blocker Escalation', dueDays: 15 },
    861980008: { label: 'Briefing', dueDays: 15 },
    861980007: { label: 'Consumption Plan', dueDays: 20 },
    861980002: { label: 'Demo', dueDays: 15 },
    861980005: { label: 'PoC/Pilot', dueDays: 60 },
    861980001: { label: 'Workshop', dueDays: 30 }
  };

  async function createTask(milestoneId, options) {
    if (!isValidGuid(milestoneId)) return { ok: false, error: 'Invalid milestone GUID' };

    const authResult = await authService.ensureAuth();
    if (!authResult.success) return { ok: false, status: 401, error: authResult.error || 'Not authenticated' };

    // Get current user
    const whoami = await crmFetch('WhoAmI');
    if (!whoami.ok) return { ok: false, error: 'WhoAmI failed' };
    const userId = whoami.data.UserId;

    // Calculate due date
    let scheduledend = options.dueDate;
    if (!scheduledend && options.category) {
      const catInfo = TASK_CATEGORIES[Number(options.category)];
      if (catInfo) {
        const d = new Date();
        d.setDate(d.getDate() + catInfo.dueDays);
        d.setUTCHours(0, 0, 0, 0);
        scheduledend = d.toISOString();
      }
    }

    const payload = {
      subject: options.subject,
      scheduleddurationminutes: 60,
      prioritycode: 1,
      'regardingobjectid_msp_engagementmilestone@odata.bind': `/msp_engagementmilestones(${milestoneId})`,
      '_ownerid_value': userId
    };
    if (options.category) payload.msp_taskcategory = Number(options.category);
    if (scheduledend) payload.scheduledend = scheduledend;

    const token = authService.getToken();
    const url = `${DEFAULT_CRM_URL}/api/data/${API_VERSION}/tasks`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.status === 201 || response.status === 204) {
        return { ok: true };
      }
      let msg = `HTTP ${response.status}`;
      try { const d = await response.json(); msg = d?.error?.message || msg; } catch {}
      return { ok: false, status: response.status, error: msg };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, status: 500, error: err.message };
    }
  }

  // ─── Write: close/complete task ───

  async function closeTask(taskId, statusCode) {
    if (!isValidGuid(taskId)) return { ok: false, error: 'Invalid task GUID' };
    const authResult = await authService.ensureAuth();
    if (!authResult.success) return { ok: false, status: 401, error: authResult.error || 'Not authenticated' };
    const token = authService.getToken();

    // PATCH statecode=1 (Completed) and statuscode
    const url = `${DEFAULT_CRM_URL}/api/data/${API_VERSION}/tasks(${taskId})`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0', 'OData-Version': '4.0',
          'Content-Type': 'application/json', 'If-Match': '*'
        },
        body: JSON.stringify({ statecode: 1, statuscode: statusCode || 5 }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.status === 204) return { ok: true };
      let msg = `HTTP ${response.status}`;
      try { const d = await response.json(); msg = d?.error?.message || msg; } catch {}
      return { ok: false, status: response.status, error: msg };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, status: 500, error: err.message };
    }
  }

  // ─── Write: delete task ───

  async function deleteTask(taskId) {
    if (!isValidGuid(taskId)) return { ok: false, error: 'Invalid task GUID' };
    const authResult = await authService.ensureAuth();
    if (!authResult.success) return { ok: false, status: 401, error: authResult.error || 'Not authenticated' };
    const token = authService.getToken();

    const url = `${DEFAULT_CRM_URL}/api/data/${API_VERSION}/tasks(${taskId})`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0', 'OData-Version': '4.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.status === 204) return { ok: true };
      let msg = `HTTP ${response.status}`;
      try { const d = await response.json(); msg = d?.error?.message || msg; } catch {}
      return { ok: false, status: response.status, error: msg };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, status: 500, error: err.message };
    }
  }

  // ─── Write: update milestone fields ───

  const ALLOWED_MILESTONE_FIELDS = new Set([
    'msp_milestonedate', 'msp_monthlyuse', 'msp_forecastcomments',
    'msp_forecastcommentsjsonfield', 'msp_name'
  ]);

  async function updateMilestone(milestoneId, fields) {
    if (!isValidGuid(milestoneId)) {
      return { ok: false, error: 'Invalid milestone GUID' };
    }
    // Only allow known safe fields
    const payload = {};
    for (const [key, value] of Object.entries(fields)) {
      if (ALLOWED_MILESTONE_FIELDS.has(key)) {
        payload[key] = value;
      }
    }
    if (Object.keys(payload).length === 0) {
      return { ok: false, error: 'No valid fields to update' };
    }

    const authResult = await authService.ensureAuth();
    if (!authResult.success) {
      return { ok: false, status: 401, error: authResult.error || 'Not authenticated' };
    }
    const token = authService.getToken();
    const url = `${DEFAULT_CRM_URL}/api/data/${API_VERSION}/msp_engagementmilestones(${milestoneId})`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Content-Type': 'application/json',
          'If-Match': '*'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.status === 204) {
        return { ok: true };
      }
      let msg = `HTTP ${response.status}`;
      try { const d = await response.json(); msg = d?.error?.message || msg; } catch {}
      return { ok: false, status: response.status, error: msg };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, status: 500, error: err.message };
    }
  }

  return {
    getAuthStatus,
    whoAmI,
    searchAccounts,
    getAccountsByTpids,
    searchOpportunities,
    getOpportunitiesByAccount,
    searchMilestones,
    getMilestonesByOpportunity,
    getMilestonesByStatus,
    getTasksByMilestone,
    runCustomQuery,
    drillDownAccount,
    updateMilestone,
    joinDealTeam,
    createTask,
    closeTask,
    deleteTask,
    formatAccount,
    formatOpportunity,
    formatMilestone,
    MILESTONE_STATUS,
    COMMITMENT_STATUS
  };
}
