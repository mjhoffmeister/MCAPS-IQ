# Optimization Plan v8.0 — UX: Risk-Tiered Cache Policy for CRM Reads

**Status**: 🟡 In Review  
**Created**: March 6, 2026  
**Branch**: `optimizationplanv8-UX`  
**Predecessor**: `optimizationplanv4-db` (.docs/ database architecture), `optimizationplanv6-teams` (hybrid cache pattern)  
**Reviewed by**: GPT-5.3-Codex · Claude Opus 4.6 · Gemini 3 Pro · GPT-5.4 (parallel 4-model review, March 6 2026)

---

## Problem Statement

The branch introduces a **Database-First Resolution Protocol** that returns milestone and opportunity data from `.docs/_data/<Account>/state.md` when the file is ≤7 days old, only falling back to live CRM when data is stale, missing, write-related, or explicitly requested. The UX goal is valid: reduce unnecessary CRM round-trips, lower token/tool cost, and let agents answer common account questions faster by using the `.docs/` database created in **v4** as a local cache.

However, the current architecture treats CRM as the **authoritative system of record for live state**. That contract is stated explicitly in `.github/instructions/local-notes.instructions.md` ("CRM provides fresh state" and "CRM data is always retrieved fresh for ... risk assessment, governance reporting, or cross-customer analysis"). The new branch weakens that contract by allowing cached state to answer read-only milestone/opportunity questions even when those questions are often governance-critical in practice.

This creates four UX/governance failures:

1. **Silent staleness risk** — A CSA, CSAM, or pipeline reviewer can receive cached milestone status with no explicit provenance or age warning, even though their workflows are about execution truth, risk posture, and near-term commitments.
2. **Guardrail bypass risk** — `msx-role-and-write-gate.instructions.md` requires scoped CRM reads before bulk milestone retrieval. If agents satisfy portfolio questions entirely from `.docs/`, they may skip the live-scoping discipline that the governance layer expects.
3. **Observability gap** — `Monitoring.md` and `.vscode/settings.json` enable OTEL at the Copilot layer, but there is currently no cache-specific instrumentation in `mcp/msx/src/` to show whether an answer came from `.docs/` or CRM, how stale it was, or whether promotion succeeded.
4. **Integrity gap** — The protocol says "promote findings" back to `.docs/`, but there is no reconciliation contract, no transactional write path across `state.md` / `_manifest.md` / `_index.md`, and no failure handling if CRM read succeeds but note promotion fails.

Additionally, two **positive UX impacts** are underappreciated in the current branch:

5. **CRM downtime resilience** — When CRM is unavailable (token expired, service outage), the agent can still answer "what are my milestones?" from cache. Today it would fail entirely. This is a meaningful UX win for continuity.
6. **Auth friction reduction** — CRM tokens expire every ~1 hour. Every live CRM call risks hitting an expired token → `az login` flow → browser auth → MCP restart. Reducing CRM calls directly reduces these interruptions.

In short: the performance optimization is directionally good, but the current proposal is too coarse. A blanket **7-day TTL for milestone/opportunity reads** does not fit the role-based governance model already encoded in the repo.

## Proposed Solution

Adopt a **Risk-Tiered Cache Policy** instead of a blanket Database-First policy.

### ADR-8.1 — `.docs/` is a context cache, not the source of truth for governance-critical state
- **Decision**: Use `.docs/` first for account identification, scope narrowing, historical context, seat snapshots, and non-critical summaries.
- **Do not** use cache-only answers for:
  - pipeline-reviewer audits
  - CSA committed milestone execution monitoring
  - CSAM committed milestone health reviews
  - SE task hygiene when tasks/status drive action
  - any write preflight
  - any "at risk / blocked / due soon / what needs attention" query
- **Rationale**: These flows depend on live milestone status, task count, forecast comments, owners, and dates. Current role skills already assume CRM-first retrieval for those checks.

### ADR-8.2 — Replace single 7-day TTL with query-class freshness

| Query class | Examples | Source policy | TTL |
|---|---|---|---|
| **Low-risk context** | account lookup, known OppID, tranche, seat snapshot, prior notes | `.docs/` first; CRM optional | 7 days |
| **Medium-risk operational read** | "show open opportunities", broad account summary, forecast comments | `.docs/` allowed only if ≤3d old and response labels provenance | 3 days |
| **High-risk governance read** | milestone health, at-risk review, pipeline audit, task hygiene, near-term due dates, commitment status | **CRM required**; `.docs/` may scope only | 1 day (or live-only) |
| **Write preflight** | create/update task, update milestone, close task | **CRM required** after `.docs/` scoping | Always live |

