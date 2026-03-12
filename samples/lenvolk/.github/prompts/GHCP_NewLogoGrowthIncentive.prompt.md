---
description: "Evaluate portfolio accounts against GHCP New Logo Growth Incentive (FY26). Pulls November 2025 baseline ACR and monthly ACR (Dec–current) from MSXI Power BI to identify eligible and qualifying accounts."
---

# GHCP New Logo Growth Incentive — Account Eligibility Review

Review my tracked accounts and tell me which ones are eligible (or qualifying) for the GHCP New Logo Growth Incentive.

## Reference

Read `.docs/documents/GHCP_NewLogoGrowthIncentive.md` for the full program rules.

## Key Rules Summary

- **Program window**: December 1, 2025 – June 30, 2026
- **November Baseline**: Accounts with GHCP monthly ACR < $800 (Enterprise) or < $320 (SME&C-C) as of November 30, 2025 are **eligible**
- **Qualifying**: Eligible account reaches incremental $800/$320 monthly ACR above November baseline for **3 consecutive months**
- **Max 3 nominations per TPID**; TPID can only win once
- **Q4 treatment**: Late qualifiers (Apr–Jun) must hold ACR through Jul–Aug

## Workflow

### Step 0 — PBI Auth Pre-Check

Before any data query, run a lightweight auth check against the MSXI semantic model:

```dax
EVALUATE TOPN(1, 'Dim_Calendar')
```

If this returns data → auth is good, proceed.

If this fails with `TypeError: fetch failed` or any auth/connection error → **stop** and tell the user:

> Power BI MCP authentication has expired. Please run:
> ```
> az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
> az account get-access-token --resource https://analysis.windows.net/powerbi/api
> ```
> Then restart `powerbi-remote` in VS Code (MCP icon → restart).

### Step 1 — Load Account Roster

Read `.docs/AccountReference.md` to get the full list of tracked TPIDs (Column B in the Account Reference table).

### Step 2 — Pull November 2025 Baseline ACR

Query MSXI Power BI semantic model (`a0239518-1109-45a3-a3eb-1872dc10ac15`) using Power BI Remote MCP:

```dax
EVALUATE
CALCULATETABLE(
    SELECTCOLUMNS(
        FILTER('Dim_Metrics', 'Dim_Metrics'[TPID] IN {"<TPID1>", "<TPID2>", ...}),
        "TPID", 'Dim_Metrics'[TPID],
        "FiscalMonth", 'Dim_Metrics'[FiscalMonth],
        "GHCP_Seats", 'Dim_Metrics'[GHCP_Seats],
        "GHCP_ACR_Dollar", 'Dim_Metrics'[GHCP_ACR_Dollar],
        "TopParent", RELATED('Dim_Account'[TopParent])
    ),
    'Dim_Calendar'[RelativeFM] = -4
)
ORDER BY [TopParent] ASC
```

> **Note**: `RelativeFM = -4` targets November 2025 (as of March 2026). Adjust if running in a different month — November 2025 is FiscalMonth `2025-11-01`. You can verify by querying `Dim_Calendar` for the correct RelativeFM offset.

### Step 3 — Baseline Screening

For each account, check November ACR against threshold:
- **Enterprise**: Nov ACR < $800 → **eligible**
- **SME&C-C**: Nov ACR < $320 → **eligible**
- All others → **ineligible** (already above threshold = not a "new logo")

### Step 4 — Pull Monthly ACR (Dec–Current)

For eligible accounts only, pull Dec through last completed month:

```dax
EVALUATE
CALCULATETABLE(
    SELECTCOLUMNS(
        FILTER('Dim_Metrics', 'Dim_Metrics'[TPID] IN {"<eligible TPIDs>"}),
        "TPID", 'Dim_Metrics'[TPID],
        "FiscalMonth", 'Dim_Metrics'[FiscalMonth],
        "GHCP_ACR_Dollar", 'Dim_Metrics'[GHCP_ACR_Dollar],
        "TopParent", RELATED('Dim_Account'[TopParent])
    ),
    'Dim_Calendar'[RelativeFM] IN {-3, -2, -1}
)
ORDER BY [TopParent] ASC, [FiscalMonth] ASC
```

### Step 5 — Growth Check

For each eligible account:
1. Calculate **target ACR** = November baseline ACR + $800 (Enterprise) or + $320 (SME&C-C)
2. Check each month Dec onward: is monthly ACR ≥ target?
3. Count consecutive months at or above target
4. If 3 consecutive months ≥ target → **QUALIFYING** 🎉
5. If < 3 consecutive months → **Eligible, not yet qualifying** (report progress)
6. If ACR dropped below target mid-streak → clock resets (per Example #4 in program rules)

### Step 6 — Report

Present results as a table:

| Account | TPID | Nov ACR (Baseline) | Target ACR | Dec | Jan | Feb | ... | Status | Calculation |
|---|---|---|---|---|---|---|---|---|---|

**Status values**:
- **QUALIFYING** — met $800/$320 incremental for 3+ consecutive months
- **On track (N/3 months)** — above threshold but hasn't hit 3 months yet
- **Eligible, no growth** — below baseline threshold but ACR hasn't grown
- **Clock reset** — was on track but ACR dipped below target, restarting count

End with a summary: how many eligible, how many qualifying, how many need attention, and time remaining in the program window (ends June 30, 2026).
