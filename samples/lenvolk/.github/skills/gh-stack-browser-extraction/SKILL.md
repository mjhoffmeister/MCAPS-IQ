---
name: gh-stack-browser-extraction
description: >-
  Extract GitHub Stack Summary data from MSX Insights Power BI report
  using Power BI Remote MCP tools (DAX queries against the MSXI semantic model).
  No browser automation needed — queries the semantic model directly via the
  powerbi-remote MCP server. Handles semantic model discovery, schema inspection,
  DAX query execution, and Excel report generation. Falls back to Playwright MCP
  browser tools only if Power BI MCP is unavailable. Use when user asks for
  GHCP matrix, GHCP seats, GitHub stack summary, GitHub stack data, seat counts,
  attach rates, ACR data, WAU/WEU, GHE seats, GHAS seats, PRU data, or any
  MSXI account-level GitHub metrics for one or more TPIDs. Also triggers on
  get_github_stack_summary returning needsExtraction=true, milestone note updates
  with GitHub data, or account reviews needing live MSXI numbers.
argument-hint: Provide one or more TPIDs to extract data for
---

# GitHub Stack Browser Extraction

Extract GitHub Stack Summary data from the MSX Insights report using Power BI Remote MCP tools (primary) or Playwright MCP browser tools (fallback).

**Execution rule**: Do not deliberate — go straight to Step 1. No planning preamble needed.

## When to Use

- User asks for GHCP matrix, GHCP seats, GitHub stack, seat counts, attach rates, ACR, WAU/WEU
- User asks to update milestone notes with GitHub stack data
- User asks for fresh/current GitHub stack summary for an account (by TPID or customer name)
- `get_github_stack_summary(tpid)` returns `needsExtraction: true`
- Any workflow requiring live ACR, seat, or attach rate data from MSXI

## Template & Weekly Workflow

The account roster lives in the **template** file at `.docs/Weekly/Template GHCP-Seats-report.xlsx`.
- The template is the extraction-specific TPID list. The master account roster (with contacts, keywords, and identifiers) is `.docs/AccountReference.md`. Both must stay in sync.
- Column A: Account Name, Column B: TPID, Column C: OppID, Column D: MileStoneID, Columns E+: MSXI data columns (populated during extraction).
- **To generate a weekly report**: read all TPIDs from column B of the template, extract data via MSXI, and write the results to `.docs/Weekly/<YYYY-MM-DD>_GHCP-Seats-report.xlsx` (copy of template with data populated).
- The template itself is never overwritten with data — it is the source of truth for which accounts to extract.
- Only generate the weekly report when explicitly asked by the user.

## Multi-TPID Support

When using Power BI MCP, include all TPIDs in a single DAX `FILTER` expression (e.g., `'Dim_Metrics'[TPID] IN {"12345", "67890", ...}`). TPIDs are stored as **Text** in Dim_Metrics, so quote them as strings. The query returns one row per TPID from the last completed month. No need to loop per TPID.

## Prerequisites

- **Primary**: Power BI Remote MCP server (`powerbi-remote`) must be configured and authenticated in `.vscode/mcp.json`
- **Fallback**: Playwright MCP browser tools (`vijaynirmal.playwright-mcp-relay/*`) if Power BI MCP is unavailable
- Tenant admin must enable "Users can use the Power BI Model Context Protocol server endpoint (preview)"
- User must have Build permissions on the MSXI semantic model

## Extraction Workflow (Primary: Power BI Remote MCP)

### Step 0 — PBI Auth Pre-Check

Before any data query, run a lightweight auth check to catch expired tokens early:

```dax
EVALUATE TOPN(1, 'Dim_Calendar')
```

If this returns data → auth is good, proceed to Step 1.

If this fails with `TypeError: fetch failed` or any auth/connection error → **stop immediately** and tell the user:

> Power BI MCP authentication has expired. Please run these commands and restart the `powerbi-remote` MCP server:
> ```
> az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
> az account get-access-token --resource https://analysis.windows.net/powerbi/api
> ```
> Then restart `powerbi-remote` in VS Code (MCP icon → restart).

Do NOT proceed with data queries on an expired token — they will all fail.

### Step 1 — Execute DAX Query (Known Schema)

The MSXI semantic model ID is **`a0239518-1109-45a3-a3eb-1872dc10ac15`** (workspace: Business Precision). Skip discovery — go straight to the DAX query.

