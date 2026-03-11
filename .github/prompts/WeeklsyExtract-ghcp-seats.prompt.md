---
description: "Extract GHCP seat data from MSXI Power BI report via browser automation. Saves weekly report to .docs/Weekly/ and runs seat opportunity analysis."
---

# Extract GHCP Seats

Extract GitHub Stack Summary data from MSXI using browser automation, save the weekly GHCP Seats report, and generate seat opportunity analysis.

## Interaction

**Ask the user:** "Which TPIDs? Enter TPID(s), account name(s), or 'all tracked accounts'."

## Workflow

### Step 1 — Resolve TPIDs (Index-First)

- Read `.docs/_index.md` for account→TPID mapping and tranche ordering (Tranche A first if "all").
- Build the TPID list for extraction.

### Step 1.5 — Cache-Age Pre-Check

- List `.docs/Weekly/` for a recent `*_GHCP-Seats-report.xlsx` (<3 days old).
- If fresh report exists, skip extraction and jump to Step 4.
- If stale or missing, continue to Step 2.

### Step 2 — Browser Extraction (via BrowserExtractor)

Delegate to **BrowserExtractor** with the `gh-stack-browser-extraction` skill:
- Navigate to MSXI PBI Embedded report.
- User completes AAD MFA if prompted.
- For each TPID: apply slicer → extract GitHub Stack Summary via PBI JS API.
- Capture: GHE Seats, GHAS Seats, GHCP Seats, PRU, WAU/WEU, ACR, Attach Rate, Seat Opportunity.

**Partial-success protocol:** If some TPIDs fail, continue with successful ones. Log failures in Blockers section.

### Step 3 — Save Report

- Read `.docs/Weekly/Template GHCP-Seats-report.xlsx` as base. **Never modify the template.**
- Populate rows from extracted data.
- Save as `.docs/Weekly/{YYYY-MM-DD}_GHCP-Seats-report.xlsx`.

### Step 4 — Seat Opportunity Analysis (via GHCPAnalyst)

Delegate to **GHCPAnalyst**:
- Compare this week's report vs. last week's (if available).
- Generate `.docs/Weekly/{YYYY-MM-DD}_GHCP-Seat-Opp.md` with: per-account whitespace breakdown, WoW movement, portfolio totals, growth cohort classification.

### Step 5 — Update Account Cache

For each extracted account, update seat snapshot in `.docs/_data/<Account>/state.md`.

### Step 6 — Report

Present summary table with key metrics and significant week-over-week changes.

## Input

{user provides TPID(s), account name(s), or "all"}
