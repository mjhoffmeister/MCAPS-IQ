---
name: appmod-milestone-finder
description: 'App modernization milestone finder: scans an account for active milestones representing platform modernization (database migrations, data platform upgrades, PaaS adoption) and filters out infra provisioning, IaaS lift-and-shift, billing swaps, and net-new greenfield. Triggers: app modernization, app mod milestones, modernization pipeline, data modernization, migrate and modernize, what modernization is happening.'
argument-hint: 'Provide customer name, e.g. "Contoso"'
---

## Purpose

Finds active milestones that represent genuine application or data platform modernization — where the workload changes from a legacy platform to a modern/PaaS equivalent. Filters out noise (infra provisioning, IaaS lift-and-shift, billing swaps, net-new greenfield, definition/assessment phases) so the user can focus triage on real modernization execution.

## Freedom Level

**Medium** — Classification requires judgment against the rules below; data retrieval is exact.

## Flow

### Step 1: Multi-keyword sweep

A single query won't catch all modernization milestones because they span different opportunities and workload names. Run **parallel keyword searches** against the customer to build complete coverage:

```
Keywords (run each as a separate get_milestones keyword search):
  migration, modernize, replatform, refactor,
  App Service, Container Apps, AKS, Kubernetes,
  Functions, Logic Apps, Spring Apps,
  SQL DB, SQL Managed, PostgreSQL, MySQL, Cosmos,
  Databricks, Fabric, Synapse, Data Factory, Data Lake,
  APIM, Service Bus, Event Hub,
  containerize, cloud-native
```

For each keyword, call `msx-crm:get_milestones` with `customerKeyword: "{customer}"`, `keyword: "{keyword}"`, `statusFilter: 'active'`, `format: 'summary'`.

Deduplicate results by `msp_engagementmilestoneid` across all sweeps.

### Step 2: Exclude non-execution milestones

First, drop milestones with non-active status: **Completed**, **Cancelled**, **Closed as Incomplete**.

Then scan milestone names (case-insensitive) for signals that the milestone is **preparatory, administrative, or supporting** rather than actual modernization execution. Milestone names are human-authored and inconsistent — use substring/prefix matching, not exact strings.

**Non-execution name signals** (any match → exclude):

| Category | Name signals (substring or prefix) | Why not execution |
|---|---|---|
| Assessment / Discovery | assess, discovery, evaluation, current state review, readiness assessment | Diagnostic — no workload moves |
| Definition / Scoping | def, definition, scoping, design, blueprint, target state, HLD, LLD | Planning artifact, not delivery |
| PoC / Pilot | poc, pilot, prototype, validation, feasibility, POV | Time-boxed feasibility check, not production |
| Planning / Readiness | planning, readiness, go-live prep, cutover plan | Pre-execution gate |
| Infra provisioning | infra, landing zone, env setup, platform setup, foundation build | Supporting infrastructure, not the app/data migration itself |
| Governance / Review | approval, review board, governance, compliance, ARB, SRB | Internal gate, no workload movement |
| Commercial / Admin | SOW, PO, funding, contract, commercial commit | Paperwork, not technology |
| Enablement | enablement, training, knowledge transfer, KT, workshop | People readiness, not workload delivery |
| Checkpoint / Gate | checkpoint, gate, phase complete, stage exit | Status marker, not work |

**Important**: These are heuristics, not absolutes. A milestone named "PoC - SQL Migration" might actually be execution if the team reuses "PoC" loosely. When a name signal fires but the workload field or opportunity context suggests real execution, flag it as **ambiguous** rather than auto-excluding.

Present excluded milestones grouped by category with counts, so the user can override if their account uses these terms differently.

### Step 3: Classify remaining milestones

Apply the **Modernization Classification Rules** below to each surviving milestone.

### Step 4: Present results

- Show `modernization` milestones in a table ordered by date
- Show `ambiguous` milestones separately with classification guidance
- Show `excluded_summary` counts
- If result set is empty, state explicitly — a thin modernization pipeline is a finding, not a failure

### Step 5: Offer batch tagging

If the user wants to track these milestones, offer:
```
tag_milestone(milestoneIds: [...all qualifying GUIDs], tag: "AppMod", reason: "...")
```

## Modernization Classification Rules

Apply these rules **in order**. The first matching rule wins.

### INCLUDE — True Modernization

A milestone qualifies if the workload destination is a **higher-abstraction platform** than the source:

