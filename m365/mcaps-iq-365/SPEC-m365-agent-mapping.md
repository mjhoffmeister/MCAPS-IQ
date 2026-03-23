# Specification: Mapping mcaps-iq → M365 Declarative Agent (TypeSpec)

> **Status:** Draft  
> **Date:** 2026-03-20  
> **Branch:** `feat/m365-agent`  
> **Scope:** Map the mcaps-iq `.github/` configuration and `mcp.json` MCP server topology into the M365 declarative agent TypeSpec project (`m365/mcaps-iq-365`).

---

## 1. Executive Summary

The mcaps-iq project today runs as a VS Code–hosted Copilot agent backed by:

- **7 MCP servers** (msx-crm, oil, excalidraw, workiq, teams, mail, calendar, sharepoint, word, powerbi-remote, github, ado)
- **15 instruction files** (`.github/instructions/*.instructions.md`)
- **4 role cards** (Specialist, SE, CSA, CSAM)
- **30+ skills** (`.github/skills/*/SKILL.md`)
- **4 agent definitions** (mcaps, m365-actions, pbi-analyst, doctor)
- **A copilot-instructions.md** root behavioral contract

The M365 declarative agent platform supports a subset of these capabilities natively. This spec defines how each component maps, what translates directly, what requires adaptation, and what remains VS Code–only.

---

## 2. Architecture Comparison

| Dimension | mcaps-iq (VS Code) | M365 Declarative Agent (TypeSpec) |
|---|---|---|
| **Runtime** | VS Code Copilot Chat + MCP stdio/http servers | Microsoft 365 Copilot orchestrator |
| **Instructions** | `copilot-instructions.md` + 15 instruction files (auto-loaded by `applyTo` glob) | Single `@instructions()` decorator (≤8,000 chars) |
| **Actions** | MCP tools (unlimited, stdio/http) | API Plugins via OpenAPI specs (REST endpoints) |
| **Knowledge** | Obsidian vault (OIL MCP), CRM (msx-crm MCP) | OneDriveAndSharePoint, CopilotConnectors, Dataverse, Email, TeamsMessages |
| **Skills** | `.github/skills/*/SKILL.md` (runtime file reads) | Not directly supported — must be baked into instructions or actions |
| **Role routing** | Dynamic role detection via `crm_whoami` | Must be handled in instructions or per-role conversation starters |
| **Subagents** | `@m365-actions`, `@pbi-analyst`, `@doctor` | Not supported — single agent, no delegation |
| **Write safety** | Staged approval queue (dry-run → human confirm → execute) | Confirmation cards via adaptive cards possible |

---

## 3. Component Mapping

### 3.1 Agent Identity

| Source | Target |
|---|---|
| `.github/agents/mcaps.agent.md` → `name: mcaps` | `@agent("MCAPS-IQ", "AI-powered sales operations agent for MCAPS account teams...")` in `main.tsp` |
| `description` field | Second param of `@agent()` decorator |
| `copilot-instructions.md` | `@instructions(Prompts.INSTRUCTIONS)` in `main.tsp` |

**Action:** Rewrite `@agent()` name/description to match mcaps branding. Update `manifest.json` name/description.

### 3.2 Instructions (8,000 char budget)

The current instruction corpus totals ~50,000+ characters across 15 files. The M365 agent has an 8,000 character limit. Strategy:

| Priority | Source Instruction | Map To | Rationale |
|---|---|---|---|
| **P0 — Core** | `copilot-instructions.md` (operational checklist, response expectations) | `Prompts.INSTRUCTIONS` | Defines agent behavioral contract |
| **P0 — Core** | `intent.instructions.md` (intent resolution order, strategic dimensions) | `Prompts.INSTRUCTIONS` | Governs resolve order |
| **P0 — Core** | `shared-patterns.instructions.md` § Opportunity Identifier Discipline | `Prompts.INSTRUCTIONS` | GUID vs display number discipline |
| **P1 — Role** | `mcem-flow.instructions.md` (Stage Spine table) | `Prompts.INSTRUCTIONS` (condensed) | MCEM stage routing |
| **P1 — Role** | Role cards (specialist, SE, CSA, CSAM) | Conversation starters per role | Cannot fit all 4 cards; use starters to scope |
| **P2 — Query** | `crm-entity-schema.instructions.md` | Action `descriptionForModel` hints | Schema guidance embedded in API plugin descriptions |
| **P2 — Query** | `crm-query-strategy.instructions.md` | Action `descriptionForModel` hints | Query scoping encoded in action descriptions |
| **P3 — Deferred** | `obsidian-vault.instructions.md` | Omit (no vault in M365) | OIL is local-only; M365 uses native knowledge |
| **P3 — Deferred** | `powerbi-mcp.instructions.md` | Omit (no PBI subagent) | PBI remote MCP not available as API plugin |
| **P3 — Deferred** | `connect-hooks.instructions.md` | Omit | Vault-dependent |
| **P3 — Deferred** | `pbi-context-bridge.instructions.md` | Omit | Subagent pattern not supported |

