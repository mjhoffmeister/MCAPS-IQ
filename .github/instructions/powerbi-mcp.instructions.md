---
description: "Power BI Remote MCP conventions: auth pre-check, semantic model referencing, DAX query patterns. Load when user mentions Power BI, PBI, MSXI, semantic model, DAX query, or any powerbi-remote tool call."
---

# Power BI Remote MCP — Conventions

## Medium Registration

Power BI is a **read-only analytics medium** alongside CRM, Vault, and WorkIQ. It provides aggregated metrics, ACR telemetry, incentive baselines, and scorecard data that live outside CRM transaction records.

| Medium | Server | Probe | If unavailable |
|---|---|---|---|
| **Power BI** | `powerbi-remote` | `ExecuteQuery` with `EVALUATE TOPN(1, 'Dim_Calendar')` against the target semantic model | Skip PBI steps; note "Power BI data unavailable this session" |

## Auth Pre-Check Pattern

Before any data query in a Power BI workflow, run a lightweight probe:

```dax
EVALUATE TOPN(1, 'Dim_Calendar')
```

- **Success** → auth is valid, proceed with workflow.
- **Failure** (`TypeError: fetch failed`, 401, or connection error) → **stop** the PBI portion and tell the user:

> Power BI MCP authentication has expired. Run:
> ```
> az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
> az account get-access-token --resource https://analysis.windows.net/powerbi/api
> ```
> Then restart `powerbi-remote` in VS Code (MCP icon → restart).

## Semantic Model Referencing

- Always reference semantic models by **dataset ID** (GUID), never by display name.
- Document the dataset ID in each prompt that uses it — managers must be able to swap it.
- Example: `a0239518-1109-45a3-a3eb-1872dc10ac15` (MSXI).

## DAX Query Discipline

1. **Filter early** — use `CALCULATETABLE` + `FILTER` to push predicates into the query. Never pull full tables and filter client-side.
2. **Project explicitly** — use `SELECTCOLUMNS` to return only the columns needed. Avoid `SELECT *` equivalents.
3. **Parameterize TPIDs** — inject TPID lists from upstream steps (vault roster, CRM accounts). Never hardcode.
4. **Use relative dates** — prefer `RelativeFM` or computed date offsets over hardcoded dates. Document the mapping (e.g., "RelativeFM = -4 targets November 2025 as of March 2026").
5. **Batch when possible** — combine related queries into one `EVALUATE` block when the model supports it, to minimize round-trips.

## Cross-Medium Integration

Power BI prompts typically combine PBI data with other mediums:

| Step | Medium | Purpose |
|---|---|---|
| Account roster | Vault (`.docs/`) or CRM | Get TPID list to filter PBI queries |
| Telemetry pull | Power BI | ACR, seats, usage metrics |
| Business-rule application | Prompt logic | Eligibility, thresholds, growth checks |
| CRM correlation | MSX-CRM | Opportunity stage, milestone state |
| Output | Synthesized report | Table with cross-medium data |

## Prompt Template Convention

Power BI workflows live as **prompt files** (`.github/prompts/pbi-*.prompt.md`). Each prompt:

1. States the semantic model ID and purpose in a header comment.
2. References any `.github/documents/` files for program rules.
3. Includes the auth pre-check as Step 0.

To create a new PBI prompt interactively, use the **pbi-prompt-builder** skill — it discovers the model schema, drafts DAX from your questions, validates against live data, and outputs a ready-to-use `pbi-*.prompt.md`.
4. Uses the DAX query discipline above.
5. Is self-contained — managers can fork and change the model ID, DAX, and business rules without touching skills or instructions.