**Dynamic TTL override**: During the last 2 weeks of each fiscal quarter (close window), all medium-risk TTLs compress to 1 day, and high-risk queries are always live. This prevents stale data during the period when milestone status, commitment flips, and forecast comments change most rapidly.

### ADR-8.3 — Every answer must carry provenance
- Add explicit response metadata: `source = docs|crm|mixed`, `crmQueriedAt`, `docsUpdatedAt`, `freshnessClass`, `cacheDecisionReason`.
- If cache is used, the user-facing answer must state that it is cached and how old it is.
- If cache is older than policy allows, force CRM or return a warning.
- Example: `📋 Milestones for Contoso (Source: .docs/ cache, updated 2 days ago) — say "check live" for fresh CRM data.`

### ADR-8.4 — Promotion is a write workflow and must be observable
- Treat CRM → `.docs/` promotion as a distinct operation with success/failure status.
- Do not mark `state.md` as fresh unless all dependent writes succeed: `state.md`, `_manifest.md`, and `_index.md`.
- Add drift detection and periodic reconciliation for high-value tracked accounts.

### ADR-8.5 — Cache metadata block in state.md
Each `state.md` frontmatter must include structured cache metadata:
```yaml
---
updated: 2026-03-06
crm_synced_at: 2026-03-06T14:30:00Z
sync_source: crm-operator
fields_synced: [milestones, opportunities, tasks]
sync_actor: session-abc123
---
```
This enables deterministic freshness evaluation (not just `updated` date) and supports drift detection and reconciliation.

### ADR-8.6 — Bootstrap workflow for non-indexed accounts
When an account exists in CRM but not in `.docs/_index.md`:
1. CRM query proceeds normally (no cache exists to check).
2. After CRM returns, create `.docs/_data/<Account>/` folder structure.
3. Populate `state.md` with initial CRM snapshot.
4. Add account to `_index.md`.
5. Do NOT auto-delete accounts removed from AccountReference.md — flag for user review.

This preserves the UX/performance benefit while keeping CRM authoritative where the current architecture depends on live truth.

## Implementation Steps

### Phase 1 — Narrow the policy surface (instruction edits)
1. Update `.github/agents/crm-operator.agent.md` so "Database-First" becomes **"Scope-First Cache"** for low-risk reads only.
2. Update `.github/instructions/local-notes.instructions.md`:
   - Resolve Core Principle contradictions (see Appendix A1).
   - Restore CRM-required behavior in freshness table for: risk assessment, governance reporting, pipeline review, committed milestone monitoring, task hygiene.
3. Update `.github/instructions/docs-index-protocol.instructions.md` to distinguish:
   - **lookup/context routing** (cache-eligible)
   - **governance/execution routing** (CRM-required)
4. Update `.github/instructions/msx-role-and-write-gate.instructions.md`:
   - §0: Add `.docs/` as first step for low-risk read-only operations.
   - §3: Cross-reference "validate live state from CRM before writing" from crm-operator protocol.
5. Add an explicit **never-cache-without-CRM** list for pipeline-reviewer and the SE/CSA/CSAM/Specialist workflows.
6. Handle `state.md` parsing errors: malformed/corrupt files must trigger CRM fallback, same as "not found."

### Phase 2 — Add provenance and decision logging
1. Add a shared "Data Source Contract" section referenced from `crm-operator.agent.md`, `local-notes.instructions.md`, `docs-index-protocol.instructions.md`, and role/pipeline skills.
2. Extend the resolution contract to emit:
   - `resolution_source` (docs | crm | mixed)
   - `docs_updated_at`
   - `crm_queried_at`
   - `query_risk_tier` (low | medium | high | write)
   - `cache_ttl_bucket`
   - `cache_decision_reason`
3. Add response provenance template required for all CRM-derived answers (see ADR-8.3).
4. Instrument resolution decisions with OTEL spans/attributes so Jaeger/App Insights can show:
   - why cache was used
   - why CRM was used
   - whether the result was mixed
5. Update `Monitoring.md` with cache observability guidance and example dashboards.

