---
description: "Full single-account analysis: email, Teams, MSX milestones, GHCP seats, communication gaps, risk signals, and project status. Combines all data sources into one actionable report."
---

# Analyze Account

Comprehensive single-account analysis combining `.docs/` cached data, live MSX milestones, M365 communications, and GHCP seat metrics. Produces an actionable status report with risks, gaps, and next actions.

## Interaction

**Ask the user:** "Which account? Enter a name or TPID."

## Workflow

### Step 1 — Resolve Account (Index-First Protocol)

1. Read `.docs/_index.md` → find account row for seats, attach%, whitespace, freshness dates, flags, next action.
2. Read `.docs/_data/<Account>/state.md` → identity, milestones, flags, billing, tranche rationale.
3. Read `.docs/_data/<Account>/contacts.md` → full contact roster, email domains, v-team roles.
4. Read `.docs/_data/<Account>/email-threads.md` → email thread catalog.
5. Read `.docs/_data/<Account>/teams-threads.md` → Teams channel/chat catalog.
6. Read `.docs/_data/<Account>/insights.md` → agent observations, strategic notes, prior findings.

### Step 2 — Live Data Collection (parallel subagent delegation)

Delegate to **all applicable subagents in parallel**:

**EmailTracker** — email communication health:
- "Search for all recent email threads with known contacts from contacts.md for {account}. Use ALL contacts: {contacts list}. Customer domains: {domains from contacts.md}. Flag unanswered threads (>5 business days), going-dark signals (>10 days no touchpoint). Account: {account}, TPID: {TPID}, Tranche: {tranche}. Execute fully autonomously."

**TeamsTracker** — Teams communication health:
- "Search for recent Teams messages in known channels/chats from teams-threads.md for {account}. Flag unanswered threads, stale channels. Execute fully autonomously."

**CRMOperator** — MSX milestone + opportunity health:
- "Check milestone health AND opportunity status for {account} (TPID: {TPID}). Use `find_milestones_needing_tasks` and `get_milestone_activities` for active milestones. Use `list_opportunities` or `crm_query` to verify opportunity stage/status matches local notes. Surface: overdue milestones, milestones without tasks, uncommitted milestones, status mismatches, discrepancies between local notes and MSX state. Execute fully autonomously."

**GHCPAnalyst** — GHCP seat analysis (if seat data exists):
- "Analyze GHCP seat data for {account}. Read latest weekly report from .docs/Weekly/. Report seat whitespace, attach rate, week-over-week movement. Execute fully autonomously."

**CalendarTracker** — recent meeting activity:
- "Find meetings involving {account} or {contacts} in the last 14 days. Report key decisions, open questions, and next meeting if scheduled. Account: {account}, TPID: {TPID}. Execute fully autonomously."

**MicrosoftResearcher** — role coverage gaps (if contacts.md shows open roles):
- "Look up the current CSAM, CSA, and AM assigned to {account} (TPID: {TPID}). Check if there are coverage gaps vs. the contacts.md roster. Execute fully autonomously."

### Step 3 — Cross-Validate Recency

After subagent results return:
- Compare EmailTracker's "most recent email" date against the thread catalog in email-threads.md.
- If email-threads.md documents a more recent thread, re-delegate to EmailTracker with that thread's exact subject + sender + recipients.
- Compare CRM state against state.md — flag any discrepancies (opportunity stage changed, milestone status mismatch).
- Mark each data point's source: `(Local)`, `(M365)`, `(MSX)`.

### Step 4 — Synthesize & Report

```markdown
## Account Analysis — {Account Name}

*Generated: {timestamp} | TPID: {TPID} | Tier: {Strategic/Major} | Tranche: {tranche}*

### Communication Health
| Channel | Last Activity | Status | Details |
|---|---|---|---|
| Email | {date} | {OK / Unanswered / Going Dark} | {thread subject} |
| Teams | {date} | {OK / Stale / No Channels} | {channel/chat name} |
| Meetings | {date} | {Active / None Scheduled} | {meeting subject} |

### Unanswered Threads
| # | Channel | Subject | Waiting Since | Days |
|---|---|---|---|---|
| 1 | Email | {subject} | {date} | {N} |

### MSX Status
| Item | Status | Detail | Source |
|---|---|---|---|
| Opportunity | {stage} | {name} | MSX |
| Milestone | {On Track / Overdue / No Tasks} | {name — date} | MSX |

### GHCP Seats
| Metric | Value |
|---|---|
| Current Seats | {N} |
| Seat Opportunity | {N} |
| Attach Rate | {%} |
| WoW Change | {+/- N} |

### Risk Summary
- 🔴 {critical risks}
- 🟡 {watch items}
- 🟢 {healthy signals}

### Recommended Actions
1. {specific next action with owner}
2. {specific next action}
```

### Step 5 — Update Account Profile

- Append key findings to `.docs/_data/<Account>/insights.md` with today's date.
- If CRM state diverged from local notes, update `.docs/_data/<Account>/state.md`.
- If findings include measurable impact (caught overdue milestones, going-dark risk, seat churn): append Connect Hook to insights.md.

## Input

{user provides account name or TPID}
