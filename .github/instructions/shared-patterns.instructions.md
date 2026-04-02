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
| **HoK**         | Hands-on-Keyboard — SE-led hands-on work in customer development, test, or production environments to accelerate cloud consumption. Legal coverage required before execution. |
| **Cusp Customer** | A customer where HoK next steps are uncertain — interested but not committed to environment access, or stalled technical progression with ambiguous follow-through. Requires leadership discussion. |
| **SE Activity Record** | An SE task created and immediately closed in the same operation. SE tasks are activity tracking entries (proof delivered, HoK session executed, review conducted) — not open work items. `create_task` is always followed by `close_task` in the same confirmation packet. |
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

- **Read tools are live**: `msx:crm_auth_status`, `msx:crm_whoami`, `msx:get_my_active_opportunities`, `msx:list_accounts_by_tpid`, `msx:list_opportunities`, `msx:get_milestones`, `msx:get_milestone_activities`, `msx:crm_get_record`, `msx:crm_query`, `msx:get_task_status_options`.
- **Write-intent tools are dry-run**: `msx:create_task`, `msx:update_task`, `msx:close_task`, `msx:update_milestone` return `mock: true` preview payloads.
- **No approval-execution tools exposed yet**: treat write outputs as recommended operations pending future staged execution.
- Follow `msx-role-and-write-gate.instructions.md` for mandatory human confirmation before any write-intent operation.

## Upfront Scoping Pattern

Collect scope in minimal calls before per-milestone workflows:

0. **VAULT-PREFETCH** — call `oil:get_customer_context({ customer })` for opportunity GUIDs and context. Skip if OIL unavailable. See `obsidian-vault.instructions.md`.
1. **Prefer `get_milestones` with name resolution** — `msx:get_milestones({ customerKeyword: "Contoso", statusFilter: "active" })` resolves customer → accounts → opportunities → milestones in one call. Add `includeTasks: true` to embed tasks inline.
2. **If vault provided GUIDs** — `msx:get_milestones({ opportunityId })` or `msx:get_milestones({ opportunityIds: [...] })` for batch.
3. `msx:get_milestone_activities(milestoneId)` — only for specific milestones needing deep investigation (or use `includeTasks: true` above).
4. `msx:crm_query` — for ad-hoc OData needs not covered by `get_milestones`. See `crm-query-strategy.instructions.md`.

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

### Multi-Account Teams Sweep (Vault-Augmented)

When asked for today's Teams activity across all accounts (or a broad account set), a single WorkIQ sweep is **insufficient**. WorkIQ is user-centric — it returns activity where the user was mentioned or directly participated. It **misses silent activity**: messages posted by others in group chats where the user was not mentioned.

**Three-phase pattern:**

1. **Phase 1 — WorkIQ broad sweep** (`workiq:ask_work_iq`): Fast user-centric discovery across all Teams chats/channels. Catches mentions and direct activity. This is the quick first pass.
2. **Phase 2 — Vault-thread poll** (`teams:ListChatMessages` per vault thread ID): Query vault for all `teams-catalog` notes (`oil:query_notes({ where: { tags: "teams" }, folder: "Customers" })`). Extract cached thread IDs from each catalog. Poll each thread via Teams MCP for messages since midnight. This catches **all** activity in known account threads regardless of user involvement.
3. **Phase 3 — Merge and diff**: Combine results. Anything in Phase 2 not surfaced in Phase 1 is **silent activity** — flag it explicitly. Report accounts with vault-cataloged threads that had no activity, and accounts missing `teams-catalog` notes entirely.

**When to use each phase:**

| Scenario | Phase 1 Only | Phase 1 + 2 |
|---|---|---|
| "What did I miss?" / mentions check | Sufficient | Not needed |
| "What's happening across all accounts today?" | Insufficient | **Required** |
| "Any activity in [specific account] thread?" | Skip | Phase 2 only (targeted) |
| Morning brief / daily sweep | Start here | Add Phase 2 for completeness |

**Scaling note**: Phase 2 makes one `ListChatMessages` call per vault thread. For 33+ accounts with multiple threads each, batch by priority — active accounts and accounts with recent CRM activity first. Cap at `top: 5` per thread for sweep; increase only for threads with confirmed activity.

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
- **Opportunity capture**: When a workflow reads or modifies opportunity data (deal team, milestones, ACR), chain to `vault-sync` (Mode 1: Opp Sync auto-capture) to sync deal team roster, `estimatedvalue`, `msp_consumptionconsumedrecurring`, milestone `msp_monthlyuse`, and opportunity notes to the vault. Direction: CRM→vault only.
- Skipped automatically if OIL is unavailable.

