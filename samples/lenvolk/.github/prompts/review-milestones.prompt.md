---
description: "MSX milestone and task health audit: overdue milestones, uncommitted milestones, missing tasks, status mismatches."
---

# Review Milestones

Audit MSX milestone and task health for one or more accounts. Surfaces overdue milestones, missing tasks, uncommitted milestones, and status mismatches. Offers to fix issues via CRM write operations.

## Interaction

**Ask the user:** "Which account(s)? Enter name(s), TPID(s), or 'all'."

## Workflow

### Step 1 — Resolve Accounts (Index-First)

- Read `.docs/_index.md` → find account rows, note MSX freshness and flags.
- For each account, read `.docs/_data/<Account>/state.md` for milestone IDs and tranche notes.
- Read `.docs/_data/<Account>/contacts.md` for owner resolution and escalation routing (CSAM, CSA, AM).

### Step 2 — MSX Query (via CRMOperator)

Delegate to **CRMOperator**:
- "Check milestone health for accounts: {account list}. Use `find_milestones_needing_tasks` with customerKeywords: [{keywords}]. For accounts with known OppIDs ({oppIds}), use `crm_query` on `msp_engagementmilestones` filtered for active/non-completed milestones. Use `get_milestone_activities` to retrieve tasks for flagged milestones. Execute fully autonomously."

### Step 3 — Classify

For each milestone:
- **🔴 Overdue**: milestone date past + not Completed.
- **🔴 No Tasks**: active milestone with zero tasks.
- **🟡 Uncommitted**: approaching date but still uncommitted.
- **🟡 At Risk**: status mismatch or no owner assigned.
- **🟢 On Track**: active, has tasks, future date, healthy status.

### Step 4 — Report

```markdown
## Milestone Review — {date}

*Scope: {accounts} | Total Milestones: {N}*

### 🔴 Needs Immediate Action

| Account | Tier | Milestone | Status | Date | Issue | Owner |
|---|---|---|---|---|---|---|
| {Account} | {tier} | {name} | {status} | {date} | {Overdue/No Tasks/Uncommitted} | {owner} |

### 🟡 Watch List

| Account | Milestone | Status | Date | Note |
|---|---|---|---|---|
| {Account} | {name} | {status} | {date} | {detail} |

### 🟢 Healthy

| Account | Milestone | Status | Date | Tasks |
|---|---|---|---|---|
| {Account} | {name} | {status} | {date} | {count} |

### Recommended Actions
1. {specific action — e.g., "Add tasks to COMCAST milestone M-12345"}
2. {specific action — e.g., "Update CONDUENT overdue milestone status"}
```

Offer to execute task creation or milestone updates via CRMOperator (staged for human approval).

### Step 5 — Connect Hook Capture

If findings include measurable impact (caught overdue milestones, prevented task gaps):
- Append entry to `.docs/_data/<Account>/insights.md` under `## Connect Hooks`.

## Input

{user provides account name(s), TPID(s), or "all"}
