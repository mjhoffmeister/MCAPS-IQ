---
description: "Generate this week's prioritized action plan from cached account data, live MSX milestones, and M365 signals. Outputs WeeklyActionPlan.md."
---

# Plan Week

Build or refresh `WeeklyActionPlan.md` — your prioritized action list for the week. Combines `.docs/` cached data with live signals from MSX and M365, ordered by tranche (A first, then B, then C).

## Interaction

**Ask the user:** "Which accounts? Enter name(s), TPID(s), tranche ('A', 'B', 'C'), or 'all'."

## Workflow

### Step 1 — Resolve Scope (Index-First)

- Read `.docs/_index.md` → full dashboard with freshness dates, flags, next actions.
- If "all": use every account. If tranche: filter by Tr column. If specific names/TPIDs: match from index.
- Note which accounts have stale data (Email/Teams/MSX columns > 3 days old or "—").

### Step 2 — Read Cached Data Per Account

For each in-scope account, read available `.docs/_data/<Account>/` files (skip missing silently):
- `state.md` → flags, milestones, billing.
- `email-threads.md` → unanswered flags.
- `teams-threads.md` → stale channel flags.
- `insights.md` → open items.

### Step 3 — Live MSX Signal (via CRMOperator)

Delegate to **CRMOperator**:
- Use `find_milestones_needing_tasks` with in-scope account keywords.
- Surface: overdue milestones, milestones without tasks, uncommitted milestones approaching dates.

### Step 4 — Live M365 Signal (for stale accounts only)

For accounts where cache is stale (>3 days) or missing, delegate in **parallel**:

**EmailTracker** — per stale account:
- "Find most recent email thread for {account}. Use ALL contacts from contacts.md: {contacts list}. Flag unanswered threads (>5 business days). Execute fully autonomously."

**CalendarTracker** — per stale account:
- "Find most recent meeting involving {account}. Report date and whether follow-up exists. Execute fully autonomously."

**Going-dark definition:** No M365 touchpoint in >10 business days across any channel.

Skip for accounts with fresh cache (<3 days).

### Step 5 — Assemble WeeklyActionPlan.md

Write to `.docs/WeeklyActionPlan.md`:

```markdown
# Weekly Action Plan — {YYYY-MM-DD}

*Generated: {timestamp} | Scope: {tranche or accounts} | Accounts: {N}*

## 🔴 Immediate Actions (This Week)

| # | Account | Tier | Tr | Action | Signal | Urgency |
|---|---|---|---|---|---|---|
| 1 | {Account} | {tier} | {tr} | {specific action} | {source} | {overdue/unanswered/going-dark} |

## 🟡 Follow-Up Queue

| Account | Item | Last Touch | Days Since |
|---|---|---|---|
| {Account} | {thread or milestone} | {date} | {N} |

## 🟢 On Track (No Action Needed)

| Account | Status | Last Touch |
|---|---|---|
| {Account} | {brief status} | {date} |

## Data Freshness

| Account | Email | Teams | Seats | MSX |
|---|---|---|---|---|
| {Account} | {date/—} | {date/—} | {date/—} | {today/—} |

## Blockers

- {MCP failures, missing data, rate limits}
```

### Step 6 — Report

Present Immediate Actions and Follow-Up Queue. Offer to drill into any account.

## Input

{user provides scope: name(s), TPID(s), tranche, or "all"}
