---
description: "Monday weekly review — vault-first data resolution, role-aware pipeline hygiene, milestone health, governance prep, and handoff readiness."
---

# Monday Weekly Review

Run my weekly review based on my MCAPS role. This is my governance-prep and pipeline-cleanup session.

## Data Resolution (Vault-First)

**Before running any skill chain, assemble context from the vault first.** This reduces API calls and provides richer context.

### Step 0 — Vault Sweep

1. **Read vault** — `oil:get_vault_context` to confirm vault is available, then sweep `Customers/` for all accounts with flags, unanswered threads, or stale data.
2. **Freshness check** — For each customer note, check `last_validated` in frontmatter:
   - If within the current work week (Monday–Friday) → treat as **current**, use directly.
   - If older → refresh via `workiq:ask_work_iq` using scoped queries, then merge via `oil:patch_note` and update `last_validated`:

   **Query 1 — Recent activity since last validation:**
   > "Summarize email threads, Teams messages, and meetings with {customer name} from {last_validated date} to today. Highlight decisions, asks, or commitments."

   **Query 2 — Upcoming commitments this week:**
   > "List meetings scheduled this week ({Monday date} to {Friday date}) involving {customer name}. Include date, attendees, and agenda if available."
3. **CRM scoped** — Only after vault context is assembled, query `msx-crm` for live state using vault-provided IDs. Never run unscoped CRM discovery.
   - `list_opportunities({ customerKeyword: "<customer>", format: "full", includeDealTeam: true })` → current pipeline state with Stage (`msp_activesalesstage`) and Estimated Close Date (`msp_estcompletiondate`, fallback `estimatedclosedate`).
   - If customer-keyword lookup is empty but milestones are present, re-query with `list_opportunities({ opportunityIds: [...] })`.
   - `find_milestones_needing_tasks({ customerKeywords: ["<customers>"] })` → milestone hygiene.
   - Surface any risks: overdue milestones, milestones without tasks, stale opportunities.
4. **Write-back** — Persist any fresh CRM/WorkIQ findings to the vault so next query hits vault-first.

## Steps

1. **Identify role** — first read `Reference/MyRoleDescriptions.md` from the Obsidian vault (`oil:search_vault` for "My Role"). If found, use that. If vault is unavailable, fall back to `crm_whoami`. Skip if already known this session.
2. **Run vault sweep** (Step 0 above) — assemble current-week context across all tracked accounts.
3. **Run role-specific review** (execute the appropriate chain below):

### Specialist weekly
Chain: **pipeline-hygiene-triage** → **handoff-readiness-validation** → **risk-surfacing**
- Pipeline cleanup: stale opps, missing fields, close-date slippage, forecast exceptions.
- Handoff check: any Stage 3 deals with customer agreement that should transfer to CSU?
- Risk radar: silent stakeholders, relationship decay, looming threats across active opps.

### Solution Engineer weekly
Chain: **task-hygiene-flow** → **execution-monitoring** → **unified-constraint-check**
- Task sweep: all task records checked for owner, status, due date, blocker notes.
- Execution audit: committed architecture decisions vs. live dependency state.
- Unified logistics: dispatch readiness, accreditation, catalog alignment for Unified items.

### Cloud Solution Architect weekly
Chain: **execution-monitoring** → **milestone-health-review** → **architecture-feasibility-check**
- Execution sweep: constraint breaches, unresolved blockers, owner-motion mismatches.
- Milestone health: date drift, overdue completions, stalled items across committed milestones.
- Feasibility pulse: any proofs concluding this week that need architecture sign-off?

### CSAM weekly
Chain: **milestone-health-review** → **risk-surfacing** → **commit-gate-enforcement**
- Milestone health: customer-safe status bullets + internal remediation queue.
- Risk review: flag relationship decay, silent stakeholders, looming threats.
- Commit gates: any milestones the team wants to flip to Committed? Check readiness.

4. **Present results** in two sections:

**For governance** (shareable with customer/leadership):
- Status bullets per opportunity or milestone — on track / at risk / blocked.
- Key wins this week.

**For me** (internal action list):
- Numbered actions, highest priority first.
- Each action includes the prompt to run if I want to drill deeper.
- Flag anything that needs a teammate's input (tag the role).

5. **Write-back to vault** — Save review findings to vault customer notes via `oil:patch_note` (Agent Insights section). Update `last_validated` on all touched accounts.

6. **Suggest next steps**:
   - If any deal needs deeper triage: *"Want me to run a full deal triage on [opp name]?"*
   - Offer to save a formatted digest: *"Run /Fri-Weekly-Digest on Friday to capture the full week."*
