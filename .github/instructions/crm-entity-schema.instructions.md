---
description: "CRM entity schema reference for Dynamics 365 OData queries. Use when constructing crm_query, crm_get_record, or any OData filter/select expressions to avoid property name guessing."
applyTo: "mcp-server/**"
---
# CRM Entity Schema Reference

Use this reference when constructing `crm_query` calls against Dynamics 365 entities.
Incorrect entity set names or field names will return 404 or 400 errors.

## Rules

- **Never guess property names.** Use only the property names listed below or discovered via `crm_list_entity_properties`.
- If a needed property is not listed here, call `crm_list_entity_properties` with the entity logical name before querying.
- Lookup/reference fields always use the pattern `_<fieldname>_value` (e.g. `_ownerid_value`, `_parentaccountid_value`).
- Entity set names are **plural** (e.g. `accounts`, `opportunities`). Entity logical names for metadata are **singular** (e.g. `account`, `opportunity`).
- **Entity allowlist**: `crm_query` and `crm_get_record` only accept entity sets in `ALLOWED_ENTITY_SETS` (defined in `mcp/msx/src/tools.js`). Currently allowed: `accounts`, `contacts`, `opportunities`, `msp_engagementmilestones`, `msp_dealteams`, `msp_workloads`, `tasks`, `systemusers`, `transactioncurrencies`, `connections`, `connectionroles`, `processstages`, `EntityDefinitions`. Queries to unlisted entities are rejected.
- **Pagination ceiling**: `crm_query` auto-pagination caps at 500 records (`CRM_QUERY_MAX_RECORDS`). Use `$top` ≤ 500 and scoped `$filter` expressions to stay within bounds.

## Common Entities

### accounts (logical name: account)

| Property               | Type             | Description                                                 |
| ---------------------- | ---------------- | ----------------------------------------------------------- |
| accountid              | Uniqueidentifier | Primary key                                                 |
| name                   | String           | Account name                                                |
| msp_mstopparentid      | String           | MS Top Parent ID (TPID) —**NOT** `msp_accounttpid` |
| _ownerid_value         | Lookup           | Owner system user                                           |
| _parentaccountid_value | Lookup           | Parent account                                              |

### opportunities (logical name: opportunity)

| Property                         | Type             | Description                                  |
| -------------------------------- | ---------------- | -------------------------------------------- |
| opportunityid                    | Uniqueidentifier | Primary key                                  |
| name                             | String           | Opportunity name                             |
| msp_opportunitynumber            | String           | MSX opportunity number (e.g. "7-3CVDESBISU") |
| estimatedclosedate               | DateTime         | Estimated close date                         |
| msp_estcompletiondate            | DateTime         | Estimated completion date                    |
| msp_consumptionconsumedrecurring | Decimal          | Consumed recurring consumption               |
| _ownerid_value                   | Lookup           | Owner system user                            |
| _parentaccountid_value           | Lookup           | Parent account                               |
| msp_salesplay                    | Picklist         | Sales play / solution area                   |
| msp_opportunitynumber            | String           | Opportunity number (e.g. "7-XXXXXXXXX")      |
| statecode                        | State            | Record state (0 = Open)                      |

### msp_engagementmilestones (logical name: msp_engagementmilestone)

| Property                          | Type                          | Description                                                                                                                                                                                                                     |
| --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| msp_engagementmilestoneid         | Uniqueidentifier              | Primary key                                                                                                                                                                                                                     |
| msp_milestonenumber               | String                        | Milestone number (e.g. "7-123456789")                                                                                                                                                                                           |
| msp_name                          | String                        | Milestone name                                                                                                                                                                                                                  |
| _msp_workloadlkid_value           | Lookup                        | Workload                                                                                                                                                                                                                        |
| msp_commitmentrecommendation      | Picklist                      | Commitment recommendation                                                                                                                                                                                                       |
| msp_milestonecategory             | Picklist                      | Milestone category                                                                                                                                                                                                              |
| msp_monthlyuse                    | Decimal                       | Monthly use value                                                                                                                                                                                                               |
| msp_milestonedate                 | DateTime                      | Milestone date                                                                                                                                                                                                                  |
| msp_milestonestatus               | Picklist                      | Milestone status                                                                                                                                                                                                                |
| _ownerid_value                    | Lookup                        | Owner system user                                                                                                                                                                                                               |
| _msp_opportunityid_value          | Lookup                        | Parent opportunity                                                                                                                                                                                                              |
| msp_forecastcomments              | String                        | Forecast comments                                                                                                                                                                                                               |
| msp_forecastcommentsjsonfield     | String                        | Forecast comments (JSON)                                                                                                                                                                                                        |
| msp_milestoneworkload             | Picklist                      | Workload Type (861980000=Azure, 861980001=Dynamics 365, 861980002=Security, 861980003=Modern Work)                                                                                                                              |
| msp_deliveryspecifiedfield        | Picklist                      | Delivered By (606820000=Customer, 606820001=Partner, 606820002=ISD, 606820003=Microsoft Support)                                                                                                                                |
| msp_milestonepreferredazureregion | Picklist                      | Preferred Azure Region (75 options — use `get_milestone_field_options` for full list; common: 861980076=None, 861980005=East US, 861980006=East US 2, 861980018=Central US, 861980040=West US 2, 861980001=West Europe)      |
| msp_milestoneazurecapacitytype    | **MultiSelectPicklist** | Azure Capacity Type — comma-separated string of codes (65 options — use `get_milestone_field_options` for full list; common: 861980000=None, 861980081=Azure OpenAI Service, 861980065=Azure SQL Database, 861980032=Other) |

