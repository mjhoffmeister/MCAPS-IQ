---
title: "Day 2: Read Your Pipeline"
description: Explore opportunities, milestones, and tasks through natural language.
tags:
  - guided
  - day-2
  - pipeline
---

# Day 2: Read Your Pipeline

<div class="step-indicator" markdown>
<span class="step done">Day 1 ✓</span>
<span class="step active">Day 2</span>
<span class="step">Day 3</span>
<span class="step">Day 5</span>
</div>

**Goal:** Use Copilot to navigate your pipeline — opportunities, milestones, tasks, and health indicators.

**Time:** ~15 minutes

**What you'll learn:**

- How to drill from portfolio → opportunity → milestone → task
- How Copilot activates domain skills automatically
- How to ask for formatted, governance-ready status updates

---

## Exercise 1: Portfolio Overview

```
Give me a summary of my pipeline — stages, values, and what needs attention.
```

**What to watch for:**

- [x] Copilot calls `list_opportunities` and synthesizes results
- [x] You'll see opportunities grouped or sorted by MCEM stage
- [x] It may highlight deals with close dates approaching or stages that look stale

!!! info "Behind the scenes"
    This prompt may activate the `pipeline-hygiene-triage` skill if it detects issues. Watch for it mentioning "hygiene" or "flag" — that's a skill doing work.

---

## Exercise 2: Drill Into a Deal

Pick one of the opportunities from Exercise 1 and ask:

```
Show me the milestones for [Opportunity Name].
```

**What to watch for:**

- [x] Copilot calls `get_milestones` for that specific opportunity
- [x] Returns milestones with status, target dates, and owners
- [x] May flag overdue or uncommitted milestones

??? tip "Natural variations"
    
    - `What's the milestone status on the Contoso deal?`
    - `Any overdue milestones on my Fabrikam opportunity?`
    - `Show me the timeline for Northwind milestones.`

---

## Exercise 3: Task-Level Detail

```
What tasks are attached to the [milestone name] milestone? Any stale or unassigned?
```

**What to watch for:**

- [x] Copilot drills from milestone to tasks
- [x] Identifies tasks with no owner, past due dates, or missing status updates
- [x] If you're an SE, this may activate `task-hygiene-flow`

---

## Exercise 4: Governance-Ready Status

Here's where it gets powerful. Ask:

```
Write me a customer-safe status summary for [Opportunity Name] that I can use in governance this week.
```

**What to watch for:**

- [x] Copilot synthesizes opportunity data, milestone health, and task status
- [x] Produces **two outputs**: customer-facing bullets (no internal jargon) and internal remediation notes
- [x] This activates the `milestone-health-review` skill

!!! success "This is real time savings"
    Instead of opening MSX, clicking through each milestone, checking tasks, and writing a summary in OneNote — you got a governance-ready update in one prompt.

---

## Exercise 5: Cross-Opportunity View

If you have multiple active deals:

```
Across all my active opportunities, which milestones are at risk? Rank by urgency.
```

**What to watch for:**

- [x] Copilot queries across all your opportunities (not just one)
- [x] Aggregates milestones and applies risk logic (overdue, stalled, missing owners)
- [x] Ranks results so you know where to focus

---

## Exercise 6: M365 Evidence (Optional)

If you have `workiq` running:

```
Find any recent Teams messages or emails about [customer name] from the last 2 weeks.
```

**What to watch for:**

- [x] Copilot calls `ask_work_iq` with a scoped query
- [x] Returns relevant Teams chats, email threads, or meeting notes
- [x] Cross-references with CRM data for context

!!! info "WorkIQ Integration"
    WorkIQ bridges the gap between CRM records and actual communication. A milestone might show "green" in CRM while the customer's emails reveal frustration. This cross-medium view is where real intelligence lives.

---

## What You Learned Today

| Concept | What It Means |
|---------|--------------|
| **Drill-down navigation** | Portfolio → Opportunity → Milestone → Task, all via natural language |
| **Skill activation** | Copilot loads domain skills (`milestone-health-review`, `task-hygiene-flow`) based on your prompt |
| **Customer-safe output** | Copilot knows how to produce different outputs for different audiences |
| **Cross-medium queries** | CRM + M365 data combined in a single response |

---

## Before Day 3

Try exploring your own pipeline. Ask questions you'd normally answer by clicking through MSX screens. Notice:

- Which things are faster via Copilot?
- Which things still need you to check MSX directly?
- What questions does Copilot struggle with?

These observations will make Day 3 more impactful.

---

[:octicons-arrow-right-16: Continue to Day 3: Multi-Skill Chains](day-3-chains.md){ .md-button .md-button--primary }
