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

### Azure Portfolio Review

```
Run my Azure portfolio review — what's my gap to target and which 
opportunities should I focus on?
```

Or use the slash command: `/pbi-azure-portfolio-review`

Pulls ACR vs. budget data, ranks opportunities by gap contribution, and highlights ones needing attention.

### GHCP New Logo Incentive Tracker

```
Which of my accounts qualify for the GHCP New Logo incentive?
```

Or use: `/pbi-ghcp-new-logo-incentive`

Evaluates accounts against incentive eligibility criteria.

### GHCP Seats Analysis

```
Show me GHCP seat data and whitespace for my tracked accounts
```

Or use: `/pbi-ghcp-seats-analysis`

Pulls seat composition, attach rates, remaining whitespace, and MoM trends. Classifies accounts into growth cohorts and surfaces expansion targets.

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