### tasks (logical name: task)

| Property                 | Type             | Description                            |
| ------------------------ | ---------------- | -------------------------------------- |
| activityid               | Uniqueidentifier | Primary key                            |
| subject                  | String           | Task subject/title                     |
| description              | String           | Task description                       |
| scheduledend             | DateTime         | Due date                               |
| statuscode               | Status           | Status code (5=Completed, 6=Cancelled) |
| statecode                | State            | Record state                           |
| _ownerid_value           | Lookup           | Owner system user                      |
| _regardingobjectid_value | Lookup           | Regarding record                       |
| msp_taskcategory         | Picklist         | Task category                          |
| createdon                | DateTime         | Created timestamp                      |

### systemusers (logical name: systemuser)

| Property             | Type             | Description   |
| -------------------- | ---------------- | ------------- |
| systemuserid         | Uniqueidentifier | Primary key   |
| fullname             | String           | Full name     |
| internalemailaddress | String           | Email address |
| title                | String           | Job title     |
| businessunitid       | Lookup           | Business unit |

### msp_dealteams (logical name: msp_dealteam)

| Property                       | Type             | Description                    |
| ------------------------------ | ---------------- | ------------------------------ |
| msp_dealteamid                 | Uniqueidentifier | Primary key                    |
| _msp_dealteamuserid_value      | Lookup           | Deal team member (system user) |
| _msp_parentopportunityid_value | Lookup           | Parent opportunity             |
| statecode                      | State            | Record state (0 = Active)      |

### msp_workloads (logical name: msp_workload)

| Property       | Type             | Description   |
| -------------- | ---------------- | ------------- |
| msp_workloadid | Uniqueidentifier | Primary key   |
| msp_name       | String           | Workload name |

> **Note**: `msp_workloads` does **not** have `_msp_opportunityid_value`. You cannot filter workloads by opportunity. To find the workload GUID for an opportunity, query `msp_engagementmilestones` filtered by `_msp_opportunityid_value` and read `_msp_workloadlkid_value` from the results.

## Known Invalid Entity Sets (DO NOT USE)

| Attempted            | Error | Correct                      |
| -------------------- | ----- | ---------------------------- |
| `msp_milestones`   | 404   | `msp_engagementmilestones` |
| `msp_milestoneses` | 404   | `msp_engagementmilestones` |

## Known Invalid Fields (DO NOT USE)

| Field                                            |            Error            | Notes                                                                                                                                                                                            |
| ------------------------------------------------ | :-------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `msp_forecastedconsumptionrecurring`           | 400 — not a valid property | Does not exist on `msp_engagementmilestone`                                                                                                                                                    |
| `msp_committedconsumptionrecurring`            | 400 — not a valid property | Does not exist on `msp_engagementmilestone`                                                                                                                                                    |
| `msp_estimatedcompletiondate`                  | 400 — not a valid property | Does not exist on `msp_engagementmilestone`; use `msp_milestonedate` instead                                                                                                                 |
| `_parentaccountid_value`                       | 400 — not a valid property | Does not exist on `msp_engagementmilestone`; lives on `opportunity` — join via `_msp_opportunityid_value` instead                                                                         |
| `msp_workloadtype`                             | 400 — not a valid property | Does not exist on `msp_engagementmilestone`; use `msp_milestoneworkload` instead                                                                                                             |
| `msp_preferredazureregion`                     | 400 — not a valid property | Does not exist on `msp_engagementmilestone`; use `msp_milestonepreferredazureregion` instead                                                                                                 |
| `msp_azurecapacitytype`                        | 400 — not a valid property | Does not exist on `msp_engagementmilestone`; use `msp_milestoneazurecapacitytype` instead                                                                                                    |
| `msp_opportunityid`                            | 400 — not a valid property | Does not exist on `opportunity`; use `msp_opportunitynumber` for the opportunity number or `opportunityid` for the primary key                                                             |
| `_msp_opportunityid_value` on `msp_workload` | 400 — not a valid property | Does not exist on `msp_workload`; workloads are not linked to opportunities — query `msp_engagementmilestones` by `_msp_opportunityid_value` and read `_msp_workloadlkid_value` instead |