**Instruction condensation strategy:**

```
src/agent/prompts/instructions.tsp  →  Prompts.INSTRUCTIONS  (≤8,000 chars)
```

Structure the 8K budget:

| Section | Budget | Content |
|---|---|---|
| Identity & Intent | ~800 chars | Agent mission, resolve order (Intent→Role→Medium→Action→Risk) |  
| Role Detection | ~600 chars | Detect role from context, 4 roles defined, stage accountability |
| MCEM Stage Spine | ~1,200 chars | Condensed 5-stage table with accountable units and exit evidence |
| Response Format | ~1,000 chars | Table columns for milestones/opportunities, no prose-only |
| CRM Discipline | ~800 chars | GUID for params, Opp# for display, key field names |
| Action Guidance | ~1,500 chars | When to use each action, multi-step workflow hints |
| Conversation Starters | ~500 chars | Role-based entry points |
| Safety & Anti-patterns | ~600 chars | Write confirmation, no guessing, cite sources |
| **Total** | **~7,000 chars** | Leaves ~1,000 char headroom |

### 3.3 MCP Servers → Actions & Capabilities

#### 3.3.1 MSX-CRM MCP → API Plugin Actions

The MSX-CRM MCP server exposes 26 tools against Dynamics 365. These must be re-exposed as OpenAPI REST endpoints that the M365 agent calls as API plugins.

**Deployment requirement:** A lightweight HTTP API proxy that wraps the CRM client (Azure Functions or Azure App Service) authenticated via the user's Entra ID token.

| MCP Tool | API Plugin Operation | HTTP | Route | Notes |
|---|---|---|---|---|
| `crm_whoami` | `whoAmI` | GET | `/api/crm/whoami` | Identity probe |
| `crm_query` | `queryEntities` | GET | `/api/crm/query` | OData passthrough (allowlisted entities) |
| `crm_get_record` | `getRecord` | GET | `/api/crm/{entitySet}/{id}` | Single record fetch |
| `list_opportunities` | `listOpportunities` | GET | `/api/opportunities` | Query params map to tool params |
| `get_my_active_opportunities` | `getMyOpportunities` | GET | `/api/opportunities/mine` | Deal-team-first discovery |
| `get_milestones` | `getMilestones` | GET | `/api/milestones` | Multi-param scoping |
| `get_milestone_activities` | `getMilestoneActivities` | GET | `/api/milestones/{id}/activities` | Task listing |
| `create_milestone` | `createMilestone` | POST | `/api/milestones` | Staged write |
| `update_milestone` | `updateMilestone` | PATCH | `/api/milestones/{id}` | Staged write |
| `create_task` | `createTask` | POST | `/api/tasks` | Staged write |
| `update_task` | `updateTask` | PATCH | `/api/tasks/{id}` | Staged write |
| `close_task` | `closeTask` | POST | `/api/tasks/{id}/close` | Staged write |
| `list_accounts_by_tpid` | `listAccountsByTpid` | GET | `/api/accounts/by-tpid` | TPID lookup |
| `find_milestones_needing_tasks` | `findMilestonesNeedingTasks` | GET | `/api/milestones/needing-tasks` | Composite |
| `get_milestone_field_options` | `getMilestoneFieldOptions` | GET | `/api/milestones/field-options` | Metadata |
| `get_task_status_options` | `getTaskStatusOptions` | GET | `/api/tasks/status-options` | Metadata |
| `view_milestone_timeline` | `viewMilestoneTimeline` | GET | `/api/milestones/timeline` | Visualization data |
| `view_opportunity_cost_trend` | `viewOpportunityCostTrend` | GET | `/api/opportunities/{id}/cost-trend` | Chart data |
| `manage_deal_team` | `manageDealTeam` | POST | `/api/opportunities/{id}/deal-team` | List/add/remove |
| `list_pending_operations` | `listPendingOperations` | GET | `/api/operations/pending` | Approval queue |
| `execute_operation` | `executeOperation` | POST | `/api/operations/{id}/execute` | Approval |
| `execute_all` | `executeAll` | POST | `/api/operations/execute-all` | Batch approval |
| `cancel_operation` | `cancelOperation` | DELETE | `/api/operations/{id}` | Rejection |
| `cancel_all` | `cancelAll` | DELETE | `/api/operations` | Batch rejection |
| `view_staged_changes_diff` | `viewStagedDiff` | POST | `/api/operations/diff` | Diff rendering |

