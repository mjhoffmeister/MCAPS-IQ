---
name: shared-patterns
description: "Shared definitions, runtime contract, upfront scoping pattern, WorkIQ companion, and output conventions used across all MSX/MCEM role workflows. Triggers: runtime contract, upfront scoping, skill composition, WorkIQ companion, output conventions, cross-service data flow, M365 delegation, vault promote, CSU role resolution, CRM linkification, artifact output."
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
| **HoK**         | Hands-on-Keyboard — SE-led hands-on work in customer development, test, or production environments to accelerate cloud consumption. Legal coverage required before execution. |
| **Cusp Customer** | A customer where HoK next steps are uncertain — interested but not committed to environment access, or stalled technical progression with ambiguous follow-through. Requires leadership discussion. |
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
- Follow the `write-gate` skill for mandatory human confirmation before any write-intent operation.

## Upfront Scoping Pattern

Collect scope in minimal calls before per-milestone workflows:

0. **VAULT-PREFETCH** — call `oil:get_customer_context({ customer })` for opportunity GUIDs and context. Skip if OIL unavailable. See `vault-routing` skill.
1. **Prefer `get_milestones` with name resolution** — `msx-crm:get_milestones({ customerKeyword: "Contoso", statusFilter: "active" })` resolves customer → accounts → opportunities → milestones in one call. Add `includeTasks: true` to embed tasks inline.
2. **If vault provided GUIDs** — `msx-crm:get_milestones({ opportunityId })` or `msx-crm:get_milestones({ opportunityIds: [...] })` for batch.
3. `msx-crm:get_milestone_activities(milestoneId)` — only for specific milestones needing deep investigation (or use `includeTasks: true` above).
4. `msx-crm:crm_query` — for ad-hoc OData needs not covered by `get_milestones`. See `crm-query-strategy` skill.

## M365 Communication Layer

### Tool Selection: WorkIQ vs Native MCP

| Need | Tool | Skill |
|---|---|---|
| **Broad M365 discovery** (meetings + chats + emails + files) | `workiq:ask_work_iq` | `workiq-query-scoping` |
| **Targeted Teams** (chat, channel, message search, post) | `teams:*` | `teams-query-scoping` |
| **Targeted email** (KQL search, thread nav, send/reply) | `mail:*` | `mail-query-scoping` |
| **Calendar** (schedule, availability, room booking) | `calendar:*` | `calendar-query-scoping` |

**Hard rule — no exceptions**:
- **WorkIQ** (`workiq:ask_work_iq`): ONLY for broad multi-source discovery that spans meetings + chats + email + files in one sweep.
- **m365-actions subagent** (or native `mail:*` / `teams:*` / `calendar:*` MCP): ALL targeted single-source operations — search, read, headers, thread nav, attachments, compose, send.

**NEVER use WorkIQ when the request targets a single M365 source** (e.g., "find email from X", "search inbox for subject Y", "read Teams thread"). WorkIQ lacks header fidelity — it may omit Cc/Bcc fields, attachment metadata, and thread structure. If you can name the source type, use the dedicated tool.

### Native M365 MCP Tools

- **Teams**: Always set `top` on `SearchTeamsMessages` (start at 5-10). Self-chat (`48:notes`) is not discoverable via `ListChats`. Cache `teamId`/`channelId` after first resolution. Vault-first UPN resolution: call `oil:get_person_context({ name })` before person-targeted ops.
- **Mail**: Always include date range in KQL searches. Use two-pass pattern (search → `GetMessage`). Check attachment sizes before download.
- **Calendar**: Always use `ListCalendarView` (time-bounded), never `ListEvents` (unbounded). Resolve timezone first.

## VAULT-PROMOTE (Post-Workflow)

After completing a CRM workflow, persist validated findings to the vault:

- Use `oil:promote_findings()` or `oil:patch_note()` with `heading: "Agent Insights"`.
- If new opportunity GUIDs were discovered, use `oil:update_customer_file()` to add them.
- Skipped automatically if OIL is unavailable.

## Skill Composition Contract

Skills are instruction documents auto-loaded by the runtime when matched. The agent MUST execute multiple skills sequentially in the same turn when needed. Do NOT refuse with "I can only invoke one skill at a time."

### Skill execution

1. **Locate**: Skill Flow/Decision Logic/Output Schema are in context when matched. Fall back to `read_file` at `.github/skills/{name}/SKILL.md` for chained skills not auto-loaded.
2. **Execute**: Follow the skill's `## Flow` — each step maps to MCP tool calls.
3. **Chain**: Read `next_action`. Same-role → execute immediately. Cross-role → present handoff recommendation.
4. **Reuse data**: MCP calls that feed multiple skills should be made once and shared.
5. **Combined output**: Label sections per skill when executing multiple skills.

### Cross-Service Data Flow Guardrails

**Allowed flows** (single-turn, no confirmation needed): CRM→Vault, M365→Vault, CRM→CRM, Vault→CRM.

**Restricted flows** (require explicit user confirmation): M365 content→CRM fields (privacy mismatch), CRM data→M365 send (HBI exposure), any→CRM bulk writes (data integrity). Never copy raw email/chat into CRM fields without approval.

## Common Output Conventions

- Dry-run write payloads include `mock: true` and the tool name that would execute.
- Every stage-bound skill output includes `next_action` naming the recommended next skill.
- Cross-role `next_action` must name the owning role and recommend engagement (no auto-invoke).
- Risk findings always include: one-sentence risk, evidence source, role to act, minimum intervention.

### Artifact Output Directory (Mandatory)

All generated file artifacts MUST be saved under `.copilot/docs/` in the workspace root.

### CRM Record Linkification (Mandatory)

Always link CRM records in output: `https://microsoftsales.crm.dynamics.com/main.aspx?etn=<entityLogicalName>&id=<GUID>&pagetype=entityrecord`. Entity types: `opportunity`, `msp_engagementmilestone`, `task`. Use `recordUrl` from tool output when available.