**CRITICAL**: The "Account Stack Table" visual on the Acc. View page reads from the **`Dim_Metrics` table** (pre-computed LCM-scoped values per TPID per month). Do NOT use `__Measure` measures — those compute aggregate (top-parent) values that are wrong for per-account extraction.

**Calendar filter**: Always use `'Dim_Calendar'[RelativeFM] = -1` to get the **last completed fiscal month**. The current partial month has incomplete data (daily partial accumulation). This matches what the MSXI Acc. View page displays.

Use `ExecuteQuery` with this proven DAX template:

**CRITICAL**: Use `SELECTCOLUMNS` (not `ADDCOLUMNS(FILTER(...))`) to explicitly select only the needed columns with clean aliases. The `FILTER` approach returns ALL 111 Dim_Metrics columns, which causes subagents to scramble column-to-value mapping during result summarization. `SELECTCOLUMNS` returns ONLY the columns listed, in the order specified — no ambiguity.

```dax
EVALUATE
CALCULATETABLE(
    SELECTCOLUMNS(
        FILTER('Dim_Metrics', 'Dim_Metrics'[TPID] IN {"TPID1", "TPID2", ...}),
        "TPID", 'Dim_Metrics'[TPID],
        "FiscalMonth", 'Dim_Metrics'[FiscalMonth],
        "GHCP_Seats", 'Dim_Metrics'[GHCP_Seats],
        "GHCP_Ent_Seats", 'Dim_Metrics'[GHCP_Ent_Seats],
        "GHCP_Business_Seats", 'Dim_Metrics'[GHCP_Business_Seats],
        "GHCP_Standalone_Seats", 'Dim_Metrics'[GHCP_Standalone_Seats],
        "GHCP_ACR_Dollar", 'Dim_Metrics'[GHCP_ACR_Dollar],
        "GHCP_Ent_Dollar", 'Dim_Metrics'[GHCP_Ent_Dollar],
        "GHCP_Business_Dollar", 'Dim_Metrics'[GHCP_Business_Dollar],
        "GHCP_Standalone_Dollar", 'Dim_Metrics'[GHCP_Standalone_Dollar],
        "ARPU", 'Dim_Metrics'[ARPU],
        "GHCP_attach", 'Dim_Metrics'[GHCP_attach],
        "TAM", 'Dim_Metrics'[TAM],
        "QSeats_GH_FY26", 'Dim_Metrics'[QSeats_GH_FY26],
        "NQSeats_GH_FY26", 'Dim_Metrics'[NQSeats_GH_FY26],
        "Remaining_Seat_Opp", 'Dim_Metrics'[Remaining Seat Opp],
        "WAU_pct", 'Dim_Metrics'[WAU %],
        "WEU_pct", 'Dim_Metrics'[WEU %],
        "GHE_Total_Seats", 'Dim_Metrics'[GHE_Total_Seats],
        "GHE_License_Seats", 'Dim_Metrics'[GHE_License_Seats],
        "GHE_Metered_Seats", 'Dim_Metrics'[GHE_Metered_Seats],
        "GHE_Metered_Dollar", 'Dim_Metrics'[GHE_Metered_Dollar],
        "ADO_Seats", 'Dim_Metrics'[ADO_Seats],
        "PRU_Units", 'Dim_Metrics'[PRU_Units],
        "PRU_Dollar", 'Dim_Metrics'[PRU_Dollar],
        "GHAS_Total_Seats", 'Dim_Metrics'[GHAS_Total_Seats],
        "GHAS_License_Seats", 'Dim_Metrics'[GHAS_License_Seats],
        "GHAS_metered", 'Dim_Metrics'[GHAS_metered],
        "GHAS_Dollar", 'Dim_Metrics'[GHAS_Dollar],
        "GHAzDO_Seats", 'Dim_Metrics'[GHAzDO_Seats],
        "Visual_Studio_Seats", 'Dim_Metrics'[Visual_Studio_Seats],
        "SRE_ACR", 'Dim_Metrics'[SRE_ACR],
        "AI_Foundry_ACR", 'Dim_Metrics'[AI_Foundry_ACR],
        "AKS_ACR", 'Dim_Metrics'[AKS_ACR],
        "Fabric_ACR", 'Dim_Metrics'[Fabric_ACR],
        "PGSQL_ACR", 'Dim_Metrics'[PGSQL_ACR],
        "CSPM_ACR", 'Dim_Metrics'[CSPM_ACR],
        "Action", 'Dim_Metrics'[Action],
        "GHCP_Growth", 'Dim_Metrics'[GHCP_Growth],
        "win", 'Dim_Metrics'[win],
        "TopParent", RELATED('Dim_Account'[TopParent]),
        "TimeZone", RELATED('Dim_Geo_Seg_Mapping'[TimeZone]),
        "FieldAccountabilityUnit", RELATED('Dim_Geo_Seg_Mapping'[FieldAccountabilityUnit]),
        "STBMidSegment", RELATED('Dim_Geo_Seg_Mapping'[STBMidSegment]),
        "MACCTPIDFlag", RELATED('Dim_Account'[MACCTPIDFlag]),
        "UnifiedSupportFlag", RELATED('Dim_Account'[UnifiedSupportFlag]),
        "NumDevelopers_MSX", RELATED('Dim_Account'[NumDevelopers (MSX)]),
        "Attach_NumDev_MSX", RELATED('Dim_Account'[Attach (Num Dev MSX)]),
        "ATU_Aliases", RELATED('Dim_Account'[ATU_EmailAliases]),
        "ATS_Aliases", RELATED('Dim_Account'[ATS_EmailAliases]),
        "SSP_Aliases", RELATED('Dim_Account'[SSP_EmailAliases]),
        "SE_Aliases", RELATED('Dim_Account'[SE_EmailAliases]),
        "SE_Software_Aliases", RELATED('Dim_Account'[SE_Software_EmailAliases]),
        "GH_AE_Aliases", RELATED('Dim_Account'[GH_AE_EmailAliases])
    ),
    'Dim_Calendar'[RelativeFM] = -1
)
```

