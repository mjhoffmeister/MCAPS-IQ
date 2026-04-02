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

**What this agent accesses:** Power BI (`powerbi-remote`), MSX CRM (`msx`), WorkIQ / M365 (`workiq`, `m365`)

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

### Removing a Role

If you don't need a role, simply don't include it when setting up your team. You can always add roles later.

---

## Additional Optional Roles

These optional roles map directly to skills and capabilities that already exist in the MCAPS IQ repo. Add them when your team needs dedicated focus in these areas — or let the core 5 handle them on-demand.

!!! tip "Pick what fits your team"
    You don't need all of these. Start with the core 5, then add optional roles as your workflow matures. Each one listed below includes the MCAPS IQ skills it activates so you can see exactly what powers it.

### 7. :material-chart-waterfall: Portfolio Strategist (Account Landscape & Prioritization)

> **Core capability:** Manages the portfolio view across all accounts — prioritization, whitespace identification, swarming opportunities, and EDE/Unified coverage alignment.

This role fills the gap between individual deal work (covered by the core 5) and portfolio-level strategic thinking.

=== "Seller Mode"

    Rank your accounts, identify where to focus next, and find swarming opportunities with adjacent pipeline.

    **Example prompts:**

    - "Rank my accounts by growth potential — where should I invest this quarter?"
    - "Which accounts have whitespace I'm not covering?"
    - "Show me swarming opportunities where other CSAs have adjacent pipeline"

=== "OU Mode"

    Drive portfolio-level coaching and segment prioritization at leadership scale.

    **Example prompts:**

    - "Build a 5-tier account classification for the segment"
    - "Which accounts are high performers vs. stagnant? Show the distribution"
    - "Where are the EDE coverage gaps across my territory?"

**Activates these MCAPS IQ skills:**

| Skill | What It Provides |
|-------|-----------------|
| `account-landscape-awareness` | Full pipeline, cross-role activity, EDE coverage, swarm opportunities |
| `account-structure-diagram` | Visual account maps (Excalidraw) with opportunity and milestone structure |
| `portfolio-prioritization` | 5-tier classification (Greenfield/Stagnant/Whitespace/High Performers/Low Utilization) |

---

### 8. :material-gavel: Deal Governance & Stage Authority (MCEM Process Guardian)

> **Core capability:** Owns MCEM stage progression discipline — validates exit criteria, enforces commit gates, identifies stage mismatches, and ensures deals progress on evidence, not optimism.

Most sellers and SAs do governance reactively. This agent makes it proactive — catching stage staleness, missing exit evidence, and premature commitment before they become problems.

=== "Seller Mode"

    Validate that a deal is truly ready to advance — check exit criteria, commitment gates, and handoff readiness.

    **Example prompts:**

    - "Is the Contoso deal really ready to commit? Check exit criteria"
    - "What evidence am I missing to advance this opportunity to Stage 3?"
    - "Run a commit-gate check — are we staffed, scoped, and dated?"

=== "OU Mode"

    Identify systemic stage progression issues across the portfolio and standardize governance discipline.

    **Example prompts:**

    - "Which deals have been stuck in Stage 2 for more than 60 days?"
    - "Show me the commit-gate pass/fail rate across my segment"
    - "Where is the BPF label disagreeing with actual evidence?"

**Activates these MCAPS IQ skills:**

| Skill | What It Provides |
|-------|-----------------|
| `mcem-stage-identification` | Diagnoses actual MCEM stage from CRM evidence (detects label-vs-reality mismatch) |
| `exit-criteria-validation` | Checks formal criteria per stage (solution play set, BVA complete, success plan linked) |
| `commit-gate-enforcement` | Pre-commitment check — resource staffing, delivery path named, date realism |
| `handoff-readiness-validation` | STU→CSU transfer completeness (business case, outcomes, proof artifacts, owners) |
| `non-linear-progression` | Handles stage regression and non-sequential progression patterns |

---

### 9. :material-currency-usd: Financial & Pricing Advisor (Azure Cost Modeling)

> **Core capability:** Builds Azure pricing models, TCO comparisons, and cost-justified delivery plans. Turns vague "how much will this cost?" questions into structured Excel-ready breakdowns.

This role fills a common gap — sellers and SAs often need pricing context during deal strategy but don't have time to assemble cost models manually.

=== "Seller Mode"

    Build customer-specific pricing models covering compute, storage, networking, licensing, and support tiers.

    **Example prompts:**

    - "Build an Azure pricing model for Contoso's AI workload — 50 VMs + GPUs"
    - "Compare reserved vs. pay-as-you-go for this workload across East US and West Europe"
    - "What's the TCO story for migrating from AWS to Azure for this customer?"

=== "OU Mode"

    Standardize pricing templates and consumption-based cost guidance for common deal patterns.

    **Example prompts:**

    - "Create a reusable pricing template for Azure AI Foundry deals"
    - "What are the most common cost objections and how do we counter them?"
    - "Build a regional cost comparison cheat sheet for the team"

