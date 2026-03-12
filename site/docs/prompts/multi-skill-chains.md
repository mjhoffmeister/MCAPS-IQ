---
title: Multi-Skill Chains
description: Realistic prompts that chain multiple skills in sequence for comprehensive output.
tags:
  - prompts
  - chains
  - advanced
---

# Multi-Skill Chains

These are realistic "day in the life" prompts that chain **multiple skills** in sequence. This is where the full orchestration shines — one prompt, 3–4 skills, one comprehensive answer.

!!! info "How chains work"
    You don't need to name the skills. Copilot matches your intent to the right skills using keyword matching against each skill's `description` field. It then runs them in the order defined by each skill's chain declarations.

---

## Full Weekly Review (Specialist)

```
I'm a Specialist. Run my full weekly review — pipeline hygiene, any deals 
ready to hand off, and flag risks across my active opps.
```

**Skills chained:** `pipeline-hygiene-triage` → `handoff-readiness-validation` → `risk-surfacing`

---

## Pre-Governance Prep (CSAM)

```
Before my Contoso governance meeting Thursday, tell me: what stage are we 
really in, what's the milestone health, and prepare a customer evidence 
pack for the last 30 days.
```

**Skills chained:** `mcem-stage-identification` → `milestone-health-review` → `customer-evidence-pack`

---

## Commit-or-Loopback Decision (CSAM/CSA)

```
The team wants to commit the Fabrikam milestone, but I heard the proof 
had issues. Check if we should commit or loop back, and tell me who owns what.
```

**Skills chained:** `commit-gate-enforcement` → `non-linear-progression` → `delivery-accountability-mapping`

---

## End-to-End Deal Triage (Any Role)

```
The Northwind deal feels stuck. What stage is it actually in, are exit 
criteria met, what are the risks, and who should own the next action?
```

**Skills chained:** `mcem-stage-identification` → `exit-criteria-validation` → `risk-surfacing` → `role-orchestration`

---

## Post-Proof Handoff (CSA → CSAM)

```
I'm a CSA. The Contoso proof just completed successfully. Check architecture 
feasibility, create the handoff note, and validate that the Specialist 
handoff is clean.
```

**Skills chained:** `architecture-feasibility-check` → `architecture-execution-handoff` → `handoff-readiness-validation`

---

## Adoption + Expansion Review (CSAM)

```
Review adoption health for Fabrikam, check if value is being realized on 
committed milestones, and flag any expansion signals that should go to 
the Specialist.
```

**Skills chained:** `adoption-excellence-review` → `value-realization-pack` → `expansion-signal-routing`

---

## Power BI Portfolio Review

```
Run my Azure portfolio review — what's my gap to target and which 
opportunities should I focus on?
```

**Uses:** `pbi-azure-portfolio-review` prompt (Power BI + CRM cross-medium)

---

## Morning Standup Prep (SE)

```
I'm an SE. Check my task hygiene, show me any execution blockers on 
committed milestones, and tell me if there are Unified constraints 
I should flag today.
```

**Skills chained:** `task-hygiene-flow` → `execution-monitoring` → `unified-constraint-check`

---

## Tips for Writing Your Own Chains

1. **Describe the outcome**, not the skills. Let Copilot figure out the workflow.
2. **Include context**: customer name, milestone name, your role — the more context, the better the result.
3. **Don't be afraid of long prompts**. A 3-sentence prompt that chains 4 skills is more productive than 4 separate 1-sentence prompts.
