# GHCP Metric Glossary & Formulas Reference

Canonical source: **Dev Services Hub — Metric Glossary** (OneNote, maintained by the MSXI dashboard team).
Report: **GHCP & Dev Services Hub** in MSX Insights → Acc. View tab.
Semantic Model: `a0239518-1109-45a3-a3eb-1872dc10ac15` (Business Precision workspace).

---

## Key Formulas

### GHCP Seat Opportunity (TAM)

```
Seat Oppty = MAX(GHE License Seats + GHE Metered Seats, ADO Seats)
```

- Calculated at the **account (TPID) level**
- Group totals = sum of per-account maxima (not max of aggregated totals)

### Remaining Seat Opportunity

```
Remaining Seat Opp = Seat Oppty − GHCP Seats − Qualified Pipeline Seats − Unqualified Pipeline Seats
```

- **Qualified Pipeline Seats (QP)**: milestone-level seats beyond earliest sales stage, approved statuses, POC/Pilot or Production, open fiscal periods. Converted via Seat Ratio ($16/seat).
- **Unqualified Pipeline Seats (NQP)**: at earliest sales stage (Sales Stage Number = 1).
- Simple `Seat Oppty − GHCP Seats` does **not** match — the model subtracts ALL pipeline.

### GHCP Attach Rate & ARPU

```
GHCP Attach = GHCP Seats / GHCP Seat Opportunity
ARPU        = GHCP ACR ($) / GHCP Seats
```

### Worked Example — TPID 719650 (Millennium Partners)

| Metric | Value |
|---|---|
| GHE License Seats | 3,753 |
| GHE Metered Seats | 0 |
| ADO Seats | 8 |
| **Seat Oppty** | **3,753** (MAX(3753, 8)) |
| GHCP Seats | 1,282 |
| Qualified Pipeline | 63 |
| Unqualified Pipeline | ~937 |
| **Remaining** | **1,471** (3,753 − 1,282 − 63 − ~937) |

---

## GHCP Seat Metrics

### Seats & ACR by Tier

| Metric | Definition |
|---|---|
| **GHCP Seats / ACR ($)** | Total paid GHCP units or ACR — includes Business, Enterprise, and Standalone |
| **GHCP Ent Seats / ACR ($)** | Copilot Enterprise tier |
| **GHCP Business Seats / ACR ($)** | Copilot Business tier |
| **GHCP Standalone Seats / ACR ($)** | Copilot Standalone offer |

> When Strategic Pillar = GitHub Copilot, ACR may differ from "GHCP ACR ($)" because the strategic pillar includes PRU revenue.

### Seat Adds & Targets

| Metric | Definition |
|---|---|
| **Seat Adds** | MoM net change in GHCP seats (e.g., Dec Adds = Dec seats − Nov seats) |
| **Seat Adds VTT** | Actual Seat Adds minus budgeted Seat Adds |
| **Gap to June Target** | June seat budget minus GHCP seats as of last closed month |
| **Seat Ratio** | ACR-to-seat conversion: **$16 per seat** |

> Seat Targets are authoritative only at Field Accountability Unit (area) and STB Mid-Segment (segment) levels. Lower-level values are derived approximations.

### Pipeline Seats

| Type | Definition |
|---|---|
| **Qualified Pipeline (QP)** | Beyond earliest stage, approved status, POC/Pilot or Production, open fiscal. Seat Ratio applied. |
| **Committed Pipeline (CP)** | Subset of QP marked committed |
| **Uncommitted Pipeline (UC)** | Subset of QP marked uncommitted |
| **Non-Qualified Pipeline (NQP)** | At earliest sales stage (Stage = 1) |

### Opportunity & Whitespace

| Metric | Definition |
|---|---|
| **GHCP Seat Opportunity** | `MAX(GHE License + GHE Metered, ADO Seats)` |
| **Remaining Seat Opp** | `Seat Oppty − GHCP Seats − QP Seats − NQP Seats` |
| **GHCP Attach** | `GHCP Seats / Seat Oppty` |
| **ARPU** | `GHCP ACR ($) / GHCP Seats` |
| **GHCP Monthly Whitespace** | `Seat Oppty − GHCP Seats (monthly)` |