**Activates these MCAPS IQ skills:**

| Skill | What It Provides |
|-------|-----------------|
| `azure-pricing-model` | Structures cost components into Excel-ready breakdown (compute, storage, networking, licensing, support) |
| `xlsx` | Generates formatted Excel spreadsheets with formulas and charts |

---

### 10. :material-chart-bell-curve-cumulative: BI & Consumption Analytics Specialist (Power BI Deep Dives)

> **Core capability:** Runs deep Power BI analytics across MSXI, OctoDash, CXObserve, and SE productivity models. Goes beyond the truth cards the Data Synthesizer produces — this agent digs into service-level consumption, incident correlation, and per-subscription breakdowns.

The Data Synthesizer (Role 2) produces account-level summaries. This agent handles the *deep dives* when you need SL5-level service analysis, per-BU seat breakdowns, or incident-to-consumption correlation.

=== "Seller Mode"

    Run targeted analytics — which Azure services are growing/declining, what's the seat composition by BU, how is adoption trending against benchmarks.

    **Example prompts:**

    - "Run an SL5 deep dive on Contoso — which services are growing vs. declining?"
    - "Break down GHCP seats by enterprise org for Fabrikam — who's adopted, who hasn't?"
    - "Show me SE productivity metrics — milestones engaged, HoK activity, committed pipe"

=== "OU Mode"

    Produce segment-wide consumption analytics, support health reviews, and incentive tracking.

    **Example prompts:**

    - "Which accounts qualify for the GHCP new logo incentive this quarter?"
    - "Run a CXObserve review — which accounts have degrading support health?"
    - "Build the Azure gap-to-target report for leadership"

**Activates these MCAPS IQ skills:**

| Skill | What It Provides |
|-------|-----------------|
| `pbi-portfolio-navigator` | Routes PBI questions to the right pre-configured prompt |
| `pbi-ghcp-seats-analysis` | Per-account GHCP seat composition, attach rates, whitespace |
| `pbi-azure-all-in-one-review` | Azure portfolio review with gap-to-target analysis |
| `pbi-azure-service-deep-dive-sl5-aio` | Service-level consumption trends (SL5 grain) |
| `ghcp-octodash` | Per-subscription/per-BU seat breakdown via OctoDash |
| `pbi-prompt-builder` | Interactive DAX query builder for custom analytics |

---

### 11. :material-file-certificate: Impact & Evidence Curator (Connect Hooks + Customer Evidence)

> **Core capability:** Captures, qualifies, and packages measurable impact evidence — for Connect reviews, customer success stories, award nominations, and wins channel posts.

This role bridges the gap between *doing the work* and *proving the impact*. It systematically captures evidence as you work and packages it for recognition, reviews, and customer stories.

=== "Seller Mode"

    Capture impact evidence from deal activities and package it for Connect, nominations, or wins posts.

    **Example prompts:**

    - "What Connect-worthy impact have I driven this quarter? Build my evidence pack"
    - "Write a nomination for the Contoso team — Living Our Culture, Make it Happen"
    - "Draft a wins channel post for the Fabrikam GHCP displacement"

=== "OU Mode"

    Aggregate impact evidence across the segment for leadership reviews and recognition programs.

    **Example prompts:**

    - "Which sellers have the strongest Connect evidence this quarter?"
    - "Build a segment impact summary for the monthly business review"
    - "Compile customer success stories from the last 90 days"

**Activates these MCAPS IQ skills:**

| Skill | What It Provides |
|-------|-----------------|
| `connect-hooks` | Impact area classification, evidence schema, vault routing |
| `customer-evidence-pack` | Compiles email/calendar/chat into consolidated briefing documents |
| `value-realization-pack` | Validates deliverables have measurable outcomes and tracking |
| `nomination` | Americas Living Our Culture award nomination generation |
| `wins-channel-post` | Teams channel "Wins and Customer Impact" post formatting |
| `adoption-excellence-review` | Usage telemetry audit (MAU, DAU, license utilization vs. targets) |

---

### 12. :material-handshake: Partner & Co-Sell Coordinator

> **Core capability:** Manages partner-led and co-sell deal motions — adjusts guidance for partner delivery, tracks co-sell alignment, and ensures partner-specific pipeline hygiene.

Many MCAPS deals involve partner delivery or co-sell motions. This agent ensures partner context doesn't get lost when the core team is focused on the Microsoft side of the deal.

=== "Seller Mode"

    Track partner involvement, adjust deal strategy for co-sell, and ensure partner delivery handoffs are clean.

    **Example prompts:**

    - "Which of my deals have partner delivery? Show me the co-sell status"
    - "Adjust the Contoso deal strategy for partner-led delivery — what changes?"
    - "Is the partner staffed and ready for the Fabrikam commitment?"

=== "OU Mode"

    Monitor co-sell health across the portfolio and identify partner capacity constraints.

    **Example prompts:**

    - "Which partners are over-committed across my segment?"
    - "Show me co-sell pipeline by partner — who's delivering, who's stalled?"
    - "Identify deals where partner attribution is missing"