**TypeSpec action definition pattern:**

```typespec
// src/agent/actions/crm.tsp
@service
@server(Environment.CRM_API_URL)
@actions(#{
  nameForHuman: "MSX CRM",
  descriptionForHuman: "Query and manage Dynamics 365 CRM opportunities, milestones, and tasks.",
  descriptionForModel: "CRM operations for MCAPS account teams. Use getMyOpportunities for deal-team-first discovery. Use getMilestones with customerKeyword for scoped milestone retrieval. Always use GUIDs for tool parameters, display msp_opportunitynumber as 'Opp #'. Write operations are staged — use listPendingOperations and executeOperation for approval."
})
namespace CrmAPI {
  @route("/api/opportunities/mine")
  @get op getMyOpportunities(
    @query customerKeyword?: string,
    @query maxResults?: integer,
    @query includeDealTeam?: boolean = true
  ): string;
  
  // ... additional operations
}
```

#### 3.3.2 OIL (Obsidian Vault) → Native Capabilities

The OIL MCP server is fundamentally local (reads/writes a local Obsidian vault). It cannot be directly exposed as an API plugin. Replacement strategy:

| OIL Capability | M365 Replacement | Implementation |
|---|---|---|
| Customer context / prefetch | **OneDriveAndSharePoint** scoped to a team SharePoint site | Customer files stored as markdown or structured docs in SharePoint |
| Graph traversal / search | **CopilotConnectors** with a Graph connector ingesting vault content | Or manually maintain a SharePoint site mirror |
| Person context / UPN resolution | **People** capability | Native M365 directory |
| Meeting notes | **Meetings** + **TeamsMessages** capabilities | Native M365 content |
| Write-back / patch notes | SharePoint file updates via API plugin | Custom API wrapping SharePoint |

**Capabilities to enable in `main.tsp`:**

```typespec
namespace mcapsiq {
  op people is AgentCapabilities.People;
  op meetings is AgentCapabilities.Meetings;
  op teamsMessages is AgentCapabilities.TeamsMessages;
  op email is AgentCapabilities.Email;
  op oneDriveAndSharePoint is AgentCapabilities.OneDriveAndSharePoint;
  op codeInterpreter is AgentCapabilities.CodeInterpreter;
}
```

#### 3.3.3 M365 MCP Servers → Native Capabilities

| MCP Server (mcp.json) | M365 Native Capability | Notes |
|---|---|---|
| `teams` | `AgentCapabilities.TeamsMessages` | Native — no action needed |
| `mail` | `AgentCapabilities.Email` | Native — no action needed |
| `calendar` | `AgentCapabilities.Meetings` | Covers meeting content; scheduling requires API plugin |
| `sharepoint` | `AgentCapabilities.OneDriveAndSharePoint` | Native for read; write requires API plugin |
| `word` | N/A | Would need API plugin if doc generation required |
| `workiq` | Subsumed by native capabilities | M365 Copilot has native access to the same Graph sources |

#### 3.3.4 Other MCP Servers

| MCP Server | M365 Strategy |
|---|---|
| `excalidraw` | Omit — VS Code only. Diagrams can use `GraphicArt` capability or `CodeInterpreter` for charts |
| `powerbi-remote` | API Plugin wrapping Fabric MCP endpoint, or **Omit** for v1 |
| `github` | API Plugin (reuse existing `github.tsp` action definition) |
| `ado` | API Plugin if needed; omit for v1 |

