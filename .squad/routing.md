# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Experience orchestration, bundle assembly, cross-agent synthesis | Danny | "Package this for the seller", "assemble the deliverable", multi-agent coordination |
| Data retrieval, signal normalization, cross-source correlation | Livingston | CRM queries, PBI data pulls, M365 signal extraction, TPID resolution |
| Win strategy, competitive positioning, sales plays | Rusty | "How do we win this?", positioning narratives, program design, sales plays |
| Demos, decks, scripts, one-pagers, workshop kits | Nagel | "Build a POV deck", demo scripts, workshop materials, customer-facing artifacts |
| Red-teaming, objection handling, readiness coaching | Saul | "Stress-test this plan", objection drills, "what's the worst question?" |
| Briefs, follow-ups, recaps, exec messages | Frank | Meeting recaps, stakeholder emails, executive briefs, action summaries |
| Account prioritization, landscape, portfolio tiering | Reuben | "Where should I focus?", whitespace analysis, account ranking, resource allocation |
| MCEM exit criteria, stage validation, commit gates | Benedict | Stage progression checks, pipeline hygiene, BPF evidence audits, commit decisions |
| Azure pricing, cost modeling, TCO, ROI | Turk | Pricing spreadsheets, reserved vs. PAYG analysis, consumption forecasting |
| Power BI analytics, DAX queries, consumption deep dives | Basher | ACR reports, GHCP seats, SE productivity, service breakdowns, PBI semantic models |
| Connect hooks, nominations, impact evidence, win posts | Linus | Evidence capture, award nominations, success stories, impact attribution |
| Partner motions, co-sell, SI/ISV coordination | Virgil | Partner delivery assessment, co-sell registration, partner capability matching |
| HoK readiness, skilling, seller enablement, sales coaching | Yen | HoK legal checks, skilling plans, enablement frameworks, readiness assessment |
| Session logging | Scribe | Automatic — never needs routing |
| Work monitoring, backlog, issue tracking | Ralph | "What's on the board?", keep-alive, issue triage |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Lead |
| `squad:{name}` | Pick up issue and complete the work | Named member |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
