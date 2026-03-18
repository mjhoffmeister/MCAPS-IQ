---
description: "OctoDash per-subscription and per-BU GHCP seat breakdown reference. Covers OctoDash semantic model schema, TPID→slug join pattern, source comparison table (MSXI vs OctoDash), presentation guardrails, and common pitfalls. Load when user asks for per-subscription breakdown, per-BU seats, enterprise slug, OctoDash enrichment, or granular GHCP report."
---

# OctoDash Enrichment — Per-Subscription / Per-BU GHCP Seat Reference

MSXI reports GHCP metrics at the **TPID level only** — no visibility into which Azure subscriptions, enterprise orgs, or business units hold the seats. When a stakeholder asks to "break it down by Azure subscription" or "show per-BU seats," MSXI cannot answer this. Use OctoDash.

## Data Source

**OctoDash** (Copilot Telemetry for Octodash)

| Setting | Value |
|---|---|
| **Semantic Model ID** | `ecdbfb59-7a8f-44fb-9102-727598416571` |
| **Workspace** | `GitHub and Microsoft` |

## OctoDash Table Reference

### `Fact_MSFT_Azure_TPID` — TPID-to-Slug Bridge

The **only** OctoDash table that contains `msft_tpid`. This is the entry point for all TPID-scoped lookups.

| Column | Type | Description |
|---|---|---|
| `msft_tpid` | **Integer** | Microsoft TPID — **no quotes** (unlike MSXI `Dim_Metrics[TPID]` which is Text) |
| `billable_owner_name` | Text | Enterprise slug — the join key to all other OctoDash tables |
| `salesforce_account_name` | Text | Salesforce account name associated with the slug |
| `azure_subscription_id` | Text | Azure subscription ID for billing |
| `Copilot Product Type` | Text | Business / Enterprise / Standalone per slug |

One TPID can map to **multiple slugs** (BUs, subsidiaries, eval accounts). Two slugs may share the same Azure Subscription ID.

### `Installed_Vs_Active_Vs_Engaged_Weekly` — Per-Slug Weekly Adoption (Preferred)

Fresher than `Licensed_User_Weekly`. Use this for current seat counts and adoption ratios.

| Column | Type | Description |
|---|---|---|
| `billable_owner_name` | Text | Enterprise slug (join key) |
| `week` | Date | Week ending date |
| `weekly_licensed_users` | Integer | Licensed seat count for the week |
| `authenticated_user_ratio` | Double | % of licensed users who authenticated |
| `active_user_ratio` | Double | % of licensed users who were active |
| `engagement_ratio` | Double | % of licensed users who were engaged |
| `industry` | Text | Industry classification |
| `industry_active_user_ratio` | Double | Industry benchmark for active user % |

### `Licensed_User_Weekly` — Legacy (Avoid)

`active_seat_count` column may lag weeks behind. Prefer `Installed_Vs_Active_Vs_Engaged_Weekly`.

## Join Pattern

OctoDash tables join via `billable_owner_name` (enterprise slug), **not** by TPID directly. Only `Fact_MSFT_Azure_TPID` has `msft_tpid`.

```
TPID → Fact_MSFT_Azure_TPID → slugs → weekly tables via slug
```

Always follow this two-hop pattern. Do not attempt to filter weekly tables by TPID — the column does not exist there.

## What Each Source Provides

| Need | MSXI (TPID-level) | OctoDash (per-slug) |
|---|---|---|
| Total GHCP seats | ✅ | ✅ (sum of slugs) |
| Seats by Azure subscription | ❌ | ✅ |
| Seats by BU / enterprise org | ❌ | ✅ |
| Azure Subscription IDs | ❌ | ✅ |
| Copilot tier per org (Business/Enterprise/Standalone) | ❌ | ✅ |
| Active% / Engaged% per org | ❌ | ✅ |
| Industry benchmark comparison per org | ❌ | ✅ |
| ACR, ARPU, Attach Rate, TAM | ✅ | ❌ |
| GHE/GHAS base seats | ✅ | ❌ |
| Qualified/Unqualified pipeline seats | ✅ | ❌ |
| Growth cohort classification | ✅ | ❌ |

## Presentation Guardrails

These rules apply whenever OctoDash or MSXI data is presented — any channel (chat, email, report, Teams message).

### 1. Identity — Say What This Is

Every output that includes OctoDash or MSXI data **must** include a clear identity statement near the top:

> "These are custom account health briefs put together using SE tooling — not Sales Excellence reports, not official Microsoft reports."

Without this, recipients may mistake the report for an official artifact and forward it under false authority.

### 2. Never Mix MSXI Revenue with CRM Milestone Dollars

- **MSXI ACR** = actual billed revenue from Azure meters (backward-looking)
- **CRM milestone $/mo** = forecasted engagement consumption (forward-looking)

**Never** subtract one from the other. **Never** present them in the same table. **Never** call the difference a "gap." They are independent measurement systems. If both appear, keep them in clearly labeled separate sections with a note explaining the distinction.

### 3. Source and Date Attribution

Label **every** data table with its source and extraction date:

| Source | Label Format |
|---|---|
| OctoDash | `OctoDash — Week of YYYY-MM-DD` |
| MSXI | `MSXI — Last Completed Month: Mon YYYY` |
| CRM | `MSX/CRM — Queried YYYY-MM-DD` |

Never present data without source and date. Stale data presented as current is worse than no data.

## Common Pitfalls

1. **OctoDash seat totals ≠ MSXI seat totals.** Different data pipelines, different refresh cadences. Present both and note the discrepancy — do not try to reconcile.
2. **`Licensed_User_Weekly` can be stale.** Its `active_seat_count` column may lag weeks behind. Prefer `Installed_Vs_Active_Vs_Engaged_Weekly` for current data.
3. **Shared Azure Subscription IDs.** Two enterprise slugs can bill to the same subscription. Flag this when presenting — it means those orgs can't be separated by subscription alone.
4. **Never compare OctoDash per-slug ACR with MSXI TPID-level ACR.** OctoDash doesn't surface ACR per slug. MSXI ACR is the authoritative revenue figure.
5. **TPID type mismatch.** `msft_tpid` in OctoDash is **Integer** (no quotes). `TPID` in MSXI `Dim_Metrics` is **Text** (must quote). Getting this wrong returns empty results with no error.