### 3.4 Skills → Instructions + Conversation Starters

Skills are runtime-loaded instruction documents in VS Code. M365 agents don't support this pattern. Strategy:

| Approach | Skills Covered |
|---|---|
| **Bake into instructions** | `morning-brief`, `mcem-stage-identification`, `milestone-health-review`, `pipeline-hygiene-triage` — highest-frequency skills condensed into action-routing guidance in `Prompts.INSTRUCTIONS` |
| **Conversation starters** | Map top skills to up to 12 conversation starters that prime the agent for specific workflows |
| **Action `descriptionForModel`** | Encode skill routing logic in action meta so the LLM knows when to call which action |
| **Defer** | Low-frequency or vault-dependent skills (vault-context-assembly, connect hooks, writing-operator-notes, docx/pdf/xlsx processing) — omit for v1 |

**Proposed conversation starters (≤12):**

```typespec
@conversationStarter(#{ title: "Morning Brief", text: "Give me my morning brief — pipeline health, milestone status, today's meetings, and risk signals." })
@conversationStarter(#{ title: "My Opportunities", text: "Show me my active opportunities with stage, health, and deal team." })
@conversationStarter(#{ title: "Milestone Health", text: "Review milestone health for [customer] — flag overdue, at-risk, and blocked items." })
@conversationStarter(#{ title: "Pipeline Hygiene", text: "Run pipeline hygiene triage — stale opportunities, missing fields, close-date slippage." })
@conversationStarter(#{ title: "Stage Check", text: "What MCEM stage is [opportunity] actually at based on CRM evidence?" })
@conversationStarter(#{ title: "Deal Risk Radar", text: "Surface deal risks for [customer] — relationship decay, silent stakeholders, looming threats." })
@conversationStarter(#{ title: "Prepare for Meeting", text: "Prepare a briefing for my meeting with [customer] — open items, recent activity, risk signals." })
@conversationStarter(#{ title: "Task Hygiene", text: "Check task hygiene for my milestones — stale tasks, missing owners, overdue items." })
@conversationStarter(#{ title: "Create Milestone", text: "Create a new milestone on [opportunity] for [customer]." })
@conversationStarter(#{ title: "Handoff Readiness", text: "Check STU-to-CSU handoff readiness for [opportunity]." })
@conversationStarter(#{ title: "Account Landscape", text: "Show me the full account landscape for [customer] — all pipeline, cross-role activity." })
@conversationStarter(#{ title: "Exit Criteria", text: "Validate exit criteria for [opportunity] — are we ready to advance?" })
```

### 3.5 Subagents → Flattened into Single Agent

| VS Code Subagent | M365 Strategy |
|---|---|
| `@m365-actions` | **Eliminated** — M365 native capabilities handle Teams/Mail/Calendar/SharePoint natively |
| `@pbi-analyst` | **Deferred** — Power BI requires API plugin; omit for v1, or add CodeInterpreter for data viz |
| `@doctor` | **Omitted** — documentation agent is dev-tooling only |

### 3.6 Write Safety (Staged Approval)

The MSX-CRM MCP server's staged approval pattern (stage → preview → confirm → execute) should be preserved in the API plugin layer:

1. Write operations (`POST`/`PATCH`/`DELETE`) return a staged payload with `operationId`
2. The agent presents the diff to the user via response text
3. User explicitly says "execute" / "approve"
4. Agent calls `executeOperation` with the `operationId`

This maps cleanly to the existing API since the approval queue lives server-side.

---

## 4. File Structure (Target State)

```
m365/mcaps-iq-365/
├── src/agent/
│   ├── main.tsp                    # Agent declaration, capabilities, conversation starters
│   ├── env.tsp                     # Auto-generated environment constants
│   ├── actions/
│   │   ├── crm.tsp                 # MSX-CRM API plugin (primary — 24 operations)
│   │   ├── crm-models.tsp          # Shared CRM models (Opportunity, Milestone, Task)
│   │   └── github.tsp              # GitHub API plugin (existing, optional)
│   └── prompts/
│       └── instructions.tsp        # Condensed 8K-char instructions
├── appPackage/
│   ├── manifest.json               # Updated name, description, permissions
│   └── adaptiveCards/
│       ├── searchIssues.json       # Existing
│       ├── opportunity.json        # NEW — opportunity card
│       ├── milestone.json          # NEW — milestone card
│       └── stagedOperation.json    # NEW — write approval card
├── env/
│   ├── .env.local                  # CRM_API_URL for local dev
│   └── .env.dev                    # CRM_API_URL for deployed API
└── package.json
```

