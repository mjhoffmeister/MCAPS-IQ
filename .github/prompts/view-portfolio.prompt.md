---
description: "Instant portfolio overview from local files: account roster, tranche breakdown, GHCP seats, data freshness. Zero MCP calls."
---

# View Portfolio

Instant portfolio overview from local `.docs/` files. No MCP calls, no rate limits — reads `_index.md` and cached data for the full lay of the land.

## Interaction

No questions needed. Reads local files immediately.

## Workflow

### Step 1 — Read Index (single read)

Read `.docs/_index.md` → full dashboard with all 46 accounts: TPID, Tier, Tranche, seats, attach%, whitespace, freshness dates, flags, next actions.

This single read replaces scanning AccountReference.md + per-account files.

### Step 2 — Read Latest Seat Data (if available)

- List `.docs/Weekly/` → find most recent `*_GHCP-Seats-report.xlsx` and `*_GHCP-Seat-Opp.md`.
- If seat opportunity file exists, read it for portfolio-level metrics. Note the file date.
- If not available, note "No weekly seat data — run `/extract-ghcp-seats` to generate."

### Step 3 — Read WeeklyActionPlan (if exists)

- Read `.docs/WeeklyActionPlan.md` → current action items, blockers, data freshness.
- Extract the generation date from the header.
- If not available, note "No action plan — run `/plan-week` to generate."

### Step 4 — Present Snapshot

```markdown
## Portfolio Overview — {date}

### Tranche Summary
| Tranche | Accounts | Focus | Top Accounts |
|---|---|---|---|
| A — Drive Adoption | {N} | Land first seats, activate greenfield | {top 3 by whitespace} |
| B — Grow & Expand | {N} | Expand attach, qualify whitespace | {top 3 by whitespace} |
| C — Monitor & Maintain | {N} | Maintain health, flag anomalies | {top 3 by seats} |
| Unclassified | {N} | TMG tracking, needs triage | {list} |

### Account Roster ({N} accounts)
| # | Account | TPID | Tier | Tr | Seats | Attach% | WS | Flag | Next Action |
|---|---|---|---|---|---|---|---|---|---|
| 1 | {Account} | {TPID} | {tier} | {tr} | {seats} | {%} | {ws} | {flag} | {action} |

### Portfolio GHCP Metrics (from {date} report)
| Metric | Portfolio Total |
|---|---|
| Total GHCP Seats | {N} |
| Total Seat Opportunity | {N} |
| Avg Attach Rate | {%} |
| Total Whitespace | {N} |

### Data Freshness
| Account | Tier | Tr | Email | Teams | MSX |
|---|---|---|---|---|---|
| {Account} | {tier} | {tr} | {date/—} | {date/—} | {date/—} |

### Quick Actions
- `/check-comms` — Check email/Teams health for flagged accounts
- `/review-milestones` — MSX milestone health audit
- `/plan-week` — Build this week's action plan
- `/analyze-account {name}` — Deep single-account analysis
- `/extract-ghcp-seats` — Refresh GHCP seat data from MSXI
- `/enrich-account {name}` — Build out account data files
```

## Input

None required — reads local files automatically.
