---
description: "CRM read query scoping strategy for MSX/MCEM. Scope-Before-Retrieve pattern: VAULT-PREFETCH, composite tools, crm_query filters, get_milestones usage. Use when constructing CRM queries, milestone lookups, or opportunity scoping to avoid oversized payloads. Prevents unscoped get_milestones(mine:true) calls."
applyTo: "mcp/msx/**"
---

# CRM Query Strategy (Scope-Before-Retrieve)

**Never call `msx-crm:get_milestones` without a scoping parameter.** The tool now rejects unscoped calls — `mine` no longer defaults to `true`. Always provide at least one of: `customerKeyword`, `opportunityKeyword`, `opportunityId`, `opportunityIds`, `milestoneNumber`, `milestoneId`, `ownerId`, or explicit `mine: true`.

## Step 0 — VAULT-PREFETCH (mandatory when OIL is available)

Before asking scoping questions or calling any CRM tool:

1. Call `oil:get_vault_context()` to confirm vault availability and get the vault map.
2. If customer is named/inferable, call `oil:get_customer_context({ customer: "<Name>" })` — returns opportunities with GUIDs, team, action items.
3. For CRM-ready OData filters, use `oil:prepare_crm_prefetch({ customers: ["<Name>"] })`.
4. If vault has opportunity GUIDs, **skip Step 1** and go directly to Step 2/3 with vault-provided IDs.
5. If OIL unavailable or customer has no vault file, fall through to Step 1.

Do NOT skip this step when OIL is available. The vault is the primary source for customer→opportunity ID mapping.

## Step 1 — Clarify Intent (if vault didn't resolve scope)

Ask clarifying questions:
- Which opportunity or customer? (name or ID)
- Which milestone status? (active, at risk, overdue, completed)
- What time range? (this quarter, next 30 days)
- What information is needed? (milestone names, tasks, dates)

## Step 2 — Composite and Batch Tools First

Prefer composite tools over chaining primitives:
- **`msx-crm:get_milestones({ customerKeyword: "Contoso" })`** — resolves customer name → accounts → opportunities → milestones in one call. Add `statusFilter: 'active'` and/or `includeTasks: true` for filtered results with inline tasks. This is the preferred tool for customer-scoped milestone queries.
- **`msx-crm:get_milestones({ opportunityKeyword: "Azure Migration" })`** — resolves opportunity name → milestones in one call. No need to call `list_opportunities` first.
- `msx-crm:get_milestones({ opportunityIds: [...], statusFilter: 'active', format: 'summary' })` — batch mode with status filtering and compact output.
- `msx-crm:find_milestones_needing_tasks({ customerKeywords: [...] })` — specialized: finds milestones *without* tasks.
- `msx-crm:list_opportunities({ customerKeyword: "...", includeDealTeam: true, format: "full" })` — opportunity-level view with stage/estimated close/deal-team enrichment.
- `msx-crm:list_opportunities({ opportunityKeyword: "..." })` or `msx-crm:list_opportunities({ opportunityIds: [...] })` — use these when customer keyword/account mapping is weak.
- `msx-crm:get_milestone_activities({ milestoneIds: [...] })` — batch task retrieval grouped by milestone (or use `get_milestones` with `includeTasks: true`).

## Step 3 — crm_query for Filtered Lookups

Preferred tool for milestone queries needing filtering. See `crm-entity-schema.instructions.md` for full schema.

**Guardrails**: `crm_query` enforces an entity allowlist and a 500-record pagination ceiling. Only entity sets in `ALLOWED_ENTITY_SETS` are permitted. Queries to unlisted entities are rejected with a descriptive error.

