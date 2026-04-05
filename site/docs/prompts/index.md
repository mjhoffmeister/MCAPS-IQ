---
title: Prompts & Workflows
description: Visual catalog of all slash commands, role prompts, skill chains, and Power BI workflows — organized by category with data source indicators.
tags:
  - prompts
  - workflows
  - catalog
hide:
  - toc
---

<div class="prompt-hero" markdown>

# Prompts & Workflows

Everything you can say to Copilot — organized visually so you can find the right prompt in seconds. Type `/` in chat or describe what you need in plain English.

<div class="ph-stats">
  <div class="ph-stat"><span class="num">27</span><span class="label">Slash Commands</span></div>
  <div class="ph-stat"><span class="num">43</span><span class="label">Skills</span></div>
  <div class="ph-stat"><span class="num">7</span><span class="label">Roles</span></div>
  <div class="ph-stat"><span class="num">5</span><span class="label">Data Sources</span></div>
</div>

</div>

<div class="source-legend" markdown>
  <div class="sl-item"><div class="sl-dot" style="background: var(--mcaps-blue);"></div> CRM / MSX</div>
  <div class="sl-item"><div class="sl-dot" style="background: var(--mcaps-teal);"></div> Microsoft 365</div>
  <div class="sl-item"><div class="sl-dot" style="background: var(--mcaps-green);"></div> Obsidian Vault</div>
  <div class="sl-item"><div class="sl-dot" style="background: var(--mcaps-purple);"></div> Power BI</div>
  <div class="sl-item"><div class="sl-dot" style="background: #333;"></div> GitHub</div>
  <div class="sl-item"><div class="sl-dot" style="background: var(--mcaps-amber);"></div> AI Synthesis</div>
</div>

---

## Quick Navigation

<div class="grid cards" markdown>

-   :material-slash-forward:{ .lg .middle } __[Slash Commands](slash-commands.md)__

    ---

    All 27 built-in guided flows. Type `/` in Copilot chat. Organized by category with data source indicators and skill chains.

-   :material-account-group:{ .lg .middle } __[By Role](by-role.md)__

    ---

    Visual role cards for Specialist, SE, CSA, CSAM, AE, ATS, and ATU Sales Director — with example prompts and skill routing.

-   :material-link-variant:{ .lg .middle } __[Multi-Skill Chains](multi-skill-chains.md)__

    ---

    One prompt triggers 3–4 skills in sequence. Flow diagrams show skill chains, data sources, and output format.

-   :material-chart-bar:{ .lg .middle } __[Power BI Analytics](powerbi.md)__

    ---

    7 PBI prompts pulling from MSXI, OctoDash, CMI, and SE Productivity models. Each shows DAX workflows and report structure.

</div>

---

## Prompt Landscape at a Glance

Every slash command grouped by when and how you'd use it. Colored badges show which data sources each prompt touches.

<!-- ── Daily & Weekly Rhythm ──────────────────────────── -->

<div class="prompt-lane lane-rhythm" markdown>
<div class="lane-sidebar">Daily · Weekly</div>
<div class="lane-body" markdown>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-teal);">☀️</div>
  <div><h4>Daily Check</h4></div>
</div>
<div class="ptile-slash">/daily</div>
<p class="ptile-desc">Role-aware morning check — surfaces top 3 actions for today based on pipeline state, task health, and milestone urgency.</p>
<div class="ptile-sources">
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-vault">Vault</span>
  <span class="ptile-src src-ai">AI Triage</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-teal);">📋</div>
  <div><h4>Morning Prep</h4></div>
</div>
<div class="ptile-slash">/morning-prep</div>
<p class="ptile-desc">Auto-populates today's daily note + meeting prep skeletons from calendar, vault context, and CRM state. Designed for non-interactive CLI use.</p>
<div class="ptile-sources">
  <span class="ptile-src src-m365">Calendar</span>
  <span class="ptile-src src-vault">Vault</span>
  <span class="ptile-src src-crm">CRM</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-teal);">📆</div>
  <div><h4>Weekly Review</h4></div>
</div>
<div class="ptile-slash">/weekly</div>
<p class="ptile-desc">Day-aware mode selector. <strong>Monday:</strong> vault-first governance prep with pipeline hygiene. <strong>Friday:</strong> retrospective digest saved to vault.</p>
<div class="ptile-sources">
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-m365">M365</span>
  <span class="ptile-src src-vault">Vault</span>
  <span class="ptile-src src-ai">AI Synthesis</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-teal);">🎯</div>
  <div><h4>What Next?</h4></div>