## Common Mistakes to Avoid

- ❌ `msp_accounttpid` → ✅ `msp_mstopparentid` (TPID on accounts)
- ❌ `ownerid` in $filter → ✅ `_ownerid_value` (lookup pattern)
- ❌ `parentaccountid` in $filter → ✅ `_parentaccountid_value`
- ❌ `opportunityid` in milestone filter → ✅ `_msp_opportunityid_value`
- ❌ `taskid` → ✅ `activityid` (tasks use activity primary key)
- ❌ `msp_engagementmilestone` as entity set → ✅ `msp_engagementmilestones` (plural)
- ❌ `msp_estimatedcompletiondate` on milestone → ✅ `msp_milestonedate` (correct date field)
- ❌ `msp_workloadtype` on milestone → ✅ `msp_milestoneworkload` (Workload Type picklist)
- ❌ `msp_preferredazureregion` on milestone → ✅ `msp_milestonepreferredazureregion` (Preferred Azure Region picklist)
- ❌ `msp_azurecapacitytype` on milestone → ✅ `msp_milestoneazurecapacitytype` (Azure Capacity Type)
- ❌ `msp_opportunityid` on opportunity → ✅ `msp_opportunitynumber` (opportunity number string)
- ❌ `_msp_opportunityid_value` on `msp_workloads` → ✅ query `msp_engagementmilestones` by `_msp_opportunityid_value`, read `_msp_workloadlkid_value`

## Milestone Status Codes

| Label                | Value         |
| -------------------- | ------------- |
| On Track             | `861980000` |
| At Risk              | `861980001` |
| Blocked              | `861980002` |
| Completed            | `861980003` |
| Cancelled            | `861980004` |
| Not Started          | `861980005` |
| Closed as Incomplete | `861980007` |

## Commitment Recommendation Codes

| Label       | Value         |
| ----------- | ------------- |
| Uncommitted | `861980000` |
| Committed   | `861980001` |

## Milestone Category Codes

| Label     | Value         |
| --------- | ------------- |
| POC/Pilot | `861980000` |

## Workload Type Codes (`msp_milestoneworkload`)

**Required** for milestone creation. All four values are known — no need to call `get_milestone_field_options`.

| Label        | Value         |
| ------------ | ------------- |
| Azure        | `861980000` |
| Dynamics 365 | `861980001` |
| Security     | `861980002` |
| Modern Work  | `861980003` |

## Delivered By Codes (`msp_deliveryspecifiedfield`)

**Required** for milestone creation. All three values are known — no need to call `get_milestone_field_options`.

| Label    | Value         |
| -------- | ------------- |
| Customer | `606820000` |
| Partner  | `606820001` |
| ISD      | `606820002` |

## Preferred Azure Region Codes (`msp_milestonepreferredazureregion`)

**Required** for milestone creation. The full list has ~75 options. Common values are listed below. If the user's region is not listed here, call `get_milestone_field_options(field: "preferredAzureRegion")` to retrieve the complete list from live metadata.

| Label                      | Value         |
| -------------------------- | ------------- |
| West Europe - Amsterdam    | `861980001` |
| East US - Blue Ridge       | `861980005` |
| East US 2 - Boydton        | `861980006` |
| Central US - Des Moines    | `861980018` |
| North Europe - Dublin      | `861980022` |
| West US 3 - Phoenix        | `861980036` |
| West US 2 - Quincy         | `861980040` |
| Southeast Asia - Singapore | `861980046` |
| None                       | `861980076` |

## Azure Capacity Type Codes (`msp_milestoneazurecapacitytype`)

**Required** for milestone creation. This is a **MultiSelectPicklist** — pass values as a comma-separated string of codes (e.g. `"861980081,861980065"`). The full list has ~65 options. Common values are listed below. If the user's capacity type is not listed here, call `get_milestone_field_options(field: "azureCapacityType")` to retrieve the complete list from live metadata.

