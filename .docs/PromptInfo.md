# Custom Prompts — Quick Reference

Slash commands available in `@mcaps`. Type `/` in chat to see the full list.

## Start Here

| Command | What It Does | Example |
|---|---|---|
| `/getting-started` | First-time setup check + guided walkthrough | `/getting-started` |
| `/my-role` | Identify or switch your MCAPS role (SE, Specialist, CSA, CSAM) | `/my-role` |

## Daily Workflow

| Command | What It Does | Example |
|---|---|---|
| `/daily` | Role-specific morning check — surfaces top 3 actions | `/daily` |
| `/morning-prep` | Auto-populates today's daily note + meeting prep skeletons from calendar | `/morning-prep` |
| `/weekly` | Weekly review — Monday: governance prep, Friday: digest. Auto-detects by day | `/weekly` |
| `/what-next` | Stuck? Scans pipeline + milestones → suggests 3 highest-impact actions | `/what-next` |
| `/quick-wins` | 5-minute CRM hygiene fixes — max 5 items, checkbox style | `/quick-wins` |

## Account Analysis

| Command | What It Does | Example |
|---|---|---|
| `/account-review` | Multi-signal account review with section selector: Health Card, Seats, Engagement, Pipeline, or Full Review | `/account-review for TPID 10427242` |
| `/portfolio-prioritization` | Rank all tracked accounts by GHCP growth potential — 5-tier classification | `/portfolio-prioritization` |
| `/ghcp-activity-impact` | Did your VBDs/meetings drive seat growth? Before/after scoring with 7-level scale | `/ghcp-activity-impact for Windstream` |

## Meetings

| Command | What It Does | Example |
|---|---|---|
| `/meeting` | Unified: prep before (provide title) or process after (paste notes). Auto-detects | `/meeting Windstream QBR` or paste transcript |

## Deep Workflows

| Command | What It Does | Example |
|---|---|---|
| `/connect-review` | Compile Connects performance evidence from MSX + M365 + vault + git | `/connect-review` |
| `/nomination` | Generate an Americas Living Our Culture award nomination | `/nomination for Windstream` |
| `/project-status` | Project status report from vault + CRM | `/project-status MyProject` |

## Vault Management

| Command | What It Does | Example |
|---|---|---|
| `/create-person` | Create a People note in the vault from context | `/create-person John Smith from Contoso` |
| `/sync-project-from-github` | Pull GitHub repo activity into a vault project note | `/sync-project-from-github` |

## Power BI Reports

These run via the `pbi-analyst` subagent. You can invoke them directly or let the agent route based on keywords.

| Command | Triggers On | Example |
|---|---|---|
| `/pbi-azure-all-in-one-review` | "azure portfolio", "ACR attainment" | `/pbi-azure-all-in-one-review for TPID 10427242` |
| `/pbi-azure-service-deep-dive-sl5-aio` | "service deep dive", "SL5" | `/pbi-azure-service-deep-dive-sl5-aio` |
| `/pbi-cxobserve-account-review` | "support health", "CXP" | `/pbi-cxobserve-account-review` |
| `/pbi-customer-incident-review` | "outage review", "CritSit" | `/pbi-customer-incident-review` |
| `/pbi-ghcp-new-logo-incentive` | "new logo", "GHCP incentive" | `/pbi-ghcp-new-logo-incentive` |
| `/pbi-ghcp-seats-analysis` | Used internally by `/account-review` Section 2 | Invoked automatically |

## Recommended Flow for New Users

```
1. /getting-started          → verify setup, identify role
2. /daily                    → see what needs attention today
3. /account-review           → deep-dive any account (pick sections)
4. /meeting                  → prep before, process after
5. /weekly                   → governance prep (Mon) or digest (Fri)
6. /portfolio-prioritization → where to focus GHCP sales effort
```