## CSU Role Resolution (CSA / CSAM Lookup)

When any workflow needs to identify the CSA or CSAM for an account or opportunity, follow this resolution chain in order. Stop at the first source that returns a confirmed result.

### Resolution chain

1. **Vault contacts note** (vault-first, most reliable) — `oil:query_notes({ where: { customer: "<name>", tags: "contacts" } })` → `oil:read_note`. Check:
   - `## Microsoft Team` table → rows with Role = "CSAM" or "CSA"
   - `## V-Team Roles (from CRM)` → `### CSAM` and `### CSA` subsections (alias lists by solution area)
   - The vault contacts note reflects email-confirmed and V-Team-confirmed assignments. Do NOT override vault-confirmed roles with CRM deal team inferences. A person marked "SSP" in the vault is an SSP regardless of how many CRM opportunities they appear on.
2. **Vault handoff tracker** — check `Reference/Committed-Milestone-Handoff-Tracker.md` for known CSA/CSAM assignments previously confirmed by the user. This covers accounts where the CSAM was provided out-of-band.
3. **CRM deal team** (supplementary, not primary) — `msx:manage_deal_team({ action: "list", opportunityId })` → resolve member titles via `msx:crm_query` on `systemusers` (select `fullname,title,internalemailaddress`). Match titles containing "Cloud Solution Architect" or "CSA" for CSA; "Customer Success" or "CSAM" for CSAM. If the specific opportunity's deal team has no match, check **other opportunities on the same account** — CSAs/CSAMs are often on sibling opps. **Critical**: CRM deal team membership alone is not sufficient to infer role — deal teams include SSPs, Specialists, SEs, and other roles.
4. **PBI fallback** — delegate to `pbi-analyst` subagent with the **WhoIsTheCSAM** report:
   - Report ID: `8be168b9-0ba6-415a-bba8-8cbfa2a9e381`
   - Dataset: `SSDMSelfServeOpenAccess`
   - Workspace: `PSDIDeliveryMgmtProdWS01`
   - Filter by TPID. Returns TAM (primary CSAM), ACSAM (backup), SPM, BAM per active Unified package.

### Priority for milestone ownership on commit

- **CSA** — if actively working with the customer on the aligned project
- **CSAM** — fallback when no CSA is actively engaged on the specific project
- See vault `Reference/Milestone-Commitment-Rule.md` for the full commitment rule

### When to invoke

- Commit-gate enforcement (who to assign the milestone to)
- Milestone health review (who to flag for reassignment)
- Account health card (team composition gap detection)
- Any workflow producing a handoff recommendation

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

### Vault Entity Icons (Mandatory)

All vault entries and agent output MUST use standard entity icons for visual consistency:

| Entity | Icon | Example |
|--------|------|---------|
| Opportunity | 🎯 | `# 🎯 Copilot Rollout` |
| Milestone | 📋 | `# 📋 AI Migration Pilot` |
| Task (by state) | ✅ 🔄 ➕ ❌ ⏸️ | `✅ Completed`, `🔄 In Progress` |
| Deal Team member | 👤 | `👤 Jin Lee` |
| ACR / Revenue | 💰 | `## 💰 ACR Summary` |
| CRM Link | 🔗 | `[🔗 MSX](url)` |
| Risk / Warning | ⚠️ | `⚠️ Stale data` |
| Customer | 🏢 | `## 🏢 Contoso` |

Apply icons in: vault note headings, table rows, frontmatter-derived displays, and skill output. See `vault-routing` skill § Vault Entity Icon & Link Standards for full contract.

### Markdown Table Formatting for Vault Notes (Mandatory)

Broken tables render as raw text in Obsidian. These rules prevent the three most common failures:

1. **Escape `|` in cell content**: Any pipe character inside a table cell MUST be escaped as `\|`. Common in opportunity names (`CIGNA \| Accelerate AI \| Call Center`) and milestone names (`Prior Auth \| AI \| POC`). The **#1 cause** of broken vault tables.
2. **Every row ends with `|`**: A row like `| Name | Value` is INVALID — must be `| Name | Value |`. Applies to HTML comments too: `<!-- userid:abc --> |`.
3. **Separator columns match header columns**: `|---|---|` for 2 columns. Never double-pipe (`||`) or missing columns.
