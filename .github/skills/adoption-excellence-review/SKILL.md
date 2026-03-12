---
name: adoption-excellence-review
description: 'Adoption excellence review: audits usage telemetry (MAU, DAU, license utilization) against consumption targets. Compares actuals to success-plan baselines and flags shortfalls needing stakeholder intervention. Chains with value-realization-pack and expansion-signal-routing for full Stage 5 review. Triggers: consumption scorecard, MAU, DAU, usage telemetry, adoption gap, adoption health, license utilization, consumption vs target, how is adoption going.'
argument-hint: 'Scope by opportunityId(s) or run across all CSAM-owned consumption targets'
---

## Purpose

Ensures adoption and usage milestones have active owner-task coverage, measurable consumption targets, and stakeholder alignment — driving sustained value realization in Stage 5.

## Freedom Level

**Medium** — Adoption assessment requires judgment; task corrections are exact.

## Trigger

- Adoption milestone created or usage intent increases
- Weekly/monthly Stage 5 health review
- User asks "how is adoption going?" or "usage health check"

## Flow

1. Call `msx-crm:get_milestones` with `opportunityId` and keyword `adoption` — identify usage/adoption milestones.
2. Call `msx-crm:get_milestone_activities` for milestones with unclear stakeholder coverage (targeted only).
3. Call `msx-crm:get_task_status_options` when status transitions are needed for proposed updates.
4. Evaluate adoption health (see below).
5. Generate dry-run corrections:
   - `msx-crm:create_task` for missing stakeholder tasks
   - `msx-crm:update_task` for date/description corrections
   - `msx-crm:close_task` for completed actions

## Adoption Health Criteria

| Signal | Healthy | Unhealthy |
|---|---|---|
| Consumption trend | Tracking toward or above target | Flat or declining |
| Stakeholder coverage | Named owners on adoption tasks | No owner or generic assignment |
| Success plan alignment | Milestone outcomes match CSP priorities | Disconnected from success plan |
| Activity cadence | Recent tasks with progress | No activity in 30+ days |
| Measurable targets | `msp_monthlyuse` or equivalent populated | No consumption metric defined |

## Output Schema

- `adoption_health`: per-milestone adoption state with classification and gap details
- `remediation_queue`: proposed tasks for stakeholder coverage and consumption tracking
- `dry_run_updates`: create/update/close task preview payloads
- `next_action`: "Adoption reviewed. Run `value-realization-pack` to validate outcome measurement, then `expansion-signal-routing` for growth signals."
- `connect_hook_hint`: Impact Area(s): Customer Impact — "Adoption review for {customer}: {healthy}/{total} milestones healthy, flagged {gaps} consumption gaps needing stakeholder intervention"

## Decision Logic

- Coordination is complete when each adoption milestone has active owner-task coverage and measurable next outcomes
- Flag adoption stalls when consumption is flat with no active mitigation
- Route optimization insights that imply scope expansion to `expansion-signal-routing`
- Surface value evidence for governance via `customer-evidence-pack`