---

## GitHub Enterprise (GHE) Seats

| Metric | Definition |
|---|---|
| **GHE License Seats** | Licensed, non-metered GHE seats (entitlement-based) |
| **GHE Metered Seats / ACR ($)** | Consumption-based metered GHE usage |
| **GHE Total Seats** | GHE License + GHE Metered |

## Azure DevOps (ADO) Seats

| Metric | Definition |
|---|---|
| **ADO Seats** | Total ADO seats (Repos/Boards Basic + Test Plans) |

## GitHub Advanced Security (GHAS)

| Metric | Definition |
|---|---|
| **GHAS Seats / ACR ($) (metered)** | Metered GHAS usage |
| **GHAzDO Seats (metered)** | GHAS via Azure DevOps |
| **GHAS Seats (license)** | Paid GHAS license seats |
| **GHAS Total** | GHAS metered + GHAS license seats |

## Premium Request Units (PRU)

> PRU ($) and PRU Units reflect **billable usage only** — consumption within monthly allowance is excluded.

| Metric | Definition |
|---|---|
| **PRU ($)** | ACR from Premium Request workloads |
| **PRU Units (#)** | Number of Premium Request units consumed |

---

## GHCP Growth Framework (Cohort Classification)

### Decision Tree

```
function classifyCohort(account):
    hasDevPlatform = GHE_Total_Seats > 0 OR ADO_Seats > 0

    if NOT hasDevPlatform AND GHCP_Seats == 0:
        return Cohort 0  # No platform

    if GHCP_Seats < 50:
        return Cohort 1  # Limited GHCP

    if GHCP_Attach < 50%:
        return Cohort 2  # Low attach

    if ARPU < $30:
        return Cohort 3  # Low ARPU

    return Cohort 4      # High value
```

### Cohort Definitions

| Cohort | Name | Criteria | Action | Recommended Next Steps |
|---|---|---|---|---|
| **0** | No platform | No GHE, no ADO, no GHCP | Land Copilot | Identify developer population, establish GHE/ADO baseline, pitch POC |
| **1** | Limited GHCP | GHE/ADO present, <50 GHCP seats | Land Copilot | Drive initial POC/pilot, team-level adoption, target 50+ seats |
| **2** | Low attach | >50 GHCP seats, <50% attach | Expand Copilot | Expand across teams, increase attach rate, target 50%+ coverage |
| **3** | Low ARPU | >50 GHCP, >50% attach, ARPU <$30 | Upsell to Enterprise | Upsell Business→Enterprise, drive PRU/custom models, target ARPU >$30 |
| **4** | High value | >50 GHCP, >50% attach, ARPU >$30 | Nurture & Cross-sell | GHAS, AI Foundry, AKS, Fabric, PGSQL, CSPM; protect base |

### Thresholds

| Threshold | Value | Purpose |
|---|---|---|
| Penetration (Enterprise) | 50 seats | Cohort 1→2 boundary |
| Penetration (SME&C) | 20 seats | SME&C penetration marker |
| Attach Rate Benchmark | 50% | Cohort 2→3 boundary |
| ARPU Threshold | $30/seat | Cohort 3→4 boundary; Enterprise vs Business monetization |
| Seat Ratio | $16/seat | Pipeline ACR-to-seat conversion |

### Report Action Column Mapping

The `Action` column in the PBI model maps to cohorts:
- `1. Land Copilot` = Cohort 0 or 1
- `2. Drive GHCP Expansion` = Cohort 2
- `3. Upsell to Enterprise` = Cohort 3
- `4. Nurture & Cross-sell` = Cohort 4

---

## Penetration Metrics

| Metric | Definition |
|---|---|
| **# GHCP Acc (LCM)** | Accounts with any GHCP ACR in last closed month |
| **Acc. Penetrated** | >50 GHCP seats (Enterprise) or >20 (SME&C) |
| **% Acc. Penetrated** | Penetrated accounts / total accounts |
| **# Acc with QP** | Accounts with ≥1 qualified pipeline milestone |
| **# Acc with CP** | Accounts with ≥1 committed pipeline milestone |

### Pipeline Segmentation (Mutually Exclusive)

| Category | Definition |
|---|---|
| **Acc QP > Threshold** | QP > 50 seats (Enterprise) or > 20 (SME&C) |
| **Acc QP < Threshold** | QP > 0 but ≤ threshold |
| **Acc NQP** | No QP, has NQP |
| **Acc No Pipe** | No pipeline at all |

---

## Seat Movement (NPSA Change Analysis)

Classifies accounts by MoM seat change:

| Category | Rule |
|---|---|
| **New** | Previous = 0, Current > 0 |
| **Increase** | Both > 0, MoM gain exceeds threshold |
| **Flat** | Both > 0, MoM change within threshold |
| **Decrease** | Both > 0, MoM loss exceeds threshold |
| **Loss** | Previous > 0, Current = 0 |
| **Not Customers** | Both = 0 |

Aggregate per category: **Count (#)**, **ACR ($)**, **Seats**.

### Penetration Change Analysis

| Category | Previous Month | Current Month |
|---|---|---|
| **Sustained Penetration** | Penetrated | Penetrated |
| **Newly Penetrated** | Not penetrated | Penetrated |
| **Lost Penetration** | Penetrated | Not penetrated |
| **Not Penetrated** | Not penetrated | Not penetrated |

---

## Engagement Metrics (from OctoDash)

| Metric | Definition |
|---|---|
| **Active User** | Using Code Completion, Chat, CLI, PR Summary, Knowledge Base, or API. Auth alone ≠ active. |
| **Engaged User** | Active + Code Completion suggestion must be **accepted** |
| **% Active User** | Active / Copilot licensed users |
| **% Engaged User** | Engaged / Copilot licensed users |

---

## GH + Azure Cross-Sell Metrics

| Metric | Definition |
|---|---|
| **SRE Agent ACR ($)** | Azure AI Agent usage |
| **AI Foundry ACR ($)** | Azure AI workloads (MaaS, OpenAI, AI services). Min: $1K SME&C, $5K Enterprise |
| **AKS ACR ($)** | Azure Kubernetes Service |
| **Fabric ACR ($)** | Microsoft Fabric F-SKU (OneLake, Data Warehousing, FabricDB) |
| **PGSQL ACR ($)** | Azure Database for PostgreSQL |
| **CSPM ACR ($)** | Microsoft Defender CSPM |

---

## Pipeline & Outlook

| Metric | Formula |
|---|---|
| **Baseline** | Last closed month ACR → daily run rate → projected forward |
| **PBO** | ACR actuals + Baseline + Committed Pipeline excl. Blocked |
| **NNR (Budget)** | ACR Budget − (ACR Actual + Baseline) |
| **CP to NNR** | Committed Pipeline excl. Blocked / \|NNR\| |
| **ACR Outlook** | Actuals + Baseline + weighted pipeline (committed × w₁ + uncommitted × w₂ + NQP × w₃) |

---

## Common Pitfalls

1. **Remaining ≠ Seat Oppty − GHCP Seats** — model also subtracts qualified AND unqualified pipeline seats.
2. **Seat Oppty ≠ GHE Total** for ADO-heavy accounts — Seat Oppty = ADO Seats when ADO > GHE.
3. **Group Seat Oppty** = SUM of per-account MAX values, not MAX of aggregated sums.
4. **Seat Targets** authoritative only at FAU and STB Mid-Segment levels.
5. **New Logo ACR excludes PRU** — remove PRU when comparing to $800/$320 thresholds.
6. **Strategic Pillar ACR ≠ GHCP ACR** — pillar includes PRU + GHE Metered + GHAS Metered.

---

*Source: Dev Services Hub — Metric Glossary (OneNote, dashboard owner: anays@microsoft.com)*
*Validated: 2026-02-27 against TPID 719650 (Millennium Partners).*