</div>
<div class="ptile-slash">/what-next</div>
<p class="ptile-desc">Quick role-specific scan of pipeline + milestones → suggests 3 highest-impact actions with "Want me to do this?" offers.</p>
<div class="ptile-sources">
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-vault">Vault</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-teal);">⚡</div>
  <div><h4>Quick Wins</h4></div>
</div>
<div class="ptile-slash">/quick-wins</div>
<p class="ptile-desc">5-minute pipeline cleanup — fix the low-hanging CRM hygiene issues that accumulate. Max 5 items, checkbox style.</p>
<div class="ptile-sources">
  <span class="ptile-src src-crm">CRM</span>
</div>
</div>

</div>
</div>

<!-- ── Account Analysis & Deep Workflows ──────────────── -->

<div class="prompt-lane lane-analysis" markdown>
<div class="lane-sidebar">Analysis</div>
<div class="lane-body" markdown>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-blue);">🏥</div>
  <div><h4>Account Review</h4></div>
</div>
<div class="ptile-slash">/account-review</div>
<p class="ptile-desc">Multi-signal health check with section selector: Health Card, Seat Analysis, Engagement, Pipeline, or Full Review.</p>
<div class="ptile-sources">
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-m365">M365</span>
  <span class="ptile-src src-pbi">PBI MSXI</span>
  <span class="ptile-src src-pbi">OctoDash</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-blue);">📊</div>
  <div><h4>Portfolio Prioritization</h4></div>
</div>
<div class="ptile-slash">/portfolio-prioritization</div>
<p class="ptile-desc">Rank accounts by GHCP growth potential — 5-tier classification (Greenfield, Stagnant, Whitespace, High Perf, Low Util).</p>
<div class="ptile-sources">
  <span class="ptile-src src-pbi">PBI Seats</span>
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-vault">Vault</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-blue);">📈</div>
  <div><h4>Activity Impact</h4></div>
</div>
<div class="ptile-slash">/ghcp-activity-impact</div>
<p class="ptile-desc">Correlates activities (VBDs, meetings, POCs) with GHCP seat movement — before/after scoring with 7-level impact scale.</p>
<div class="ptile-sources">
  <span class="ptile-src src-vault">Vault</span>
  <span class="ptile-src src-m365">M365</span>
  <span class="ptile-src src-pbi">PBI</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-blue);">🤝</div>
  <div><h4>Meeting</h4></div>
</div>
<div class="ptile-slash">/meeting</div>
<p class="ptile-desc">Unified meeting workflow — auto-detects mode. Give a meeting title → <strong>Prep</strong>. Paste notes → <strong>Process</strong>.</p>
<div class="ptile-sources">
  <span class="ptile-src src-m365">Calendar</span>
  <span class="ptile-src src-vault">Vault</span>
  <span class="ptile-src src-crm">CRM</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-blue);">📁</div>
  <div><h4>Project Status</h4></div>
</div>
<div class="ptile-slash">/project-status</div>
<p class="ptile-desc">Reads vault project note, related meetings, and CRM state to generate a project status summary.</p>
<div class="ptile-sources">
  <span class="ptile-src src-vault">Vault</span>
  <span class="ptile-src src-crm">CRM</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-blue);">🔗</div>
  <div><h4>Connect Review</h4></div>
</div>
<div class="ptile-slash">/connect-review</div>
<p class="ptile-desc">Compile Connects performance evidence — correlates MSX + WorkIQ + vault + git signals into an auditable evidence pack.</p>
<div class="ptile-sources">
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-m365">WorkIQ</span>
  <span class="ptile-src src-vault">Vault</span>
  <span class="ptile-src src-gh">GitHub</span>
</div>
</div>

</div>
</div>

<!-- ── Power BI ───────────────────────────────────────── -->

<div class="prompt-lane lane-pbi" markdown>
<div class="lane-sidebar">Power BI</div>
<div class="lane-body" markdown>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-purple);">☁️</div>
  <div><h4>Azure All-in-One</h4></div>
