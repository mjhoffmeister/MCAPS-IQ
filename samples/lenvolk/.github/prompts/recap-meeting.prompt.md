---
description: "Structure raw meeting notes, transcripts, or screenshots into a formatted meeting note with action items. Updates .docs/ account files."
---

# Recap Meeting

Structure raw meeting input (transcript, pasted notes, screenshot text, or Copilot recap) into a complete meeting note with frontmatter, action items, and key decisions. Updates related `.docs/` account files.

## Interaction

User provides raw meeting notes, transcript, or screenshot text.

## Workflow

### Step 1 — Resolve References

- Match any mentioned customer to a `.docs/_data/` folder.
- Read `.docs/_data/<Account>/contacts.md` → identify known attendees.
- Read `.docs/_index.md` → account context (tier, tranche, flags).
- Read `.docs/_data/<Account>/state.md` for tranche classification.

### Step 2 — Extract & Structure

From raw input, extract:
- **Date** → YYYY-MM-DD
- **Customer** → match to `_data/` folder name
- **Summary** → one sentence capturing the core outcome
- **Attendees** → linked to contacts.md entries
- **Action items** → checkboxes with owner attribution
- **Key decisions** → bullet list with rationale
- **Technologies** → Azure services, frameworks, tools mentioned

### Step 3 — Write Meeting Note

Save to `.docs/_data/<Account>/<YYYY-MM-DD> - <Meeting Title>.md`.

### Step 4 — Enrich with M365 Context (parallel subagents)

If the meeting involved a tracked customer, delegate in parallel:

**CalendarTracker** — transcript/recap:
- "Find the transcript or Copilot recap for the meeting on {date} with {attendees}. Extract action items or decisions not in the raw notes. Execute fully autonomously."

**EmailTracker** — related email context:
- "Find email threads about {topic/customer} from the past 7 days that provide context for this meeting. Execute fully autonomously."

**Enrich the note with:**
- Action items from transcript missing from raw notes.
- Context for decisions referencing prior email/chat threads.
- Commitments that contradict or update prior agreements.

### Step 5 — Update Account Files

1. **insights.md**: Append brief entry with meeting date and key takeaways.
2. **contacts.md**: List any new attendees not in contacts.md. Add them under the appropriate section (Customer Contacts or Microsoft / GitHub Team).
3. **state.md**: If action items affect milestones, note the update.

## Output Format

```markdown
---
tags: [meeting]
date: YYYY-MM-DD
customer: {customer folder name}
summary: {one sentence}
status: open
action_owners: [{names}]
---

# {Meeting Title}

**Date:** {YYYY-MM-DD}
**Customer:** {customer}

## Attendees

- {Name} — {role/company}

## Notes

**{Topic 1}**
- Key point
- *Technologies:* {services, frameworks}

## Action Items

- [ ] {Action} ({Owner})

## Key Decisions

- {Decision}: {rationale}
```

### New Contacts Detected

```
> **New contacts to add:**
> - {Name} — {Title}, {Company} → {section}
```

## Input

{user provides raw notes, transcript, or screenshot text}