| Pattern | Real examples from field | Why it qualifies |
|---|---|---|
| SQL Server → Azure Databricks | "SQL to Databricks M1", "EDW Databricks Migration Mar 26" | Database/analytics engine moves to managed lakehouse |
| SQL Server → Azure SQL DB / MI (PaaS) | "SQL Migration Phase 1" through Phase 8 | Database engine moves to managed PaaS |
| SQL Server → PostgreSQL (PaaS) | "HUM \| SQL Server \| PGSQL Phase 1" | Database engine moves to managed open-source PaaS |
| Oracle → PostgreSQL (PaaS) | "HUM \| Oracle \| PGSQL Phase 1" | Database engine moves to managed PaaS |
| SAS → Azure Databricks | "SAS DB DBU Migration Phase 3" | Legacy analytics platform → managed lakehouse |
| Synapse → Fabric | "HUMANA INC - Synapse to Fabric Migration" | Analytics platform upgrades to next-gen PaaS |
| On-prem data warehouse → Fabric | "Surround Snow with Fabric", "Fabric Q1-Q20" | Analytics platform changes to managed PaaS |
| On-prem apps → App Service / Container Apps / AKS | "App Service Optimization" | Compute moves from VMs to PaaS |
| Legacy workflows → Logic Apps Standard / Durable Functions | "Logic Apps Standard Adoption" | Workflow engine moves to PaaS |
| SSRS → modern reporting | Part of "CPSS (SQL / SSRS Migration)" | Reporting platform modernization |
| Interoperability data analytics migration | "InterOp Data Analytics Phase 1-3" | Data pipeline modernization to managed platform |
| MACC quarterly modernization milestones | "WM+M Q1", "Analytics Q1", "Fabric Q1" | Ongoing modernization pipeline sliced by quarter |

### EXCLUDE — Not Modernization

| Pattern | Why it's excluded |
|---|---|
| **Infra provisioning milestones** — names containing "Infra" (e.g., "M1 Infra", "Apr Infra 26") | Infrastructure setup for migrations, not the migration itself. Always paired with a non-Infra sibling that IS the app mod milestone. |
| **Definition/assessment phases** — "Def for SQL Phase N", "PoC - Assess - Plan" | Pre-qualification planning, not execution. Tracks separately from active modernization. |
| **IaaS lift-and-shift** — on-prem VMs → Azure VMs, AVS, AVD/Citrix | Platform abstraction doesn't change; still managing VMs/OS |
| **Epic on Azure** | EHR runs on Azure VMs (IaaS), not PaaS — this is a hosting migration |
| **Billing/SKU swaps** — Power BI P-SKU → Fabric F-SKU, reservation changes, "P to FSKU Migration" | Commercial change, not a platform change |
| **Net-new apps/analytics** — new AI agents, new Fabric workspaces, new Copilot deployments | Greenfield, not modernization of an existing workload |
| **Security/compliance overlays** — Defender for Cloud, WAF, Sentinel | Security tooling, not app/data platform change |
| **Hybrid management** — Azure Arc | Management layer change, not platform modernization |
| **Expansion/growth** — VMware cluster expansion, additional VM capacity | More of existing platform, not a platform change |
| **Developer tooling** — GitHub, Copilot, DevOps | Toolchain, not workload modernization |
| **M365 / D365 / SaaS adoption** — Copilot Chat, Modern Work | SaaS consumption, not platform engineering |
| **Clinical/business apps on existing platforms** — "Copilots for Clinicians", "Clinical Ladder Optimization", "Value-Based Care" | These run ON modern platforms but aren't modernizing FROM a legacy platform |
| **RPA VM hosting** — Blue Prism on Azure VMs | Still running on VMs |

### AMBIGUOUS — Flag for User Decision

| Pattern | Guidance |
|---|---|
| **APIM adoption** | Include if replacing existing on-prem API gateway; exclude if net-new API layer for AI workloads |
| **Databricks on Azure (standalone)** | Include if replacing on-prem Hadoop/Spark/SAS; exclude if net-new data sharing/AI |
| **Azure Arc for SQL** | Exclude by default (management plane); include if explicitly scoped as step toward Azure SQL migration |
| **Interoperability milestones** | Include if workload shows data analytics migration; exclude if purely integration/API work with no platform change |
| **MACC "ACD Reductions"** | Usually billing optimization, not modernization — but verify workload field |
| **Opportunities with "ACO" in the name** | May contain Databricks workloads that are net-new analytics, not migrations — check workload field |

When a milestone is ambiguous, present it in a separate **"Needs Classification"** section with the reason.

## Decision Logic

- Only the **workload destination** matters — not the opportunity name or sales motion label
- Read the `workload` field (`_msp_workloadlkid_value` formatted value) as the primary signal
- Workloads containing "Migration" or "Migrate" in the workload name are strong candidates
- Cross-reference the milestone name for context when the workload field alone is ambiguous
- **Opportunity names can mislead**: "Humana | Interoperability" contained valid Databricks migration milestones; "Humana | ACO" contained Databricks workloads that may be net-new
- **Infra milestones always have a non-Infra sibling** — if you see "M1 Infra", expect "M1" as the actual app mod milestone
- **MACC quarterly milestones (Q1-Q20)** represent long-term modernization pipeline — include all active quarters
- A thin result set is a valid, reportable finding — it indicates a modernization pipeline gap

## Output Schema

- `modernization_milestones`: table with Opportunity, Milestone, Owner, Date, Monthly ACR, Customer Commitment, Workload
- `excluded_summary`: count of milestones excluded, grouped by reason (Infra, Def/PoC, IaaS, billing swap, net-new, clinical/business app, etc.)
- `ambiguous`: milestones needing user classification, with reason
- `gap_assessment`: one-sentence observation on modernization pipeline depth
- `next_action`: "Modernization milestones identified. Run `tag_milestone(milestoneIds: [...], tag: 'AppMod', reason: '...')` to batch-tag for tracking, or `milestone-health-review` to triage health."
- `connect_hook_hint`: Circle(s): Customer/Business — "Identified {n} active app/data modernization milestones for {customer} totaling ${acr}/mo — {gap_observation}"
