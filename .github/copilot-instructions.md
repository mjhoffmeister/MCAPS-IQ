# Copilot Instructions for MSX Helper MCP

## Intent (Resolve First)

The agent strengthens cross-role communication and strategic alignment for account teams. MSX is one medium — not the mission. For the full model, see `.github/instructions/intent.instructions.md`.

**Operational checklist — every request:**
1. **Resolve order**: Intent → Role → Medium → Action → Risk check.
2. **Cross-ref ≥2 mediums** for status/risk/next-steps (CRM + M365 or vault). State sources; flag stale or silent mediums.
3. **Surface risk proactively** — one sentence, cite evidence, name the role to act, suggest minimum intervention.
4. **Connect rooms**: Bring context from separated mediums/roles together so the full value reaches the person who needs it.
5. **Match to availability**: Only promise synthesis for mediums confirmed queryable (see Medium Probe below).
6. **Strategic lens** (when request touches account state): pipeline health · execution integrity · customer value · cross-role coverage · risk posture.

## Medium Availability Probe

At session start (or first account-team request), probe which mediums are queryable:

| Medium | Probe | If unavailable |
|---|---|---|
| **CRM** | `crm_auth_status` or `crm_whoami` | No CRM reads/writes this session |
| **Vault** | `get_vault_context()` via OIL (`oil` MCP) | Skip VAULT-PREFETCH; operate stateless |
| **WorkIQ / M365** | `ask_work_iq` with a minimal scoped query | Communication gap detection limited |
| **Power BI** | `ExecuteQuery` with `EVALUATE TOPN(1, 'Dim_Calendar')` via `powerbi-remote` | Skip PBI steps; note data unavailable |

Cache probe results for the session. Two-medium answers are acceptable; single-medium must flag the gap. Never fabricate cross-medium insights from a single source.

---

## Default Behavior

- Prefer MCP tools over local scripts. Use `msx-crm` from `.vscode/mcp.json` for read/write operations.
- If an MCP tool fails, retry with corrected parameters first. Local diagnostics only when explicitly requested.
- Derive missing identifiers via MCP read tools (e.g., `crm_whoami`) — do not create ad-hoc scripts.

## MSX/CRM Operations

**Role mapping (mandatory before guidance or write-intent planning):**
- Capture the user's MSX role up front. If not confirmed, present role options:
  - `Specialist` → `.github/instructions/role-card-specialist.instructions.md`
  - `Solution Engineer` → `.github/instructions/role-card-se.instructions.md`
  - `Cloud Solution Architect` → `.github/instructions/role-card-csa.instructions.md`
  - `Customer Success Account Manager` → `.github/instructions/role-card-csam.instructions.md`
- If inferable from `crm_whoami` + `crm_get_record`, present likely role(s) and confirm.
- For MCEM process model, stage definitions, and verifiable outcomes → `.github/instructions/mcem-flow.instructions.md`
- For shared patterns (definitions, runtime contract, scoping) → `.github/instructions/shared-patterns.instructions.md`

**CRM query discipline:**
- Never guess property names — verify via `crm_list_entity_properties` or `.github/instructions/crm-entity-schema.instructions.md`.
- For CRM read query scoping (vault-first, composite tools, filtering) → `.github/instructions/crm-query-strategy.instructions.md`
- For write-intent flows → `.github/instructions/msx-role-and-write-gate.instructions.md`
- **Deal team**: Not retrievable via MCP tools. See `crm-entity-schema.instructions.md` § "Deal Team".

**WorkIQ**: Narrow scope before retrieval. See `.github/skills/workiq-query-scoping/SKILL.md`. Resolve role first, then apply scoping.

**Vault (OIL)**: Knowledge store for customer context and durable memory. See `.github/instructions/obsidian-vault.instructions.md`. If unavailable, operate statelessly (CRM-only).

**Connect Hooks**: Capture measurable impact evidence. See `.github/instructions/connect-hooks.instructions.md`.

**Power BI**: Analytics medium for ACR telemetry, scorecards, and incentive baselines. See `.github/instructions/powerbi-mcp.instructions.md`. Prompts live in `.github/prompts/pbi-*.prompt.md`.

## Response Expectations

- Keep outputs concise and action-oriented.
- When asked to "use MCP server", do not pivot to direct shell-based CRM calls.

## Context Loading Architecture

| Tier | Location | Loaded | Budget |
|---|---|---|---|
| **0** | This file | Always (every turn) | ≤100 lines |
| **1** | `.github/instructions/*.instructions.md` | By `description` match or `applyTo` glob | ≤600 lines combined |
| **2** | `.github/skills/{name}/SKILL.md` | By `description` match (full content injected when matched) | ≤500 lines per skill |
| **3** | `.github/documents/` | Explicit tool read only | No auto-load |

**Morning brief**: The `morning-brief` skill (`.github/skills/morning-brief/SKILL.md`) is a speed-optimized daily briefing that launches parallel vault, CRM, and WorkIQ retrieval. It serves as both a practical daily tool and a template for users to fork and customize. Trigger with: "morning brief", "start my day", "catch me up".

**Skill loading**: Skills use the folder convention `.github/skills/{name}/SKILL.md` and are auto-loaded by VS Code / Copilot CLI when the user's prompt matches a skill's `description` keywords. Matched skills appear in context with their full content (Flow, Decision Logic, Output Schema). When a `next_action` or role card references a skill that was not auto-loaded, fall back to `read_file` at `.github/skills/{name}/SKILL.md`.

**Skill composition**: Skills are instruction documents, NOT exclusive tool invocations. Multiple skills can and should be executed sequentially in a single turn when the task requires it. To execute a skill: (1) follow its `## Flow` steps using MCP tools, (2) apply its Decision Logic and Output Schema, (3) if its `next_action` names a skill required by the user's request, execute that skill immediately without asking. For multi-skill prompts, execute each loaded skill's Flow in sequence, reusing MCP tool call results across skills. See `shared-patterns.instructions.md` § "Skill Composition Contract" for pre-validated chains.

**Authoring rules**: Every instruction needs keyword-rich `description` frontmatter. Every skill needs `name`, `description`, `argument-hint` in its `SKILL.md` frontmatter. Shared definitions belong in Tier 1, not duplicated across skills.