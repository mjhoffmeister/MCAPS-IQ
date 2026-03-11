---
description: "Pre-meeting intelligence briefing: context from .docs/, recent M365 activity, CRM status, open action items, and suggested agenda."
---

# Prep Meeting

Generate a pre-meeting intelligence briefing for an upcoming meeting. Pulls context from `.docs/`, live M365 signals, and CRM to surface relevant background, open items, and attendee context.

## Interaction

**Ask the user:** "Which meeting? Enter the meeting title, customer name, or date."

## Workflow

### Step 1 — Resolve Account & Context

From meeting title or user input, determine the customer.
- Read `.docs/_index.md` → find account, note flags and next action.
- Read `.docs/_data/<Account>/state.md` → identity, milestones, flags.
- Read `.docs/_data/<Account>/contacts.md` → contact roster, email domains.
- Read `.docs/_data/<Account>/email-threads.md` → email thread catalog.
- Read `.docs/_data/<Account>/teams-threads.md` → Teams channels/chats.
- Read `.docs/_data/<Account>/insights.md` → prior findings, strategic notes.

### Step 2 — Live M365 Context (parallel subagents)

**CalendarTracker** — recent and upcoming meetings:
- "Find meetings with {customer} or {attendees from contacts.md} in the last 14 days and next 7 days. Report key discussion points, decisions, and open questions. Execute fully autonomously."

**EmailTracker** — recent email threads:
- "Find recent email threads involving contacts from contacts.md for {account}. Report decisions, asks, or blockers from the last 14 days. Execute fully autonomously."

**TeamsTracker** — recent Teams messages:
- "Find recent Teams messages in channels/chats from teams-threads.md for {account}. Report decisions, status updates, or unresolved threads. Execute fully autonomously."

**Surface in the briefing:**
- Decisions or commitments made outside formal meetings (chat/email)
- Open questions or unresolved threads for the agenda
- Recent meeting topics (to avoid rehashing)
- Stakeholder changes or new participants

### Step 3 — CRM Validation (via CRMOperator)

Delegate to **CRMOperator**:
- "Check opportunity status and milestone health for {account} (TPID: {TPID}). Report current CRM state. Execute fully autonomously."

### Step 4 — Write Briefing

Save to `.docs/_data/<Account>/insights.md` under a dated meeting prep section.

## Output Format

```markdown
# Meeting Prep — {Meeting Title}

**Date:** {YYYY-MM-DD}
**Customer:** {customer name}
**TPID:** {TPID} | **Tier:** {tier} | **Tranche:** {tranche}

## Pre-Meeting Context

> **Account Status:** {brief from state.md + flags from _index.md}
> **Last Meeting:** {date} — {summary}
> **MSX State:** {opportunity stage, milestone status from CRM}

## Recent Activity (Last 14 Days)

- **Email:** {key threads, decisions, unanswered items}
- **Teams:** {notable messages, decisions}
- **Meetings:** {recent meeting outcomes, carry-forward items}

## Carried-Forward Action Items

- [ ] {open action from previous meeting} ({Owner})
- [ ] {open action from email/chat commitment}

## Suggested Agenda

1. Review open action items
2. {topic from milestone/project status}
3. {topic from open threads}

## Attendees

- {Name} — {role/company}

## Notes

-

## Action Items

- [ ]
```

## Input

{user provides meeting title, customer, or date}