| Label                                     | Value         |
| ----------------------------------------- | ------------- |
| None                                      | `861980000` |
| Other                                     | `861980032` |
| Av2/Dv2/Dv3/Ev3/Dsv3/Esv3 (Intel) (Cores) | `861980037` |
| Azure SQL Database (Cores or DTUs)        | `861980065` |
| Nd H100 V5 (Cores) (Future)               | `861980080` |
| Azure OpenAI Service                      | `861980081` |

## Task Category Codes (`msp_taskcategory`)

Used when creating tasks via `create_task`.

| Label                       | Value         |
| --------------------------- | ------------- |
| Workshop                    | `861980001` |
| Demo                        | `861980002` |
| Architecture Design Session | `861980004` |
| PoC/Pilot                   | `861980005` |
| Technical Close/Win Plan    | `606820005` |
| Blocker Escalation          | `861980006` |
| Consumption Plan            | `861980007` |
| Briefing                    | `861980008` |

## Milestone Picklist Resolution Procedure

When creating or updating milestones, the agent **MUST** map picklist fields to valid numeric codes. Follow these steps:

### Step 1: Check embedded tables first

For fields with a small, stable option set, use the tables above directly:

- **Workload Type** — 4 options, fully listed above
- **Delivered By** — 4 options, fully listed above
- **Milestone Status** — 7 options, fully listed above
- **Commitment Recommendation** — 2 options, fully listed above
- **Milestone Category** — listed above
- **Task Category** — 8 options, fully listed above

### Step 2: Check common values for large picklists

For fields with many options, check the common-values tables above:

- **Preferred Azure Region** — 9 common values listed; ~75 total
- **Azure Capacity Type** — 6 common values listed; ~65 total

### Step 3: Call `get_milestone_field_options` for unlisted values

If the user specifies a region or capacity type **not found** in the common-values tables above, call:

```
get_milestone_field_options({ field: "preferredAzureRegion" })
get_milestone_field_options({ field: "azureCapacityType" })
```

These query live Dynamics 365 metadata and return the full option list.

### Step 4: Never guess codes

- **Never invent a numeric code.** If a value cannot be matched to a known option, call `get_milestone_field_options` to discover it.
- If `get_milestone_field_options` returns no match, ask the user to verify the value.

### Required fields for `create_milestone`

The following picklist fields are **mandatory** — `create_milestone` will reject payloads missing any of them:

1. `workloadType` — map from Workload Type Codes
2. `deliveredBy` — map from Delivered By Codes
3. `preferredAzureRegion` — map from Preferred Azure Region Codes (or `get_milestone_field_options`)
4. `azureCapacityType` — map from Azure Capacity Type Codes (or `get_milestone_field_options`); pass as comma-separated string for multiple

### `get_milestone_field_options` Tool Reference

| Parameter | Type              | Accepted values                                                                            |
| --------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `field` | string (required) | `"workloadType"`, `"deliveredBy"`, `"preferredAzureRegion"`, `"azureCapacityType"` |

Returns `{ field, logicalName, options: [{ value, label }] }` from live Dynamics 365 metadata.

## Filtering Milestones via `crm_query`

Prefer `crm_query` with `entitySet: "msp_engagementmilestones"` over `get_milestones` when you need:

- Status filtering (e.g., only active milestones)
- Multi-opportunity queries (OR filters)
- Date range scoping
- Minimal field selection

### Example: Milestones for one opportunity (active only)

```
crm_query({
  entitySet: "msp_engagementmilestones",
  filter: "_msp_opportunityid_value eq '<GUID>' and msp_milestonestatus eq 861980000",
  select: "msp_milestonenumber,msp_name,msp_milestonestatus,msp_milestonedate,msp_monthlyuse,msp_commitmentrecommendation",
  orderby: "msp_milestonedate asc",
  top: 25
})
```

### Example: Milestones across multiple opportunities

```
crm_query({
  entitySet: "msp_engagementmilestones",
  filter: "(_msp_opportunityid_value eq '<GUID1>' or _msp_opportunityid_value eq '<GUID2>') and msp_milestonestatus ne 861980003 and msp_milestonestatus ne 861980004",
  select: "msp_milestonenumber,msp_name,msp_milestonestatus,msp_milestonedate,msp_monthlyuse,_msp_opportunityid_value",
  orderby: "msp_milestonedate asc",
  top: 50
})
```

## `get_milestones` Tool — Actual Parameters

The `get_milestones` tool accepts these parameters (defined in `mcp/msx/src/tools.js`):