### Phase 3 — Make promotion safe and add bootstrap
1. Define a promotion sequence:
   - CRM fetch complete
   - `state.md` write success (with cache metadata frontmatter per ADR-8.5)
   - `_manifest.md` write success
   - `_index.md` write success
2. If any step fails:
   - surface a warning
   - do not advance freshness markers
   - record promotion failure telemetry
3. Add reconciliation workflow for tracked accounts:
   - daily/weekly scan of `MSX` date in `_index.md`
   - compare cached milestone IDs/counts/status against CRM for recent active opportunities
4. Implement bootstrap workflow (ADR-8.6) for accounts in CRM but not yet in `.docs/`.
5. Define conflict-safe update order when multiple agents (AccountTracker + CRMOperator) may update the same `state.md` — use append-only strategy for insights, full-overwrite for state snapshots.

### Phase 4 — Validate by workflow, not just by file
1. Test SE daily task hygiene with stale and fresh `state.md`.
2. Test CSA committed milestone review with a cached mismatch.
3. Test CSAM weekly health review with a changed task/comment state in CRM.
4. Test pipeline-reviewer criteria 1-8 with cache-only input vs CRM input and compare findings.
5. Test low-risk account summary and lookup flows for token/tool savings.

## Success Criteria

### UX / Efficiency
- [ ] Low-risk account lookup flows reduce CRM calls by **50%+** without increasing incorrect-answer rate.
- [ ] Median tool-call count for account lookup / known-opportunity lookup drops by **30%+** versus current CRM-first behavior.
- [ ] Cache hit rate for **low-risk** reads reaches **60%+**.
- [ ] Average response time for cached "show milestones" < **2 seconds** (currently ~10s with CRM round-trip).
- [ ] p50 / p95 response-time improvement measurable via OTEL spans.
- [ ] User interruptions for CRM auth refresh reduced by **50%+**.
- [ ] Agent continues to answer read-only queries during CRM token expiry or service outage.

### Governance / Accuracy
- [ ] **100%** of pipeline-reviewer audits use live CRM milestone/opportunity data for criterion evaluation.
- [ ] **100%** of write preflights query CRM after `.docs/` scoping.
- [ ] **100%** of CSA/CSAM committed-milestone health workflows use CRM when milestone is due in ≤60 days, committed, at-risk, or blocked.
- [ ] Cache-only responses always expose provenance and age.
- [ ] Reconciliation detects and resolves cache/CRM drift within **24 hours** for active tracked accounts.

### Observability
- [ ] OTEL spans capture `source`, `risk_tier`, `ttl_bucket`, `promotion_status`, and `fallback_reason` for every milestone/opportunity resolution.
- [ ] Dashboard can report:
  - cache hit rate by query class
  - stale-read rate
  - CRM fallback rate
  - promotion success/failure rate
  - drift incidents by account

## Risk Mitigation

| Risk | Why it matters | Mitigation |
|---|---|---|
| Cached milestone status hides new risk | Violates `intent.instructions.md` risk-surfacing mode | Require CRM for governance/risk queries; expose provenance on every cached answer |
| Bulk-read scoping discipline gets bypassed | Weakens `msx-role-and-write-gate.instructions.md` safeguards | Cache may scope or answer low-risk reads only; CRM scoping rules still apply whenever live data is required |
| Pipeline-reviewer flags become stale or incomplete | Criteria 1, 3, 4, 5, 6, 7, 8 all depend on live milestone/opportunity/task/comment state | Make pipeline-reviewer CRM-required for criterion evaluation; use `.docs/` only for SSP/Tier/Tranche context |
| CSAM / CSA act on wrong execution data | Wrong status/date/owner can cause customer-facing mistakes or missed escalation | Force CRM for committed or near-term milestones; warn when cached context is older than policy |
| Promotion partially fails | Cache looks fresh even though only some files updated | Transactional promotion status, no freshness bump on partial failure, emit telemetry + warning |
| Cache drift accumulates | `.docs/state.md` can diverge quickly from CRM between manual syncs | Add scheduled reconciliation and drift metrics |
| Observability remains blind | Cannot prove whether cache improves UX safely | Add OTEL attributes/spans and Monitoring.md dashboard guidance |

## Files Requiring Updates

This section consolidates all files that need modification to implement the risk-tiered cache policy. Organized by priority.

### 🔴 Blocking (must update before merge)