- Entity set: `msp_engagementmilestones` (NOT `msp_milestones` or `msp_milestoneses`)
- Use `$filter` for status, date range, opportunity, or owner
- Use `$select` for only needed fields (avoid full-record payloads)
- Use `$top` to limit results (default 10–25)
- Use `$orderby` for date/status relevance
- Multi-opportunity: OData `or` in `$filter` (`_msp_opportunityid_value eq '<GUID1>' or _msp_opportunityid_value eq '<GUID2>'`)
- Status filtering: `msp_milestonestatus eq 861980000` (On Track), `ne 861980003` (exclude Completed)

## Step 4 — get_milestones (Full-Featured Tool)

`get_milestones` is the primary milestone retrieval tool. It supports:

| Parameter | Type | Description |
|---|---|---|
| `customerKeyword` | string | Resolves customer name → accounts → opportunities → milestones in one call |
| `opportunityKeyword` | string | Resolves opportunity name → milestones in one call |
| `opportunityId` | string (GUID) | Filter by single opportunity |
| `opportunityIds` | string[] | Batch mode: array of opportunity GUIDs |
| `milestoneId` | string (GUID) | Direct milestone lookup |
| `milestoneNumber` | string | e.g. "7-123456789" |
| `ownerId` | string (GUID) | Filter by owner |
| `mine` | boolean | Current user's milestones (**must be explicit** — no default) |
| `statusFilter` | 'active' \| 'all' | Filter by status group |
| `keyword` | string | Case-insensitive keyword filter |
| `format` | 'full' \| 'summary' | Response format |
| `taskFilter` | 'all' \| 'with-tasks' \| 'without-tasks' | Filter by task presence |
| `includeTasks` | boolean | Embed linked tasks inline on each milestone |

Use `crm_query` only for queries that `get_milestones` cannot express (e.g., custom date range filters, arbitrary OData predicates).

## Step 5 — Drill Down Incrementally

For "which milestones need tasks":
1. Prefer `msx-crm:find_milestones_needing_tasks` for full chain.
2. Or `msx-crm:crm_query` with `entitySet: "msp_engagementmilestones"` and filters.
3. `msx-crm:get_milestone_activities({ milestoneIds: [...] })` for batch task detail.
4. Do not call `get_milestone_activities` one milestone at a time in a loop.

## Good vs Bad Patterns

| Pattern | Status |
|---|---|
| `get_milestones(mine: true)` → "which ones need attention?" | ❌ Unscoped — use customerKeyword or opportunityId instead |
| `get_milestones({})` or `get_milestones()` with no params | ❌ Rejected — scoping required |
| `crm_query({ entitySet: "msp_milestones" })` | ❌ Wrong entity set |
| `crm_query` with `msp_forecastedconsumptionrecurring` | ❌ Field doesn't exist |
| `crm_query` with `msp_estimatedcompletiondate` | ❌ Use `msp_milestonedate` |
| Loop: list_opportunities per customer → get_milestones per opp → get_milestone_activities per ms | ❌ ~30 calls |
| Skipping vault when OIL is available | ❌ Wastes API calls |
| `get_milestones({ customerKeyword: "Contoso", statusFilter: "active" })` | ✅ **1 call** (best) |
| `get_milestones({ customerKeyword: "Contoso", includeTasks: true })` | ✅ **1 call** with inline tasks |
| `get_milestones({ opportunityKeyword: "Azure Migration" })` | ✅ **1 call** (name resolution) |
| `get_milestones({ opportunityIds: [...], statusFilter: "active" })` | ✅ Batch with filtering |
| `oil:get_customer_context("Contoso")` → use GUID → `get_milestones({ opportunityId })` | ✅ Vault-first (2 calls) |
| `oil:prepare_crm_prefetch({ customers: [...] })` → paste into `crm_query` | ✅ CRM-ready prefetch |
| `find_milestones_needing_tasks({ customerKeywords: [...] })` | ✅ 1 call |
| `crm_query` with proper `$filter`/`$select`/`$top` | ✅ Filtered, efficient |
| `get_milestone_activities({ milestoneIds: ["ms1","ms2","ms3"] })` | ✅ Batch (1 call) |
