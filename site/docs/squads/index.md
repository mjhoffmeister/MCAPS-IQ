---
title: Squads — AI Agent Teams for MCAPS IQ
description: Add a persistent AI agent team to your MCAPS IQ workspace. Each squad member specializes in a part of the sales motion and learns your accounts over time.
tags:
  - squads
  - customization
  - agents
hide:
  - toc
---

# Squads — AI Agent Teams

!!! tip "What are Squads?"
    [Squad](https://github.com/bradygaster/squad) gives you a **persistent team of AI agents** that live in your repo as files. Each agent has a role, a name, accumulated knowledge, and shared decision history — they get better the more you use them.

---

## Why Squads for Sales & Solution Architecture?

MCAPS IQ connects Copilot to your CRM, M365, and analytics data. **Squads** take this further by letting you define a **team of specialists** that divide and conquer complex sales workflows:

<div class="grid cards" markdown>

-   :material-account-group:{ .lg .middle } __Parallel Workstreams__

    ---

    Ask your squad to "prep for the QBR" and multiple agents work simultaneously — one pulls pipeline data, another builds the deck, a third drafts follow-ups.

-   :material-brain:{ .lg .middle } __Accumulated Knowledge__

    ---

    Each agent writes learnings to its `history.md`. After a few sessions, they know your accounts, your talk tracks, and your preferences — no re-explaining.

-   :material-git:{ .lg .middle } __Version-Controlled Team__

    ---

    The whole squad lives in `.squad/` — commit it, and anyone who clones the repo gets the same team with the same knowledge.

-   :material-account-cog:{ .lg .middle } __Role-Specialized Reasoning__

    ---

    Instead of one generalist agent doing everything, each squad member focuses on what they do best — data synthesis, win strategy, artifact building, deal coaching.

</div>

---

## How It Works with MCAPS IQ

```
You (Copilot Chat or Squad Shell)
  │
  ├── "Prep account plan for Contoso"
  │     ├── 🎯 Experience Orchestrator → routes to specialists
  │     ├── 📊 Data Synthesizer → pulls CRM + PBI signals
  │     ├── 🏆 Win Strategy Lead → picks plays + programs
  │     ├── 🛠️ Artifact Builder → generates deck + one-pager
  │     └── 🔴 Contrarian Coach → pressure-tests the plan
  │
  └── One coherent output, assembled by the orchestrator
```

The squad agents use the same MCP servers (MSX CRM, M365, Power BI, OIL) that MCAPS IQ already provides. They just divide the work intelligently.

---

## The Recommended Team

MCAPS IQ ships with a **recommended 5+1 role configuration** tailored for sellers and solution architects. You can use it as-is or customize every aspect.

| # | Role | What They Do |
|---|------|-------------|
| 1 | **Experience Orchestrator** | Routes work to specialists, assembles seller-ready bundles |
| 2 | **Data & Signal Synthesizer** | Builds truth sets from CRM + PBI + M365 signals |
| 3 | **Sales Excellence & Win Strategy Lead** | Converts signals into winning plays, programs, and positioning |
| 4 | **Artifact Builder** | Produces demos, POV decks, scripts, workshop kits |
| 5 | **Contrarian Coach** | Red-teams the plan, surfaces objections, coaches readiness |
| 6 | **Work Context Comms Agent** _(optional)_ | Drafts briefs, follow-ups, recaps, and action lists |

Plus **7 additional optional roles** mapped to the repo's existing skills — portfolio strategy, deal governance, pricing, BI analytics, impact evidence, partner motions, and enablement coaching.

[:octicons-arrow-right-16: See detailed role descriptions](roles.md){ .md-button }

---

## Getting Started

<div class="timeline-nav">
<a href="setup/" class="tl-step active"><div class="tl-node"><span class="tl-num">1</span></div><div class="tl-label">Install Squad CLI</div></a>
<a href="setup/#initialize" class="tl-step"><div class="tl-node"><span class="tl-num">2</span></div><div class="tl-label">Initialize Squad</div></a>
<a href="setup/#theme" class="tl-step"><div class="tl-node"><span class="tl-num">3</span></div><div class="tl-label">Pick a Theme</div></a>
<a href="setup/#start" class="tl-step"><div class="tl-node"><span class="tl-num">4</span></div><div class="tl-label">Start Working</div></a>
</div>

| Step | What You'll Do | Time |
|------|---------------|------|
| [**Setup**](setup.md) | Install the Squad CLI and initialize in your MCAPS IQ workspace | 3 min |
| [**Roles**](roles.md) | Understand the recommended roles and customize for your team | 5 min |
| [**Themes**](themes.md) | Pick a personality theme for your squad's cast of characters | 2 min |

[:octicons-arrow-right-16: Start Setup](setup.md){ .md-button .md-button--primary }