| File | Change Required |
|---|---|
| `.github/agents/crm-operator.agent.md` | Rename "Database-First" → "Scope-First Cache"; add query-class routing; add provenance contract; handle state.md parse errors |
| `.github/instructions/local-notes.instructions.md` | Resolve 3 Core Principle contradictions (A1); update freshness table with tiered TTLs; update rule of thumb; update anti-pattern wording |
| `.github/instructions/docs-index-protocol.instructions.md` | Split operation table into context vs governance routing; add risk-tier annotations |
| `.github/instructions/msx-role-and-write-gate.instructions.md` | §0: add .docs/ as first step for low-risk reads; §3: cross-reference live-state validation |

### 🟡 Should update (documentation consistency)

| File | Change Required |
|---|---|
| `.github/skills/pipeline-reviewer/SKILL.md` | Explicitly state CRM-required for criterion evaluation; document .docs/ as scope/context only |
| `.github/skills/solution-engineer/SKILL.md` | Add note that database-first applies transitively via CRMOperator; SE task hygiene is CRM-required |
| `.github/skills/cloud-solution-architect/SKILL.md` | Add note that committed milestone monitoring is CRM-required |
| `.github/skills/csam/SKILL.md` | Add note that committed milestone health is CRM-required |
| `.github/skills/specialist/SKILL.md` | Add note that pipeline creation/qualification uses CRM-required reads |
| `Monitoring.md` | Add cache observability section: hit rates, staleness, promotion success/failure |

### 🟢 Enhancement (Phase 2+)

| File | Change Required |
|---|---|
| `.docs/_schema.md` | Add cache metadata frontmatter spec (ADR-8.5) |
| `mcp/msx/src/` | Add OTEL instrumentation for cache vs CRM resolution decisions |
| `.github/agents/AccountTracker.agent.md` | Verify delegation to CRMOperator includes risk-tier context |

## Review Notes Against Current Repo

- `.github/instructions/local-notes.instructions.md` still states that CRM is the authoritative fresh-state system and should be used for risk/governance/cross-customer analysis; the branch partially contradicts that contract.
- `.github/skills/pipeline-reviewer/SKILL.md` already says: use `.docs/` for scope filtering and SSP lookup, but use **CRM for milestone-level criterion checks**.
- `.github/skills/solution-engineer/SKILL.md`, `.github/skills/cloud-solution-architect/SKILL.md`, and `.github/skills/csam/SKILL.md` all define operational loops around live CRM milestone/task/activity retrieval for execution truth.
- `Monitoring.md` plus `.vscode/settings.json` provide Copilot-level OTEL plumbing, but `mcp/msx/src/` currently has no visible cache telemetry implementation. The plan should therefore include instrumentation work, not just instruction edits.

---

## Appendix: Deep Architecture Cross-Reference

This section documents specific file-level findings from a full cross-agent consistency audit.

### A1. Internal Contradictions in `local-notes.instructions.md` (Blocking)

Three statements in the unchanged portions of the file directly contradict the new Freshness Rules:

| # | Statement (unchanged) | Line | Contradiction with branch changes |
|---|---|---|---|
| 1 | Core Principle #1: "Notes define scope; **CRM provides fresh state**" | L13 | New rules allow notes to *provide* state (not just scope) for fresh read-only queries |
| 2 | Core Principle #3: "**CRM data is always retrieved fresh** for complex operations" | L15 | "What milestones need attention?" is a complex/risk-assessment query but now uses notes-first |
| 3 | Anti-pattern: "**Stale notes over fresh CRM** — notes context is for scoping and narrative. Never use cached notes as a substitute for live CRM status when accuracy matters" | L211 | 7-day-old cached milestone status IS being used as a substitute for live CRM status |

**Suggested resolution**: Update Principle #1 to "Notes define scope **and serve as first-pass data source**; CRM provides **validated live state** when notes are stale, missing, or write-intent is involved." Update Principle #3 to explicitly list the operations that always require CRM: "writes, risk assessment, governance reporting, cross-customer analysis, pipeline audit criteria." Update the anti-pattern to: "**Blindly trusting stale notes** — cached data older than the TTL threshold must trigger CRM validation. Never present cached data as live state without source attribution."

### A2. `msx-role-and-write-gate.instructions.md` Not Updated (Blocking)

This instruction file directly governs CRM read/write behavior but is untouched by the branch:

