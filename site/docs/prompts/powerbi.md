---
title: Power BI Prompts
description: Pull analytics data from Power BI semantic models using natural language.
tags:
  - prompts
  - powerbi
  - analytics
---

# Power BI Prompts

The **Power BI Remote MCP** connects Copilot to your Power BI semantic models. Pull ACR telemetry, incentive baselines, consumption scorecards, and pipeline analytics — all from the chat window. No DAX knowledge required.

!!! info "Prerequisites"
    Power BI integration requires the `powerbi-remote` server running in `.vscode/mcp.json`. See [Power BI Setup](../integrations/powerbi.md) for details.

---

## Included Prompts

### Azure All-in-One Review

```
Run my Azure portfolio review — what's my gap to target and which 
opportunities should I focus on?
```

Or use the slash command: `/pbi-azure-all-in-one-review`

Pulls ACR vs. budget data, pipeline conversion, ACR actuals, and budget attainment. Highlights opportunities needing attention.

### Azure Service Deep Dive (SL5)

```
Show me service-level consumption breakdown for my Azure accounts
```

Or use: `/pbi-azure-service-deep-dive-sl5-aio`

Cross-report analysis correlating portfolio performance with SL5-level consumption. Shows which Azure services are growing or declining.

### CXObserve Account Review

```
What's the support health for my account?
```

Or use: `/pbi-cxobserve-account-review`

Account support experience review — active incidents, escalations, satisfaction trends, and outage impact.

### Customer Incident Review

```
Show me current incidents and outages for my account
```

Or use: `/pbi-customer-incident-review`

Customer incident and outage review — current incidents, CritSits, outage trends, and reactive support health.

### GHCP New Logo Incentive Tracker

```
Which of my accounts qualify for the GHCP New Logo incentive?
```

Or use: `/pbi-ghcp-new-logo-incentive`

Evaluates accounts against the FY26 GHCP New Logo Growth Incentive eligibility criteria.

### GHCP Seats Analysis

```
Show me GHCP seat data and whitespace for my tracked accounts
```

Or use: `/pbi-ghcp-seats-analysis`

Pulls seat composition, attach rates, remaining whitespace, and MoM trends. Classifies accounts into growth cohorts and surfaces expansion targets. Also used internally by `/account-review` Section 2.

---

## Building Your Own PBI Prompt

The **pbi-prompt-builder** skill walks you through creating custom Power BI prompts interactively:

```
I want to build a Power BI prompt to track my gap to target across 
my Azure accounts.
```

The builder will:

1. **Discover** available semantic models
2. **Map** your questions to tables and measures
3. **Generate** and validate DAX queries against live data
4. **Output** a ready-to-use `.prompt.md` file

See [Power BI Integration](../integrations/powerbi.md) for the full setup guide.