</div>
<div class="ptile-slash">/pbi-azure-all-in-one-review</div>
<p class="ptile-desc">ACR vs budget, pipeline conversion, attainment tracking from MSXI.</p>
<div class="ptile-sources"><span class="ptile-src src-pbi">MSXI</span></div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-purple);">🔬</div>
  <div><h4>Service Deep Dive</h4></div>
</div>
<div class="ptile-slash">/pbi-azure-service-deep-dive-sl5-aio</div>
<p class="ptile-desc">Cross-report SL5-level consumption correlated with portfolio performance.</p>
<div class="ptile-sources"><span class="ptile-src src-pbi">MSXI</span><span class="ptile-src src-pbi">ACRSL5</span></div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-purple);">🛡️</div>
  <div><h4>CXObserve</h4></div>
</div>
<div class="ptile-slash">/pbi-cxobserve-account-review</div>
<p class="ptile-desc">Support health, incidents, satisfaction trends, outage impact.</p>
<div class="ptile-sources"><span class="ptile-src src-pbi">CMI</span></div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-purple);">🚨</div>
  <div><h4>Customer Incidents</h4></div>
</div>
<div class="ptile-slash">/pbi-customer-incident-review</div>
<p class="ptile-desc">Active incidents, CritSits, escalation trends, reactive support health.</p>
<div class="ptile-sources"><span class="ptile-src src-pbi">CMI</span></div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-purple);">🏷️</div>
  <div><h4>GHCP New Logo</h4></div>
</div>
<div class="ptile-slash">/pbi-ghcp-new-logo-incentive</div>
<p class="ptile-desc">Evaluate accounts against FY26 GHCP New Logo Growth Incentive eligibility.</p>
<div class="ptile-sources"><span class="ptile-src src-pbi">MSXI</span></div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-purple);">💺</div>
  <div><h4>GHCP Seats</h4></div>
</div>
<div class="ptile-slash">/pbi-ghcp-seats-analysis</div>
<p class="ptile-desc">Seat composition, attach rates, whitespace, MoM trends. Also used by Account Review.</p>
<div class="ptile-sources"><span class="ptile-src src-pbi">MSXI</span><span class="ptile-src src-pbi">OctoDash</span></div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-purple);">📏</div>
  <div><h4>SE Productivity</h4></div>
</div>
<div class="ptile-slash">/pbi-se-productivity-review</div>
<p class="ptile-desc">HoK activities, milestones engaged, customer coverage, pipeline velocity.</p>
<div class="ptile-sources"><span class="ptile-src src-pbi">SE FY26</span></div>
</div>

</div>
</div>

<!-- ── Vault & Sync ───────────────────────────────────── -->

<div class="prompt-lane lane-vault" markdown>
<div class="lane-sidebar">Vault · Sync</div>
<div class="lane-body" markdown>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-green);">🔄</div>
  <div><h4>Vault Sync</h4></div>
</div>
<div class="ptile-slash">/vault-sync</div>
<p class="ptile-desc">Bulk CRM → vault sync. Pulls live CRM data and writes all entity notes in one pass via vault-sync.js.</p>
<div class="ptile-sources">
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-vault">Vault</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-green);">✅</div>
  <div><h4>Task Sync</h4></div>
</div>
<div class="ptile-slash">/task-sync</div>
<p class="ptile-desc">Reconciles CRM task records with vault to maintain a durable SE activity log per milestone.</p>
<div class="ptile-sources">
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-vault">Vault</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-green);">👤</div>
  <div><h4>Create Person</h4></div>
</div>
<div class="ptile-slash">/create-person</div>
<p class="ptile-desc">Create a new People note from context in a meeting note or conversation.</p>
<div class="ptile-sources">
  <span class="ptile-src src-vault">Vault</span>
  <span class="ptile-src src-m365">WorkIQ</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-green);">🐙</div>
  <div><h4>Sync Project from GitHub</h4></div>
</div>
<div class="ptile-slash">/sync-project-from-github</div>
<p class="ptile-desc">Pull GitHub repo activity (commits, PRs, issues) into a vault project note.</p>
<div class="ptile-sources">
  <span class="ptile-src src-gh">GitHub</span>
  <span class="ptile-src src-vault">Vault</span>
</div>
</div>

</div>
</div>

<!-- ── Special & Write ────────────────────────────────── -->