**Key relationships**: `Dim_Account[TPID] (Int)` → `Dim_Metrics[TPID] (Text)` → `Dim_Calendar[FiscalMonth]` → `Dim_Metrics[FiscalMonth]`. RELATED() traverses Metrics→Account→Geo.

### Step 2 — Parse Results (Column Mapping)

The query returns one row per TPID with exactly the columns listed in the SELECTCOLUMNS above. Map the DAX result column aliases to the template Excel headers using this reference:

| Template Column | DAX Alias | Source Column | Type | Rounding |
|---|---|---|---|---|
| GHCP Seats | `GHCP_Seats` | `Dim_Metrics[GHCP_Seats]` | int | round |
| GHCP Ent Seats | `GHCP_Ent_Seats` | `Dim_Metrics[GHCP_Ent_Seats]` | int | round |
| GHCP Business Seats | `GHCP_Business_Seats` | `Dim_Metrics[GHCP_Business_Seats]` | int | round |
| GHCP Standalone Seats | `GHCP_Standalone_Seats` | `Dim_Metrics[GHCP_Standalone_Seats]` | int | round |
| GHCP ACR ($) | `GHCP_ACR_Dollar` | `Dim_Metrics[GHCP_ACR_Dollar]` | dollar | round |
| GHCP Ent ACR ($) | `GHCP_Ent_Dollar` | `Dim_Metrics[GHCP_Ent_Dollar]` | dollar | round |
| GHCP Business ACR ($) | `GHCP_Business_Dollar` | `Dim_Metrics[GHCP_Business_Dollar]` | dollar | round |
| GHCP Standalone ACR ($) | `GHCP_Standalone_Dollar` | `Dim_Metrics[GHCP_Standalone_Dollar]` | dollar | round |
| ARPU | `ARPU` | `Dim_Metrics[ARPU]` | float | 2 decimals |
| GHCP Attach | `GHCP_attach` | `Dim_Metrics[GHCP_attach]` | pct | ×100, 1 decimal |
| # Developers (MSX Field) | `NumDevelopers_MSX` | `Dim_Account[NumDevelopers (MSX)]` | int | — |
| GHCP Attach (# Dev MSX) | `Attach_NumDev_MSX` | `Dim_Account[Attach (Num Dev MSX)]` | pct | ×100, 1 decimal |
| GHCP Seat Oppty | `TAM` | `Dim_Metrics[TAM]` | int | round |
| GH QSeats remaining FY26 | `QSeats_GH_FY26` | `Dim_Metrics[QSeats_GH_FY26]` | int | round |
| GH Non QSeats remaining FY26 | `NQSeats_GH_FY26` | `Dim_Metrics[NQSeats_GH_FY26]` | int | round |
| Remaining GHCP Seat Opp | `Remaining_Seat_Opp` | `Dim_Metrics[Remaining Seat Opp]` | int | round |
| WAU % | `WAU_pct` | `Dim_Metrics[WAU %]` | pct | ×100, 1 decimal |
| WEU % | `WEU_pct` | `Dim_Metrics[WEU %]` | pct | ×100, 1 decimal |
| GHE Total Seats | `GHE_Total_Seats` | `Dim_Metrics[GHE_Total_Seats]` | int | round |
| GHE License Seats | `GHE_License_Seats` | `Dim_Metrics[GHE_License_Seats]` | int | round |
| GHE Metered Seats | `GHE_Metered_Seats` | `Dim_Metrics[GHE_Metered_Seats]` | int | round |
| GHE Metered ACR ($) | `GHE_Metered_Dollar` | `Dim_Metrics[GHE_Metered_Dollar]` | dollar | round |
| ADO Seats | `ADO_Seats` | `Dim_Metrics[ADO_Seats]` | int | round |
| PRU Units | `PRU_Units` | `Dim_Metrics[PRU_Units]` | int | round |
| PRU ACR ($) | `PRU_Dollar` | `Dim_Metrics[PRU_Dollar]` | dollar | round |
| GHAS Total Seats | `GHAS_Total_Seats` | `Dim_Metrics[GHAS_Total_Seats]` | int | round |
| GHAS License Seats | `GHAS_License_Seats` | `Dim_Metrics[GHAS_License_Seats]` | int | round |
| GHAS Metered Seats | `GHAS_metered` | `Dim_Metrics[GHAS_metered]` | int | round |
| GHAS ACR ($) | `GHAS_Dollar` | `Dim_Metrics[GHAS_Dollar]` | dollar | round |
| GHAzDO Seats | `GHAzDO_Seats` | `Dim_Metrics[GHAzDO_Seats]` | int | round |
| Visual Studio Seats | `Visual_Studio_Seats` | `Dim_Metrics[Visual_Studio_Seats]` | int | round |
| SRE ACR ($) | `SRE_ACR` | `Dim_Metrics[SRE_ACR]` | dollar | round |
| AI Foundry ACR ($) | `AI_Foundry_ACR` | `Dim_Metrics[AI_Foundry_ACR]` | dollar | round |
| AKS ACR ($) | `AKS_ACR` | `Dim_Metrics[AKS_ACR]` | dollar | round |
| Fabric ACR ($) | `Fabric_ACR` | `Dim_Metrics[Fabric_ACR]` | dollar | round |
| PGSQL ACR ($) | `PGSQL_ACR` | `Dim_Metrics[PGSQL_ACR]` | dollar | round |
| CSPM ACR ($) | `CSPM_ACR` | `Dim_Metrics[CSPM_ACR]` | dollar | round |
| MACC | `MACCTPIDFlag` | `Dim_Account[MACCTPIDFlag]` | text | — |
| Unified Support | `UnifiedSupportFlag` | `Dim_Account[UnifiedSupportFlag]` | text | — |
| Action | `Action` | `Dim_Metrics[Action]` | text | — |
| GHCP Cohort | `GHCP_Growth` | `Dim_Metrics[GHCP_Growth]` | text | — |
| ATU Aliases | `ATU_Aliases` | `Dim_Account[ATU_EmailAliases]` | text | — |
| ATS Aliases | `ATS_Aliases` | `Dim_Account[ATS_EmailAliases]` | text | — |
| SSP Aliases | `SSP_Aliases` | `Dim_Account[SSP_EmailAliases]` | text | — |
| SE Aliases | `SE_Aliases` | `Dim_Account[SE_EmailAliases]` | text | — |
| SE Software Aliases | `SE_Software_Aliases` | `Dim_Account[SE_Software_EmailAliases]` | text | — |
| GH AE Aliases | `GH_AE_Aliases` | `Dim_Account[GH_AE_EmailAliases]` | text | — |

**Value rounding rules**: Dim_Metrics stores LCM-normalized values as floats (e.g., GHCP_Seats = 1629.14). Always `round()` seat/unit/dollar values to integers before writing to Excel. Percentages are stored as decimals (0.376 = 37.6%) — multiply by 100 for display or store as Excel percentage format.

**Column naming**: The SELECTCOLUMNS DAX aliases above (`DAX Alias` column) exactly match the `[column_name]` keys in the JSON result. The `Source Column` shows the original Dim_Metrics/Dim_Account column. Do NOT confuse `Dim_Metrics[ARPU]` (actual ARPU = ~$16.66/seat) with `Dim_Metrics[TAM]` (seat opportunity = ~3,455). There is no naming swap — ARPU is ARPU, TAM is TAM.

### Step 3 — Save Extracted Data

Parse the query results into structured data. The Power BI MCP returns results as structured JSON (not CSV). Each row maps to one TPID.

### Step 4 — Generate Weekly Excel Report

**Use `openpyxl` (always available)** — do NOT use pandas or pip install any packages.

**Write one self-contained `.tmp_generate_report.py` script** that does everything in a single run:

1. **Read the template**: Open `.docs/Weekly/Template GHCP-Seats-report.xlsx` with `openpyxl.load_workbook()`. Copy to `.docs/Weekly/<YYYY-MM-DD>_GHCP-Seats-report.xlsx`.
2. **Match & populate**: For each template row, match TPID (column E for the current template, or the column with "TPID" header) against query results. Use the **Column Mapping** table from Step 2 to map DAX column names to template headers. Apply rounding rules:
   - Seat/unit columns: `round()` to int (Dim_Metrics stores LCM-normalized floats like 1629.14 → 1,629)
   - Dollar columns: `round()` to int
   - Percentage columns (attach, WAU %, WEU %): stored as decimals in DAX (0.376 = 37.6%) — store as float in Excel with `0.0%` format
   - ARPU: 2 decimal places
   - Text columns (aliases, MACC, Action, Cohort): store as string
3. **Formatting**: TPID → `0`, dollars → `$#,##0`, percentages → `0.0%`, ARPU → `#,##0.00`, seats → `#,##0`.
4. **Styling**: Arial 10pt, dark blue headers (`#2F5496`, white text), thin gray borders (`#D9D9D9`). Freeze pane A2, auto-filter, column widths auto-sized (cap 30).
5. **Clean up**: Delete the temp script after successful execution.

The template file is **never modified** — only the weekly copy gets data.

### Step 6 — Present Results

Show the user:
1. A markdown table with all extracted data
2. Confirm the Excel file path

Do NOT ask follow-up questions. If the user wants more, they'll ask.

## Fallback Workflow: Playwright MCP (only if Power BI MCP unavailable)

If the Power BI Remote MCP is not configured, not authenticated, or the tenant admin hasn't enabled the MCP endpoint, fall back to Playwright browser automation.

### Fallback Step 1 — Navigate to MSXI Report

```
browser_navigate: https://aka.ms/ghinsights
```

Wait for page load. If redirected to a login page, **tell the user** to complete authentication in the browser window.

### Fallback Step 2 — Wait for PBI Embed to Load

```javascript
browser_evaluate:
  !!window.powerbi?.embeds?.length
```

If `false`, wait and retry.

### Fallback Step 3 — Navigate to "Acc. View" and Set TPID Filter

The report defaults to "Exec. View" (no TPID slicer). Switch to "Acc. View" first:

```javascript
browser_evaluate:
  (async () => {
    const embed = window.powerbi.embeds[0];
    const pages = await embed.getPages();
    const accView = pages.find(p => p.displayName === 'Acc. View');
    if (!accView) return { error: 'Acc. View page not found', pages: pages.map(p => p.displayName) };
    await accView.setActive();
    await new Promise(r => setTimeout(r, 5000));
    const visuals = await accView.getVisuals();

    const slicer = visuals.find(v => v.title === 'TPID');
    if (!slicer) return { error: 'TPID slicer not found', visualTitles: visuals.map(v => v.title).filter(Boolean) };

    await slicer.setSlicerState({
      filters: [{
        $schema: 'http://powerbi.com/product/schema#basic',
        target: { table: 'Dim_Account', column: 'TPID_Text' },
        operator: 'In',
        values: ['<TPID1>', '<TPID2>', ...],
        filterType: 1
      }]
    });

    return { success: true };
  })()
```

### Fallback Step 4 — Export Account Stack Table

```javascript
browser_evaluate:
  (async () => {
    await new Promise(r => setTimeout(r, 6000));

    const embed = window.powerbi.embeds[0];
    const pages = await embed.getPages();
    const activePage = pages.find(p => p.isActive) || pages[0];
    const visuals = await activePage.getVisuals();

    const stackTable = visuals.find(v =>
      v.title && v.title.toLowerCase().includes('account stack')
    );
    if (!stackTable) return {
      error: 'Account Stack Table not found',
      visualTitles: visuals.map(v => ({ title: v.title, type: v.type })).filter(v => v.title)
    };

    const result = await stackTable.exportData(0);
    return { csv: result.data };
  })()
```

**CSV escape format**: The `csv` value uses literal `\r\n` as row delimiters and `\"` for embedded quotes. When parsing:
```python
csv_raw = csv_raw.replace('\\r\\n', '\n').replace('\\"', '"')
```

### Fallback Step 5 — Generate Excel

Same as primary Step 5, but parse from CSV instead of structured JSON.

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Power BI MCP not connected | Check `powerbi-remote` in `.vscode/mcp.json`, verify auth in MCP panel |
| `DiscoverArtifacts` returns no results | Try different search terms: "Dev Services Hub", "MSXI", "GitHub Insights" |
| DAX query fails | Use `GetSemanticModelSchema` to verify table/column names, or use `GenerateQuery` for natural language → DAX |
| Tenant MCP endpoint not enabled | Admin must enable "Users can use the Power BI Model Context Protocol server endpoint (preview)" — fall back to Playwright |
| No Build permissions on semantic model | User needs Build permission on the MSXI dataset — contact admin |
| Playwright fallback: `powerbi.embeds` empty | Report still loading — wait and retry |
| Playwright fallback: TPID slicer not found | Page may not be "Acc. View" — check `activePage.displayName` |
| Playwright fallback: Login redirect | Tell user to authenticate in the visible browser |

## Key Constants

| Item | Value |
|------|-------|
| Semantic Model ID | `a0239518-1109-45a3-a3eb-1872dc10ac15` |
| Semantic Model Name | GHCP and Dev Services Hub |
| Workspace | Business Precision (`824003D8-7E9B-4D4A-AA2A-FE295B23549E`) |
| MSXI Report URL | `https://aka.ms/ghinsights` |
| PBI Report ID | `0d5f46d6-5d27-4f78-82d6-8be082dd6c9b` |
| PBI MCP Endpoint | `https://api.fabric.microsoft.com/v1/mcp/powerbi` |
| Calendar Filter | `'Dim_Calendar'[RelativeFM] = -1` (last completed month) |
| Metrics Table | `Dim_Metrics` (LCM-scoped, per TPID per FiscalMonth) |
| Account Table | `Dim_Account` (aliases, MACC, Unified, NumDev) |
| Geo Table | `Dim_Geo_Seg_Mapping` (TimeZone, FAU, Segment) |
| Slicer Target (Playwright) | `Dim_Account.TPID_Text` |
| Active Page (Playwright) | "Acc. View" |

## Schema Notes

**Why `Dim_Metrics` and NOT `__Measure`**: The `__Measure` table contains DAX measures that compute aggregate/top-parent values (e.g., GHCP Seats = 23,863 for CBRE — the full corporate hierarchy). The `Dim_Metrics` table stores **LCM (Lowest Common Measure) scoped** pre-computed values per TPID per month (e.g., GHCP Seats = 1,629 for CBRE — the SE-relevant LCM entity). The "Account Stack Table" visual on Acc. View reads from `Dim_Metrics`, which is what users see and expect.

**Why `SELECTCOLUMNS` and NOT `ADDCOLUMNS(FILTER(...))`**: `FILTER('Dim_Metrics', ...)` returns ALL 111 columns of Dim_Metrics. When subagents process this 111-column result, they can scramble column-to-value mappings — producing plausible but wrong values (e.g., assigning `AI_Foundry_ACR` to `GHCP_Business_Dollar`). `SELECTCOLUMNS` explicitly names each output column with a clean alias, returning only the ~50 needed columns in a predictable order. This prevents column misalignment.

**Why `RelativeFM = -1`**: `Dim_Metrics` stores one row per TPID per FiscalMonth. The current month (RelativeFM = 0) contains partial data that accumulates daily — values are ~1/N of final where N is the day of the month. Only completed months have reliable data. `RelativeFM = -1` selects the last fully completed fiscal month.

**Column naming — no ARPU/TAM swap**: `Dim_Metrics[ARPU]` is the actual ARPU (ACR per user, ~$16.66/seat). `Dim_Metrics[TAM]` is the actual TAM (Total Addressable Market / Seat Opportunity, ~3,455 seats). These names are accurate — do NOT swap them.

**Relationship chain**: `Dim_Geo_Seg_Mapping` → `Dim_Account` → `Dim_Metrics` ← `Dim_Calendar`. All joins are M:1, so RELATED() traverses from Dim_Metrics to Dim_Account and Dim_Geo_Seg_Mapping.