---

## 5. Phased Implementation Plan

### Phase 1: Agent Shell (Instructions + Capabilities)

1. Rewrite `main.tsp` — update `@agent()` identity, add capabilities, add conversation starters
2. Condense instructions into `prompts/instructions.tsp` (8K limit)
3. Enable native capabilities: People, Meetings, TeamsMessages, Email, OneDriveAndSharePoint, CodeInterpreter
4. Compile and validate: `npm run compile`
5. Test in M365 Copilot playground with knowledge-only queries

### Phase 2: CRM API Plugin

1. Build HTTP API proxy for CRM operations (Azure Functions or App Service)
   - Reuse `mcp/msx/src/tools.ts` logic, expose as REST endpoints
   - Auth: user's Entra ID token → Dynamics 365 OBO flow
2. Define `actions/crm.tsp` with full OpenAPI spec
3. Define `actions/crm-models.tsp` with TypeSpec models
4. Add adaptive cards for opportunity/milestone rendering
5. Add staged-operation adaptive card for write approval UX
6. Wire environment variables: `CRM_API_URL`

### Phase 3: Knowledge Layer

1. Evaluate SharePoint site as vault replacement (customer files, meeting notes)
2. If using SharePoint: scope `OneDriveAndSharePoint` capability to the team site
3. If using Graph connector: build ingestion pipeline for vault → Graph connector
4. Add `CopilotConnectors` capability if Graph connector route chosen

### Phase 4: Extended Actions

1. Power BI API plugin (wrap Fabric MCP endpoint)
2. Calendar write operations (create/update events)
3. ADO integration if needed
4. `GraphicArt` capability for diagram generation (replaces Excalidraw)

---

## 6. Risks & Constraints

| Risk | Mitigation |
|---|---|
| 8,000 char instruction limit loses nuance | Prioritize behavioral contract; encode details in `descriptionForModel` per action |
| No subagent delegation in M365 | Flatten into single agent; accept that PBI heavy workflows may not port |
| CRM API proxy requires deployment infrastructure | Use Azure Functions with managed identity; align with existing MCPaS patterns |
| OIL vault has no direct equivalent | SharePoint or Graph connector — requires separate data migration |
| Write safety UX differs (no interactive approval queue) | API plugin returns staged payloads; agent presents diff as text; user confirms verbally |
| No dynamic skill loading | Top skills baked into instructions; long-tail skills deferred |
| Conversation starters limited to 12 | Choose highest-frequency workflows; users can still free-text |

---

## 7. What Stays VS Code–Only

These components remain exclusive to the VS Code agent experience:

- **OIL vault** — local Obsidian integration
- **Excalidraw diagrams** — local file rendering
- **Dynamic skill loading** — runtime file reads
- **Subagent delegation** (`@m365-actions`, `@pbi-analyst`)
- **MCP stdio servers** — VS Code MCP protocol
- **Instruction hot-reload** — `.instructions.md` auto-loading by glob
- **Morning prep shell script** — `scripts/morning-prep.sh`
- **Eval harness** — `evals/` test framework

---

## 8. Decision Log

| Decision | Rationale |
|---|---|
| CRM API as single action namespace vs multiple | Single namespace — simpler for M365 orchestrator; `descriptionForModel` guides operation selection |
| Condense instructions vs multiple prompt files | TypeSpec only supports one `@instructions()` — must be single string |
| Enable all knowledge capabilities | Broader context = better answers; scope later if noisy |
| Defer PBI to Phase 4 | Requires Fabric API proxy; high effort, moderate value for v1 |
| Exclude vault from v1 | No clear M365 equivalent; CRM + native M365 covers 80% of use cases |

---

## Appendix A: MCP Tool → API Plugin Quick Reference

<details>
<summary>Full tool-to-operation mapping (26 MSX-CRM tools)</summary>

