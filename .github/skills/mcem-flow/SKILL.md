---
name: mcem-flow
description: "MCEM process spine: maps Stages 1-5 with ATU/STU/CSU accountability, exit criteria, and skill activation order. Triggers: stage progression, MCEM exit criteria, role orchestration, commit gates, handoff readiness, expansion routing, which stage, what stage, MCEM."
---
# MCEM Sales Process Flow

## Use This File

1. Identify likely stage with `mcem-stage-identification`.
2. Apply the stage row below for accountability and next-skill routing.
3. Use Verifiable Outcomes (VO) from CRM evidence as truth when BPF label disagrees.
4. If user role differs from accountable unit, state lead vs contributor explicitly.

## Stage Spine

| Stage               | Objective                                           | Accountable Unit | Typical Active Roles      | Primary Skills                                                                                | Exit Evidence (VO)                                     |
| ------------------- | --------------------------------------------------- | ---------------- | ------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1 Listen & Consult  | Qualify need and define measurable outcomes         | ATU              | Specialist, CSAM          | `pipeline-qualification`, `customer-outcome-scoping`                                      | Open qualified opportunity + initial `msp_salesplay` |
| 2 Inspire & Design  | Shape approach, validate value/design, and **position HoK** | STU              | Specialist, SE, CSA       | `proof-plan-orchestration`, `hok-readiness-check`, `architecture-feasibility-check`, `pipeline-hygiene-triage` | Play confirmed + BVA complete + success plan linked + HoK positioned |
| 3 Empower & Achieve | Prove, commit, **execute HoK**, and finalize handoff readiness | STU              | Specialist, SE, CSA, CSAM | `commit-gate-enforcement`, `hok-readiness-check`, `handoff-readiness-validation`, `exit-criteria-validation`   | Agreement + committed milestones + dated outcomes + HoK legal coverage confirmed |
| 4 Realize Value     | Execute delivery and protect architecture integrity | CSU              | CSAM, CSA                 | `milestone-health-review`, `execution-monitoring`, `delivery-accountability-mapping`    | Milestone delivery + customer health tracking          |
| 5 Manage & Optimize | Sustain outcomes and route expansion                | CSU              | CSAM, Specialist          | `adoption-excellence-review`, `value-realization-pack`, `expansion-signal-routing`      | Sustained value + expansion/next-cycle readiness       |

## Cross-Stage Skills

- `mcem-stage-identification`
- `role-orchestration`
- `exit-criteria-validation`
- `hok-readiness-check`
- `non-linear-progression`
- `partner-motion-awareness`
- `risk-surfacing`

## VO Rules

- Stage is determined by evidence, not label alone.
- Compare `declared_stage` (BPF) vs `actual_stage` (VO-based) and report mismatch.
- Keep discrepancy output explicit: evidence present, evidence missing, and minimum next action.

## Critical Field Corrections

- `msp_milestonestatus = 861980001` means At Risk, not Committed.
- Commitment (Committed) is `msp_commitmentrecommendation = 861980003` (NOT `861980001`).
- Sales play field is `msp_salesplay`.
- Use `msp_milestonedate` for milestone date.

Detailed VO mappings and examples are in `.github/documents/MCEM-stage-reference.md`.

## Non-Linear Progression (Stage Loopback)

When evidence shows the opportunity is not ready to progress, structured loopback preserves execution integrity.

### Common Loopback Patterns

| Trigger | From → To | Re-entry Skill |
|---|---|---|
| Proof fails or is inconclusive | Stage 3 → Stage 2 | `proof-plan-orchestration` |
| Architecture infeasible | Stage 3 → Stage 2 | `architecture-feasibility-check` |
| Capacity/delivery gap post-commit | Stage 4 → Stage 3 | `commit-gate-enforcement` |
| Scope change by customer | Stage 4 → Stage 2 | `pipeline-qualification` + `proof-plan-orchestration` |
| Adoption stall reveals design issue | Stage 5 → Stage 4 | `value-realization-pack` |
| Customer priority shift | Any → Stage 1 | `pipeline-qualification` |

### Loopback Rules

- Loopback is recommended when VO evidence contradicts current stage positioning
- Document loopback reason in milestone comments before stage change
- Notify accountable roles for both current and target stages
- Loopback is not failure — it preserves long-term execution integrity
