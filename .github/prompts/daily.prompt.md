---
description: "Role-aware daily routine. Runs your morning hygiene checks, surfaces what needs attention today, and suggests your top 3 actions."
---

# Daily

Run my morning routine based on my MCAPS role. Check what needs attention, flag risks, and give me a prioritized short list of actions for today.

## Steps

1. **Identify role** — first read `Reference/MyRoleDescriptions.md` from the Obsidian vault (`oil:search_vault` for "My Role"). If found, use that. If vault is unavailable, fall back to `crm_whoami`. Skip if already known this session.
2. **Run role-specific checks** (execute the appropriate chain below):

### Specialist daily
- Run **pipeline-hygiene-triage**: flag stale opps, missing fields, close-date slippage.
- Run **risk-surfacing** on any Stage 2-3 opportunities with activity in the last 7 days.
- Output: a prioritized punch list — what needs my attention today, ordered by urgency.

### Solution Engineer daily
- Run **task-hygiene-flow**: check task records for stale, orphaned, or ownerless items.
- Run **execution-monitoring**: scan committed milestones for constraint breaches or blockers.
- Run **unified-constraint-check**: flag dispatch/eligibility gaps.
- Output: a categorized list — "Fix now", "Follow up", "On track".

### Cloud Solution Architect daily
- Run **execution-monitoring**: audit architecture decisions against dependency state.
- Check committed milestones for date drift via **milestone-health-review** (scoped to my milestones only).
- Output: a risk-ranked list of items needing intervention.

### CSAM daily
- Run **milestone-health-review**: scan committed milestones for drift, overdue items, stalled work.
- Run **risk-surfacing**: flag relationship decay or silent stakeholders.
- Output: "Customer-safe bullets" (shareable) + "Internal actions" (my to-do list).

3. **Present results** as a short, scannable summary:
   - **Top 3 actions** — numbered, with the actual prompt to run if I want to drill deeper.
   - **All clear items** — one line: "N milestones/opps on track, no action needed."
   - **Risks** — any early warnings, one sentence each.

## Tone

Morning briefing energy. Quick, direct, actionable. If everything looks good, say so and suggest something proactive instead.
