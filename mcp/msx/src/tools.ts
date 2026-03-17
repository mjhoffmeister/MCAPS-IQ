// MCP tool definitions — maps CRM operations to MCP tools
// Each tool receives validated params and calls createCrmClient methods

import { z } from 'zod';
import { isValidGuid, normalizeGuid, isValidTpid, sanitizeODataString } from './validation.js';
import { getApprovalQueue } from './approval-queue.js';
import type { StagedOperation } from './approval-queue.js';
import { auditLog } from './audit.js';
import { detectInjection, formatDetectionWarning, formatWriteWarning } from './prompt-guard.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CrmClient, CrmResponse, CrmData } from './crm.js';

// ── Internal types ───────────────────────────────────────────
interface PicklistOption {
  label: string;
  value: number;
}

interface ToolContent {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface DealTeamMember {
  userId: string | null;
  name: string;
}

interface DealTeamInfo {
  dealTeamByOpportunity: Record<string, DealTeamMember[]>;
  available: boolean;
  error?: string;
  skipped?: boolean;
}

// ── Entity allowlist ─────────────────────────────────────────
// Only these Dynamics 365 entity sets may be queried via crm_query
// and crm_get_record.  Purpose-built tools bypass this list because
// they already constrain scope through hard-coded entity paths.
export const ALLOWED_ENTITY_SETS = new Set([
  'accounts',
  'contacts',
  'opportunities',
  'msp_engagementmilestones',
  'msp_dealteams',
  'msp_workloads',
  'tasks',
  'systemusers',
  'transactioncurrencies',
  // Deal team / partner linkage (alternative to msp_dealteams in some orgs)
  'connections',
  'connectionroles',
  // BPF stage name resolution (mcem-stage-identification)
  'processstages',
  // Access team queries (manage_deal_team / manage_milestone_team)
  'teams',
  // Personal views (layoutxml / fetchxml management)
  'userqueries',
  // Metadata endpoints (used by get_task_status_options pattern)
  'EntityDefinitions',
]);

/** Check whether an entity set (or entity-set-with-key) is on the allowlist. */
export function isEntityAllowed(entitySet: string): boolean {
  if (!entitySet || typeof entitySet !== 'string') return false;
  // Strip key suffix: "accounts(guid)" → "accounts"
  const base = entitySet.split('(')[0].split('/')[0];
  return ALLOWED_ENTITY_SETS.has(base);
}

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
  'msp_forecastcomments',
  'msp_milestoneworkload',
  'msp_deliveryspecifiedfield',
  'msp_milestonepreferredazureregion',
  'msp_milestoneazurecapacitytype'
].join(',');

const OPP_SELECT = [
  'opportunityid', 'name', 'estimatedclosedate',
  'msp_estcompletiondate', 'msp_consumptionconsumedrecurring',
  '_ownerid_value', '_parentaccountid_value', 'msp_salesplay', 'msp_opportunitynumber',
  'msp_activesalesstage', 'estimatedvalue'
].join(',');

const TASK_CATEGORIES: PicklistOption[] = [
  { label: 'Technical Close/Win Plan', value: 606820005 },
  { label: 'Architecture Design Session', value: 861980004 },
  { label: 'Blocker Escalation', value: 861980006 },
  { label: 'Briefing', value: 861980008 },
  { label: 'Consumption Plan', value: 861980007 },
  { label: 'Demo', value: 861980002 },
  { label: 'PoC/Pilot', value: 861980005 },
  { label: 'Workshop', value: 861980001 }
];

// ── Milestone view field picklist options ─────────────────────
// Embedded here so the agent can present options to users without
// a metadata round-trip.  get_milestone_field_options still queries
// live metadata for the full list (especially Azure regions/capacity).

const WORKLOAD_TYPES: PicklistOption[] = [
  { label: 'Azure', value: 861980000 },
  { label: 'Dynamics 365', value: 861980001 },
  { label: 'Security', value: 861980002 },
  { label: 'Modern Work', value: 861980003 }
];

const DELIVERED_BY: PicklistOption[] = [
  { label: 'Customer', value: 606820000 },
  { label: 'Partner', value: 606820001 },
  { label: 'ISD', value: 606820002 },
  { label: 'Microsoft Support', value: 606820003 }
];

const MILESTONE_STATUSES: PicklistOption[] = [
  { label: 'On Track', value: 861980000 },
  { label: 'At Risk', value: 861980001 },
  { label: 'Blocked', value: 861980002 },
  { label: 'Completed', value: 861980003 },
  { label: 'Cancelled', value: 861980004 },
  { label: 'Not Started', value: 861980005 },
  { label: 'Closed as Incomplete', value: 861980007 }
];

const COMMITMENT_RECOMMENDATIONS: PicklistOption[] = [
  { label: 'Uncommitted', value: 861980000 },
  { label: 'Committed', value: 861980001 },
  { label: 'Best Case', value: 861980002 },
  { label: 'Pipeline', value: 861980003 }
];

const MILESTONE_CATEGORIES: PicklistOption[] = [
  { label: 'POC/Pilot', value: 861980000 },
  { label: 'Pre-Production', value: 861980001 },
  { label: 'Production', value: 861980002 }
];

// Common regions — full list (75 options) available via get_milestone_field_options
const PREFERRED_AZURE_REGIONS_COMMON: PicklistOption[] = [
  { label: 'East US - Blue Ridge', value: 861980005 },
  { label: 'East US 2 - Boydton', value: 861980006 },
  { label: 'Central US - Des Moines', value: 861980018 },
  { label: 'West US 2 - Quincy', value: 861980040 },
  { label: 'West US 3 - Phoenix', value: 861980036 },
  { label: 'West Europe - Amsterdam', value: 861980001 },
  { label: 'North Europe - Dublin', value: 861980022 },
  { label: 'Southeast Asia - Singapore', value: 861980046 },
  { label: 'None', value: 861980076 }
];

// Common capacity types — full list (65 options) available via get_milestone_field_options
// NOTE: This is a MultiSelectPicklist — values are comma-separated strings (e.g. "861980081,861980065")
const AZURE_CAPACITY_TYPES_COMMON: PicklistOption[] = [
  { label: 'None', value: 861980000 },
  { label: 'Av2/Dv2/Dv3/Ev3/Dsv3/Esv3 (Intel) (Cores)', value: 861980037 },
  { label: 'Azure SQL Database (Cores or DTUs)', value: 861980065 },
  { label: 'Azure OpenAI Service', value: 861980081 },
  { label: 'Nd H100 V5 (Cores) (Future)', value: 861980080 },
  { label: 'Other', value: 861980032 }
];

/** Resolve a picklist numeric value to "Label (value)" for human-readable output.
 *  For multi-select (comma-separated codes), resolves each code individually. */
function resolvePicklistLabel(options: PicklistOption[], value: unknown): string | null {
  if (value === undefined || value === null) return null;
  // Multi-select: comma-separated string of codes
  if (typeof value === 'string' && value.includes(',')) {
    return value.split(',').map(code => {
      const num = Number(code.trim());
      const match = options.find(o => o.value === num);
      return match ? `${match.label} (${num})` : String(num);
    }).join(', ');
  }
  const num = typeof value === 'string' ? Number(value) : value;
  const match = options.find(o => o.value === num);
  return match ? `${match.label} (${num})` : String(num);
}

/**
 * Resolve a picklist input that may be a numeric code or a human-readable label.
 * Returns the numeric code, or undefined if unresolvable.
 */
function resolveOptionValue(options: PicklistOption[], input: unknown): number | undefined {
  if (input === undefined || input === null) return undefined;
  // Already a number — validate it exists
  if (typeof input === 'number') {
    return options.some(o => o.value === input) ? input : undefined;
  }
  // String: try numeric parse first
  const asNum = Number(input);
  if (!isNaN(asNum) && options.some(o => o.value === asNum)) return asNum;
  // String label match (case-insensitive)
  const match = options.find(o => o.label.toLowerCase() === String(input).toLowerCase().trim());
  return match ? match.value : undefined;
}

/** Map of CRM payload keys to their picklist arrays for resolution. */
const PICKLIST_MAP: Record<string, PicklistOption[]> = {
  msp_milestoneworkload: WORKLOAD_TYPES,
  msp_deliveryspecifiedfield: DELIVERED_BY,
  msp_milestonepreferredazureregion: PREFERRED_AZURE_REGIONS_COMMON,
  msp_milestoneazurecapacitytype: AZURE_CAPACITY_TYPES_COMMON,
  msp_milestonestatus: MILESTONE_STATUSES,
  msp_commitmentrecommendation: COMMITMENT_RECOMMENDATIONS,
  msp_milestonecategory: MILESTONE_CATEGORIES
};

/** Resolve all picklist fields in a payload to human-readable labels.
 *  Non-picklist and lookup fields are passed through as-is. */