<div class="prompt-lane lane-write" markdown>
<div class="lane-sidebar">Special</div>
<div class="lane-body" markdown>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-amber);">🏆</div>
  <div><h4>Nomination</h4></div>
</div>
<div class="ptile-slash">/nomination</div>
<p class="ptile-desc">Generate an Americas Living Our Culture award nomination with narrative framing and compliance checks.</p>
<div class="ptile-sources">
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-vault">Vault</span>
  <span class="ptile-src src-ai">AI Draft</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-amber);">📣</div>
  <div><h4>Wins Channel Post</h4></div>
</div>
<div class="ptile-slash">/wins-channel-post</div>
<p class="ptile-desc">Generate a Teams channel post for "Wins and Customer Impact". Evaluates story fitness before posting.</p>
<div class="ptile-sources">
  <span class="ptile-src src-m365">Teams</span>
  <span class="ptile-src src-crm">CRM</span>
  <span class="ptile-src src-ai">AI Draft</span>
</div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-amber);">🔧</div>
  <div><h4>Modernize</h4></div>
</div>
<div class="ptile-slash">/modernize</div>
<p class="ptile-desc">Scan VS Code release notes for new agent features and apply them to MCAPS-IQ. Dev-focused prompt.</p>
<div class="ptile-sources">
  <span class="ptile-src src-gh">GitHub</span>
  <span class="ptile-src src-ai">AI Analysis</span>
</div>
</div>

</div>
</div>

<!-- ── Setup & Onboarding ─────────────────────────────── -->

<div class="prompt-lane lane-setup" markdown>
<div class="lane-sidebar">Setup</div>
<div class="lane-body" markdown>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-gray);">🚀</div>
  <div><h4>Getting Started</h4></div>
</div>
<div class="ptile-slash">/getting-started</div>
<p class="ptile-desc">First-time setup — verifies environment, identifies your role, walks you to first success.</p>
<div class="ptile-sources"><span class="ptile-src src-crm">CRM</span><span class="ptile-src src-ai">AI Guide</span></div>
</div>

<div class="ptile" markdown>
<div class="ptile-head">
  <div class="ptile-icon" style="background: var(--mcaps-gray);">🪪</div>
  <div><h4>My Role</h4></div>
</div>
<div class="ptile-slash">/my-role</div>
<p class="ptile-desc">Identify or switch your MCAPS role. Shows role-specific capabilities, daily rhythms, and recommended workflows.</p>
<div class="ptile-sources"><span class="ptile-src src-crm">CRM</span></div>
</div>

</div>
</div>

---

## How Prompts Connect to Skills

```mermaid
graph LR
    A["💬 <b>You say something</b><br/><small>in plain English</small>"] --> B["🧠 <b>Keyword Match</b><br/><small>skills auto-selected</small>"]
    B --> C["⛓️ <b>Skills Chain</b><br/><small>run in sequence</small>"]
    C --> D["🔌 <b>MCP Queries</b><br/><small>CRM · M365 · Vault · PBI</small>"]
    D --> E["✨ <b>Synthesized Output</b><br/><small>tables · actions · risks</small>"]
    
    style A fill:#0078D4,color:#fff,stroke:#005a9e,stroke-width:2px
    style B fill:#00B7C3,color:#fff,stroke:#008b94,stroke-width:2px
    style C fill:#107C10,color:#fff,stroke:#0a5c0a,stroke-width:2px
    style D fill:#5C2D91,color:#fff,stroke:#462170,stroke-width:2px
    style E fill:#FFB900,color:#1B1B1B,stroke:#e0a700,stroke-width:2px

    linkStyle default stroke:#9e9e9e,stroke-width:2.5px
```

!!! tip "You don't need to memorize any of this"
    Just describe what you need. The agent figures out the right skills, tools, and data sources automatically. These pages exist as reference — not required reading.

---

## Deep Dive Pages

| Page | What You'll Find |
|------|-----------------|
| [Slash Commands](slash-commands.md) | Complete catalog with data source badges, skill chains, and role indicators |
| [By Role](by-role.md) | Visual role cards showing which prompts/skills each role uses most |
| [Multi-Skill Chains](multi-skill-chains.md) | Flow diagrams for complex multi-skill workflows |
| [Power BI Analytics](powerbi.md) | All 7 PBI prompts with semantic model details and trigger keywords |