- **§0 (CRM Read Scoping)**: Makes no mention of `.docs/` — still implies every read starts with CRM scoping. Should add `.docs/` as first step for read-only operations.
- **§1 (Role Resolution)**: Correctly stays CRM-first — user identity (`crm_auth_status` + `crm_get_record`) doesn't live in `.docs/`. This is a valid exception to database-first.
- **§3 (Mandatory Plan Mode)**: Requires confirmation before writes but doesn't reference "validate live state from CRM before writing." The crm-operator protocol adds this requirement, but §3 should cross-reference it for consistency.

### A3. Cross-Agent `.docs/`-Awareness Map

| Agent/Skill | References `.docs/`? | Database-first? | CRM query method | Gap |
|---|---|---|---|---|
| crm-operator | ✅ (updated) | ✅ (new protocol) | Direct `msx-crm/*` tools | — |
| AccountTracker | ✅ (context loading) | ⚠️ Implicit | Delegates to CRMOperator | No formal TTL enforcement; relies on CRMOperator |
| StratTechSalesOrch | ✅ (primary source) | ✅ (no CRM tools) | Reports stale data back to AccountTracker | Already aligned — 7-day threshold explicit |
| pipeline-reviewer | ✅ (scope + SSP) | ⚠️ Partial | "Use CRM for milestone-level criterion checks" | **Contradicts** database-first for its heaviest operation |
| SE skill | ❌ | ❌ | Inline within CRMOperator | Silent on `.docs/` — protocol applies transitively |
| CSA skill | ❌ | ❌ | Inline within CRMOperator | Same as SE |
| CSAM skill | ❌ | ❌ | Inline within CRMOperator | Same as SE |
| Specialist skill | ❌ | ❌ | Inline within CRMOperator | Same as SE |

**Key insight**: All role skills (SE, CSA, CSAM, Specialist) are defined as inline workflow templates executed within CRMOperator's context. The database-first protocol in crm-operator.agent.md applies *transitively* to these workflows — but the skill files themselves make no mention of it, creating documentation inconsistency.

### A4. Intent Alignment: Multi-Medium Cross-Referencing Risk

`intent.instructions.md` lines 65–71 require: *"Cross-reference at least two mediums when the question involves status, risk, or next steps"* and *"Flag when a medium is stale or silent."*

| Scenario | Before (CRM-first) | After (database-first) | Intent compliance |
|---|---|---|---|
| "What milestones need attention?" | CRM (live) + `.docs/` (context) = 2 mediums | `.docs/` only (if fresh) = 1 medium | ⚠️ Regression |
| "Status of opportunity Y?" | CRM (live) = 1 medium | `.docs/` (if fresh) = 1 medium | Same (1 medium both times) |
| "Account health summary" | CRM + `.docs/` + agent memory = 3 mediums | `.docs/` only (if fresh) = 1 medium | ⚠️ Regression |

**Mitigation**: Even when serving cached CRM data, the agent should still cross-reference M365 signals (email activity, meeting notes, Teams threads). A milestone marked "On Track" 5 days ago in `.docs/` but with a customer email saying "we're blocked" yesterday should trigger a CRM refresh.

### A5. TTL Sensitivity Analysis

| Data type | Change frequency | 7-day stale risk | Suggested TTL |
|---|---|---|---|
| Milestone status (On Track → At Risk → Blocked) | Hours to days | **HIGH** — missed escalation | 1 day |
| Task completion/creation | Daily | **MEDIUM** — show completed as open | 1 day |
| Forecast comments | Weekly (governance cycle) | **MEDIUM** — outdated thinking | 3 days |
| Opportunity stage changes | Weekly | **MEDIUM** — affects handoff logic | 3 days |
| Milestone dates | Occasional | LOW | 7 days |
| Account identity, ownership, tranche | Rare | LOW | 7 days |

### A6. UX Transparency Contract (Missing)

The branch adds no mechanism for the agent to communicate data source or freshness. Recommended guardrail for crm-operator.agent.md:

> When serving milestone/opportunity data from `.docs/` cache, include in the response: (1) data source (`.docs/` cache vs live CRM), (2) age of cached data, (3) how to force a refresh ("say 'refresh from CRM' for live data").

Example: `📋 Milestones for Contoso (Source: .docs/ cache, updated 2 days ago) — say "check live" for fresh CRM data.`
