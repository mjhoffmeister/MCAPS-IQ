---
name: role-orchestration
description: 'Role orchestration router and authority tie-breaker: given current deal state, recommends which unit (ATU, STU, CSU, or Partner) should own the next step. Also resolves conflicting role guidance by assigning a single decision-owner per disputed domain. Triggers: who leads next, team assignment, action paralysis, ATU/STU/CSU routing, which team, next-step owner, who should own, tie-break, conflicting direction, who decides, authority clarification, role disagreement, deadlock, who has final say.'
argument-hint: 'Provide opportunityId and the specific action or decision needing team assignment'
---

## Purpose

Determines which role should lead the next action based on MCEM stage accountability model, current opportunity state, and the nature of the pending decision — eliminating multi-role paralysis.

## Freedom Level

**Medium** — Role recommendation requires stage and context judgment.

## Trigger

- Multiple roles involved and leadership is unclear
- User asks "who should own this?" or "who leads next?"
- Stage transition requires explicit role handoff

## Flow

1. Determine current MCEM stage — use `mcem-stage-identification` skill if needed.
2. Map stage to accountable unit using MCEM accountability model.
3. Identify the nature of the pending action (see classification below).
4. Recommend lead role with explicit ownership statement.

## MCEM Accountability Model

| Stage | Accountable Unit | Lead Role |
|---|---|---|
| Stage 1: Listen & Consult | ATU | Specialist (signal intake), CSAM (outcome input) |
| Stage 2: Inspire & Design | STU | Specialist (lead), SE (technical), CSA (feasibility) |
| Stage 3: Empower & Achieve | STU | Specialist (lead → handoff), SE (proof), CSA+CSAM (commit gate) |
| Stage 4: Realize Value | CSU | CSAM (lead), CSA (architecture guardrails) |
| Stage 5: Manage & Optimize | CSU | CSAM (lead), Specialist (expansion signals) |

## Action Classification

| Action Type | Default Lead |
|---|---|
| Technical feasibility | CSA |
| Customer communication | CSAM |
| Pipeline/opportunity structure | Specialist |
| Proof execution | SE |
| Delivery coordination | CSAM (orchestration), Partner/ISD (execution) |
| Expansion evaluation | Specialist (pipeline), CSAM (timing) |

## Decision Logic

- Stage accountability overrides action type when there's ambiguity
- Cross-stage actions → lead role is determined by where the opportunity currently sits
- If user's role differs from recommended lead → present handoff recommendation

## Authority Tie-Break (Conflicting Role Guidance)

When two roles give conflicting direction on the same work item:

| Domain | Decision Owner | Communication Owner |
|---|---|---|
| Technical feasibility | CSA | CSA informs CSAM |
| Architecture constraints | CSA | CSA documents, CSAM communicates to customer |
| Customer expectation | CSAM | CSAM manages timeline/scope messaging |
| Delivery resourcing | CSAM (escalation) | CSAM owns partner/ISD coordination |
| Timeline adjustment | CSAM (customer) + CSA (technical) | Joint |

- Technical disputes → CSA is final authority
- Customer-facing implications → CSAM communicates adjustments
- Mixed → CSA decides technical path, CSAM communicates customer impact
- Neither claims decision → flag as `unresolved_authority` requiring explicit assignment

## Output Schema

- `recommended_lead`: role name + rationale
- `contributing_roles`: other roles with specific asks
- `handoff_needed`: boolean + direction if user is not the lead role
- `authority_conflicts`: disputed areas with tie-break decisions (when applicable)
- `next_action`: names the skill the lead role should invoke next
