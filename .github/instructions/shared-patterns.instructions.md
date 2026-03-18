---
description: "Shared definitions, runtime contract, upfront scoping pattern, WorkIQ companion, and output conventions used across all MSX/MCEM role workflows. Loaded when any role skill or MCEM flow skill activates. Prevents duplication across Specialist, SE, CSA, CSAM skills."
---
# Shared Patterns for MSX/MCEM Operations

## Shared Definitions

| Term                  | Definition                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Opportunity** | Customer engagement container aligned to MCEM stages                                                                                                                     |
| **Milestone**   | Execution unit (`msp_engagementmilestones`) for commitment, delivery, and usage/consumption outcomes                                                                   |
| **Uncommitted** | Still shaping; not fully resourced for delivery (`msp_commitmentrecommendation = 861980000`)                                                                          |
| **Committed**   | Customer agreement + internal readiness for execution (`msp_commitmentrecommendation = 861980003`)                                                                     |
| **Stage 1–5**  | MCEM stages: Listen & Consult → Inspire & Design → Empower & Achieve → Realize Value → Manage & Optimize                                                             |
| **EDE**         | Enhanced Designated Engineer — a dedicated technical resource aligned to a Unified Support package and customer TPID. Tracked in vault `## Unified Coverage`, not CRM |
| **Swarming**    | Cross-role collaboration on adjacent pipeline within the same account — working opportunities outside your direct assignment to bring full account value                |

## Opportunity Identifier Discipline

- **GUID (`opportunityid`)**: Use for all tool parameters (`opportunityId`, `opportunityIds`), OData filters, and internal lookups between tools. This is the stable CRM primary key.
- **Number (`msp_opportunitynumber`)**: Use for user-facing display only — tables, links, and chat output. Render as `Opp #` column with CRM deep-link. Fall back to GUID only if number is missing.
- When chaining tool output → tool input, always pass the GUID (`id` field), never the opportunity number.

## MCEM Unit → Agent Role Mapping

| MCEM Unit                   | Agent Roles                                              | Stage Accountability                  |
| --------------------------- | -------------------------------------------------------- | ------------------------------------- |
| ATU (Account Team Unit)     | Account Executive (out of scope for skills)              | Stage 1 lead, co-orchestrates Stage 2 |
| STU (Specialist Team Unit)  | **Specialist**, **Solution Engineer (SE)**   | Stages 2–3 accountable               |
| CSU (Customer Success Unit) | **CSAM**, **Cloud Solution Architect (CSA)** | Stages 4–5 accountable               |
| Partners                    | Referenced contextually                                  | Varies by segment and motion          |

## Runtime Contract

- **Read tools are live**: `msx-crm:crm_auth_status`, `msx-crm:crm_whoami`, `msx-crm:get_my_active_opportunities`, `msx-crm:list_accounts_by_tpid`, `msx-crm:list_opportunities`, `msx-crm:get_milestones`, `msx-crm:get_milestone_activities`, `msx-crm:crm_get_record`, `msx-crm:crm_query`, `msx-crm:get_task_status_options`.
- **Write-intent tools are dry-run**: `msx-crm:create_task`, `msx-crm:update_task`, `msx-crm:close_task`, `msx-crm:update_milestone` return `mock: true` preview payloads.
- **No approval-execution tools exposed yet**: treat write outputs as recommended operations pending future staged execution.
- Follow `msx-role-and-write-gate.instructions.md` for mandatory human confirmation before any write-intent operation.

## Upfront Scoping Pattern

Collect scope in minimal calls before per-milestone workflows:

0. **VAULT-PREFETCH** — call `oil:get_customer_context({ customer })` for opportunity GUIDs and context. Skip if OIL unavailable. See `obsidian-vault.instructions.md`.
1. **Prefer `get_milestones` with name resolution** — `msx-crm:get_milestones({ customerKeyword: "Contoso", statusFilter: "active" })` resolves customer → accounts → opportunities → milestones in one call. Add `includeTasks: true` to embed tasks inline.
2. **If vault provided GUIDs** — `msx-crm:get_milestones({ opportunityId })` or `msx-crm:get_milestones({ opportunityIds: [...] })` for batch.
3. `msx-crm:get_milestone_activities(milestoneId)` — only for specific milestones needing deep investigation (or use `includeTasks: true` above).
4. `msx-crm:crm_query` — for ad-hoc OData needs not covered by `get_milestones`. See `crm-query-strategy.instructions.md`.

## M365 Communication Layer

### Tool Selection: WorkIQ vs Native MCP

| Need | Tool | Skill |
|---|---|---|
| **Broad M365 discovery** (meetings + chats + emails + files) | `workiq:ask_work_iq` | `workiq-query-scoping` |
| **Targeted Teams** (chat, channel, message search, post) | `teams:*` | `teams-query-scoping` |
| **Targeted email** (KQL search, thread nav, send/reply) | `mail:*` | `mail-query-scoping` |
| **Calendar** (schedule, availability, room booking) | `calendar:*` | `calendar-query-scoping` |

**Decision rule**: WorkIQ for multi-source discovery; native MCP tools for targeted single-source operations.

### WorkIQ MCP Companion

Use `ask_work_iq` when evidence lives in M365 (chats, transcripts, mail, SharePoint). CRM = system-of-record; WorkIQ = communication evidence. Always scope with date range, customer/people, and source types. For Connect/impact evidence, include user's alias (from `crm_whoami`) as a required filter.

### Native M365 MCP Tools