function resolvePayloadLabels(payload: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    const picklist = PICKLIST_MAP[key];
    if (picklist && value !== undefined && value !== null) {
      resolved[key] = resolvePicklistLabel(picklist, value);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

/** Maximum records crm_query will return via auto-pagination. */
export const CRM_QUERY_MAX_RECORDS = 500;
const EXECUTE_ALL_CONFIRM_TOKEN = 'EXECUTE_ALL';

const UNSAFE_QUERY_CHARS = /[;\r\n]/;
const SELECT_PATTERN = /^[a-zA-Z0-9_,.$ ]+$/;
const ORDERBY_PATTERN = /^[a-zA-Z0-9_,.$ ]+$/;
const EXPAND_PATTERN = /^[a-zA-Z0-9_,.$()=\- ]+$/;

function validateODataFragment(name: string, value: string | undefined | null, pattern: RegExp): string | null {
  if (value === undefined || value === null) return null;
  if (UNSAFE_QUERY_CHARS.test(value)) return `${name} contains unsafe control characters`;
  if (!pattern.test(value)) return `${name} contains unsupported characters`;
  return null;
}

const text = (content: unknown): ToolContent => ({ content: [{ type: 'text', text: typeof content === 'string' ? content : JSON.stringify(content, null, 2) }] });
const error = (msg: string): ToolContent => ({ content: [{ type: 'text', text: msg }], isError: true });

/**
 * Build a staged-write tool response. Scans the payload and beforeState
 * for prompt injection indicators and surfaces warnings in the response.
 */
function stagedResponse(responseObj: Record<string, unknown>): ToolContent {
  const scanTargets = [responseObj.payload, responseObj.before, responseObj.beforeState].filter(Boolean);
  const detections = scanTargets.flatMap(t => detectInjection(t, `staged_write:${responseObj.operationId}`));
  const highSeverity = detections.filter(d => d.severity === 'high');

  if (highSeverity.length > 0) {
    // Remove staged operation when high-severity prompt injection indicators are detected.
    if (responseObj.operationId) {
      const queue = getApprovalQueue();
      queue.reject(responseObj.operationId as string);
    }
    const details = highSeverity
      .slice(0, 5)
      .map(d => `[${d.id}] ${d.description} at ${d.field}`)
      .join('; ');
    return error(
      `Write blocked: high-severity prompt injection indicators detected (${highSeverity.length}). ` +
      `Details: ${details}`
    );
  }

  const warning = formatWriteWarning(detections);
  if (warning) responseObj.injectionWarning = warning;
  return text(responseObj);
}

// ── AI Attribution (RH-2) ─────────────────────────────────────
const AI_ATTRIBUTION = '[AI-assisted via MCAPS-IQ]';

/** Append AI attribution to a string field if not already present. */
function withAttribution(value: string): string {
  // Preserve non-string values and empty strings without injecting attribution.
  if (typeof value !== 'string') return value;
  if (value === '') return value;
  if (value.includes(AI_ATTRIBUTION)) return value;
  return `${value} ${AI_ATTRIBUTION}`;
}

/** Format a numeric value as USD currency. Returns null/empty if value is null/undefined/zero.
 *  Used for msp_consumptionconsumedrecurring and monthly use fields. */
function formatCurrency(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return null;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month`;
}

/** Build a Dynamics 365 deep-link URL to open a record in the browser. */
function buildRecordUrl(crmBaseUrl: string | null, entityLogicalName: string, guid: string): string | undefined {
  if (!crmBaseUrl || !entityLogicalName || !guid) return undefined;
  return `${crmBaseUrl}/main.aspx?etn=${entityLogicalName}&id=${guid}&pagetype=entityrecord`;
}

function monthKey(dateValue: unknown): string | null {
  if (!dateValue) return null;
  const date = new Date(dateValue as string | number);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 7);
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function deriveOpportunityHealth(opportunity: Record<string, unknown> | null): string {
  const completion = toIsoDate(opportunity?.msp_estcompletiondate);
  if (!completion) return 'Unknown';
  const today = toIsoDate(new Date().toISOString())!;
  if (completion < today) return 'At Risk';

  const d1 = new Date(completion);
  const d2 = new Date(today);
  const diffDays = Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 14) return 'Watch';
  return 'On Track';
}

function chunkArray<T>(items: T[], chunkSize = 25): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) chunks.push(items.slice(i, i + chunkSize));
  return chunks;
}

function deriveOpportunityStage(opportunity: Record<string, unknown> | null, stageNameById?: Record<string, string>): string | null {
  // Prefer msp_activesalesstage (human-readable, pre-resolved by CRM)
  if (opportunity?.msp_activesalesstage) return opportunity.msp_activesalesstage as string;
  const formatted = fv(opportunity, '_activestageid_value');
  if (formatted) return formatted;
  const stageId = opportunity?._activestageid_value as string | undefined;
  if (!stageId) return null;
  return stageNameById?.[stageId] || stageId;
}

async function resolveStageNames(crmClient: CrmClient, opportunities: Record<string, unknown>[]): Promise<Record<string, string>> {
  const stageIds = [...new Set(
    opportunities
      .map(o => o._activestageid_value as string | undefined)
      .filter(Boolean)
  )] as string[];
  if (!stageIds.length) return {};

  const stageNameById: Record<string, string> = {};
  for (const chunk of chunkArray(stageIds, 25)) {
    const filter = chunk.map(id => `processstageid eq '${sanitizeODataString(id)}'`).join(' or ');
    const result = await crmClient.requestAllPages('processstages', {
      query: { $filter: filter, $select: 'processstageid,stagename' }
    });
    if (!result.ok) continue;
    for (const stage of (result.data?.value as Record<string, unknown>[]) || []) {
      if (stage.processstageid && stage.stagename) {
        stageNameById[stage.processstageid as string] = stage.stagename as string;
      }
    }
  }
  return stageNameById;
}

async function resolveDealTeamMembers(crmClient: CrmClient, opportunities: Record<string, unknown>[]): Promise<DealTeamInfo> {
  const opportunityIds = [...new Set(opportunities.map(o => o.opportunityid as string).filter(Boolean))];
  const dealTeamByOpportunity: Record<string, DealTeamMember[]> = {};
  if (!opportunityIds.length) return { dealTeamByOpportunity, available: true };

  for (const chunk of chunkArray(opportunityIds, 25)) {
    const filterClause = chunk.map(id => `_msp_parentopportunityid_value eq '${sanitizeODataString(id)}'`).join(' or ');
    const result = await crmClient.requestAllPages('msp_dealteams', {
      query: {
        $filter: `(${filterClause}) and statecode eq 0`,
        $select: '_msp_parentopportunityid_value,_msp_dealteamuserid_value'
      }
    });

    if (!result.ok) {
      return {
        dealTeamByOpportunity,
        available: false,
        error: result.data?.message || 'msp_dealteams unavailable'
      };
    }

    for (const row of (result.data?.value as Record<string, unknown>[]) || []) {
      const oppId = row._msp_parentopportunityid_value as string;
      if (!oppId) continue;
      const memberId = (row._msp_dealteamuserid_value as string | null) || null;
      const memberName = fv(row, '_msp_dealteamuserid_value') || memberId || 'Unknown';
      if (!dealTeamByOpportunity[oppId]) dealTeamByOpportunity[oppId] = [];
      const exists = dealTeamByOpportunity[oppId].some(member => member.userId === memberId && member.name === memberName);
      if (!exists) {
        dealTeamByOpportunity[oppId].push({ userId: memberId, name: memberName });
      }
    }
  }

  return { dealTeamByOpportunity, available: true };
}

/** Map task statusCode to the required statecode for Dynamics 365 state transitions. */
function taskStateForStatus(statusCode: number): number {
  if ([5].includes(statusCode)) return 1;       // Completed
  if ([6].includes(statusCode)) return 2;       // Cancelled
  return 0;                                      // Open
}

function fv(record: Record<string, unknown> | null, field: string): string | null {
  if (!record) return null;
  return (record[`${field}@OData.Community.Display.V1.FormattedValue`] as string) ?? null;
}

/** Returns ISO date string for (today - days). */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const ACTIVE_STATUSES = new Set(['Not Started', 'On Track', 'In Progress', 'Blocked', 'At Risk']);

/** Derive human-readable commitment label from a milestone record. */
function commitmentLabel(m: Record<string, unknown>): string {
  return m.msp_commitmentrecommendation === 861980003 ? 'Committed' : 'Uncommitted';
}

function buildMilestoneSummary(milestones: Record<string, unknown>[], crmBaseUrl: string | null) {
  const byStatus: Record<string, number> = {};
  const byOpportunity: Record<string, number> = {};
  const byCommitment: Record<string, number> = { Committed: 0, Uncommitted: 0 };
  for (const m of milestones) {
    const status = fv(m, 'msp_milestonestatus') || 'Unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
    const opp = fv(m, '_msp_opportunityid_value') || 'Unknown';
    byOpportunity[opp] = (byOpportunity[opp] || 0) + 1;
    byCommitment[commitmentLabel(m)] += 1;
  }
  return {
    count: milestones.length,
    byStatus,
    byCommitment,
    byOpportunity,
    milestones: milestones.map(m => ({
      ...m,
      status: fv(m, 'msp_milestonestatus'),
      commitment: commitmentLabel(m),
      monthlyUse: formatCurrency(m.msp_monthlyuse),
      opportunity: fv(m, '_msp_opportunityid_value'),
      recordUrl: buildRecordUrl(crmBaseUrl, 'msp_engagementmilestone', m.msp_engagementmilestoneid as string)
    }))
  };
}

/**
 * Triage format: classifies milestones into urgency buckets and strips
 * verbose OData annotations for a compact, action-oriented response.
 */
function buildMilestoneTriage(milestones: Record<string, unknown>[], crmBaseUrl: string | null) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 14);
  const soonStr = soon.toISOString().split('T')[0];

  const buckets: Record<string, Record<string, unknown>[]> = { overdue: [], due_soon: [], blocked: [], on_track: [] };
  const summary: Record<string, unknown> = { total: milestones.length, overdue: 0, due_soon: 0, blocked: 0, on_track: 0, byCommitment: { Committed: 0, Uncommitted: 0 } as Record<string, number> };

  for (const m of milestones) {
    const status = fv(m, 'msp_milestonestatus') || 'Unknown';
    const date = (m.msp_milestonedate as string) || null;
    const commitment = commitmentLabel(m);
    (summary.byCommitment as Record<string, number>)[commitment] += 1;

    const compact: Record<string, unknown> = {
      id: m.msp_engagementmilestoneid,
      number: m.msp_milestonenumber,
      name: m.msp_name,
      status,
      commitment,
      date,
      monthlyUse: formatCurrency(m.msp_monthlyuse),
      opportunity: fv(m, '_msp_opportunityid_value'),
      workload: fv(m, '_msp_workloadlkid_value'),
      recordUrl: buildRecordUrl(crmBaseUrl, 'msp_engagementmilestone', m.msp_engagementmilestoneid as string)
    };
    if (m.tasks) compact.tasks = m.tasks;

    if (status === 'Blocked' || status === 'At Risk') {
      buckets.blocked.push(compact);
      (summary as Record<string, number>).blocked++;
    } else if (date && date < todayStr) {
      buckets.overdue.push(compact);
      (summary as Record<string, number>).overdue++;
    } else if (date && date <= soonStr) {
      buckets.due_soon.push(compact);
      (summary as Record<string, number>).due_soon++;
    } else {
      buckets.on_track.push(compact);
      (summary as Record<string, number>).on_track++;
    }
  }

  // Sort each bucket by date ascending
  for (const list of Object.values(buckets)) {
    list.sort((a, b) => ((a.date as string) || '9999').localeCompare((b.date as string) || '9999'));
  }

  return { summary, ...buckets };
}

async function applyTaskFilter(crmClient: CrmClient, milestones: Record<string, unknown>[], mode: string): Promise<Record<string, unknown>[]> {
  if (!milestones.length) return milestones;
  const msIds = (milestones.map(m => m.msp_engagementmilestoneid).filter(Boolean)) as string[];
  const chunks: string[][] = [];
  for (let i = 0; i < msIds.length; i += 25) chunks.push(msIds.slice(i, i + 25));
  const taskMatches = new Set<string>();
  for (const chunk of chunks) {
    const tf = chunk.map(id => `_regardingobjectid_value eq '${id}'`).join(' or ');
    const taskResult = await crmClient.requestAllPages('tasks', {
      query: { $filter: tf, $select: '_regardingobjectid_value' }
    });
    if (taskResult.ok && taskResult.data?.value) {
      for (const t of taskResult.data.value as Record<string, unknown>[]) taskMatches.add(t._regardingobjectid_value as string);
    }
  }
  if (mode === 'without-tasks') {
    return milestones.filter(m => !taskMatches.has(m.msp_engagementmilestoneid as string));
  }
  return milestones.filter(m => taskMatches.has(m.msp_engagementmilestoneid as string));
}

const INLINE_TASK_SELECT = 'activityid,subject,scheduledend,statuscode,statecode,_ownerid_value,description,msp_taskcategory,_regardingobjectid_value';

/** Fetch tasks for a list of milestone IDs and return them as a flat array. */
async function fetchTasksForMilestones(crmClient: CrmClient, msIds: string[]): Promise<Record<string, unknown>[]> {
  if (!msIds.length) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < msIds.length; i += 25) chunks.push(msIds.slice(i, i + 25));
  const allTasks: Record<string, unknown>[] = [];
  for (const chunk of chunks) {
    const tf = chunk.map(id => `_regardingobjectid_value eq '${id}'`).join(' or ');
    const taskResult = await crmClient.requestAllPages('tasks', {
      query: { $filter: tf, $select: INLINE_TASK_SELECT, $orderby: 'createdon desc' }
    });
    if (taskResult.ok && taskResult.data?.value) allTasks.push(...(taskResult.data.value as Record<string, unknown>[]));
  }
  return allTasks;
}

/** Batch-fetch tasks and embed them as a `tasks` array on each milestone record. */
async function embedTasksOnMilestones(crmClient: CrmClient, milestones: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  if (!milestones.length) return milestones;
  const msIds = (milestones.map(m => m.msp_engagementmilestoneid).filter(Boolean)) as string[];
  const allTasks = await fetchTasksForMilestones(crmClient, msIds);
  const byMilestone: Record<string, Record<string, unknown>[]> = {};
  for (const t of allTasks) {
    const msId = t._regardingobjectid_value as string;
    if (!byMilestone[msId]) byMilestone[msId] = [];
    byMilestone[msId].push(t);
  }
  return milestones.map(m => ({
    ...m,
    tasks: byMilestone[m.msp_engagementmilestoneid as string] || []
  }));
}

/**
 * Register all CRM tools on an McpServer instance.
 */
export function registerTools(server: McpServer, crmClient: CrmClient): void {
  /** Lazily get the CRM base URL for deep-link generation. */
  const getCrmBase = (): string | null => crmClient.getCrmUrl?.() || null;

  // ── crm_whoami ──────────────────────────────────────────────
  server.tool(
    'crm_whoami',
    'Validate CRM access and return the current user identity (UserId, name).',
    {},
    async () => {
      const result = await crmClient.request('WhoAmI');
      if (!result.ok) return error(`WhoAmI failed: ${result.data?.message || result.status}`);
      return text(result.data);
    }
  );

  // ── crm_query ───────────────────────────────────────────────
  server.tool(
    'crm_query',
    `Execute a read-only OData GET against an allowed Dynamics 365 entity set. Supports $filter, $select, $orderby, $top, $expand. Auto-paginates up to ${CRM_QUERY_MAX_RECORDS} records. Allowed entity sets: ${[...ALLOWED_ENTITY_SETS].join(', ')}.`,
    {
      entitySet: z.string().describe('Entity set name, e.g. "opportunities", "accounts", "msp_engagementmilestones"'),
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated field names for $select'),
      orderby: z.string().optional().describe('OData $orderby expression'),
      top: z.number().optional().describe('Maximum number of records to return'),
      expand: z.string().optional().describe('OData $expand expression')
    },
    async ({ entitySet, filter, select, orderby, top, expand }) => {
      if (!entitySet) return error('entitySet is required');

      if (!isEntityAllowed(entitySet)) {
        auditLog({ tool: 'crm_query', entitySet, blocked: true, reason: 'entity not in allowlist' });
        return error(
          `Entity set "${entitySet}" is not in the allowed list. ` +
          `Permitted entity sets: ${[...ALLOWED_ENTITY_SETS].join(', ')}. ` +
          `If you need access to this entity, add it to ALLOWED_ENTITY_SETS in tools.js.`
        );
      }

      const selectErr = validateODataFragment('select', select, SELECT_PATTERN);
      if (selectErr) return error(selectErr);
      const orderbyErr = validateODataFragment('orderby', orderby, ORDERBY_PATTERN);
      if (orderbyErr) return error(orderbyErr);
      const expandErr = validateODataFragment('expand', expand, EXPAND_PATTERN);
      if (expandErr) return error(expandErr);
      if (top !== undefined && (!Number.isInteger(top) || top < 1)) {
        return error('top must be a positive integer');
      }

      const query: Record<string, string> = {};
      if (filter) query.$filter = filter;
      if (select) query.$select = select;
      if (orderby) query.$orderby = orderby;
      if (top !== undefined) query.$top = String(Math.min(top, CRM_QUERY_MAX_RECORDS));
      if (expand) query.$expand = expand;

      const result = await crmClient.requestAllPages(entitySet, { query, maxRecords: CRM_QUERY_MAX_RECORDS });
      if (!result.ok) return error(`Query failed (${result.status}): ${result.data?.message}`);

      const records = result.data?.value || (result.data ? [result.data] : []);
      auditLog({ tool: 'crm_query', entitySet, params: { filter, select, top }, recordCount: records.length });
      const piDetections = detectInjection(records, `crm_query:${entitySet}`);
      const warning = formatDetectionWarning(piDetections);
      const body = JSON.stringify({ count: records.length, value: records }, null, 2);
      const content: Array<{ type: 'text'; text: string }> = [];
      if (warning) content.push({ type: 'text', text: warning });
      content.push({ type: 'text', text: body });
      return { content };
    }
  );

  // ── crm_get_record ──────────────────────────────────────────
  server.tool(
    'crm_get_record',
    `Retrieve a single Dynamics 365 record by entity set and GUID. Allowed entity sets: ${[...ALLOWED_ENTITY_SETS].join(', ')}.`,
    {
      entitySet: z.string().describe('Entity set name, e.g. "opportunities", "accounts"'),
      id: z.string().describe('Record GUID'),
      select: z.string().optional().describe('Comma-separated field names for $select')
    },
    async ({ entitySet, id, select }) => {
      if (!entitySet) return error('entitySet is required');

      if (!isEntityAllowed(entitySet)) {
        auditLog({ tool: 'crm_get_record', entitySet, blocked: true, reason: 'entity not in allowlist' });
        return error(
          `Entity set "${entitySet}" is not in the allowed list. ` +
          `Permitted entity sets: ${[...ALLOWED_ENTITY_SETS].join(', ')}. ` +
          `If you need access to this entity, add it to ALLOWED_ENTITY_SETS in tools.js.`
        );
      }

      const normalized = normalizeGuid(id);
      if (!isValidGuid(normalized)) return error('Invalid GUID');
      const query: Record<string, string> = {};
      if (select) query.$select = select;
      const result = await crmClient.request(`${entitySet}(${normalized})`, { query });
      if (!result.ok) return error(`Get record failed (${result.status}): ${result.data?.message}`);
      auditLog({ tool: 'crm_get_record', entitySet, recordCount: 1 });
      const piDetections = detectInjection(result.data, `crm_get_record:${entitySet}`);
      const warning = formatDetectionWarning(piDetections);
      const body = JSON.stringify(result.data, null, 2);
      const content: Array<{ type: 'text'; text: string }> = [];
      if (warning) content.push({ type: 'text', text: warning });
      content.push({ type: 'text', text: body });
      return { content };
    }
  );

  // ── list_opportunities ──────────────────────────────────────
  server.tool(
    'list_opportunities',
    'List open opportunities for one or more account IDs or by customer name keyword. Returns stage, estimated close date, and deal team details.',
    {
      opportunityIds: z.array(z.string()).optional().describe('Optional list of opportunity GUIDs for direct lookup'),
      opportunityKeyword: z.string().optional().describe('Optional opportunity name keyword for direct lookup'),
      accountIds: z.array(z.string()).optional().describe('Array of Dynamics 365 account GUIDs'),
      customerKeyword: z.string().optional().describe('Customer name keyword — resolves matching accounts internally'),
      includeCompleted: z.boolean().optional().default(false).describe('Include opportunities past their estimated completion date (default: false)'),
      includeDealTeam: z.boolean().optional().default(true).describe('When false, skips deal-team enrichment for faster responses (default: true)'),
      format: z.enum(['full', 'compact']).optional().describe('Output format: full (default) or compact (id, name, stage, close date, revenue, health)')
    },
    async ({ opportunityIds, opportunityKeyword, accountIds, customerKeyword, includeCompleted, includeDealTeam, format }) => {
      // Direct opportunity ID lookup path
      let allOpps: Record<string, unknown>[] = [];
      let lookupAttempted = false;
      if (opportunityIds?.length) {
        lookupAttempted = true;
        const resolvedOppIds = opportunityIds.map(normalizeGuid).filter(isValidGuid);
        if (!resolvedOppIds.length) return error('No valid opportunity GUIDs in opportunityIds');
        for (const chunk of chunkArray(resolvedOppIds, 25)) {
          let filter = `(${chunk.map(id => `opportunityid eq '${id}'`).join(' or ')}) and statecode eq 0`;
          if (!includeCompleted) {
            filter += ` and (msp_estcompletiondate ge ${daysAgo(30)} or msp_estcompletiondate eq null)`;
          }
          const result = await crmClient.requestAllPages('opportunities', {
            query: { $filter: filter, $select: OPP_SELECT, $orderby: 'name' }
          });
          if (result.ok && result.data?.value) allOpps.push(...result.data.value);
        }
        if (!allOpps.length) {
          return text({ count: 0, opportunities: [], format: format || 'full', includeDealTeam: includeDealTeam !== false, message: `No active opportunities found for the provided ${resolvedOppIds.length} ID(s). They may be closed or past their estimated completion date — retry with includeCompleted: true to include them.` });
        }
      } else if (opportunityKeyword) {
        // Direct opportunity name lookup path
        const sanitized = sanitizeODataString(opportunityKeyword.trim());
        let filter = `contains(name,'${sanitized}') and statecode eq 0`;
        if (!includeCompleted) {
          filter += ` and (msp_estcompletiondate ge ${daysAgo(30)} or msp_estcompletiondate eq null)`;
        }
        const result = await crmClient.requestAllPages('opportunities', {
          query: { $filter: filter, $select: OPP_SELECT, $orderby: 'name', $top: '200' }
        });
        if (result.ok && result.data?.value) allOpps.push(...result.data.value);
        if (!allOpps.length) {
          return text({ count: 0, opportunities: [], format: format || 'full', includeDealTeam: includeDealTeam !== false, message: `No active opportunities found matching '${opportunityKeyword}'` });
        }
      }

      // Account/customer scoped lookup path (fallback)
      let resolvedIds: string[] = accountIds ? accountIds.map(normalizeGuid).filter(isValidGuid) : [];

      // Resolve customerKeyword → account GUIDs
      if (!allOpps.length && !resolvedIds.length && customerKeyword) {
        const sanitized = sanitizeODataString(customerKeyword.trim());
        const acctResult = await crmClient.requestAllPages('accounts', {
          query: { $filter: `contains(name,'${sanitized}')`, $select: 'accountid,name', $top: '50' }
        });
        const matchedAccounts = acctResult.ok ? (acctResult.data?.value || []) : [];
        if (!matchedAccounts.length) {
          // Fallback: treat customerKeyword as opportunity name keyword when account-name lookup misses.
          let filter = `contains(name,'${sanitized}') and statecode eq 0`;
          if (!includeCompleted) {
            filter += ` and (msp_estcompletiondate ge ${daysAgo(30)} or msp_estcompletiondate eq null)`;
          }
          const oppResult = await crmClient.requestAllPages('opportunities', {
            query: { $filter: filter, $select: OPP_SELECT, $orderby: 'name', $top: '200' }
          });
          if (oppResult.ok && oppResult.data?.value) {
            allOpps.push(...oppResult.data.value);
          }
          if (!allOpps.length) {
            return text({ count: 0, opportunities: [], matchedAccounts: [], message: `No accounts or active opportunities found matching '${customerKeyword}'` });
          }
        } else {
          resolvedIds = matchedAccounts.map(a => a.accountid as string);
        }
      }

      if (!allOpps.length && !resolvedIds.length && !lookupAttempted) {
        return error('Provide opportunityIds, opportunityKeyword, accountIds, or customerKeyword');
      }
      if (!allOpps.length && !resolvedIds.length && lookupAttempted) {
        return text({ count: 0, opportunities: [], format: format || 'full', message: 'No active opportunities matched the provided scoping parameters.' });
      }

      // Chunk into groups of 25 to keep filter URL manageable
      const chunks = chunkArray(resolvedIds, 25);

      if (!allOpps.length) {
        for (const chunk of chunks) {
          let filter = `(${chunk.map(id => `_parentaccountid_value eq '${id}'`).join(' or ')}) and statecode eq 0`;
          if (!includeCompleted) {
            filter += ` and (msp_estcompletiondate ge ${daysAgo(30)} or msp_estcompletiondate eq null)`;
          }
          const result = await crmClient.requestAllPages('opportunities', {
            query: { $filter: filter, $select: OPP_SELECT, $orderby: 'name' }
          });
          if (result.ok && result.data?.value) allOpps.push(...result.data.value);
        }
      }

      const base = getCrmBase();
      const stageNameById = await resolveStageNames(crmClient, allOpps);
      const dealTeamInfo = includeDealTeam !== false
        ? await resolveDealTeamMembers(crmClient, allOpps)
        : { dealTeamByOpportunity: {}, available: true, skipped: true };
      const normalized = allOpps.map(o => {
        const stage = deriveOpportunityStage(o, stageNameById);
        const estimatedCloseDate = o.estimatedclosedate || o.msp_estcompletiondate || null;
        const dealTeam = includeDealTeam !== false
          ? (dealTeamInfo.dealTeamByOpportunity[o.opportunityid as string] || [])
          : [];
        return {
          id: o.opportunityid,
          opportunityNumber: o.msp_opportunitynumber ?? null,
          name: o.name,
          stage,
          estimatedCloseDate,
          closeDate: estimatedCloseDate,
          revenue: o.estimatedvalue ?? null,
          monthlyUse: formatCurrency(o.msp_consumptionconsumedrecurring),
          health: deriveOpportunityHealth(o),
          dealTeam,
          dealTeamCount: dealTeam.length,
          dealTeamSource: dealTeamInfo.skipped
            ? 'skipped'
            : (dealTeamInfo.available ? 'msp_dealteams' : 'unavailable'),
          recordUrl: buildRecordUrl(base, 'opportunity', o.opportunityid as string)
        };
      });
      const normalizedById = Object.fromEntries(normalized.map(n => [n.id, n]));

      const opportunities = format === 'compact'
        ? normalized
        : allOpps.map(o => {
          const enriched = normalizedById[o.opportunityid as string];
          return {
            ...o,
            stage: enriched?.stage ?? null,
            estimatedCloseDate: enriched?.estimatedCloseDate ?? null,
            closeDate: enriched?.closeDate ?? null,
            health: enriched?.health ?? 'Unknown',
            dealTeam: enriched?.dealTeam || [],
            dealTeamCount: enriched?.dealTeamCount ?? 0,
            dealTeamSource: enriched?.dealTeamSource || 'unavailable',
            recordUrl: enriched?.recordUrl || buildRecordUrl(base, 'opportunity', o.opportunityid as string)
          };
        });

      const response: Record<string, unknown> = { count: opportunities.length, opportunities, format: format || 'full', includeDealTeam: includeDealTeam !== false };
      if (!dealTeamInfo.available) {
        response.dealTeamWarning = 'Deal team details unavailable from msp_dealteams in this environment.';
      }
      return text(response);
    }
  );

  // ── get_milestones ──────────────────────────────────────────
  server.tool(
    'get_milestones',
    'Get engagement milestones scoped by customer name, opportunity name/GUID, milestoneId, milestone number, or owner. Always requires a scoping parameter — never returns all milestones unscoped. Resolves customer/opportunity keywords to GUIDs internally — no need to call list_opportunities first. Supports batch opportunityIds, status/keyword filtering, task-presence filtering, and inline task embedding. When mine=true, only active milestones are returned by default (excludes Completed/Cancelled/Closed); pass statusFilter="all" to override. Use format="triage" for urgency-classified output (overdue, due_soon, blocked, on_track) — ideal for morning briefs and health reviews.',
    {
      customerKeyword: z.string().optional().describe('Customer name keyword — resolves accounts → opportunities → milestones in one call'),
      opportunityKeyword: z.string().optional().describe('Opportunity name keyword — resolves matching opportunities → milestones in one call'),
      opportunityId: z.string().optional().describe('Opportunity GUID to list milestones for'),
      opportunityIds: z.array(z.string()).optional().describe('Array of opportunity GUIDs for batch milestone retrieval'),
      milestoneNumber: z.string().optional().describe('Milestone number to search for, e.g. "7-123456789"'),
      milestoneId: z.string().optional().describe('Direct milestone GUID lookup'),
      ownerId: z.string().optional().describe('Owner system user GUID to list milestones for'),
      mine: z.boolean().optional().describe('When explicitly set to true, returns milestones owned by the authenticated CRM user. Automatically filters to active milestones (excludes Completed/Cancelled/Closed) unless statusFilter="all" is passed. Must be set explicitly — does NOT default to true. Prefer customerKeyword, opportunityKeyword, or opportunityId for narrower scoping.'),
      statusFilter: z.enum(['active', 'all']).optional().describe('Filter by status: active = Not Started/On Track/Blocked/At Risk'),
      keyword: z.string().optional().describe('Case-insensitive keyword filter across milestone name, opportunity, and workload'),
      format: z.enum(['full', 'summary', 'triage']).optional().describe('Response format: full (default), summary (grouped compact), or triage (urgency-classified: overdue / due_soon / blocked / on_track)'),
      taskFilter: z.enum(['all', 'with-tasks', 'without-tasks']).optional().describe('Filter milestones by task presence'),
      includeTasks: z.boolean().optional().describe('When true, embeds linked tasks inline on each milestone (avoids separate get_milestone_activities call). Default: false')
    },
    async ({ customerKeyword, opportunityKeyword, opportunityId, opportunityIds, milestoneNumber, milestoneId, ownerId, mine, statusFilter, keyword, format, taskFilter: taskFilterParam, includeTasks }) => {
      // When mine=true, default to active milestones only (skip Completed/Cancelled/Closed)
      if (mine === true && statusFilter === undefined) {
        statusFilter = 'active';
      }

      // Direct GUID lookup
      if (milestoneId) {
        const nid = normalizeGuid(milestoneId);
        if (!isValidGuid(nid)) return error('Invalid milestoneId GUID');
        const result = await crmClient.request(`msp_engagementmilestones(${nid})`, {
          query: { $select: MILESTONE_SELECT }
        });
        if (!result.ok) return error(`Milestone lookup failed (${result.status}): ${result.data?.message}`);
        const data = result.data as Record<string, unknown>;
        const milestone: Record<string, unknown> = { ...data, commitment: commitmentLabel(data), monthlyUse: formatCurrency(data.msp_monthlyuse), recordUrl: buildRecordUrl(getCrmBase(), 'msp_engagementmilestone', nid) };
        if (includeTasks) {
          milestone.tasks = await fetchTasksForMilestones(crmClient, [nid]);
        }
        return text(milestone);
      }

      // Resolve customerKeyword → opportunity GUIDs
      let resolvedOppIds: string[] | null = null;
      if (customerKeyword) {
        const sanitized = sanitizeODataString(customerKeyword.trim());
        const acctResult = await crmClient.requestAllPages('accounts', {
          query: { $filter: `contains(name,'${sanitized}')`, $select: 'accountid,name', $top: '50' }
        });
        const accounts = acctResult.ok ? (acctResult.data?.value || []) : [];
        if (!accounts.length) {
          return text({ count: 0, milestones: [], message: `No accounts found matching '${customerKeyword}'` });
        }
        const acctIds = accounts.map(a => a.accountid as string);
        const cutoff = daysAgo(30);
        const acctChunks: string[][] = [];
        for (let i = 0; i < acctIds.length; i += 25) acctChunks.push(acctIds.slice(i, i + 25));
        const allOpps: Record<string, unknown>[] = [];
        for (const chunk of acctChunks) {
          const acctFilter = `(${chunk.map(id => `_parentaccountid_value eq '${id}'`).join(' or ')}) and statecode eq 0 and (msp_estcompletiondate ge ${cutoff} or msp_estcompletiondate eq null)`;
          const oppResult = await crmClient.requestAllPages('opportunities', {
            query: { $filter: acctFilter, $select: 'opportunityid,name', $orderby: 'name' }
          });
          if (oppResult.ok && oppResult.data?.value) allOpps.push(...oppResult.data.value);
        }
        if (!allOpps.length) {
          return text({ count: 0, milestones: [], message: `No active opportunities found for customer '${customerKeyword}'` });
        }
        resolvedOppIds = allOpps.map(o => o.opportunityid as string);
      }

      // Resolve opportunityKeyword → opportunity GUIDs
      if (!resolvedOppIds && opportunityKeyword) {
        const sanitized = sanitizeODataString(opportunityKeyword.trim());
        const cutoff = daysAgo(30);
        const oppResult = await crmClient.requestAllPages('opportunities', {
          query: {
            $filter: `contains(name,'${sanitized}') and statecode eq 0 and (msp_estcompletiondate ge ${cutoff} or msp_estcompletiondate eq null)`,
            $select: 'opportunityid,name',
            $orderby: 'name',
            $top: '50'
          }
        });
        const opps = oppResult.ok ? (oppResult.data?.value || []) : [];
        if (!opps.length) {
          return text({ count: 0, milestones: [], message: `No active opportunities found matching '${opportunityKeyword}'` });
        }
        resolvedOppIds = opps.map(o => o.opportunityid as string);
      }

      // If keyword resolution produced opportunity IDs, merge with explicit opportunityIds
      if (resolvedOppIds) {
        const merged: string[] = resolvedOppIds;
        if (opportunityIds?.length) merged.push(...opportunityIds);
        if (opportunityId) merged.push(opportunityId);
        opportunityIds = merged;
        opportunityId = undefined;
      }

      let filter;
      if (milestoneNumber) {
        const sanitized = sanitizeODataString(milestoneNumber.trim());
        filter = `msp_milestonenumber eq '${sanitized}'`;
      } else if (opportunityIds?.length) {
        const validIds = opportunityIds.map(normalizeGuid).filter(isValidGuid);
        if (!validIds.length) return error('No valid opportunity GUIDs in opportunityIds');
        const chunks: string[][] = [];
        for (let i = 0; i < validIds.length; i += 25) chunks.push(validIds.slice(i, i + 25));
        const allMilestones: Record<string, unknown>[] = [];
        for (const chunk of chunks) {
          const chunkFilter = chunk.map(id => `_msp_opportunityid_value eq '${id}'`).join(' or ');
          const chunkResult = await crmClient.requestAllPages('msp_engagementmilestones', {
            query: { $filter: chunkFilter, $select: MILESTONE_SELECT, $orderby: 'msp_milestonedate' }
          });
          if (chunkResult.ok && chunkResult.data?.value) allMilestones.push(...chunkResult.data.value);
        }
        let milestones = allMilestones;
        if (statusFilter === 'active') {
          milestones = milestones.filter(m => ACTIVE_STATUSES.has(fv(m, 'msp_milestonestatus') ?? ''));
        }
        if (keyword) {
          const kw = keyword.toLowerCase();
          milestones = milestones.filter(m =>
            ((m.msp_name as string) || '').toLowerCase().includes(kw) ||
            (fv(m, '_msp_opportunityid_value') || '').toLowerCase().includes(kw) ||
            (fv(m, '_msp_workloadlkid_value') || '').toLowerCase().includes(kw)
          );
        }
        if (taskFilterParam && taskFilterParam !== 'all') {
          milestones = await applyTaskFilter(crmClient, milestones, taskFilterParam);
        }
        if (includeTasks) {
          milestones = await embedTasksOnMilestones(crmClient, milestones);
        }
        if (format === 'summary') return text(buildMilestoneSummary(milestones, getCrmBase()));
        if (format === 'triage') return text(buildMilestoneTriage(milestones, getCrmBase()));
        return text({ count: milestones.length, milestones: milestones.map(m => ({ ...m, commitment: commitmentLabel(m), recordUrl: buildRecordUrl(getCrmBase(), 'msp_engagementmilestone', m.msp_engagementmilestoneid as string) })) });
      } else if (opportunityId) {
        const nid = normalizeGuid(opportunityId);
        if (!isValidGuid(nid)) return error('Invalid opportunityId GUID');
        filter = `_msp_opportunityid_value eq '${nid}'`;
      } else if (ownerId) {
        const nid = normalizeGuid(ownerId);
        if (!isValidGuid(nid)) return error('Invalid ownerId GUID');
        filter = `_ownerid_value eq '${nid}'`;
      } else if (mine === true) {
        const whoAmI = await crmClient.request('WhoAmI');
        if (!whoAmI.ok || !whoAmI.data?.UserId) {
          return error(`Unable to resolve current CRM user for milestone lookup (${whoAmI.status}): ${whoAmI.data?.message || 'WhoAmI failed'}`);
        }
        const nid = normalizeGuid(whoAmI.data.UserId);
        filter = `_ownerid_value eq '${nid}'`;
      } else {
        return error('Scoping required: provide customerKeyword, opportunityKeyword, opportunityId, opportunityIds, milestoneNumber, milestoneId, ownerId, or mine=true. Unscoped milestone queries are not allowed.');
      }

      const result = await crmClient.requestAllPages('msp_engagementmilestones', {
        query: { $filter: filter, $select: MILESTONE_SELECT, $orderby: 'msp_milestonedate' }
      });
      if (!result.ok) return error(`Get milestones failed (${result.status}): ${result.data?.message}`);
      let milestones = result.data?.value || [];

      // Post-query filters
      if (statusFilter === 'active') {
        milestones = milestones.filter(m => ACTIVE_STATUSES.has(fv(m, 'msp_milestonestatus') ?? ''));
      }
      if (keyword) {
        const kw = keyword.toLowerCase();
        milestones = milestones.filter(m =>
          ((m.msp_name as string) || '').toLowerCase().includes(kw) ||
          (fv(m, '_msp_opportunityid_value') || '').toLowerCase().includes(kw) ||
          (fv(m, '_msp_workloadlkid_value') || '').toLowerCase().includes(kw)
        );
      }
      if (taskFilterParam && taskFilterParam !== 'all') {
        milestones = await applyTaskFilter(crmClient, milestones, taskFilterParam);
      }
      if (includeTasks) {
        milestones = await embedTasksOnMilestones(crmClient, milestones);
      }
      if (format === 'summary') return text(buildMilestoneSummary(milestones, getCrmBase()));
      if (format === 'triage') return text(buildMilestoneTriage(milestones, getCrmBase()));
      return text({ count: milestones.length, milestones: milestones.map(m => ({ ...m, commitment: commitmentLabel(m), monthlyUse: formatCurrency(m.msp_monthlyuse), recordUrl: buildRecordUrl(getCrmBase(), 'msp_engagementmilestone', m.msp_engagementmilestoneid as string) })) });
    }
  );

  // ── get_my_active_opportunities ─────────────────────────────
  server.tool(
    'get_my_active_opportunities',
    'Returns active opportunities where you are on the deal team or are the owner. Primary discovery is via msp_dealteams entity (deal-team-first), then augmented with owned opportunities. Falls back to milestone-ownership heuristic if msp_dealteams is unavailable. Each opportunity is tagged with relationship (owner, deal-team, or both) and enriched with stage name, health, and deal team members. The recordUrl is embedded on the opportunityNumber field for direct linking.',
    {
      customerKeyword: z.string().optional().describe('Case-insensitive customer name filter'),
      maxResults: z.number().int().min(1).max(200).optional().describe('Optional cap on returned opportunities (1-200) for large portfolios'),
      includeDealTeam: z.boolean().optional().default(true).describe('When false, skips deal-team member enrichment for faster responses (default: true)')
    },
    async ({ customerKeyword, maxResults, includeDealTeam }) => {
      const whoAmI = await crmClient.request('WhoAmI');
      if (!whoAmI.ok || !whoAmI.data?.UserId) {
        return error(`Unable to resolve current CRM user (${whoAmI.status}): ${whoAmI.data?.message || 'WhoAmI failed'}`);
      }
      const userId = normalizeGuid(whoAmI.data.UserId);
      const cutoff = daysAgo(30);
      const base = getCrmBase();

      // 1. Deal-team-first: discover all opportunities where user is on the deal team
      let dealTeamAllOppIds: string[] = [];
      let dealTeamAvailable = true;
      const dealTeamResult = await crmClient.requestAllPages('msp_dealteams', {
        query: {
          $filter: `_msp_dealteamuserid_value eq '${userId}' and statecode eq 0`,
          $select: '_msp_parentopportunityid_value'
        }
      });

      if (dealTeamResult.ok && dealTeamResult.data?.value) {
        for (const row of dealTeamResult.data.value) {
          const oppId = row._msp_parentopportunityid_value as string;
          if (oppId && !dealTeamAllOppIds.includes(oppId)) dealTeamAllOppIds.push(oppId);
        }
      } else {
        dealTeamAvailable = false;
        // Fallback: infer deal-team involvement via milestone ownership
        const msResult = await crmClient.requestAllPages('msp_engagementmilestones', {
          query: { $filter: `_ownerid_value eq '${userId}'`, $select: '_msp_opportunityid_value' }
        });
        if (msResult.ok && msResult.data?.value) {
          for (const m of msResult.data.value) {
            const oppId = m._msp_opportunityid_value as string;
            if (oppId && !dealTeamAllOppIds.includes(oppId)) dealTeamAllOppIds.push(oppId);
          }
        }
      }

      // 2. Fetch all deal-team opportunities (active state only)
      const allOppsById = new Map();
      if (dealTeamAllOppIds.length) {
        for (const chunk of chunkArray(dealTeamAllOppIds, 25)) {
          const dtFilter = chunk.map(id => `opportunityid eq '${sanitizeODataString(id)}'`).join(' or ');
          const dtResult = await crmClient.requestAllPages('opportunities', {
            query: { $filter: `(${dtFilter}) and statecode eq 0 and (msp_estcompletiondate ge ${cutoff} or msp_estcompletiondate eq null)`, $select: OPP_SELECT, $orderby: 'name' }
          });
          if (dtResult.ok && dtResult.data?.value) {
            for (const o of dtResult.data.value) allOppsById.set(o.opportunityid, o);
          }
        }
      }

      // 3. Also fetch owned opportunities and merge (may include opps where user is owner but not on deal team record)
      const ownedResult = await crmClient.requestAllPages('opportunities', {
        query: { $filter: `_ownerid_value eq '${userId}' and statecode eq 0 and (msp_estcompletiondate ge ${cutoff} or msp_estcompletiondate eq null)`, $select: OPP_SELECT, $orderby: 'name' }
      });
      const ownedIds = new Set();
      if (ownedResult.ok && ownedResult.data?.value) {
        for (const o of ownedResult.data.value) {
          ownedIds.add(o.opportunityid);
          if (!allOppsById.has(o.opportunityid)) allOppsById.set(o.opportunityid, o);
        }
      }

      // 4. Determine relationship per opportunity
      const dealTeamOppIdSet = new Set(dealTeamAllOppIds);
      const allOpps = [...allOppsById.values()];

      // 5. Enrich with stage names and deal team members
      const stageNameById = await resolveStageNames(crmClient, allOpps);
      const dealTeamInfo = includeDealTeam !== false
        ? await resolveDealTeamMembers(crmClient, allOpps)
        : { dealTeamByOpportunity: {}, available: true, skipped: true };

      // 6. Build enriched output
      let opportunities = allOpps.map(o => {
        const isOwned = ownedIds.has(o.opportunityid);
        const isOnDealTeam = dealTeamOppIdSet.has(o.opportunityid);
        const relationship = isOwned && isOnDealTeam ? 'both' : isOwned ? 'owner' : 'deal-team';
        const stage = deriveOpportunityStage(o, stageNameById);
        const estimatedCloseDate = o.msp_estcompletiondate || o.estimatedclosedate || null;
        const dealTeam = includeDealTeam !== false
          ? (dealTeamInfo.dealTeamByOpportunity[o.opportunityid] || [])
          : [];
        const recordUrl = buildRecordUrl(base, 'opportunity', o.opportunityid);
        return {
          id: o.opportunityid,
          opportunityNumber: o.msp_opportunitynumber ?? null,
          name: o.name,
          customer: fv(o, '_parentaccountid_value') || null,
          stage,
          estimatedCloseDate,
          revenue: o.estimatedvalue ?? null,
          monthlyUse: formatCurrency(o.msp_consumptionconsumedrecurring),
          health: deriveOpportunityHealth(o),
          relationship,
          dealTeam,
          dealTeamCount: dealTeam.length,
          dealTeamSource: dealTeamInfo.skipped
            ? 'skipped'
            : (dealTeamInfo.available ? 'msp_dealteams' : (dealTeamAvailable ? 'msp_dealteams' : 'milestone-fallback')),
          recordUrl
        };
      });

      // 7. Filter by customerKeyword
      if (customerKeyword) {
        const kw = customerKeyword.toLowerCase();
        opportunities = opportunities.filter(o => (o.customer || '').toLowerCase().includes(kw));
      }

      const totalCount = opportunities.length;
      if (maxResults) {
        opportunities = opportunities.slice(0, maxResults);
      }

      const response: Record<string, unknown> = { count: opportunities.length, totalCount, opportunities, maxResults: maxResults || null };
      if (!dealTeamAvailable) {
        response.dealTeamDiscoveryNote = 'msp_dealteams was unavailable; deal-team discovery fell back to milestone-ownership heuristic.';
      }
      if (dealTeamInfo && !dealTeamInfo.available && !dealTeamInfo.skipped) {
        response.dealTeamWarning = 'Deal team member details unavailable from msp_dealteams in this environment.';
      }
      return text(response);
    }
  );

  // ── create_milestone ───────────────────────────────────────
  server.tool(
    'create_milestone',
    'Create an engagement milestone linked to an opportunity. Supports date, monthly use, status, category, commitment, owner, workload, comments, workload type, delivered by, preferred Azure region, and Azure capacity type.',
    {
      opportunityId: z.string().describe('Opportunity GUID to link the milestone to'),
      name: z.string().describe('Milestone name/title'),
      milestoneDate: z.string().describe('Required. Milestone date in YYYY-MM-DD format'),
      monthlyUse: z.number().describe('Required. Monthly use value'),
      milestoneCategory: z.number().describe(`Required. Milestone category: ${MILESTONE_CATEGORIES.map(o => `${o.value}=${o.label}`).join(', ')}`),
      commitmentRecommendation: z.number().optional().describe(`Commitment recommendation: ${COMMITMENT_RECOMMENDATIONS.map(o => `${o.value}=${o.label}`).join(', ')}`),
      milestoneStatus: z.union([z.number(), z.string()]).optional().describe(`Milestone status (name or code): ${MILESTONE_STATUSES.map(o => `${o.label}=${o.value}`).join(', ')}`),
      workloadId: z.string().describe('Required. Workload GUID (lookup) — use _msp_workloadlkid_value from an existing milestone on the same opportunity, or query msp_workloads by msp_name'),
      ownerId: z.string().optional().describe('System user GUID to assign as owner. Defaults to current user if omitted'),
      transactionCurrencyId: z.string().optional().describe('Transaction currency GUID'),
      forecastComments: z.string().optional().describe('Forecast comments text'),
      workloadType: z.number().optional().describe(`Required for milestone view. Workload Type: ${WORKLOAD_TYPES.map(o => `${o.value}=${o.label}`).join(', ')}.`),
      deliveredBy: z.number().optional().describe(`Required for milestone view. Delivered By: ${DELIVERED_BY.map(o => `${o.value}=${o.label}`).join(', ')}.`),
      preferredAzureRegion: z.number().optional().describe(`Required for milestone view. Preferred Azure Region. Common values: ${PREFERRED_AZURE_REGIONS_COMMON.map(o => `${o.value}=${o.label}`).join(', ')}. Use get_milestone_field_options(field:"preferredAzureRegion") for the full list of 75 regions.`),
      azureCapacityType: z.string().optional().describe(`Required for milestone view. Azure Capacity Type (MultiSelectPicklist — pass comma-separated codes for multiple, e.g. "861980081,861980065"). Common values: ${AZURE_CAPACITY_TYPES_COMMON.map(o => `${o.value}=${o.label}`).join(', ')}. Use get_milestone_field_options(field:"azureCapacityType") for the full list of 65 types.`)
    },
    async ({
      opportunityId,
      name,
      milestoneDate,
      monthlyUse,
      milestoneCategory,
      commitmentRecommendation,
      milestoneStatus,
      workloadId,
      ownerId,
      transactionCurrencyId,
      forecastComments,
      workloadType,
      deliveredBy,
      preferredAzureRegion,
      azureCapacityType
    }) => {
      const oppNid = normalizeGuid(opportunityId);
      if (!isValidGuid(oppNid)) return error('Invalid opportunityId GUID');
      if (!name) return error('name is required');

      // Validate required fields — must be explicitly provided
      const missingViewFields: string[] = [];
      if (!milestoneDate) missingViewFields.push('milestoneDate');
      if (monthlyUse === undefined) missingViewFields.push('monthlyUse');
      if (milestoneCategory === undefined) missingViewFields.push('milestoneCategory');
      if (!workloadId) missingViewFields.push('workloadId');
      if (workloadType === undefined) missingViewFields.push('workloadType');
      if (deliveredBy === undefined) missingViewFields.push('deliveredBy');
      if (preferredAzureRegion === undefined) missingViewFields.push('preferredAzureRegion');
      if (azureCapacityType === undefined) missingViewFields.push('azureCapacityType');
      if (missingViewFields.length) {
        const fieldHints = {
          milestoneDate: 'YYYY-MM-DD format',
          monthlyUse: 'numeric value (e.g. 1000)',
          milestoneCategory: '861980002=Production, 861980000=POC/Pilot',
          workloadId: 'Workload GUID — use _msp_workloadlkid_value from an existing milestone on the same opportunity, or query msp_workloads by msp_name',
          workloadType: WORKLOAD_TYPES.map(o => `${o.value}=${o.label}`).join(', '),
          deliveredBy: DELIVERED_BY.map(o => `${o.value}=${o.label}`).join(', '),
          preferredAzureRegion: PREFERRED_AZURE_REGIONS_COMMON.map(o => `${o.value}=${o.label}`).join(', ') + ' (common — use get_milestone_field_options for full list)',
          azureCapacityType: AZURE_CAPACITY_TYPES_COMMON.map(o => `${o.value}=${o.label}`).join(', ') + ' (common — use get_milestone_field_options for full list)'
        };
        const details = missingViewFields.map(f => `  - ${f}: ${fieldHints[f]}`).join('\n');
        return error(
          `Missing required milestone view fields: ${missingViewFields.join(', ')}. ` +
          'These fields are mandatory for the milestone to display correctly in the opportunity milestone view.\n' +
          'Available values:\n' + details
        );
      }

      const oppLookup = await crmClient.request(`opportunities(${oppNid})`, {
        query: { $select: 'name' }
      });
      if (!oppLookup.ok) {
        return error(`Opportunity lookup failed (${oppLookup.status}): ${oppLookup.data?.message || 'not found'}`);
      }
      const opportunityName = oppLookup.data?.name || null;

      const payload: Record<string, unknown> = {
        msp_name: name,
        'msp_OpportunityId@odata.bind': `/opportunities(${oppNid})`
      };

      // Required fields — validated above, always present
      payload.msp_milestonedate = milestoneDate;
      payload.msp_monthlyuse = monthlyUse;
      payload.msp_milestonecategory = milestoneCategory;

      if (commitmentRecommendation !== undefined) payload.msp_commitmentrecommendation = commitmentRecommendation;
      if (milestoneStatus !== undefined) {
        const resolved = resolveOptionValue(MILESTONE_STATUSES, milestoneStatus);
        if (resolved === undefined) return error(`Invalid milestoneStatus "${milestoneStatus}". Valid: ${MILESTONE_STATUSES.map(o => `${o.label} (${o.value})`).join(', ')}`);
        payload.msp_milestonestatus = resolved;
      }
      if (forecastComments !== undefined) payload.msp_forecastcomments = forecastComments;

      // Required milestone view fields — validated above, always present
      payload.msp_milestoneworkload = workloadType;
      payload.msp_deliveryspecifiedfield = deliveredBy;
      payload.msp_milestonepreferredazureregion = preferredAzureRegion;
      payload.msp_milestoneazurecapacitytype = azureCapacityType;

      const workloadNid = normalizeGuid(workloadId);
      if (!isValidGuid(workloadNid)) return error('Invalid workloadId GUID');
      payload['msp_WorkloadlkId@odata.bind'] = `/msp_workloads(${workloadNid})`;

      if (ownerId) {
        const ownerNid = normalizeGuid(ownerId);
        if (!isValidGuid(ownerNid)) return error('Invalid ownerId GUID');
        payload['ownerid@odata.bind'] = `/systemusers(${ownerNid})`;
      }

      if (transactionCurrencyId) {
        const currencyNid = normalizeGuid(transactionCurrencyId);
        if (!isValidGuid(currencyNid)) return error('Invalid transactionCurrencyId GUID');
        payload['transactioncurrencyid@odata.bind'] = `/transactioncurrencies(${currencyNid})`;
      }

      // AI attribution (RH-2) — only tag if the user provided forecast comments
      if (payload.msp_forecastcomments !== undefined) {
        payload.msp_forecastcomments = withAttribution(payload.msp_forecastcomments as string);
      }

      const queue = getApprovalQueue();
      const op = queue.stage({
        type: 'create_milestone',
        entitySet: 'msp_engagementmilestones',
        method: 'POST',
        payload,
        beforeState: null,
        description: `Create milestone "${name}" on opportunity ${opportunityName || oppNid}`
      });

      return stagedResponse({
        staged: true,
        operationId: op.id,
        description: op.description,
        identity: {
          opportunityId: oppNid,
          opportunityName
        },
        recordUrl: buildRecordUrl(getCrmBase(), 'opportunity', oppNid),
        fieldSummary: resolvePayloadLabels(payload),
        payload,
        message: `Staged ${op.id}: ${op.description}. Approve via execute_operation or from the approval UI.`
      });
    }
  );

  // ── create_task ─────────────────────────────────────────────
  server.tool(
    'create_task',
    'Create a task linked to an engagement milestone. Optionally specify category, subject, due date, and owner.',
    {
      milestoneId: z.string().describe('Engagement milestone GUID to link the task to'),
      subject: z.string().describe('Task subject/title'),
      category: z.number().optional().describe(`Task category code. Valid values: ${TASK_CATEGORIES.map(c => `${c.value} (${c.label})`).join(', ')}`),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      ownerId: z.string().optional().describe('System user GUID to assign as owner'),
      description: z.string().optional().describe('Task description')
    },
    async ({ milestoneId, subject, category, dueDate, ownerId, description }) => {
      const nid = normalizeGuid(milestoneId);
      if (!isValidGuid(nid)) return error('Invalid milestoneId GUID');
      if (!subject) return error('subject is required');

      const payload: Record<string, unknown> = {
        subject,
        'regardingobjectid_msp_engagementmilestone@odata.bind': `/msp_engagementmilestones(${nid})`
      };
      if (category !== undefined) payload.msp_taskcategory = category;
      if (dueDate) payload.scheduledend = dueDate;
      if (description) payload.description = description;
      if (ownerId) {
        const ownerNid = normalizeGuid(ownerId);
        if (!isValidGuid(ownerNid)) return error('Invalid ownerId GUID');
        payload['ownerid@odata.bind'] = `/systemusers(${ownerNid})`;
      }

      // AI attribution (RH-2) — only tag if the user provided a description
      if (payload.description !== undefined) {
        payload.description = withAttribution(payload.description as string);
      }

      const queue = getApprovalQueue();
      const op = queue.stage({
        type: 'create_task',
        entitySet: 'tasks',
        method: 'POST',
        payload,
        beforeState: null,
        description: `Create task "${subject}" on milestone ${nid}`
      });
      return stagedResponse({
        staged: true,
        operationId: op.id,
        description: op.description,
        recordUrl: buildRecordUrl(getCrmBase(), 'msp_engagementmilestone', nid),
        payload,
        message: `Staged ${op.id}: ${op.description}. Approve via execute_operation or from the approval UI.`
      });
    }
  );

  // ── update_task ─────────────────────────────────────────────
  server.tool(
    'update_task',
    'Update fields on an existing task (subject, due date, description, status).',
    {
      taskId: z.string().describe('Task GUID'),
      subject: z.string().optional().describe('New subject'),
      dueDate: z.string().optional().describe('New due date YYYY-MM-DD'),
      description: z.string().optional().describe('New description'),
      statusCode: z.number().optional().describe('New status code')
    },
    async ({ taskId, subject, dueDate, description, statusCode }) => {
      const nid = normalizeGuid(taskId);
      if (!isValidGuid(nid)) return error('Invalid taskId GUID');
      const payload: Record<string, unknown> = {};
      if (subject !== undefined) payload.subject = subject;
      if (dueDate !== undefined) payload.scheduledend = dueDate;
      if (description !== undefined) payload.description = description;
      if (statusCode !== undefined) {
        payload.statuscode = statusCode;
        payload.statecode = taskStateForStatus(statusCode);
      }
      if (Object.keys(payload).length === 0) return error('No fields to update');

      // Fetch before-state for diff preview
      const before = await crmClient.request(`tasks(${nid})`, {
        query: { $select: Object.keys(payload).join(',') }
      });

      // AI attribution (RH-2)
      if (payload.description !== undefined) payload.description = withAttribution(payload.description as string);

      const queue = getApprovalQueue();
      const op = queue.stage({
        type: 'update_task',
        entitySet: `tasks(${nid})`,
        method: 'PATCH',
        payload,
        beforeState: before.ok ? before.data : null,
        description: `Update task ${nid}: ${Object.keys(payload).join(', ')}`
      });
      return stagedResponse({
        staged: true,
        operationId: op.id,
        description: op.description,
        recordUrl: buildRecordUrl(getCrmBase(), 'task', nid),
        before: op.beforeState,
        after: payload,
        message: `Staged ${op.id}: ${op.description}. Approve via execute_operation or from the approval UI.`
      });
    }
  );

  // ── close_task ──────────────────────────────────────────────
  server.tool(
    'close_task',
    'Close a task using the CloseTask action (with fallback to bound Close endpoint).',
    {
      taskId: z.string().describe('Task GUID'),
      statusCode: z.number().describe('Status code for the closure (e.g. 5 = Completed, 6 = Cancelled)'),
      subject: z.string().optional().describe('Close subject (defaults to "Task Closed")')
    },
    async ({ taskId, statusCode, subject }) => {
      const nid = normalizeGuid(taskId);
      if (!isValidGuid(nid)) return error('Invalid taskId GUID');
      if (statusCode === undefined) return error('statusCode is required');

      // Fetch before-state
      const before = await crmClient.request(`tasks(${nid})`, {
        query: { $select: 'subject,statuscode,statecode' }
      });

      // Stage with CloseTask action as primary strategy
      const closePayload = {
        TaskClose: {
          subject: subject || 'Task Closed',
          'activityid@odata.bind': `/tasks(${nid})`
        },
        Status: statusCode
      };

      const queue = getApprovalQueue();
      const op = queue.stage({
        type: 'close_task',
        entitySet: 'CloseTask',
        method: 'POST',
        payload: closePayload,
        beforeState: before.ok ? before.data : null,
        description: `Close task ${nid} with status ${statusCode}`
      });
      // Attach fallback info for executor
      op.fallbackEntitySet = `tasks(${nid})/Microsoft.Dynamics.CRM.Close`;
      op.fallbackPayload = { Status: statusCode };

      return stagedResponse({
        staged: true,
        operationId: op.id,
        description: op.description,
        recordUrl: buildRecordUrl(getCrmBase(), 'task', nid),
        before: op.beforeState,
        statusCode,
        message: `Staged ${op.id}: ${op.description}. Approve via execute_operation or from the approval UI.`
      });
    }
  );

  // ── update_milestone ────────────────────────────────────────
  server.tool(
    'update_milestone',
    'Update fields on an engagement milestone. Only fields you provide will be changed — all other fields are preserved. Supports name, date, monthly use, status, category, commitment, workload, owner, currency, comments, workload type, delivered by, preferred Azure region, and Azure capacity type.',
    {
      milestoneId: z.string().describe('Engagement milestone GUID'),
      name: z.string().optional().describe('New milestone name/title (cannot be empty)'),
      milestoneDate: z.string().optional().describe('New milestone date YYYY-MM-DD'),
      monthlyUse: z.number().optional().describe('New monthly use value'),
      milestoneCategory: z.number().optional().describe(`Milestone category: ${MILESTONE_CATEGORIES.map(o => `${o.value}=${o.label}`).join(', ')}`),
      commitmentRecommendation: z.number().optional().describe(`Commitment recommendation: ${COMMITMENT_RECOMMENDATIONS.map(o => `${o.value}=${o.label}`).join(', ')}`),
      milestoneStatus: z.union([z.number(), z.string()]).optional().describe(`Milestone status (name or code): ${MILESTONE_STATUSES.map(o => `${o.label}=${o.value}`).join(', ')}`),
      workloadId: z.string().optional().describe('New workload GUID (use null to clear)'),
      ownerId: z.string().optional().describe('New owner system user GUID'),
      transactionCurrencyId: z.string().optional().describe('New transaction currency GUID'),
      forecastComments: z.string().optional().describe('Forecast comments text'),
      workloadType: z.number().optional().describe(`Workload Type: ${WORKLOAD_TYPES.map(o => `${o.value}=${o.label}`).join(', ')}`),
      deliveredBy: z.number().optional().describe(`Delivered By: ${DELIVERED_BY.map(o => `${o.value}=${o.label}`).join(', ')}`),
      preferredAzureRegion: z.number().optional().describe(`Preferred Azure Region. Common: ${PREFERRED_AZURE_REGIONS_COMMON.map(o => `${o.value}=${o.label}`).join(', ')}. Full list via get_milestone_field_options.`),
      azureCapacityType: z.string().optional().describe(`Azure Capacity Type (MultiSelectPicklist — comma-separated codes). Common: ${AZURE_CAPACITY_TYPES_COMMON.map(o => `${o.value}=${o.label}`).join(', ')}. Full list via get_milestone_field_options.`)
    },
    async ({ milestoneId, name, milestoneDate, monthlyUse, milestoneCategory, commitmentRecommendation, milestoneStatus, workloadId, ownerId, transactionCurrencyId, forecastComments, workloadType, deliveredBy, preferredAzureRegion, azureCapacityType }) => {
      const nid = normalizeGuid(milestoneId);
      if (!isValidGuid(nid)) return error('Invalid milestoneId GUID');

      // Guard: name must not be blanked
      if (name !== undefined && !name.trim()) return error('name cannot be empty — omit the field to keep the existing name');

      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.msp_name = name;
      if (milestoneDate !== undefined) payload.msp_milestonedate = milestoneDate;
      if (monthlyUse !== undefined) payload.msp_monthlyuse = monthlyUse;
      if (milestoneCategory !== undefined) payload.msp_milestonecategory = milestoneCategory;
      if (commitmentRecommendation !== undefined) payload.msp_commitmentrecommendation = commitmentRecommendation;
      if (milestoneStatus !== undefined) {
        const resolved = resolveOptionValue(MILESTONE_STATUSES, milestoneStatus);
        if (resolved === undefined) return error(`Invalid milestoneStatus "${milestoneStatus}". Valid: ${MILESTONE_STATUSES.map(o => `${o.label} (${o.value})`).join(', ')}`);
        payload.msp_milestonestatus = resolved;
      }
      if (forecastComments !== undefined) payload.msp_forecastcomments = withAttribution(forecastComments);
      if (workloadType !== undefined) payload.msp_milestoneworkload = workloadType;
      if (deliveredBy !== undefined) payload.msp_deliveryspecifiedfield = deliveredBy;
      if (preferredAzureRegion !== undefined) payload.msp_milestonepreferredazureregion = preferredAzureRegion;
      if (azureCapacityType !== undefined) payload.msp_milestoneazurecapacitytype = azureCapacityType;

      if (workloadId !== undefined) {
        if (workloadId) {
          const workloadNid = normalizeGuid(workloadId);
          if (!isValidGuid(workloadNid)) return error('Invalid workloadId GUID');
          payload['msp_WorkloadlkId@odata.bind'] = `/msp_workloads(${workloadNid})`;
        } else {
          payload['msp_WorkloadlkId@odata.bind'] = null;
        }
      }

      if (ownerId !== undefined) {
        const ownerNid = normalizeGuid(ownerId);
        if (!isValidGuid(ownerNid)) return error('Invalid ownerId GUID');
        payload['ownerid@odata.bind'] = `/systemusers(${ownerNid})`;
      }

      if (transactionCurrencyId !== undefined) {
        const currencyNid = normalizeGuid(transactionCurrencyId);
        if (!isValidGuid(currencyNid)) return error('Invalid transactionCurrencyId GUID');
        payload['transactioncurrencyid@odata.bind'] = `/transactioncurrencies(${currencyNid})`;
      }

      if (Object.keys(payload).length === 0) return error('No fields to update');

      // Fetch full milestone record for identity verification + before-state
      const fullRecord = await crmClient.request(`msp_engagementmilestones(${nid})`, {
        query: { $select: MILESTONE_SELECT }
      });
      if (!fullRecord.ok) {
        return error(`Milestone ${nid} not found or inaccessible (${fullRecord.status}): ${fullRecord.data?.message || 'lookup failed'}`);
      }

      const record = fullRecord.data as Record<string, unknown>;
      const milestoneNumber = (record.msp_milestonenumber as string) || null;
      const milestoneName = (record.msp_name as string) || null;
      const milestoneOppId = (record._msp_opportunityid_value as string) || null;
      const milestoneOwnerId = (record._ownerid_value as string) || null;
      const opportunityName = fv(record, '_msp_opportunityid_value') || null;

      // Ownership verification: ensure current user owns milestone or is on deal team
      const whoAmI = await crmClient.request('WhoAmI');
      if (whoAmI.ok && whoAmI.data?.UserId) {
        const currentUserId = normalizeGuid(whoAmI.data.UserId);
        const isOwner = milestoneOwnerId && normalizeGuid(milestoneOwnerId as string) === currentUserId;

        if (!isOwner && milestoneOppId) {
          // Check if user owns the opportunity or any milestones under it
          const oppResult = await crmClient.request(`opportunities(${normalizeGuid(milestoneOppId)})`, {
            query: { $select: '_ownerid_value' }
          });
          const oppOwnerId = oppResult.ok ? normalizeGuid(oppResult.data?._ownerid_value || '') : '';
          const isOppOwner = oppOwnerId === currentUserId;

          if (!isOppOwner) {
            const teamCheck = await crmClient.requestAllPages('msp_engagementmilestones', {
              query: {
                $filter: `_msp_opportunityid_value eq '${normalizeGuid(milestoneOppId)}' and _ownerid_value eq '${currentUserId}'`,
                $select: 'msp_engagementmilestoneid',
                $top: '1'
              }
            });
            const isOnDealTeam = teamCheck.ok && (teamCheck.data?.value?.length ?? 0) > 0;
            if (!isOnDealTeam) {
              return error(
                `Ownership check failed: milestone ${milestoneNumber || nid} ("${milestoneName || 'unknown'}") ` +
                `under opportunity "${opportunityName || milestoneOppId}" is not owned by you and you are not on the deal team. ` +
                `Verify you have the correct milestone ID.`
              );
            }
          }
        } else if (!isOwner && !milestoneOppId) {
          return error(
            `Ownership check failed: milestone ${milestoneNumber || nid} is not owned by you ` +
            `and has no linked opportunity for deal-team verification.`
          );
        }
      }

      // Build before-state limited to fields being changed
      const before: Record<string, unknown> = {};
      for (const key of Object.keys(payload)) {
        before[key] = record[key] ?? null;
      }

      // Identity metadata for pre-execution verification
      const identity = {
        milestoneNumber,
        milestoneName,
        opportunityId: milestoneOppId,
        opportunityName,
      };

      const humanDesc = `Update milestone ${milestoneNumber || nid}` +
        (milestoneName ? ` ("${milestoneName}")` : '') +
        (opportunityName ? ` on "${opportunityName}"` : '') +
        `: ${Object.keys(payload).join(', ')}`;

      const queue = getApprovalQueue();
      const op = queue.stage({
        type: 'update_milestone',
        entitySet: `msp_engagementmilestones(${nid})`,
        method: 'PATCH',
        payload,
        beforeState: before,
        description: humanDesc
      });
      // Attach identity for execution-time re-verification
      op.identity = identity;

      return stagedResponse({
        staged: true,
        operationId: op.id,
        description: op.description,
        recordUrl: buildRecordUrl(getCrmBase(), 'msp_engagementmilestone', nid),
        identity,
        before: resolvePayloadLabels(before),
        after: resolvePayloadLabels(payload),
        payload,
        message: `Staged ${op.id}: ${op.description}. Approve via execute_operation or from the approval UI.`
      });
    }
  );

  // ── list_accounts_by_tpid ───────────────────────────────────
  server.tool(
    'list_accounts_by_tpid',
    'Find accounts by MS Top Parent ID (TPID). Returns account GUIDs and names.',
    {
      tpids: z.array(z.string()).describe('Array of TPID values (numeric strings)')
    },
    async ({ tpids }) => {
      if (!tpids?.length) return error('At least one TPID is required');
      const valid = tpids.filter(isValidTpid);
      if (!valid.length) return error('No valid TPIDs provided');

      const filter = valid.map(t => `msp_mstopparentid eq '${sanitizeODataString(t)}'`).join(' or ');
      const result = await crmClient.requestAllPages('accounts', {
        query: {
          $filter: filter,
          $select: 'accountid,name,msp_mstopparentid',
          $orderby: 'name'
        }
      });
      if (!result.ok) return error(`Account lookup failed (${result.status}): ${result.data?.message}`);
      const accounts = result.data?.value || [];
      return text({ count: accounts.length, accounts });
    }
  );

  // ── get_milestone_field_options ─────────────────────────────
  server.tool(
    'get_milestone_field_options',
    'Retrieve available picklist options for milestone fields from Dynamics 365 metadata. Use before create_milestone to discover valid values for required fields.',
    {
      field: z.enum(['workloadType', 'deliveredBy', 'preferredAzureRegion', 'azureCapacityType']).describe('Which milestone picklist field to retrieve options for')
    },
    async ({ field }) => {
      const fieldMap = {
        workloadType: 'msp_milestoneworkload',
        deliveredBy: 'msp_deliveryspecifiedfield',
        preferredAzureRegion: 'msp_milestonepreferredazureregion',
        azureCapacityType: 'msp_milestoneazurecapacitytype'
      };
      const logicalName = fieldMap[field];
      // azureCapacityType is a MultiSelectPicklist; the rest are standard Picklists
      const metadataType = field === 'azureCapacityType'
        ? 'MultiSelectPicklistAttributeMetadata'
        : 'PicklistAttributeMetadata';
      const result = await crmClient.request(
        `EntityDefinitions(LogicalName='msp_engagementmilestone')/Attributes(LogicalName='${logicalName}')/Microsoft.Dynamics.CRM.${metadataType}`,
        { query: { $select: 'LogicalName', $expand: field === 'azureCapacityType' ? 'GlobalOptionSet($select=Options)' : 'OptionSet($select=Options)' } }
      );
      if (!result.ok) return error(`Metadata query failed (${result.status}): ${result.data?.message}`);

      // MultiSelectPicklist exposes options via GlobalOptionSet; standard Picklist via OptionSet
      const optionSet = (result.data?.OptionSet ?? result.data?.GlobalOptionSet) as Record<string, unknown> | undefined;
      const options = optionSet?.Options as Record<string, unknown>[] || [];
      const parsed = options
        .map((o: Record<string, unknown>) => ({
          value: o?.Value,
          label: ((o?.Label as Record<string, unknown>)?.UserLocalizedLabel as Record<string, unknown>)?.Label || ((o?.Label as Record<string, unknown>)?.LocalizedLabels as Record<string, unknown>[])?.[0]?.Label || ''
        }))
        .filter(o => Number.isInteger(o.value) && o.label);
      return text({ field, logicalName, options: parsed });
    }
  );

  // ── get_task_status_options ─────────────────────────────────
  server.tool(
    'get_task_status_options',
    'Retrieve available task status/statuscode options from Dynamics 365 metadata.',
    {},
    async () => {
      const result = await crmClient.request(
        "EntityDefinitions(LogicalName='task')/Attributes(LogicalName='statuscode')/Microsoft.Dynamics.CRM.StatusAttributeMetadata",
        { query: { $select: 'LogicalName', $expand: 'OptionSet($select=Options)' } }
      );
      if (!result.ok) return error(`Metadata query failed (${result.status}): ${result.data?.message}`);

      const options = (result.data?.OptionSet as Record<string, unknown>)?.Options as Record<string, unknown>[] || [];
      const parsed = options
        .map((o: Record<string, unknown>) => ({
          value: o?.Value,
          label: ((o?.Label as Record<string, unknown>)?.UserLocalizedLabel as Record<string, unknown>)?.Label || ((o?.Label as Record<string, unknown>)?.LocalizedLabels as Record<string, unknown>[])?.[0]?.Label || '',
          stateCode: o?.State
        }))
        .filter(o => Number.isInteger(o.value) && o.label);
      return text(parsed);
    }
  );

  // ── get_milestone_activities ────────────────────────────────
  server.tool(
    'get_milestone_activities',
    'List tasks/activities linked to one or more engagement milestones. Supports batch retrieval via milestoneIds array.',
    {
      milestoneId: z.string().optional().describe('Single engagement milestone GUID'),
      milestoneIds: z.array(z.string()).optional().describe('Array of milestone GUIDs for batch retrieval')
    },
    async ({ milestoneId, milestoneIds }) => {
      // Batch mode
      if (milestoneIds?.length) {
        const validIds = milestoneIds.map(normalizeGuid).filter(isValidGuid);
        if (!validIds.length) return error('No valid milestone GUIDs in milestoneIds');
        const chunks: string[][] = [];
        for (let i = 0; i < validIds.length; i += 25) chunks.push(validIds.slice(i, i + 25));
        const allTasks: Record<string, unknown>[] = [];
        for (const chunk of chunks) {
          const batchFilter = chunk.map(id => `_regardingobjectid_value eq '${id}'`).join(' or ');
          const batchResult = await crmClient.requestAllPages('tasks', {
            query: {
              $filter: batchFilter,
              $select: 'activityid,subject,scheduledend,statuscode,statecode,_ownerid_value,description,msp_taskcategory,_regardingobjectid_value',
              $orderby: 'createdon desc'
            }
          });
          if (batchResult.ok && batchResult.data?.value) allTasks.push(...batchResult.data.value);
        }
        // Group by milestone and add recordUrls
        const base = getCrmBase();
        const byMilestone: Record<string, Record<string, unknown>[]> = {};
        for (const t of allTasks) {
          const msId = t._regardingobjectid_value as string;
          if (!byMilestone[msId]) byMilestone[msId] = [];
          byMilestone[msId].push({ ...t, recordUrl: buildRecordUrl(base, 'task', t.activityid as string) });
        }
        return text({ count: allTasks.length, byMilestone });
      }

      // Single mode (backward-compatible)
      if (!milestoneId) return error('Provide milestoneId or milestoneIds');
      const nid = normalizeGuid(milestoneId);
      if (!isValidGuid(nid)) return error('Invalid milestoneId GUID');

      const filter = `_regardingobjectid_value eq '${nid}'`;
      const result = await crmClient.requestAllPages('tasks', {
        query: {
          $filter: filter,
          $select: 'activityid,subject,scheduledend,statuscode,statecode,_ownerid_value,description,msp_taskcategory',
          $orderby: 'createdon desc'
        }
      });
      if (!result.ok) return error(`Get activities failed (${result.status}): ${result.data?.message}`);
      const tasks = (result.data?.value || []).map(t => ({ ...t, recordUrl: buildRecordUrl(getCrmBase(), 'task', t.activityid as string) }));
      return text({ count: tasks.length, tasks });
    }
  );

  // ── find_milestones_needing_tasks ───────────────────────────
  server.tool(
    'find_milestones_needing_tasks',
    'Composite tool: resolves customer keywords → accounts → opportunities → milestones, then identifies milestones without linked tasks.',
    {
      customerKeywords: z.array(z.string()).describe('Array of customer name keywords to search'),
      statusFilter: z.enum(['active', 'all']).optional().describe('Milestone status filter (default: active)')
    },
    async ({ customerKeywords, statusFilter = 'active' }) => {
      if (!customerKeywords?.length) return error('At least one customerKeyword is required');

      const customers: Record<string, unknown>[] = [];
      let totalNeedingTasks = 0;

      for (const keyword of customerKeywords) {
        const sanitized = sanitizeODataString(keyword.trim());

        // 1. Resolve accounts
        const acctResult = await crmClient.requestAllPages('accounts', {
          query: { $filter: `contains(name,'${sanitized}')`, $select: 'accountid,name', $top: '50' }
        });
        const accounts = acctResult.ok ? (acctResult.data?.value || []) : [];
        if (!accounts.length) {
          customers.push({ customer: keyword, error: 'No matching accounts found', milestonesNeedingTasks: 0, milestones: [] });
          continue;
        }

        // 2. Get opportunities for matched accounts
        const acctIds = accounts.map(a => a.accountid);
        const acctFilter = acctIds.map(id => `_parentaccountid_value eq '${id}'`).join(' or ');
        const oppResult = await crmClient.requestAllPages('opportunities', {
          query: { $filter: `(${acctFilter}) and statecode eq 0`, $select: OPP_SELECT, $orderby: 'name' }
        });
        const opps = oppResult.ok ? (oppResult.data?.value || []) : [];
        if (!opps.length) {
          customers.push({ customer: keyword, milestonesNeedingTasks: 0, milestones: [], accounts: accounts.map(a => a.name) });
          continue;
        }

        // 3. Get milestones for opportunities
        const oppIds = opps.map(o => o.opportunityid);
        const oppFilter = oppIds.map(id => `_msp_opportunityid_value eq '${id}'`).join(' or ');
        const msResult = await crmClient.requestAllPages('msp_engagementmilestones', {
          query: { $filter: oppFilter, $select: MILESTONE_SELECT, $orderby: 'msp_milestonedate' }
        });
        let milestones = msResult.ok ? (msResult.data?.value || []) : [];

        // Apply status filter
        if (statusFilter === 'active') {
          milestones = milestones.filter(m => ACTIVE_STATUSES.has(fv(m, 'msp_milestonestatus') ?? ''));
        }

        if (!milestones.length) {
          customers.push({ customer: keyword, milestonesNeedingTasks: 0, milestones: [] });
          continue;
        }

        // 4. Batch task check
        const msIds = milestones.map(m => m.msp_engagementmilestoneid as string);
        const taskFilter = msIds.map(id => `_regardingobjectid_value eq '${id}'`).join(' or ');
        const taskResult = await crmClient.requestAllPages('tasks', {
          query: { $filter: taskFilter, $select: '_regardingobjectid_value' }
        });
        const taskMsIds = new Set<unknown>();
        if (taskResult.ok && taskResult.data?.value) {
          for (const t of taskResult.data.value) taskMsIds.add(t._regardingobjectid_value);
        }

        const needingTasks = milestones.filter(m => !taskMsIds.has(m.msp_engagementmilestoneid));
        totalNeedingTasks += needingTasks.length;

        customers.push({
          customer: keyword,
          milestonesNeedingTasks: needingTasks.length,
          totalMilestones: milestones.length,
          milestones: needingTasks.map(m => ({
            id: m.msp_engagementmilestoneid,
            number: m.msp_milestonenumber,
            name: m.msp_name,
            status: fv(m, 'msp_milestonestatus'),
            commitment: commitmentLabel(m),
            date: toIsoDate(m.msp_milestonedate),
            opportunity: fv(m, '_msp_opportunityid_value'),
            workload: fv(m, '_msp_workloadlkid_value'),
            recordUrl: buildRecordUrl(getCrmBase(), 'msp_engagementmilestone', m.msp_engagementmilestoneid as string)
          }))
        });
      }

      return text({ totalMilestonesNeedingTasks: totalNeedingTasks, customers });
    }
  );

  // ── view_milestone_timeline ─────────────────────────────────
  server.tool(
    'view_milestone_timeline',
    'Return timeline-friendly milestone events for a user or opportunity, with render hints for Copilot UI.',
    {
      ownerId: z.string().optional().describe('System user GUID to filter milestone owner'),
      opportunityId: z.string().optional().describe('Opportunity GUID to filter milestones'),
      fromDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('End date (YYYY-MM-DD)')
    },
    async ({ ownerId, opportunityId, fromDate, toDate }) => {
      if (!ownerId && !opportunityId) {
        return error('Provide ownerId or opportunityId');
      }

      const filters: string[] = [];
      if (ownerId) {
        const ownerNid = normalizeGuid(ownerId);
        if (!isValidGuid(ownerNid)) return error('Invalid ownerId GUID');
        filters.push(`_ownerid_value eq '${ownerNid}'`);
      }

      if (opportunityId) {
        const oppNid = normalizeGuid(opportunityId);
        if (!isValidGuid(oppNid)) return error('Invalid opportunityId GUID');
        filters.push(`_msp_opportunityid_value eq '${oppNid}'`);
      }

      if (fromDate) filters.push(`msp_milestonedate ge ${sanitizeODataString(fromDate)}`);
      if (toDate) filters.push(`msp_milestonedate le ${sanitizeODataString(toDate)}`);

      const result = await crmClient.requestAllPages('msp_engagementmilestones', {
        query: {
          $filter: filters.join(' and '),
          $select: 'msp_engagementmilestoneid,msp_milestonenumber,msp_name,msp_milestonestatus,msp_commitmentrecommendation,msp_milestonedate,msp_monthlyuse,_msp_opportunityid_value',
          $orderby: 'msp_milestonedate asc'
        }
      });
      if (!result.ok) return error(`Timeline query failed (${result.status}): ${result.data?.message}`);

      const milestones = result.data?.value || [];
      const oppIds = [...new Set(milestones.map(m => m._msp_opportunityid_value as string).filter(Boolean))];
      const opportunityNames: Record<string, unknown> = {};

      for (const id of oppIds) {
        const opp = await crmClient.request(`opportunities(${id})`, { query: { $select: 'name' } });
        if (opp.ok && opp.data?.name) opportunityNames[id] = opp.data.name;
      }

      const base = getCrmBase();
      const events = milestones.map(m => ({
        id: m.msp_engagementmilestoneid,
        date: toIsoDate(m.msp_milestonedate),
        title: m.msp_name,
        milestoneNumber: m.msp_milestonenumber,
        status: m['msp_milestonestatus@OData.Community.Display.V1.FormattedValue'] ?? m.msp_milestonestatus,
        commitment: commitmentLabel(m),
        monthlyUse: formatCurrency(m.msp_monthlyuse),
        opportunityId: m._msp_opportunityid_value ?? null,
        opportunityName: opportunityNames[m._msp_opportunityid_value as string] ?? null,
        recordUrl: buildRecordUrl(base, 'msp_engagementmilestone', m.msp_engagementmilestoneid as string)
      }));

      return text({
        count: events.length,
        events,
        renderHints: {
          view: 'timeline',
          defaultSort: { field: 'date', direction: 'asc' },
          dateField: 'date',
          titleField: 'title',
          laneField: 'opportunityName',
          statusField: 'status'
        }
      });
    }
  );

  // ── view_opportunity_cost_trend ────────────────────────────
  server.tool(
    'view_opportunity_cost_trend',
    'Return monthly cost/consumption trend points for an opportunity with chart/table render hints.',
    {
      opportunityId: z.string().describe('Opportunity GUID'),
      includeMilestones: z.boolean().optional().describe('Include milestone monthly-use points (default true)')
    },
    async ({ opportunityId, includeMilestones = true }) => {
      const oppNid = normalizeGuid(opportunityId);
      if (!isValidGuid(oppNid)) return error('Invalid opportunityId GUID');

      const opportunityResult = await crmClient.request(`opportunities(${oppNid})`, {
        query: {
          $select: 'opportunityid,name,estimatedclosedate,msp_estcompletiondate,msp_consumptionconsumedrecurring'
        }
      });
      if (!opportunityResult.ok) {
        return error(`Opportunity lookup failed (${opportunityResult.status}): ${opportunityResult.data?.message}`);
      }

      const opportunity = opportunityResult.data || {};
      const byMonth = new Map();

      if (includeMilestones) {
        const milestoneResult = await crmClient.requestAllPages('msp_engagementmilestones', {
          query: {
            $filter: `_msp_opportunityid_value eq '${oppNid}'`,
            $select: 'msp_milestonedate,msp_monthlyuse,msp_name,msp_milestonenumber',
            $orderby: 'msp_milestonedate asc'
          }
        });
        if (!milestoneResult.ok) {
          return error(`Milestone trend query failed (${milestoneResult.status}): ${milestoneResult.data?.message}`);
        }

        for (const milestone of milestoneResult.data?.value || []) {
          const key = monthKey(milestone.msp_milestonedate);
          const amount = Number(milestone.msp_monthlyuse ?? 0);
          if (!key || Number.isNaN(amount)) continue;
          byMonth.set(key, (byMonth.get(key) || 0) + amount);
        }
      }

      const points = [...byMonth.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, planned]) => ({ month, plannedMonthlyUse: planned, plannedMonthlyUseFormatted: formatCurrency(planned) }));

      const totalPlanned = points.reduce((sum, point) => sum + point.plannedMonthlyUse, 0);
      const consumedRecurring = Number(opportunity.msp_consumptionconsumedrecurring ?? 0);

      return text({
        opportunity: {
          id: opportunity.opportunityid,
          name: opportunity.name,
          estimatedCloseDate: toIsoDate(opportunity.estimatedclosedate),
          estimatedCompletionDate: toIsoDate(opportunity.msp_estcompletiondate),
          consumedRecurring,
          consumedRecurringFormatted: formatCurrency(consumedRecurring)
        },
        points,
        kpis: {
          consumedRecurring,
          consumedRecurringFormatted: formatCurrency(consumedRecurring),
          totalPlannedMonthlyUse: totalPlanned,
          totalPlannedMonthlyUseFormatted: formatCurrency(totalPlanned),
          latestPlannedMonthlyUse: points.length ? points[points.length - 1].plannedMonthlyUse : 0,
          latestPlannedMonthlyUseFormatted: points.length ? formatCurrency(points[points.length - 1].plannedMonthlyUse) : null
        },
        renderHints: {
          view: 'timeseries',
          xField: 'month',
          yFields: ['plannedMonthlyUse'],
          currency: 'USD',
          defaultChart: 'line',
          showTable: true
        }
      });
    }
  );

  // ── view_staged_changes_diff ───────────────────────────────
  server.tool(
    'view_staged_changes_diff',
    'Build a render-friendly before/after diff table from staged write payloads.',
    {
      before: z.object({}).passthrough().describe('Current values object (before)'),
      after: z.object({}).passthrough().describe('Proposed values object (after)'),
      context: z.string().optional().describe('Optional context label (e.g. operation ID)')
    },
    async ({ before, after, context }) => {
      const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
      const rows = keys
        .map((field) => {
          const beforeValue = before?.[field] ?? null;
          const afterValue = after?.[field] ?? null;
          const beforeText = beforeValue === null ? null : String(beforeValue);
          const afterText = afterValue === null ? null : String(afterValue);

          if (beforeText === afterText) return null;

          let changeType = 'updated';
          if (beforeValue === null && afterValue !== null) changeType = 'added';
          if (beforeValue !== null && afterValue === null) changeType = 'removed';

          return {
            field,
            before: beforeValue,
            after: afterValue,
            changeType
          };
        })
        .filter(Boolean);

      return text({
        context: context || null,
        summary: {
          changedFieldCount: rows.length
        },
        rows,
        renderHints: {
          view: 'diffTable',
          columns: ['field', 'before', 'after', 'changeType'],
          emphasisField: 'changeType'
        }
      });
    }
  );

  // ── list_pending_operations ──────────────────────────────────
  server.tool(
    'list_pending_operations',
    'List all staged CRM write operations awaiting human approval.',
    {},
    async () => {
      const queue = getApprovalQueue();
      const pending = queue.listPending();
      return text({
        count: pending.length,
        operations: pending.map(op => ({
          id: op.id,
          type: op.type,
          description: op.description,
          stagedAt: op.stagedAt,
          expiresIn: Math.max(0, Math.round((op.expiresAt - Date.now()) / 1000)) + 's',
          before: op.beforeState,
          after: op.payload,
        })),
      });
    }
  );

  // ── Post-write rich result helper ─────────────────────────
  // After a successful CRM write, re-fetch the record and return
  // its final state with a direct MSX deep-link.
  const REFETCH_MAP: Record<string, { entity: string; set: string; select: string; idField: string }> = {
    create_milestone:  { entity: 'msp_engagementmilestone', set: 'msp_engagementmilestones', select: MILESTONE_SELECT, idField: 'msp_engagementmilestoneid' },
    update_milestone:  { entity: 'msp_engagementmilestone', set: 'msp_engagementmilestones', select: MILESTONE_SELECT, idField: 'msp_engagementmilestoneid' },
    create_task:       { entity: 'task', set: 'tasks', select: INLINE_TASK_SELECT, idField: 'activityid' },
    update_task:       { entity: 'task', set: 'tasks', select: INLINE_TASK_SELECT, idField: 'activityid' },
    close_task:        { entity: 'task', set: 'tasks', select: INLINE_TASK_SELECT, idField: 'activityid' },
  };

  async function buildPostWriteResult(op: StagedOperation, writeResult: CrmResponse): Promise<Record<string, unknown> | null> {
    const meta = REFETCH_MAP[op.type];
    if (!meta) return null; // non-milestone/task ops — skip rich result

    // Determine record ID
    let recordId: string | undefined;
    if (op.method === 'POST') {
      // Creates: prefer entityId from OData-EntityId header, then response body
      recordId = (writeResult.entityId as string | undefined) || (writeResult.data?.[meta.idField] as string | undefined);
    }
    if (!recordId) {
      // Updates / closes: parse GUID from entitySet (e.g. "tasks(guid)")
      const m = op.entitySet.match(/\(([0-9a-f-]{36})\)/i);
      recordId = m?.[1];
    }
    if (!recordId && op.type === 'close_task') {
      // Fallback: extract from description "Close task <guid>"
      const m = op.description.match(/task ([a-f0-9-]+)/i);
      recordId = m?.[1];
    }
    if (!recordId) return null;

    const base = getCrmBase();
    const recordUrl = buildRecordUrl(base, meta.entity, recordId);

    try {
      const refetch = await crmClient.request(`${meta.set}(${recordId})`, {
        query: { $select: meta.select }
      });
      if (refetch.ok && refetch.data) {
        const record = refetch.data as Record<string, unknown>;
        const result: Record<string, unknown> = { ...record, recordUrl };
        if (meta.entity === 'msp_engagementmilestone') {
          result.commitment = commitmentLabel(record);
        }
        return result;
      }
    } catch { /* re-fetch is best-effort */ }

    return { recordId, recordUrl };
  }

  // ── execute_operation ──────────────────────────────────────
  server.tool(
    'execute_operation',
    'Approve and execute a single staged CRM write operation by ID.',
    {
      id: z.string().describe('Operation ID (e.g. "OP-1")')
    },
    async ({ id }) => {
      const queue = getApprovalQueue();
      // approve() expects 'pending'; also accept 'approved' (orphaned from a failed batch)
      let op = queue.approve(id);
      if (!op) {
        const existing = queue.get(id);
        if (existing && existing.status === 'approved') {
          op = existing; // resume orphaned approved op
        } else {
          return error(`Operation ${id} not found, already executed, or expired.`);
        }
      }

      // Pre-execution integrity check for milestone updates
      if (op.type === 'update_milestone' && op.identity?.milestoneNumber) {
        const recheck = await crmClient.request(op.entitySet, {
          query: { $select: 'msp_milestonenumber,msp_name,_msp_opportunityid_value' }
        });
        if (!recheck.ok) {
          queue.markFailed(id, 'Pre-execution verification failed: milestone no longer accessible');
          return error(`${id} aborted: milestone no longer accessible (${recheck.status}). The record may have been deleted.`);
        }
        const currentNumber = recheck.data?.msp_milestonenumber;
        if (currentNumber && currentNumber !== op.identity.milestoneNumber) {
          queue.markFailed(id, `Milestone number mismatch: expected ${op.identity.milestoneNumber}, got ${currentNumber}`);
          return error(
            `${id} aborted: milestone identity mismatch. ` +
            `Expected milestone number ${op.identity.milestoneNumber} but record at this GUID is ${currentNumber}. ` +
            `This may indicate the wrong milestone was targeted.`
          );
        }
      }

      // Execute against CRM
      let result;
      if (op.type === 'close_task') {
        // Try primary CloseTask action, fallback to bound Close
        result = await crmClient.request(op.entitySet, { method: op.method, body: op.payload });
        if (!result.ok && result.status !== 204 && op.fallbackEntitySet) {
          result = await crmClient.request(op.fallbackEntitySet, { method: 'POST', body: op.fallbackPayload });
        }
        // Third fallback: direct PATCH with state+status
        if (!result.ok && result.status !== 204) {
          const taskId = op.description.match(/task ([a-f0-9-]+)/)?.[1];
          if (taskId) {
            const sc = (op.fallbackPayload?.Status as number) || 5;
            result = await crmClient.request(`tasks(${taskId})`, {
              method: 'PATCH',
              body: { statecode: taskStateForStatus(sc), statuscode: sc }
            });
          }
        }
      } else if (op.type.endsWith('_deal_team_member') || op.type.endsWith('_milestone_team_member')) {
        // Record team operations: try bound action first, fallback to unbound
        result = await crmClient.request(op.entitySet, { method: op.method, body: op.payload });
        if (!result.ok && result.status !== 204) {
          const actionName = op.type.startsWith('add_') ? 'AddUserToRecordTeam' : 'RemoveUserFromRecordTeam';
          result = await crmClient.request(actionName, { method: 'POST', body: op.payload });
        }
      } else {
        result = await crmClient.request(op.entitySet, { method: op.method, body: op.payload });
      }

      if (result.ok || result.status === 204) {
        queue.markExecuted(id, result.data);
        const rich = await buildPostWriteResult(op, result);
        return text({ success: true, executed: id, type: op.type, description: op.description, ...(rich && { result: rich }) });
      }

      queue.markFailed(id, result.data?.message);
      return error(`Execution of ${id} failed (${result.status}): ${result.data?.message}`);
    }
  );

  // ── execute_all ────────────────────────────────────────────
  server.tool(
    'execute_all',
    'Approve and execute ALL pending staged operations in sequence.',
    {
      confirmToken: z.string().describe(`Safety confirmation token. Must be exactly "${EXECUTE_ALL_CONFIRM_TOKEN}".`),
      maxOperations: z.number().optional().describe('Optional cap on number of pending operations to execute (>=1).')
    },
    async ({ confirmToken, maxOperations }) => {
      if (confirmToken !== EXECUTE_ALL_CONFIRM_TOKEN) {
        return error(`execute_all requires confirmToken="${EXECUTE_ALL_CONFIRM_TOKEN}"`);
      }
      if (maxOperations !== undefined && (!Number.isInteger(maxOperations) || maxOperations < 1)) {
        return error('maxOperations must be a positive integer when provided');
      }

      const queue = getApprovalQueue();
      let pending = queue.listPending();
      if (maxOperations !== undefined) pending = pending.slice(0, maxOperations);
      if (!pending.length) return text({ executed: 0, message: 'No pending operations.' });

      const results: Record<string, unknown>[] = [];
      for (const op of pending) {
        try {
          const approved = queue.approve(op.id);
          if (!approved) {
            results.push({ id: op.id, success: false, reason: 'expired or missing' });
            continue;
          }

          // Pre-execution integrity check for milestone updates
          if (op.type === 'update_milestone' && op.identity?.milestoneNumber) {
            const recheck = await crmClient.request(op.entitySet, {
              query: { $select: 'msp_milestonenumber,msp_name,_msp_opportunityid_value' }
            });
            if (!recheck.ok) {
              queue.markFailed(op.id, 'Pre-execution verification failed: milestone no longer accessible');
              results.push({ id: op.id, success: false, reason: 'milestone no longer accessible' });
              continue;
            }
            const currentNumber = recheck.data?.msp_milestonenumber;
            if (currentNumber && currentNumber !== op.identity.milestoneNumber) {
              queue.markFailed(op.id, `Milestone number mismatch: expected ${op.identity.milestoneNumber}, got ${currentNumber}`);
              results.push({ id: op.id, success: false, reason: `identity mismatch: expected ${op.identity.milestoneNumber}, got ${currentNumber}` });
              continue;
            }
          }

          let result;
          if (op.type === 'close_task') {
            result = await crmClient.request(op.entitySet, { method: op.method, body: op.payload });
            if (!result.ok && result.status !== 204 && op.fallbackEntitySet) {
              result = await crmClient.request(op.fallbackEntitySet, { method: 'POST', body: op.fallbackPayload });
            }
            // Third fallback: direct PATCH with state+status
            if (!result.ok && result.status !== 204) {
              const taskId = op.description.match(/task ([a-f0-9-]+)/)?.[1];
              if (taskId) {
                const sc = (op.fallbackPayload?.Status as number) || 5;
                result = await crmClient.request(`tasks(${taskId})`, {
                  method: 'PATCH',
                  body: { statecode: taskStateForStatus(sc), statuscode: sc }
                });
              }
            }
          } else if (op.type.endsWith('_deal_team_member') || op.type.endsWith('_milestone_team_member')) {
            // Record team operations: try bound action first, fallback to unbound
            result = await crmClient.request(op.entitySet, { method: op.method, body: op.payload });
            if (!result.ok && result.status !== 204) {
              const actionName = op.type.startsWith('add_') ? 'AddUserToRecordTeam' : 'RemoveUserFromRecordTeam';
              result = await crmClient.request(actionName, { method: 'POST', body: op.payload });
            }
          } else {
            result = await crmClient.request(op.entitySet, { method: op.method, body: op.payload });
          }

          if (result.ok || result.status === 204) {
            queue.markExecuted(op.id, result.data);
            const rich = await buildPostWriteResult(op, result);
            results.push({ id: op.id, success: true, ...(rich && { result: rich }) });
          } else {
            queue.markFailed(op.id, result.data?.message);
            results.push({ id: op.id, success: false, reason: result.data?.message });
          }
        } catch (err) {
          results.push({ id: op.id, success: false, reason: err?.message || 'unexpected error' });
        }
      }

      const executed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      return text({ executed, failed, results });
    }
  );

  // ── cancel_operation ───────────────────────────────────────
  server.tool(
    'cancel_operation',
    'Cancel/reject a single staged operation by ID. No CRM changes are made.',
    {
      id: z.string().describe('Operation ID (e.g. "OP-1")')
    },
    async ({ id }) => {
      const queue = getApprovalQueue();
      const op = queue.reject(id);
      if (!op) return error(`Operation ${id} not found or already processed.`);
      return text({ cancelled: id, type: op.type, description: op.description });
    }
  );

  // ── cancel_all ─────────────────────────────────────────────
  server.tool(
    'cancel_all',
    'Cancel/reject ALL pending staged operations. No CRM changes are made.',
    {},
    async () => {
      const queue = getApprovalQueue();
      const rejected = queue.rejectAll();
      return text({
        cancelled: rejected.length,
        operations: rejected.map(op => ({ id: op.id, type: op.type, description: op.description })),
      });
    }
  );

  // ── manage_deal_team ─────────────────────────────────────────
  const OPP_TEAM_TEMPLATE_ID = 'cc923a9d-7651-e311-9405-00155db3ba1e';

  server.tool(
    'manage_deal_team',
    'List, add, or remove deal team members on an opportunity via D365 Access Teams. ' +
      'For "add": resolves a person by email or systemUserId, then stages an AddUserToRecordTeam action ' +
      'to add them to the opportunity access team (the "Deal Team" tab in MSX). ' +
      'For "list": returns current access team members. ' +
      'For "remove": stages a RemoveUserFromRecordTeam action to remove a user.',
    {
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      opportunityId: z.string().describe('Opportunity GUID'),
      email: z.string().optional().describe('Email address of the person to add/remove (used to resolve systemuserid)'),
      systemUserId: z.string().optional().describe('SystemUser GUID (if known — skips email lookup)')
    },
    async ({ action, opportunityId, email, systemUserId }) => {
      const oppNid = normalizeGuid(opportunityId);
      if (!isValidGuid(oppNid)) return error('Invalid opportunityId GUID');

      // ── LIST ──
      if (action === 'list') {
        const teamResult = await crmClient.requestAllPages('teams', {
          query: {
            $filter: `_regardingobjectid_value eq '${oppNid}' and _teamtemplateid_value eq '${OPP_TEAM_TEMPLATE_ID}'`,
            $select: 'teamid,name',
            $expand: 'teammembership_association($select=systemuserid,fullname,title)',
            $top: '1'
          }
        });
        if (!teamResult.ok) return error(`List deal team failed (${teamResult.status}): ${teamResult.data?.message}`);

        const teams = teamResult.data?.value || [];
        if (!teams.length) {
          return text({ opportunityId: oppNid, teamExists: false, count: 0, members: [], message: 'No deal team exists yet (0 members).' });
        }

        const team = teams[0];
        const members = ((team.teammembership_association || []) as Record<string, unknown>[]).map(m => ({
          systemUserId: m.systemuserid,
          fullName: m.fullname,
          title: m.title
        }));
        return text({ opportunityId: oppNid, teamId: team.teamid, teamExists: true, count: members.length, members });
      }

      // ── Resolve user for add/remove ──
      let resolvedUserId = systemUserId ? normalizeGuid(systemUserId) : null;
      let displayName: unknown = null;

      if (!resolvedUserId && email) {
        const sanitizedEmail = sanitizeODataString(email.trim());
        const userResult = await crmClient.requestAllPages('systemusers', {
          query: {
            $filter: `internalemailaddress eq '${sanitizedEmail}'`,
            $select: 'systemuserid,fullname,internalemailaddress',
            $top: '5'
          }
        });
        if (userResult.ok && userResult.data?.value?.length) {
          resolvedUserId = normalizeGuid(userResult.data.value[0].systemuserid);
          displayName = userResult.data.value[0].fullname;
        } else {
          return error(`No systemuser found with email "${email}". Verify the email address is correct.`);
        }
      }

      if (!resolvedUserId || !isValidGuid(resolvedUserId)) {
        return error('Either email or systemUserId is required to add/remove a deal team member.');
      }

      if (!displayName) {
        const userResult = await crmClient.request(`systemusers(${resolvedUserId})`, {
          query: { $select: 'fullname' }
        });
        if (userResult.ok && userResult.data) displayName = userResult.data.fullname;
      }

      // ── ADD ──
      if (action === 'add') {
        const payload = {
          Record: {
            '@odata.type': 'Microsoft.Dynamics.CRM.opportunity',
            opportunityid: oppNid
          },
          TeamTemplate: {
            '@odata.type': 'Microsoft.Dynamics.CRM.teamtemplate',
            teamtemplateid: OPP_TEAM_TEMPLATE_ID
          }
        };

        const queue = getApprovalQueue();
        const op = queue.stage({
          type: 'add_deal_team_member',
          entitySet: `systemusers(${resolvedUserId})/Microsoft.Dynamics.CRM.AddUserToRecordTeam`,
          method: 'POST',
          payload,
          beforeState: null,
          description: `Add ${displayName || resolvedUserId} to deal team on opportunity ${oppNid}`
        });
        return text({
          staged: true,
          operationId: op.id,
          description: op.description,
          recordUrl: buildRecordUrl(getCrmBase(), 'opportunity', oppNid),
          resolvedUserId,
          displayName,
          message: `Staged ${op.id}: ${op.description}. Approve via execute_operation.`
        });
      }

      // ── REMOVE ──
      if (action === 'remove') {
        const payload = {
          Record: {
            '@odata.type': 'Microsoft.Dynamics.CRM.opportunity',
            opportunityid: oppNid
          },
          TeamTemplate: {
            '@odata.type': 'Microsoft.Dynamics.CRM.teamtemplate',
            teamtemplateid: OPP_TEAM_TEMPLATE_ID
          }
        };

        const queue = getApprovalQueue();
        const op = queue.stage({
          type: 'remove_deal_team_member',
          entitySet: `systemusers(${resolvedUserId})/Microsoft.Dynamics.CRM.RemoveUserFromRecordTeam`,
          method: 'POST',
          payload,
          beforeState: null,
          description: `Remove ${displayName || resolvedUserId} from deal team on opportunity ${oppNid}`
        });
        return text({
          staged: true,
          operationId: op.id,
          description: op.description,
          recordUrl: buildRecordUrl(getCrmBase(), 'opportunity', oppNid),
          resolvedUserId,
          displayName,
          message: `Staged ${op.id}: ${op.description}. Approve via execute_operation.`
        });
      }

      return error(`Unknown action: ${action}`);
    }
  );

  // ── manage_milestone_team ──────────────────────────────────
  const MILESTONE_TEAM_TEMPLATE_ID = '316e4735-9e83-eb11-a812-0022481e1be0';

  server.tool(
    'manage_milestone_team',
    'List, add, or remove members on a milestone\'s access team (the "Milestone Team" tab in MSX). ' +
      'Uses Dynamics 365 Access Teams with the "Milestone Team" team template. ' +
      'Add/remove are staged for human approval via execute_operation.',
    {
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      milestoneId: z.string().describe('Engagement milestone GUID'),
      email: z.string().optional().describe('Email address of the person to add/remove (used to resolve systemuserid)'),
      systemUserId: z.string().optional().describe('SystemUser GUID (if known — skips email lookup)')
    },
    async ({ action, milestoneId, email, systemUserId }) => {
      const msNid = normalizeGuid(milestoneId);
      if (!isValidGuid(msNid)) return error('Invalid milestoneId GUID');

      // ── LIST ──
      if (action === 'list') {
        const teamResult = await crmClient.requestAllPages('teams', {
          query: {
            $filter: `_regardingobjectid_value eq '${msNid}' and _teamtemplateid_value eq '${MILESTONE_TEAM_TEMPLATE_ID}'`,
            $select: 'teamid,name',
            $expand: 'teammembership_association($select=systemuserid,fullname,title)',
            $top: '1'
          }
        });
        if (!teamResult.ok) return error(`List milestone team failed (${teamResult.status}): ${teamResult.data?.message}`);

        const teams = teamResult.data?.value || [];
        if (!teams.length) {
          return text({ milestoneId: msNid, teamExists: false, count: 0, members: [], message: 'No milestone team exists yet (0 members).' });
        }

        const team = teams[0];
        const members = ((team.teammembership_association || []) as Record<string, unknown>[]).map(m => ({
          systemUserId: m.systemuserid,
          fullName: m.fullname,
          title: m.title
        }));
        return text({ milestoneId: msNid, teamId: team.teamid, teamExists: true, count: members.length, members });
      }

      // ── Resolve user for add/remove ──
      let resolvedUserId = systemUserId ? normalizeGuid(systemUserId) : null;
      let displayName: unknown = null;

      if (!resolvedUserId && email) {
        const sanitizedEmail = sanitizeODataString(email.trim());
        const userResult = await crmClient.requestAllPages('systemusers', {
          query: {
            $filter: `internalemailaddress eq '${sanitizedEmail}'`,
            $select: 'systemuserid,fullname,internalemailaddress',
            $top: '5'
          }
        });
        if (userResult.ok && userResult.data?.value?.length) {
          resolvedUserId = normalizeGuid(userResult.data.value[0].systemuserid);
          displayName = userResult.data.value[0].fullname;
        } else {
          return error(`No systemuser found with email "${email}".`);
        }
      }

      if (!resolvedUserId || !isValidGuid(resolvedUserId)) {
        return error('Either email or systemUserId is required to add/remove a milestone team member.');
      }

      if (!displayName) {
        const userResult = await crmClient.request(`systemusers(${resolvedUserId})`, {
          query: { $select: 'fullname' }
        });
        if (userResult.ok && userResult.data) displayName = userResult.data.fullname;
      }

      // ── ADD ──
      if (action === 'add') {
        const payload = {
          Record: {
            '@odata.type': 'Microsoft.Dynamics.CRM.msp_engagementmilestone',
            msp_engagementmilestoneid: msNid
          },
          TeamTemplate: {
            '@odata.type': 'Microsoft.Dynamics.CRM.teamtemplate',
            teamtemplateid: MILESTONE_TEAM_TEMPLATE_ID
          }
        };

        const queue = getApprovalQueue();
        const op = queue.stage({
          type: 'add_milestone_team_member',
          entitySet: `systemusers(${resolvedUserId})/Microsoft.Dynamics.CRM.AddUserToRecordTeam`,
          method: 'POST',
          payload,
          beforeState: null,
          description: `Add ${displayName || resolvedUserId} to milestone team on ${msNid}`
        });
        return text({
          staged: true,
          operationId: op.id,
          description: op.description,
          recordUrl: buildRecordUrl(getCrmBase(), 'msp_engagementmilestone', msNid),
          resolvedUserId,
          displayName,
          message: `Staged ${op.id}: ${op.description}. Approve via execute_operation.`
        });
      }

      // ── REMOVE ──
      if (action === 'remove') {
        const payload = {
          Record: {
            '@odata.type': 'Microsoft.Dynamics.CRM.msp_engagementmilestone',
            msp_engagementmilestoneid: msNid
          },
          TeamTemplate: {
            '@odata.type': 'Microsoft.Dynamics.CRM.teamtemplate',
            teamtemplateid: MILESTONE_TEAM_TEMPLATE_ID
          }
        };

        const queue = getApprovalQueue();
        const op = queue.stage({
          type: 'remove_milestone_team_member',
          entitySet: `systemusers(${resolvedUserId})/Microsoft.Dynamics.CRM.RemoveUserFromRecordTeam`,
          method: 'POST',
          payload,
          beforeState: null,
          description: `Remove ${displayName || resolvedUserId} from milestone team on ${msNid}`
        });
        return text({
          staged: true,
          operationId: op.id,
          description: op.description,
          recordUrl: buildRecordUrl(getCrmBase(), 'msp_engagementmilestone', msNid),
          resolvedUserId,
          displayName,
          message: `Staged ${op.id}: ${op.description}. Approve via execute_operation.`
        });
      }

      return error(`Unknown action: ${action}`);
    }
  );

  // ── crm_auth_status ─────────────────────────────────────────
  server.tool(
    'crm_auth_status',
    'Check authentication status — shows current user, expiry, CRM URL.',
    {},
    async () => {
      const authResult = await crmClient.request('WhoAmI');
      if (!authResult.ok) return error(`Not authenticated: ${authResult.data?.message || authResult.status}`);
      return text({
        authenticated: true,
        userId: authResult.data?.UserId,
        businessUnitId: authResult.data?.BusinessUnitId,
        organizationId: authResult.data?.OrganizationId
      });
    }
  );
}
