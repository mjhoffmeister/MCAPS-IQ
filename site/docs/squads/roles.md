---
title: Recommended Squad Roles
description: The 5+1 agent roles optimized for MCAPS sales teams and solution architects. Understand each role, customize it, or build your own.
tags:
  - squads
  - roles
  - customization
---

# Recommended Squad Roles

MCAPS IQ recommends a **core 5 + optional 6th** agent configuration designed specifically for sellers and solution architects. These roles mirror how high-performing account teams actually divide work.

!!! info "These are starting points, not rules"
    Every role below can be renamed, merged, split, or replaced. The squad learns from how you use it — customize freely to match your team's workflows.

---

## Core 5 Roles (Recommended Baseline)

### 1. :material-target: Experience Orchestrator (Agent Boss)

> **Core capability:** Routes work to the right specialists and assembles a "seller-ready experience bundle."

The orchestrator is the front door for complex requests. When you say "prep account plan + meeting + follow-ups," this agent breaks it into parallel workstreams and returns one coherent output.

=== "Seller Mode"

    Turn an ask ("prep account plan + meeting + follow-ups") into parallel workstreams and return one coherent output.

    **Example prompts:**

    - "Prep everything I need for the Contoso QBR tomorrow"
    - "Run my weekly pipeline review and create action items"
    - "Pull together meeting prep, talking points, and follow-up draft for Fabrikam"

=== "OU Mode"

    Run repeatable "portfolio experiences" (weekly/ROB style) and standardize outputs across many accounts.

    **Example prompts:**

    - "Run the Monday pipeline sweep across my top 10 accounts"
    - "Generate the weekly ROB summary for my segment"
    - "Standardize the account review output format across the team"

**What this agent accesses:** All MCP servers (CRM, M365, Power BI, OIL) — it delegates to other agents but can also pull context directly to coordinate.

---

### 2. :material-chart-box: Data & Signal Synthesizer (PowerBI + CRM + Work Context)

> **Core capability:** Builds the data model / truth set by pulling and normalizing signals from reporting + CRM + work context.

This agent is your data engine. It pulls from Power BI dashboards, CRM pipeline state, and M365 activity to build a single source of truth for any account or portfolio.

=== "Seller Mode"

    Produce an account "truth card" — trends, gaps, risks, and next-best actions from usage/pipeline/CRM context.

    **Example prompts:**

    - "Build me a truth card for Contoso — usage trends, pipeline gaps, risks"
    - "What's changed in Fabrikam's consumption over the last 3 months?"
    - "Show me the signal landscape for my top 5 opportunities"

=== "OU Mode"

    Produce a portfolio view — top movers, systemic blockers, and priority segments to drive coaching at scale.

    **Example prompts:**

    - "Which accounts have the largest gap-to-target this quarter?"
    - "Identify systemic blockers across my segment's pipeline"
    - "Rank my accounts by growth potential vs. current investment"

**What this agent accesses:** Power BI (`powerbi-remote`), MSX CRM (`msx-crm`), WorkIQ / M365 (`workiq`, `m365`)

---

### 3. :material-trophy: Sales Excellence & Win Strategy Lead (Plays, Programs, Incentives, IP)

> **Core capability:** Converts truth-set signals into the best way to win: positioning, plays, programs, incentives, and packaging.

Once the Data Synthesizer produces the truth set, this agent figures out *how to win*. It matches account signals to available plays, programs, incentives, and proof points.

=== "Seller Mode"

    Choose the winning bundle for an account — which motion + which offers/programs + what proof/talk track.

    **Example prompts:**

    - "What's the best play for Contoso given their current consumption pattern?"
    - "Which incentive programs apply to this deal? Build me a positioning talk track"
    - "Compare Azure migration vs. modernization plays for Fabrikam"

=== "OU Mode"

    Define repeatable plays + incentives/program guidance for the whole OU.

    **Example prompts:**

    - "Which plays are our top performers running? Build a best-practice guide"
    - "Create a program eligibility cheat sheet for this quarter's incentives"
    - "Identify which motions are under-utilized across my segment"

**What this agent accesses:** CRM for pipeline context, vault for institutional knowledge, web search for current programs/incentives.

---

### 4. :material-hammer-wrench: Artifact Builder (Demo + POV + Enablement Pack Producer)

> **Core capability:** Builds the tangible assets sellers use: demos, POV decks, scripts, one-pagers, workshop kits.

This is the builder. It takes the strategy from the Win Strategy Lead and produces the actual deliverables — decks, scripts, one-pagers, and kits.

