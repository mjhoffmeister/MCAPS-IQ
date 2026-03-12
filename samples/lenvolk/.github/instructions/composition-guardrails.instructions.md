---
description: >-
  Composition quality guardrails and feedback lessons for all outbound text (emails, Teams messages,
  strategic communications). MUST be read by StratTechSalesOrch before composing any outbound message.
  Contains anti-pattern registry, Composition Scoring Matrix, and lessons learned from past composition
  incidents. Loaded on: composition, draft, outbound message, email authoring, Teams message authoring,
  strategic communication, exec briefing.
applyTo: .github/agents/strat-tech-sales-orch.agent.md
---

# Composition Guardrails

This file is the **single source of truth** for composition quality rules and feedback lessons. StratTechSalesOrch MUST read this file before composing any outbound text — emails, Teams messages, exec briefings, or any customer/partner-facing communication.

## Composition Scoring Matrix

Every draft MUST be scored against these 6 criteria before output. Each criterion is **binary Pass/Fail** — there is no "Marginal", "Partial", or "Borderline" score. **If you're unsure whether a criterion passes, it Fails.** Criteria 1-2 (Factual Accuracy, Implication Safety) are **Critical** — a Fail on either is an **auto-reject** that requires revision. Any Fail on any criterion blocks output — revise and re-score.

| # | Criterion | Pass Condition | Fail Example |
|---|---|---|---|
| 1 | **Factual Accuracy** | Every claim is backed by data in `.docs/`, CRM, or verified sources. No assumptions stated as facts. | Saying "you've been nominated" when no nomination process exists |
| 2 | **Implication Safety** | No word or phrase implies a commitment, status, or action that hasn't actually occurred. Scrutinize verbs like "nominated", "selected", "approved", "confirmed", "awarded". | Using "Nomination" when the customer expressed interest but no formal process was followed |
| 3 | **Persona Fit** | Tone, vocabulary, and framing match the target audience (exec, architect, finance, SSP, internal). | Sending technical jargon to an exec, or casual tone in a formal introduction |
| 4 | **CTA Clarity** | The call-to-action is specific, achievable, and doesn't presuppose the recipient's answer. | "Please confirm your nomination" (presupposes they were nominated) |
| 5 | **Feedback Lessons** | Draft does not violate ANY anti-pattern in the Lessons Registry below. Every lesson is checked. | Repeating a known anti-pattern from a past incident |
| 6 | **Recipient Alignment** | The message is addressed to the right people, with correct roles and context for each recipient. | Sending an internal-only strategy note to external recipients |

## Audience Classification Rules

Every composition has an **audience type** that gates which content categories are permissible. Determine the audience in Step 2 of the composition workflow and apply these rules throughout drafting and scoring.

| Content Category | Internal (Microsoft/GitHub) | Customer-Facing (External) | Partner-Facing |
|---|---|---|---|
| Pipeline data (attach rates, whitespace, ACR, seats) | ✅ Yes | ❌ Never | ❌ Never |
| CRM milestone status, opportunity details | ✅ Yes | ❌ Never | ❌ Never |
| Competitive intelligence (Cursor, Claude, competitor names) | ✅ Yes (with care) | ❌ Never | ⚠️ Only if partner is engaged in compete play |
| Internal Teams/email thread intelligence | ✅ Yes (attribute source) | ❌ Never | ❌ Never |
| Customer's own statements (from meetings, emails) | ✅ Yes | ✅ Only what they said to us directly | ⚠️ Only if relevant and non-confidential |
| Published research / public data (GitHub reports, etc.) | ✅ Yes | ✅ Yes (attribute source) | ✅ Yes |
| Account notes from .docs/ state.md, insights.md | ✅ Yes | ❌ Never expose raw notes | ❌ Never expose raw notes |
| Pricing, commercial terms | ⚠️ Internal strategy only | ❌ Never (sales team handles) | ❌ Never |
| Sourcing/procurement call details | ✅ Yes | ❌ Never | ❌ Never |