| # | MCP Tool | HTTP | API Route | Priority |
|---|---|---|---|---|
| 1 | `crm_whoami` | GET | `/api/crm/whoami` | P0 |
| 2 | `crm_query` | GET | `/api/crm/query` | P0 |
| 3 | `crm_get_record` | GET | `/api/crm/{entitySet}/{id}` | P1 |
| 4 | `list_opportunities` | GET | `/api/opportunities` | P0 |
| 5 | `get_my_active_opportunities` | GET | `/api/opportunities/mine` | P0 |
| 6 | `get_milestones` | GET | `/api/milestones` | P0 |
| 7 | `get_milestone_activities` | GET | `/api/milestones/{id}/activities` | P1 |
| 8 | `create_milestone` | POST | `/api/milestones` | P1 |
| 9 | `update_milestone` | PATCH | `/api/milestones/{id}` | P1 |
| 10 | `create_task` | POST | `/api/tasks` | P1 |
| 11 | `update_task` | PATCH | `/api/tasks/{id}` | P1 |
| 12 | `close_task` | POST | `/api/tasks/{id}/close` | P1 |
| 13 | `list_accounts_by_tpid` | GET | `/api/accounts/by-tpid` | P2 |
| 14 | `find_milestones_needing_tasks` | GET | `/api/milestones/needing-tasks` | P2 |
| 15 | `get_milestone_field_options` | GET | `/api/milestones/field-options` | P2 |
| 16 | `get_task_status_options` | GET | `/api/tasks/status-options` | P2 |
| 17 | `view_milestone_timeline` | GET | `/api/milestones/timeline` | P2 |
| 18 | `view_opportunity_cost_trend` | GET | `/api/opportunities/{id}/cost-trend` | P2 |
| 19 | `manage_deal_team` | POST | `/api/opportunities/{id}/deal-team` | P2 |
| 20 | `list_pending_operations` | GET | `/api/operations/pending` | P1 |
| 21 | `execute_operation` | POST | `/api/operations/{id}/execute` | P1 |
| 22 | `execute_all` | POST | `/api/operations/execute-all` | P2 |
| 23 | `cancel_operation` | DELETE | `/api/operations/{id}` | P1 |
| 24 | `cancel_all` | DELETE | `/api/operations` | P2 |
| 25 | `view_staged_changes_diff` | POST | `/api/operations/diff` | P2 |
| 26 | `manage_milestone_team` | POST | `/api/milestones/{id}/team` | P2 |

</details>

<details>
<summary>Full OIL tool inventory (22 tools — mapped to M365 native or deferred)</summary>

| # | OIL Tool | M365 Strategy |
|---|---|---|
| 1 | `get_vault_context` | OneDriveAndSharePoint (Phase 3) |
| 2 | `get_customer_context` | OneDriveAndSharePoint + CRM API (Phase 3) |
| 3 | `get_person_context` | People capability (native) |
| 4 | `query_graph` | Deferred |
| 5 | `resolve_people_to_customers` | People + CRM correlation (Phase 3) |
| 6 | `oil_get_opportunity_context` | CRM API `listOpportunities` (Phase 2) |
| 7 | `oil_get_milestone_context` | CRM API `getMilestones` (Phase 2) |
| 8 | `search_vault` | OneDriveAndSharePoint search (Phase 3) |
| 9 | `query_notes` | Deferred |
| 10 | `find_similar_notes` | Deferred |
| 11 | `read_note` | OneDriveAndSharePoint (Phase 3) |
| 12 | `patch_note` | Deferred |
| 13 | `capture_connect_hook` | Deferred |
| 14 | `log_agent_action` | Deferred |
| 15 | `draft_meeting_note` | Deferred |
| 16 | `update_customer_file` | Deferred |
| 17 | `create_customer_file` | Deferred |
| 18 | `write_note` | Deferred |
| 19 | `apply_tags` | Deferred |
| 20 | `prepare_crm_prefetch` | CRM API (Phase 2) |
| 21 | `correlate_with_vault` | Deferred |
| 22 | `promote_findings` | Deferred |
| 23 | `check_vault_health` | Deferred |
| 24 | `get_drift_report` | Deferred |
| 25 | `manage_pending_writes` | Deferred |
| 26 | `migrate_customer_structure` | Deferred |
| 27 | `oil_create_opportunity` | Deferred |
| 28 | `oil_update_opportunity` | Deferred |
| 29 | `oil_create_milestone` | Deferred |
| 30 | `oil_update_milestone` | Deferred |

</details>
