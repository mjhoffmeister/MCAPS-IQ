---
title: "Day 3: Multi-Skill Chains"
description: Issue a single prompt that orchestrates multiple skills in sequence.
tags:
  - guided
  - day-3
  - chains
  - advanced
---

# Day 3: Multi-Skill Chains

<div class="step-indicator" markdown>
<span class="step done">Day 1 ✓</span>
<span class="step done">Day 2 ✓</span>
<span class="step active">Day 3</span>
<span class="step">Day 5</span>
</div>

**Goal:** Experience the power of multi-step orchestration — one prompt, multiple skills, comprehensive output.

**Time:** ~15 minutes

**What you'll learn:**

- How one natural-language prompt can trigger 3–4 skills in sequence
- How skills pass context to each other (chaining)
- Why this is fundamentally different from asking separate questions

---

## Why Chains Matter

On Day 2, you asked individual questions: _"Show milestones," "Check tasks," "Write a summary."_ That's useful, but it's still you orchestrating the workflow.

**Chains flip the model.** You describe the _outcome_ you want, and Copilot figures out which skills to run and in what order.

```mermaid
graph LR
    A[Your prompt] --> B[pipeline-hygiene-triage]
    B --> C[risk-surfacing]
    C --> D[handoff-readiness-validation]
    D --> E[Prioritized action list]
    style A fill:#4CAF50,color:#fff
    style E fill:#1565C0,color:#fff
```

---

## Exercise 1: The Weekly Review Chain

=== "Specialist"

    ```
    I'm a Specialist. Run my full weekly review — pipeline hygiene, 
    any deals ready to hand off, and flag risks across my active opps.
    ```
    
    **What runs:**
    
    1. `pipeline-hygiene-triage` — sweeps for stale opps, missing fields, close-date slippage
    2. `handoff-readiness-validation` — checks STU-to-CSU handoff completeness
    3. `risk-surfacing` — flags relationship decay, silent stakeholders, looming threats
    
    **What you get:** A single, prioritized action list with everything ranked by urgency.

=== "CSAM"

    ```
    Before my governance meeting Thursday, tell me: what stage are we 
    really in on the Contoso deal, what's the milestone health, and 
    prepare a customer evidence pack for the last 30 days.
    ```
    
    **What runs:**
    
    1. `mcem-stage-identification` — diagnoses true stage vs. BPF label
    2. `milestone-health-review` — scans for date drift and overdue completions
    3. `customer-evidence-pack` — assembles communication evidence
    
    **What you get:** Governance-ready briefing with honest stage assessment, not just what CRM says.

=== "CSA"

    ```
    I'm a CSA. Run my weekly execution sweep — what's at risk across 
    my committed milestones?
    ```
    
    **What runs:**
    
    1. `execution-monitoring` — audits architecture decisions vs. live state
    2. `task-hygiene-flow` — checks task owners and due dates
    
    **What you get:** A punch-list of execution risks with specific remediation actions.

=== "Solution Engineer"

    ```
    I'm an SE. Check my task hygiene, show me any execution blockers 
    on committed milestones, and tell me if there are Unified constraints 
    I should flag today.
    ```
    
    **What runs:**
    
    1. `task-hygiene-flow` — reads each CRM task for correctness
    2. `execution-monitoring` — flags constraint breaches
    3. `unified-constraint-check` — detects Unified dispatch eligibility gaps
    
    **What you get:** Morning prep completed in one prompt.

!!! success "Notice the difference"
    You didn't name any skills. You didn't specify any tools. You described what you needed, and Copilot:
    
    1. Identified the relevant skills from your intent
    2. Ran them in the correct order
    3. Passed context between them
    4. Produced a unified output

---

## Exercise 2: The Deal Triage Chain

Pick a deal that feels stuck or uncertain:

```
The [opportunity name] deal feels stuck. What stage is it actually in, 
are exit criteria met, what are the risks, and who should own the next action?
```

**What runs:**

1. `mcem-stage-identification` → Where are we _really_?
2. `exit-criteria-validation` → What criteria are met/unmet?
3. `risk-surfacing` → What threats are we not seeing?
4. `role-orchestration` → Who should move next?

**This is four workflows compressed into one prompt.** The output connects them — risks inform the next-action recommendation, stage position informs which exit criteria matter.

---

## Exercise 3: The Commit-or-Loopback Decision

```
The team wants to commit the [milestone name] milestone, but I heard the 
proof had issues. Check if we should commit or loop back.
```

**What runs:**

1. `commit-gate-enforcement` → Are resources staffed? Delivery path named? Dates realistic?
2. `non-linear-progression` → Should we regress to an earlier stage?
3. `delivery-accountability-mapping` → Who owns what if we do commit?

**What you get:** A clear commit/loopback recommendation with evidence, not opinion.

---

## Exercise 4: Post-Proof Handoff (CSA → CSAM)

```
I'm a CSA. The Contoso proof just completed successfully. Check 
architecture feasibility, create the handoff note, and validate 
that the Specialist handoff is clean.
```

**What runs:**

1. `architecture-feasibility-check` → Can we actually build what was proved?
2. `architecture-execution-handoff` → Generate the decision record
3. `handoff-readiness-validation` → Is the STU exit clean?

---

## Understanding Chain Behavior

!!! info "How Copilot chains skills"
    
    1. **Intent matching** — Copilot reads your prompt and identifies which skills' `description` keywords match
    2. **Ordering** — Skills declare which other skills they chain with in their docs
    3. **Context forwarding** — Output from skill 1 becomes input context for skill 2
    4. **Unified output** — The final response synthesizes all skill outputs into one coherent answer

??? question "What if a skill in the chain has no relevant data?"
    Copilot handles this gracefully — it notes "no issues found" for that skill and continues the chain. You won't get an error; you'll get a shorter answer.

??? question "Can I force a specific chain order?"
    You can, but you usually don't need to. If you want control:
    ```
    First run pipeline-hygiene-triage, then risk-surfacing, 
    then give me a prioritized action list.
    ```

---

## What You Learned Today

| Concept | What It Means |
|---------|--------------|
| **Skill chaining** | Multiple skills execute in sequence from a single prompt |
| **Intent-driven orchestration** | You describe the outcome; Copilot picks the workflow |
| **Context forwarding** | Each skill's output enriches the next skill's input |
| **One prompt, full picture** | Complex multi-step investigations in a single interaction |

---

## Take Day 4 for Yourself

Before Day 5, spend a day using chains on your _real_ pipeline. Try:

- A weekly review for your actual role
- A triage on a deal that's actually problematic
- A governance prep for a meeting you actually have

The more you use real data, the more impressed (or occasionally frustrated) you'll be — and both reactions are valuable learning.

---

[:octicons-arrow-right-16: Continue to Day 5: The Lightbulb Moment](day-5-lightbulb.md){ .md-button .md-button--primary }
