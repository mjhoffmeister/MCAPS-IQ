---
name: milestone-health-review
description: 'Milestone health review for weekly governance: scans active milestones for date drift, overdue completions, and stalled items. Produces customer-safe status bullets plus internal remediation queue and uncommitted commit-readiness signals. Chains with mcem-stage-identification and customer-evidence-pack for pre-governance prep. Triggers: weekly status, date drift, overdue milestones, governance cycle, customer status update, how are my milestones, milestone health, governance prep.'
argument-hint: 'Scope by opportunityId(s) or run across all CSAM-governed active milestones'
---

## Purpose

Produces a structured health report for active milestones within CSAM scope, flagging at-risk or blocked milestones that need recovery plans or escalation, plus commitment-readiness guidance for uncommitted milestones.

## Freedom Level

**Medium** — Health classification requires judgment; status updates are exact.

## Trigger

- Weekly governance cycle
- User asks "how are my milestones?" or "committed milestone status"
- Pre-customer-meeting preparation

## Flow

1. Call `msx-crm:crm_auth_status`.
2. Call `msx-crm:get_my_active_opportunities` — single call for all active opportunities.
3. Call `msx-crm:get_milestones` with `opportunityIds` (batch from step 2), `statusFilter: 'active'`, `format: 'triage'`, and `includeTasks: true` — one call returns all milestones pre-classified into urgency buckets (overdue, due_soon, blocked, on_track) with inline tasks. If scoped to a single customer, use `customerKeyword` instead.
4. Classify health state per milestone.
6. Generate dry-run corrections:
   - `msx-crm:update_milestone` for date/status/comments
   - `msx-crm:create_task` for mitigation actions

## Health Classification

| State | Criteria |
|---|---|
| **On track** | `msp_milestonestatus = 861980000`, active tasks with owners, date >30 days out |
| **At risk** | `msp_milestonestatus = 861980001` OR date <30 days with incomplete tasks |
| **Blocked** | `msp_milestonestatus = 861980002` OR no active tasks and date <14 days |
| **Complete** | `msp_milestonestatus = 861980003` — include in summary, no action needed |

## Decision Logic

- Flag `at_risk` or `blocked` when due date is near and mitigation activity is absent
- Require explicit recovery owner + date before closing risk
- Separate customer-facing summary from internal action items
- Route technical blockers to CSA; route delivery/resourcing to partner/ISD
- **Commit readiness signal** (for uncommitted milestones): Assess whether the milestone could be committed by evaluating:
  - `msp_monthlyuse` = estimated **change** in monthly revenue (delta, not absolute). Is this delta realistic given execution state?
  - Delivery evidence: tasks with owners, dates, and active progress
  - Customer scope confirmation that maps to the revenue delta
  - Label each uncommitted milestone: `Committable` / `Not yet committable` / `Needs review` with brief reasoning
  - **CSU assignment**: When labeling `Committable`, resolve the CSA (preferred, if actively working the aligned project) or CSAM (fallback) from the opportunity deal team and include their name + email as the suggested assignee. If no CSU role on deal team, flag the gap.
  - **CSU handoff required**: Note that commitment requires a handoff discussion with the receiving CSU role and their explicit confirmation — label cannot be `Committable` without this.
  - Check vault `Reference/Milestone-Commitment-Rule.md` for the full commitment rule if available
- **Committed milestone owner check**: For milestones already committed, verify the owner is a CSA or CSAM. If not, flag: "⚠ Committed but not assigned to CSU — reassign to [CSA/CSAM name]"

## Output Schema

- `health_report`: milestone-level status with classification and reason
- `commit_readiness`: for each uncommitted milestone — `Committable` / `Not yet committable` / `Needs review` with reasoning (based on revenue delta confidence)
- `customer_summary`: customer-safe status bullets
- `internal_summary`: action items with owners and dates
- `dry_run_updates`: update/task preview payloads
- `next_action`: "Health review complete. Would you like to run `delivery-accountability-mapping` for blocked milestones?"
- `connect_hook_hint`: Impact Area(s): Customer Impact, Culture & Collaboration — "Ran milestone health review for {customer}: {on_track} on-track, {at_risk} at-risk, {blocked} blocked — generated remediation queue with {n} action items"