| Parameter              | Type                                    | Description                                                                      |
| ---------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `customerKeyword`    | string                                  | Resolves customer name → accounts → opportunities → milestones in one call    |
| `opportunityKeyword` | string                                  | Resolves opportunity name → milestones in one call                              |
| `opportunityId`      | string (GUID)                           | Filter by single opportunity                                                     |
| `opportunityIds`     | string[] (GUIDs)                        | Batch mode: array of opportunity GUIDs (chunked to groups of 25)                 |
| `milestoneNumber`    | string                                  | Filter by milestone number                                                       |
| `milestoneId`        | string (GUID)                           | Get single milestone by ID                                                       |
| `ownerId`            | string (GUID)                           | Filter by owner                                                                  |
| `mine`               | boolean                                 | Get all milestones owned by current user                                         |
| `statusFilter`       | 'active'\| 'all'                        | Filter by status: active = Not Started/In Progress/Blocked/At Risk               |
| `keyword`            | string                                  | Case-insensitive keyword filter across milestone name, opportunity, and workload |
| `format`             | 'full'\| 'summary'                      | Response format: summary groups by status/commitment/opportunity                 |
| `taskFilter`         | 'all'\| 'with-tasks' \| 'without-tasks' | Filter milestones by task presence                                               |
| `includeTasks`       | boolean                                 | When true, embeds linked tasks inline on each milestone (default: false)         |

**Preferred patterns (one-call milestone retrieval):**

- `get_milestones({ customerKeyword: "Contoso", statusFilter: "active" })` — 1 call
- `get_milestones({ opportunityKeyword: "Azure Migration", includeTasks: true })` — 1 call with tasks
- `get_milestones({ opportunityIds: [...], format: "summary" })` — batch mode with compact output

## Deal Team: Opportunity vs. Milestone Ownership

MSX has **two distinct deal team concepts** that are often conflated. The agent must distinguish them clearly.

### Opportunity Deal Team (queryable via `msp_dealteams`)

The formal deal team lives at the **opportunity level**. Being on the opportunity deal team grants visibility and accountability for the entire opportunity. This is the deal team users typically mean when they say "deal team."

The `msp_dealteams` entity exposes deal-team membership via OData. Key fields:

- `_msp_dealteamuserid_value` — the team member (system user lookup)
- `_msp_parentopportunityid_value` — the parent opportunity
- `statecode` — filter on `0` for active records

Example query — find all opportunities where a user is on the deal team:

```
crm_query({
  entitySet: "msp_dealteams",
  filter: "_msp_dealteamuserid_value eq '<USER_GUID>' and statecode eq 0",
  select: "_msp_parentopportunityid_value"
})
```

**Note:** The `msp_dealteams` entity may not be available in all environments. When unavailable, fall back to milestone ownership (see below).

### Milestone Deal Team (retrievable via `_ownerid_value`)

Each engagement milestone has an **owner** (`_ownerid_value` on `msp_engagementmilestones`). Owning a milestone means you are part of the milestone-level execution team.

**Key distinction:** Being assigned as a milestone owner does **NOT** automatically add you to the opportunity deal team. These are separate relationships in MSX.

The `get_my_active_opportunities` tool uses `msp_dealteams` as its primary lookup and falls back to milestone ownership as a heuristic when `msp_dealteams` is unavailable.

### What we CAN do

| Question                                 | Tool / Approach                                             | Reliability                                         |
| ---------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| Who is on the opportunity deal team?     | `crm_query` on `msp_dealteams`                          | Reliable (where entity is available)                |
| Am I on the opportunity deal team?       | `crm_query` on `msp_dealteams` filtered by user         | Reliable (where entity is available)                |
| Who owns milestones on this opportunity? | `get_milestones({ opportunityId })` → `_ownerid_value` | Reliable                                            |
| Which opportunities am I involved in?    | `get_my_active_opportunities()`                           | Reliable (deal team + milestone heuristic fallback) |

## CRM Record URL Pattern

All CRM records can be linked directly using this URL template:
```
https://microsoftsales.crm.dynamics.com/main.aspx?etn=<entityLogicalName>&id=<GUID>&pagetype=entityrecord
```

| Entity | `etn` value | GUID field |
|---|---|---|
| Account | `account` | `accountid` |
| Opportunity | `opportunity` | `opportunityid` |
| Milestone | `msp_engagementmilestone` | `msp_engagementmilestoneid` |
| Task | `task` | `activityid` |
| System User | `systemuser` | `systemuserid` |

The `get_milestones` tool returns a pre-built `recordUrl` per milestone — prefer using it over manual construction.

## Dynamic Schema Discovery

When a property is not listed above, use the `crm_list_entity_properties` MCP tool:

```
crm_list_entity_properties({ entityLogicalName: "account", filter: "tpid" })
```

This returns all matching properties with their logical names and types.
