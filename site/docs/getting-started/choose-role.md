---
title: Choose Your Role
description: Tell Copilot your MCAPS role so it tailors its behavior to your workflows.
tags:
  - getting-started
  - roles
hide:
  - toc
---

# Choose Your Role

<div class="timeline-nav">
<a href="../" class="tl-step done"><div class="tl-node"><span class="tl-num">1</span></div><div class="tl-label">Getting Started</div></a>
<a href="../installation/" class="tl-step done"><div class="tl-node"><span class="tl-num">2</span></div><div class="tl-label">Install</div></a>
<a href="../first-chat/" class="tl-step done"><div class="tl-node"><span class="tl-num">3</span></div><div class="tl-label">First Chat</div></a>
<a href="./" class="tl-step active"><div class="tl-node"><span class="tl-num">4</span></div><div class="tl-label">Choose Role</div></a>
</div>

Copilot automatically detects your role from CRM, but you can also tell it explicitly. This takes 30 seconds and dramatically improves the relevance of its guidance.

---

## Auto-Detect (Recommended)

Just type:

```
/my-role
```

Copilot calls `crm_whoami`, looks at your role assignments, and confirms what it found. It then shows you a menu of actions tailored to your role.

---

## Or Tell It Directly

If auto-detection doesn't work or you want to set context explicitly:

```
I'm a Specialist. What should I focus on today?
```

---

## What Each Role Gets

<div class="grid cards" markdown>

-   :material-chart-line:{ .lg .middle } __Specialist (STU)__

    ---

    **Pipeline builder & deal driver**

    - Opportunity qualification
    - Forecast hygiene
    - Stage 2–3 progression
    - STU-to-CSU handoff checklists

-   :material-wrench:{ .lg .middle } __Solution Engineer (SE)__

    ---

    **Technical proof executor**

    - POC/Pilot/Demo management
    - Task-record hygiene
    - BANT qualification support
    - SE-to-CSU handoff

-   :material-vector-polygon:{ .lg .middle } __Cloud Solution Architect (CSA)__

    ---

    **Architecture-focused execution owner**

    - Technical proof oversight
    - Guardrail enforcement
    - Value-realization validation
    - Architecture handoff documents

-   :material-shield-check:{ .lg .middle } __CSAM__

    ---

    **Customer-success orchestrator**

    - Governance cadence
    - Success-plan alignment
    - Adoption tracking
    - Commit-readiness gates

</div>

---

## You're All Set! :tada:

You've completed the setup. Here's what to do next:

| What | Where |
|------|-------|
| **Follow the guided experience** | [Day 1: Hello MCAPS IQ →](../guided/day-1-hello.md) |
| **Explore prompts for your role** | [Prompts by Role →](../prompts/by-role.md) |
| **Try multi-skill chains** | [Multi-Skill Chains →](../prompts/multi-skill-chains.md) |
| **Set up Obsidian vault** | [Obsidian Integration →](../integrations/obsidian.md) |

!!! tip "Recommended: Follow the Guided Experience"
    The [Guided Experience](../guided/index.md) walks you through progressively powerful scenarios over 5 days — from basic reads to multi-skill orchestration chains that will change how you work. This is the fastest path to your **lightbulb moment**.

[:octicons-rocket-16: Start the Guided Experience](../guided/index.md){ .md-button .md-button--primary }
[:octicons-list-unordered-16: Browse All Prompts](../prompts/index.md){ .md-button }
