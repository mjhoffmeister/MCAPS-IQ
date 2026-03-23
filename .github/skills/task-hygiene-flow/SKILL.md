---
name: task-hygiene-flow
description: 'Task hygiene flow for SE: reads each CRM task row for correct owner, due date, status, and blocker notes. Patches stale or orphaned entries via dry-run at individual task-row level. Chains with execution-monitoring and unified-constraint-check for SE morning prep. Triggers: task record inspector, SE daily check, stale tasks, orphaned tasks, task owner, task due date, CRM task row, task hygiene. DO NOT USE FOR: full morning briefing — use morning-brief. Not for CSAM milestone reviews — use milestone-health-review.'
argument-hint: 'Scope by opportunityId(s) or sweep all SE-owned active task records'
---

## Purpose

Keeps milestone tasks current and actionable by detecting missing owners, stale dates, incomplete status, and absent completion conditions on SE-scoped milestones.

## Freedom Level

**Medium** — Task classification requires judgment; field corrections are exact.

## Trigger

- Daily/weekly SE operating cadence
- User asks "what tasks need updating?" or "task hygiene check"
- Milestone activities appear stale or incomplete

## Flow

1. Call `msx-crm:get_my_active_opportunities` — single call for all active opportunities.
2. Call `msx-crm:get_milestones` with `opportunityIds` (batch from step 1), `statusFilter: 'active'`, `format: 'triage'`, and `includeTasks: true` — one call returns milestones pre-classified by urgency with inline tasks for SE-scoped milestones. If scoped to a single customer, use `customerKeyword` instead.
3. Apply task completeness checks (see below).
4. Generate dry-run corrections:
   - `msx-crm:create_task` for missing tasks
   - `msx-crm:update_task` for stale fields
   - `msx-crm:close_task` for completed actions

## Task Completeness Checks

| Check | Pass | Fail Action |
|---|---|---|
| Owner assigned | Task has named owner | Flag for assignment |
| Due date set | Realistic future date | Flag for date update |
| Status current | Reflects actual progress | Flag for status refresh |
| Blocker documented | If blocked, reason is stated | Flag for blocker text |
| Completion condition | Clear done-criteria exist | Flag for criteria addition |
| HoK legal coverage (HoK tasks only) | Legal agreement confirmed before execution | **Block task**; flag for legal coverage |
| HoK environment tier (HoK tasks only) | Dev/Test/Prod explicitly classified | Flag for environment classification |

## Decision Logic

- Prioritize tasks on near-term milestones (due within 30 days)
- For uncommitted milestones: focus on BANT gap closure tasks and HoK positioning tasks
- For committed milestones where SE influenced: ensure continuity until CSU execution is stable; verify HoK artifacts are transferred
- Skip milestones where SE has no active contribution
- **HoK tasks**: If a task involves customer environment work, verify legal coverage status. Block execution tasks without confirmed legal coverage and chain to `hok-readiness-check`.

## Output Schema

- `task_report`: milestone-level task hygiene status
- `stale_tasks`: tasks needing update with specific gap
- `proposed_corrections`: dry-run create/update/close payloads
- `next_action`: context-dependent — "Specialist should run `handoff-readiness-validation` for milestones approaching commitment — recommend engaging the Specialist." or "Task hygiene complete — no escalation needed."
