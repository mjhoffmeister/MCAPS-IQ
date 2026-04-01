---
description: "MCEM process spine: maps Stages 1-5 with ATU/STU/CSU accountability, exit criteria, and skill activation order. Triggers: stage progression, MCEM exit criteria, role orchestration, commit gates, handoff readiness, expansion routing."
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
| 1 Listen & Consult  | Qualify need and define measurable outcomes         | ATU              | Specialist, CSAM          | `pipeline-qualification`, `mcem-stage-identification`                                      | Open qualified opportunity + initial `msp_salesplay` |
| 2 Inspire & Design  | Shape approach, validate value/design, and **position HoK** | STU              | Specialist, SE, CSA       | `proof-plan-orchestration`, `hok-readiness-check`, `architecture-feasibility-check`, `pipeline-hygiene-triage` | Play confirmed + BVA complete + success plan linked + HoK positioned |
| 3 Empower & Achieve | Prove, commit, **execute HoK**, and finalize handoff readiness | STU              | Specialist, SE, CSA, CSAM | `commit-gate-enforcement`, `hok-readiness-check`, `handoff-readiness-validation`, `exit-criteria-validation`   | Agreement + committed milestones + dated outcomes + HoK legal coverage confirmed |
| 4 Realize Value     | Execute delivery and protect architecture integrity | CSU              | CSAM, CSA                 | `milestone-health-review`, `execution-monitoring`, `role-orchestration`    | Milestone delivery + customer health tracking          |
| 5 Manage & Optimize | Sustain outcomes and route expansion                | CSU              | CSAM, Specialist          | `adoption-excellence-review`, `value-realization-pack`, `expansion-signal-routing`      | Sustained value + expansion/next-cycle readiness       |

## Cross-Stage Skills

- `mcem-stage-identification`
- `role-orchestration`
- `exit-criteria-validation`
- `hok-readiness-check`
- `commit-gate-enforcement`
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
