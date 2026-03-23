---
description: "Weekly review with day-aware mode selector. Monday: vault-first governance prep, role-aware pipeline hygiene, milestone health, handoff readiness with vault write-back. Friday: retrospective digest summarizing meetings, action items, CRM health, M365 activity, saved to vault. Triggers: weekly review, governance prep, weekly digest, Mon-Weekly, Fri-Weekly-Digest, end of week, start of week, weekly status, weekly check."
---

# Weekly Review

Run your weekly review — automatically selects **Monday mode** (governance prep) or **Friday mode** (retrospective digest) based on today's day of week.

## Mode Selector — Auto-Detect

| Day | Mode | What You Get |
|---|---|---|
| **Monday** | Governance Prep | Vault sweep → role-specific skill chains → shareable status + internal action list → vault write-back |
| **Friday** | Weekly Digest | Meeting aggregation → M365 gap fill → CRM health → formatted digest saved to `Weekly/` |
| **Other days** | User choice | "Monday (governance prep) or Friday (digest)?" — ask and wait |

**Override**: If the user says "governance", "prep", "pipeline review" → Monday mode regardless of day. If they say "digest", "retrospective", "wrap up", "end of week" → Friday mode.

---

## Shared Step 0 — Vault Sweep

Runs in both modes.

1. **Role**: Read vault `Reference/MyRoleDescriptions.md` (`oil:search_vault` for "My Role") → identify name and role. Fall back to `crm_whoami`. Skip if known.
2. **Vault context**: `oil:get_vault_context` → confirm available, get customer roster.
3. **Freshness check** — For each customer note, check `last_validated` in frontmatter:
   - Within current work week → **current**, use directly
   - Older → **stale**, queue for refresh
4. **Stale refresh** — For stale accounts, use `ask_work_iq` with scoped queries:
   > "Summarize email threads, Teams messages, and meetings with {customer name} from {last_validated date} to today. Highlight decisions, asks, or commitments."
   Merge via `oil:patch_note`, update `last_validated`.
5. **CRM scoped** — Only after vault context, query `msx-crm` using vault-provided IDs. Never unscoped.
   - `list_opportunities({ customerKeyword: "<customer>", format: "full", includeDealTeam: true })` → pipeline state with Stage, Est Close, Deal Team.
   - `find_milestones_needing_tasks({ customerKeywords: ["<customers>"] })` → milestone hygiene.
6. **Write-back** — Persist fresh findings to vault.

---

## Monday Mode — Governance Prep

Heavy skill-chain execution. Produces governance-ready output + internal action list.

### Role-Specific Skill Chains

Execute the chain for the user's confirmed role:

| Role | Chain | Focus |
|---|---|---|
| **Specialist** | `pipeline-hygiene-triage` → `handoff-readiness-validation` → `risk-surfacing` | Pipeline cleanup, STU→CSU transfer readiness, deal risk |
| **SE** | `task-hygiene-flow` → `execution-monitoring` → `unified-constraint-check` | Task sweep, architecture guardrails, Unified dispatch |
| **CSA** | `execution-monitoring` → `milestone-health-review` → `architecture-feasibility-check` | Constraint breaches, milestone health, proof sign-off |
| **CSAM** | `milestone-health-review` → `risk-surfacing` → `commit-gate-enforcement` | Customer-safe status, risk flags, commit readiness |

### Output — Two Sections

**For governance** (shareable with customer/leadership):
- Status bullets per opportunity or milestone — on track / at risk / blocked
- Key wins this week

**For me** (internal action list):
- Numbered actions, highest priority first
- Each action includes the prompt to run for a deeper dive
- Flag anything needing a teammate's input (tag the role)

### Write-Back

Save findings to vault customer notes via `oil:patch_note` (Agent Insights section). Update `last_validated`.

### Follow-Up

- If any deal needs deeper triage: *"Want me to run a full deal triage on [opp name]?"*
- *"Run `/weekly` on Friday to capture the full week as a digest."*

---

## Friday Mode — Weekly Digest

Aggregation + retrospective. Produces a formatted digest saved to vault.

### Step 1 — Scope the Week

Target: current work week (Monday–Friday). Use Step 0's vault data.

### Step 2 — M365 Activity

Use `ask_work_iq` for meetings, emails, chats not captured in vault:

**Query 1 — Meetings:**
> "List all meetings I attended this week ({Monday} to {Friday}). For each: date, attendees, customer/project, one-line summary."

**Query 2 — Email/chat:**
> "Summarize email threads and Teams messages with {customer roster} from {Monday} to {Friday}. Highlight decisions, asks, commitments."

**Capture:**
- Meetings without vault notes → **uncaptured meetings**
- Email/chat decisions → **action items**
- Customers with zero M365 touchpoints → **engagement gap signal**

### Step 3 — Write Digest

Save to `Weekly/<YYYY>-W<XX>.md` via `oil:write_note`:

```markdown
---
tags: [weekly-digest]
date: {YYYY-MM-DD}
week: {YYYY-WXX}
customers_touched: [{Customer A}, {Customer B}]
---

# Weekly Digest — Week of {Monday date}

## Summary
- **{N}** meetings ({M} with vault notes, {K} uncaptured)
- **{N}** action items created
- **Customers touched:** [[{A}]], [[{B}]]
- **Customers with no touchpoints:** [[{C}]]

## Meetings
| Date | Meeting | Customer | Source | Summary |
|---|---|---|---|---|

## Uncaptured Meetings
{WorkIQ meetings with no vault note}

## M365 Highlights
{Decisions/commitments from email + chat}

## Customer Health
{Per-customer pipeline + milestone status from CRM}

## Carry-Forward
{Items needing attention next week}

## Next Week's Focus
{Top 2-3 priorities}
```

### Follow-Up

- *"Run `/weekly` on Monday for governance prep with fresh context."*
- *"Run `/account-review` for any flagged account?"*

---

## Rules

1. **Vault is the primary source** — sweep vault first, fill gaps from WorkIQ/CRM.
2. **Never run unscoped CRM discovery** — vault provides IDs.
3. **Write-back is mandatory** — always persist findings via `oil:patch_note`.
4. **Auto-detect mode by day** — don't make the user remember which weekly prompt to run.