**Activates these MCAPS IQ skills:**

| Skill | What It Provides |
|-------|-----------------|
| `partner-motion-awareness` | Adjusts guidance for partner-led/co-sell scenarios |
| `delivery-accountability-mapping` | Maps delivery ownership and flags accountability gaps |
| `unified-constraint-check` | Checks Unified dispatch eligibility and accreditation gaps |

---

### 13. :material-school: Enablement & Readiness Coach

> **Core capability:** Tracks seller readiness — skilling plans, certifications, HoK positioning, and consultative sales skill development. Coaches sellers on MCEM-aligned behaviors and identifies readiness gaps.

This role addresses a common gap: sellers invest in deal execution but underinvest in their own readiness. This agent proactively surfaces skilling gaps, HoK positioning opportunities, and consultative selling improvements.

=== "Seller Mode"

    Track your readiness — HoK positioning, skilling plan completion, and consultative sales skill development.

    **Example prompts:**

    - "Am I HoK-ready for my top 3 accounts? Check legal coverage and environment access"
    - "Which consultative sales skills should I focus on this quarter?"
    - "What skilling plan items are overdue at aka.ms/FRI?"

=== "OU Mode"

    Monitor team readiness, identify skilling gaps, and drive consistent HoK positioning across the segment.

    **Example prompts:**

    - "Which SEs haven't positioned HoK with any customers this quarter?"
    - "Show me skilling plan completion rates across the team"
    - "Identify cusp customers where HoK positioning is uncertain"

**Activates these MCAPS IQ skills:**

| Skill | What It Provides |
|-------|-----------------|
| `hok-readiness-check` | Validates legal coverage, environment access, HoK positioning |
| `mcem-consultative-sales` | 6 core consultative sales skills with MCEM stage mapping and behaviors |
| `proof-plan-orchestration` | POC/Pilot/Demo blueprint with success criteria and milestone planning |
| `task-hygiene-flow` | SE daily check for task ownership, due dates, and blockers |

---

## Skills-to-Roles Coverage Map

This table shows how every major MCAPS IQ skill domain maps to the squad roles — core and optional. Gaps are highlighted so you can see where adding an optional role provides dedicated coverage.

| Skill Domain | Core Roles (1–5) | Optional Role 6 | Additional Optional Roles |
|---|---|---|---|
| **CRM Pipeline & Opportunities** | :material-check: Data Synthesizer, Orchestrator | | |
| **Deal Strategy & Plays** | :material-check: Win Strategy Lead | | |
| **Technical Proofs & Demos** | :material-check: Artifact Builder | | |
| **Objection Handling & Readiness** | :material-check: Contrarian Coach | | |
| **Communications & Briefs** | | :material-check: Comms Agent | |
| **Portfolio Prioritization** | :material-dots-horizontal: partial | | :material-check: Portfolio Strategist (#7) |
| **MCEM Stage Governance** | :material-dots-horizontal: partial | | :material-check: Deal Governance (#8) |
| **Azure Pricing & TCO** | :material-close: not covered | | :material-check: Financial Advisor (#9) |
| **Deep PBI Analytics (SL5, OctoDash)** | :material-dots-horizontal: partial | | :material-check: BI Specialist (#10) |
| **Impact Evidence & Awards** | :material-close: not covered | | :material-check: Impact Curator (#11) |
| **Partner & Co-Sell Motions** | :material-close: not covered | | :material-check: Partner Coordinator (#12) |
| **HoK, Skilling & Readiness** | :material-close: not covered | | :material-check: Enablement Coach (#13) |

!!! success "Core 5 covers ~60% of skills"
    The core 5 roles handle the primary deal cycle well. The optional roles fill specialized gaps — add them based on where your team spends the most time or where you see the most friction.

---

## Role-to-MCAPS Role Mapping

The squad roles complement (not replace) your MCAPS organizational role. This table includes both core and optional roles:

| Your MCAPS Role | Core Squad Agents | Recommended Optional Additions |
|----------------|-------------------|-------------------------------|
| **Specialist** | Orchestrator, Data Synthesizer, Win Strategy Lead | Portfolio Strategist (#7), Deal Governance (#8), Partner Coordinator (#12) |
| **Solution Engineer** | Data Synthesizer, Artifact Builder, Contrarian Coach | Financial Advisor (#9), Enablement Coach (#13), BI Specialist (#10) |
| **CSA** | Orchestrator, Data Synthesizer, Contrarian Coach | Deal Governance (#8), Impact Curator (#11), BI Specialist (#10) |
| **CSAM** | Orchestrator, Comms Agent, Data Synthesizer | Portfolio Strategist (#7), Impact Curator (#11), Partner Coordinator (#12) |

---

## What's Next?

[:octicons-arrow-right-16: Pick a Theme for Your Squad](themes.md){ .md-button .md-button--primary }
