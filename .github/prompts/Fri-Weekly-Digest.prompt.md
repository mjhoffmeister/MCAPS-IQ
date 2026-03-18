---
description: "Friday weekly digest — vault-first retrospective summarizing meetings, action items, project updates, CRM health, and M365 activity for tracked customers. Saves to vault."
---

# Friday Weekly Digest

Generate a weekly digest by aggregating vault activity, M365 signals, and CRM state across tracked customers. Output is both human-readable and saved to the vault for retrieval.

## Data Resolution (Vault-First)

**The vault is the primary data source.** Read vault first, then fill gaps from WorkIQ and CRM.

### Step 0 — Vault Context Assembly

1. **Read vault** — `oil:get_vault_context` to get the active customer roster and vault health.
2. **Sweep customer notes** — For each customer in the roster, check `last_validated`:
   - If within the current work week → vault data is current, use directly for the digest.
   - If older → flag for WorkIQ refresh in Step 2.
3. **Read existing weekly note** — Check `Weekly/` for an existing digest this week to avoid overwriting.

## Workflow

### Step 1 — Scope the Week

Determine the target week (default: current week, Mon–Fri).

### Step 2 — Gather Vault Data + Fill Gaps

- Read all `Customers/*/` notes → extract flags, unanswered threads, seat snapshots, agent insights from the current week.
- For customers where `last_validated` is stale:
  - Query `workiq:ask_work_iq` for Teams messages, Outlook emails, and calendar events since `last_validated`.
  - Merge findings into vault via `oil:patch_note`. Update `last_validated`.
- Read `Weekly/` for any existing meeting notes or project updates this week.

### Step 3 — M365 Activity via WorkIQ

Use `ask_work_iq` to surface meetings, emails, and chats that may not have corresponding vault notes:

**Query 1 — Meeting activity:**
> "List all meetings I attended this week ({Monday date} to {Friday date}). For each, provide the date, attendees, customer/project if identifiable, and a one-line summary."

**Query 2 — Email/chat threads with tracked customers:**
> "Summarize email threads and Teams messages with {customer roster from vault} from {Monday} to {Friday}. Highlight any decisions, asks, or commitments made."

**What to capture:**
- Meetings that happened but don't have a vault meeting note → flag as **uncaptured meetings** in the digest.
- Email/chat decisions or commitments that should be tracked as action items.
- Customer engagement frequency — which tracked customers had zero M365 touchpoints this week (engagement gap signal).

### Step 4 — CRM Health Check (Scoped via Vault)

For each tracked customer touched this week, use vault-provided IDs (`tpid`, `oppid`, `milestoneid`) to scope CRM queries:
- `list_opportunities({ customerKeyword: "<customer>", format: "full", includeDealTeam: true })` → current pipeline state with Stage (`msp_activesalesstage`) and Estimated Close Date (`msp_estcompletiondate`, fallback `estimatedclosedate`).
- If customer-keyword lookup is empty but milestones are present, re-query with `list_opportunities({ opportunityIds: [...] })`.
- `find_milestones_needing_tasks({ customerKeywords: ["<customers>"] })` → milestone hygiene.
- Surface any risks: overdue milestones, milestones without tasks, stale opportunities.
- **Do not run unscoped CRM discovery** — vault provides the IDs.

### Step 5 — Write-Back

1. **Update customer notes** — Merge any new findings (WorkIQ, CRM) back to vault customer notes via `oil:patch_note`.
2. **Write digest** — Save to `Weekly/<YYYY>-W<XX>.md` via `oil:write_note`.

## Frontmatter Schema

```yaml
tags:
  - weekly-digest
date: YYYY-MM-DD          # Friday of the week
week: YYYY-WXX
customers_touched: []     # Array of customer names
```

## Output Format

```markdown
---
tags:
  - weekly-digest
date: {YYYY-MM-DD}
week: {YYYY-WXX}
customers_touched:
  - {Customer A}
  - {Customer B}
---

# Weekly Digest — Week of {Monday date}

## Summary

- **{N}** meetings this week ({M} with vault notes, {K} uncaptured)
- **{N}** action items created
- **{N}** tasks completed
- **Customers touched:** [[{Customer A}]], [[{Customer B}]]
- **Customers with no touchpoints:** [[{Customer C}]]

## Meetings

| Date | Meeting | Customer | Source | Summary |
|---|---|---|---|---|
| {date} | [[{meeting title}]] | [[{customer}]] | Vault | {summary} |
| {date} | {meeting title} | {customer} | WorkIQ | {summary — no vault note} |

## Uncaptured Meetings

Meetings found via WorkIQ with no corresponding vault note:
- **{date}**: {meeting title} with {attendees} — {summary from transcript}

## M365 Highlights

Key decisions or commitments surfaced from email and chat threads this week:
- {Decision/commitment from email} — {customer/project}, {date}
- {Open thread requiring follow-up} — {customer/project}

## Action Items Created

- [ ] {action} ([[{owner}]]) — from [[{meeting}]]

## Completed This Week

- [x] {completed task} — from [[{source}]]

## Customer Health

### [[{Customer A}]]

- **Pipeline:** {opportunity count}, {total pipeline value}
- **Milestones:** {active count}, {at risk count}
- **Risks:** {any overdue milestones, missing tasks, stale opportunities}

### [[{Customer B}]]

- ...

## Active Projects

### [[{Project 1}]]

- {what happened this week}

## Carry-Forward / Blockers

- {item that needs attention next week}

## Next Week's Focus

- {priority 1}
- {priority 2}
```

## Input

{user can optionally specify which week, defaults to current week}