=== "Seller Mode"

    Generate deal-specific assets aligned to the chosen win strategy.

    **Example prompts:**

    - "Build a POV deck for the Contoso Azure AI opportunity"
    - "Create a one-pager comparing our solution to AWS for Fabrikam"
    - "Draft a demo script for the GitHub Copilot pitch meeting"

=== "OU Mode"

    Produce reusable "kits" so many sellers can execute consistently — templates + standardized demos.

    **Example prompts:**

    - "Create a reusable workshop kit for Azure AI Foundry demos"
    - "Build a standardized pitch template for the GHCP motion"
    - "Package the top 3 winning deck templates for the segment"

**What this agent accesses:** CRM for account context, vault for prior artifacts, document generation tools (DOCX, PPTX, PDF skills).

---

### 5. :material-shield-alert: Contrarian Coach (Red Team + Seller Readiness)

> **Core capability:** Pressure-tests the plan and coaches the seller with "what will break / what will be challenged."

This is the agent that says "not so fast." It reviews the work of other agents, identifies gaps, and prepares you for tough questions.

=== "Seller Mode"

    Run "deal rehearsal" — surface objections, missing proof, and readiness gaps.

    **Example prompts:**

    - "Red-team my Contoso pitch — what will the CTO push back on?"
    - "What proof points am I missing for the Azure migration deal?"
    - "Run a deal readiness check on my top 3 opportunities"

=== "OU Mode"

    Aggregate recurring objection patterns and update standard talk tracks.

    **Example prompts:**

    - "What are the top 5 objections our sellers are hitting this quarter?"
    - "Update our standard AWS-vs-Azure competitive talk track"
    - "Which deals failed this quarter and what patterns do you see?"

**What this agent accesses:** CRM for deal state, vault for historical outcomes, M365 for customer communication signals.

---

## Optional 6th Role

### 6. :material-email-fast: Work Context Comms & Briefing Agent (Exec-ready messages + actioning)

> **Core capability:** Turns work context into crisp briefs, follow-ups, and action lists (summaries, drafts, task automation).

Add this agent when you want more automation of communication outputs.

=== "Seller Mode"

    Draft meeting prep, follow-ups, recaps, and next steps grounded in the truth set.

    **Example prompts:**

    - "Draft the follow-up email from today's Contoso meeting"
    - "Build my meeting prep for tomorrow — agenda, talking points, open items"
    - "Summarize this week's customer interactions into a recap"

=== "OU Mode"

    Produce standardized weekly updates, leadership briefs, and ROB outputs.

    **Example prompts:**

    - "Generate the weekly segment update for leadership"
    - "Build the ROB output for this week's business review"
    - "Create a standardized weekly update template for all sellers"

**What this agent accesses:** M365 (`m365`, `workiq`) for emails/meetings/chats, CRM for pipeline context, calendar for scheduling.

---

## Customizing Roles

### Renaming a Role

Edit the agent's charter file in `.squad/agents/{name}/charter.md`:

```markdown
# Agent Charter: {New Name}

Role: Your custom role description
Expertise: What this agent specializes in
Voice: How this agent communicates
```

### Merging Roles

If your team is small, you might combine roles. For example, merge the **Win Strategy Lead** and **Artifact Builder** into a single "Strategy & Assets" agent.

### Adding Custom Roles

You can extend beyond the recommended set. Some ideas for MCAPS teams:

| Custom Role | What It Does |
|-------------|-------------|
| **Partner Motion Specialist** | Manages co-sell partner relationships and joint go-to-market |
| **Customer Success Liaison** | Bridges the STU→CSU handoff with continuity and context |
| **Competitive Intelligence Analyst** | Monitors competitor activity and maintains battle cards |
| **Enablement & Skilling Tracker** | Tracks team certifications, skilling plans, and readiness |

### Removing a Role

If you don't need a role, simply don't include it when setting up your team. You can always add roles later.

---

## Role-to-MCAPS Role Mapping

The squad roles complement (not replace) your MCAPS organizational role:

| Your MCAPS Role | Squad Agents You'll Use Most |
|----------------|------------------------------|
| **Specialist** | Orchestrator, Data Synthesizer, Win Strategy Lead |
| **Solution Engineer** | Data Synthesizer, Artifact Builder, Contrarian Coach |
| **CSA** | Orchestrator, Data Synthesizer, Contrarian Coach |
| **CSAM** | Orchestrator, Comms Agent, Data Synthesizer |

---

## What's Next?

[:octicons-arrow-right-16: Pick a Theme for Your Squad](themes.md){ .md-button .md-button--primary }