- **Teams**: Set `top` on searches (5-10). Self-chat (`48:notes`) not discoverable via `ListChats`. Use vault-first UPN resolution (`oil:get_person_context`) before person-targeted ops.
- **Mail**: Always include date range in KQL. Two-pass: search → `GetMessage`. Check attachment sizes.
- **Calendar**: Use `ListCalendarView` (time-bounded), never `ListEvents`. Resolve timezone first.

### Native M365 MCP Tools

When using Teams, Mail, or Calendar MCP servers directly:

- **Teams**: Always set `top` on `SearchTeamsMessages` (start at 5-10). Self-chat (`48:notes`) is not discoverable via `ListChats`. Cache `teamId`/`channelId` after first resolution. **Vault-first UPN resolution**: Before any person-targeted Teams operation, call `oil:get_person_context({ name })` to retrieve cached `email`/`teamsId` — this avoids intermittent Graph API failures from direct UPN lookups. Persist newly discovered UPNs back to vault via `oil:patch_note`. See `teams-query-scoping/SKILL.md`.
- **Mail**: Always include date range in KQL searches. Use two-pass pattern (search → `GetMessage`). Check attachment sizes before download. See `mail-query-scoping/SKILL.md`.
- **Calendar**: Always use `ListCalendarView` (time-bounded), never `ListEvents` (unbounded). Resolve timezone first. See `calendar-query-scoping/SKILL.md`.

## VAULT-PROMOTE (Post-Workflow)

After completing a CRM workflow, persist validated findings to the vault:

- Use `oil:promote_findings()` or `oil:patch_note()` with `heading: "Agent Insights"`.
- If new opportunity GUIDs were discovered, use `oil:update_customer_file()` to add them.
- Skipped automatically if OIL is unavailable.

## Skill Composition Contract

### Cross-Service Data Flow Guardrails (RH-3)

The agent can read from one service and write to another in a single turn. To prevent unintended data flows:

**Allowed flows** (single-turn, no confirmation needed): CRM→Vault, M365→Vault, CRM→CRM, Vault→CRM.

**Restricted flows** (require explicit user confirmation): M365 content→CRM fields (privacy mismatch), CRM data→M365 send (HBI exposure), any→CRM bulk writes (data integrity). Never copy raw email/chat into CRM fields without approval. Cross-service writes must surface the data source in staged response.

Skills are instruction documents auto-loaded by the runtime when matched. The agent MUST execute multiple skills sequentially in the same turn when needed. Do NOT refuse with "I can only invoke one skill at a time."

### Skill execution

1. **Locate**: Skill Flow/Decision Logic/Output Schema are in context when matched. Fall back to `read_file` at `.github/skills/{name}/SKILL.md` for chained skills not auto-loaded.
2. **Execute**: Follow the skill's `## Flow` — each step maps to MCP tool calls.
3. **Chain**: Read `next_action`. Same-role → execute immediately. Cross-role → present handoff recommendation.
4. **Reuse data**: MCP calls that feed multiple skills should be made once and shared.
5. **Combined output**: Label sections per skill when executing multiple skills.

### Common multi-skill chains

Pre-validated chain definitions (including trigger patterns) live in `.github/documents/skill-chains.md`.
Use that file when a prompt clearly maps to a chain.

**PBI chain rules** (see `pbi-context-bridge.instructions.md`):

- For medium/heavy PBI prompts, run PBI retrieval + analysis as a **subagent** so raw DAX data stays in the subagent's context. The parent receives only the final rendered report.
- PBI reports are persisted to `.copilot/sessions/pbi/` for downstream re-read without re-executing queries.
- Downstream skills scope their CRM/WorkIQ queries using the report's gap analysis table, conversion rankings, and recommended actions.

## Connect Hook Capture (Post-Action)

When a workflow produces measurable evidence, use `oil:capture_connect_hook` after delivering the main output.
Detailed formatting, classification, and schema rules are centralized in `.github/instructions/connect-hooks.instructions.md`.

## Common Output Conventions

- Dry-run write payloads include `mock: true` and the tool name that would execute.
- Every stage-bound skill output includes `next_action` naming the recommended next skill.
- Cross-role `next_action` must name the owning role and recommend engagement (no auto-invoke).
- Risk findings always include: one-sentence risk, evidence source, role to act, minimum intervention.
- `connect_hook_hint` (optional): pre-classified Connects impact area(s) and one-line hook template for passive evidence capture.

### Artifact Output Directory (Mandatory)

All generated file artifacts MUST be saved under `.copilot/docs/` in the workspace root. This directory is gitignored and serves as the single collection point for agent-produced documents.

| Artifact type | Default path |
|---|---|
| PDF | `.copilot/docs/<name>.pdf` |
| Word (.docx) | `.copilot/docs/<name>.docx` |
| Excel (.xlsx) | `.copilot/docs/<name>.xlsx` |
| PowerPoint (.pptx) | `.copilot/docs/<name>.pptx` |
| Excalidraw | `.copilot/docs/excalidraw/<name>.excalidraw` |
| Other documents | `.copilot/docs/<name>.<ext>` |

- Create `.copilot/docs/` (and subdirectories) automatically before writing — use `mkdir -p` or equivalent.
- If the user provides an explicit output path, honor it instead.
- Use descriptive filenames: `<customer>-<artifact>-<date>.<ext>` (e.g. `contoso-pricing-model-2026-03-16.xlsx`).

### CRM Record Linkification (Mandatory)

Always link CRM records in output: `https://microsoftsales.crm.dynamics.com/main.aspx?etn=<entityLogicalName>&id=<GUID>&pagetype=entityrecord`. Entity types: `opportunity`, `msp_engagementmilestone` (GUID from `id`), `task` (GUID from `activityid`). Use `recordUrl` from tool output when available. Format as `[Record Name](url)` in tables and confirmation packets.