**Mixed-audience rule**: When ANY external recipient (customer or partner) appears on TO, CC, or BCC, the **entire email/message** must comply with the **most restrictive** audience's rules — typically customer-facing. Internal recipients who need strategic context should receive it via a **separate internal-only thread**. Never embed internal-only data in a mixed-audience message "for the CC'd team's benefit."

**Sparse-data rule**: When `.docs/` data is thin or missing for an account, the composition MUST: (1) explicitly state what is unknown rather than filling gaps with assumptions, (2) use only verified data points, (3) frame proposed actions as gap-filling steps. An honest "What We Don't Know" section is better than confident-sounding vagueness. Criterion 1 (Factual Accuracy) Fails if ANY claim cannot be traced to a verified source.

**Scoring integration**: Criterion 2 (Implication Safety) now includes audience-content validation. If a draft contains content from a ❌ category for the target audience, it automatically Fails criterion 2.

## Anti-Pattern Lessons Registry

Each lesson captures a real incident. StratTechSalesOrch checks every draft against ALL lessons before output.

### CG-001: Innovation Hub "Nomination" Incident

- **Date**: March 4, 2026
- **Anti-pattern**: Using the word "Nomination" (or "Selected", "Approved", "Shortlisted") in email subjects or body when no formal nomination/selection process was completed and recorded.
- **What happened**: Emails sent to 6 accounts with subject containing "Innovation Hub Nomination" — recipients (Ryan Sullivan, Jon Baez, Andrea Schultz) understood this as a formal nomination when it was actually an interest expression or outreach. Caused confusion and required damage control.
- **Correct pattern**: Use neutral language that accurately describes the status: "Innovation Hub — Interest & Next Steps", "Innovation Hub — Exploring Fit", "Innovation Hub — Program Overview". Only use "Nomination" if a formal nomination form was submitted AND the submission is recorded in the account's `state.md`.
- **Verification rule**: Before using status-implying words (Nominated, Selected, Approved, Confirmed, Awarded, Shortlisted, Accepted, Enrolled), check the account's `state.md` for evidence that the implied action actually occurred. If no evidence → use neutral alternative.
- **Scope**: All outbound text — emails, Teams messages, exec briefings, any recipient-facing content.

<!-- Add new lessons below this line using the format:
### CG-XXX: [Incident Name]
- **Date**: [date]
- **Anti-pattern**: [what to avoid]
- **What happened**: [incident description]
- **Correct pattern**: [what to do instead]
- **Verification rule**: [how to check before composing]
- **Scope**: [which channels/audiences]
-->

## Self-Brainstorming for Compositions

When composing any outbound text, StratTechSalesOrch MUST run the Self-Brainstorming Protocol (from its agent file) adapted for composition:

1. **Draft v1** — Write the initial composition based on context and intent.
2. **Score v1** — Run the Composition Scoring Matrix (6 criteria above). Each is binary Pass/Fail — no "Marginal". If unsure, it's a Fail. Log any Fail results.
3. **Draft v2** — Revise to fix all Fails. If the original framing caused the Fail, restructure — don't just patch words. A "borderline" feeling means Fail — revise.
4. **Score v2** — Re-run the matrix. If all Pass → output. If any Fail → draft v3.
5. **Maximum 3 iterations** — If v3 still has Fails, output with explicit `⚠️ Warning` flags on each failing criterion.

### Deliberation Output

Every composition MUST include a brief deliberation note (for the orchestrator's visibility):

```
📝 Composition Deliberation:
- Drafts: [N] iterations
- Scoring: [list of criteria that failed on v1 and were fixed]
- Lessons checked: [CG-001, CG-XXX, ...]
- Final status: All Pass / Warning on [criterion]
```

## Storage Routing for Compositions

Composed text is stored based on its context:

| Context | Storage Location |
|---|---|
| Email draft (for a tracked account) | `.docs/_data/<Account>/email-threads.md` — append as new entry |
| Teams message (for a tracked account) | `.docs/_data/<Account>/teams-threads.md` or `chats/` subfolder |
| Standalone strategic communication | `.docs/_data/<Account>/compositions/` subfolder |
| Portfolio-wide or generic (no single account) | `.docs/TMG/` folder |
| Ephemeral (one-time, not worth storing) | Same path as above, marked `[ephemeral — delete after send]` |
