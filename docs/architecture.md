# Architecture & What's Included

## How It Works

![alt text](assets/how-it-works-flat.png)

```
You (Copilot Chat)
  │
  ├── asks about CRM data  ──→ msx-crm MCP server ──→ MSX Dynamics 365
  ├── asks about M365 data ──→ workiq MCP server  ──→ Teams / Outlook / SharePoint
  └── asks about notes     ──→ OIL (optional)     ──→ Your Obsidian Vault
```

1. You type a question or action in Copilot chat.
2. Copilot reads the role skills and instruction files in this repo to understand how to behave.
3. It routes your request to the right MCP server (CRM, WorkIQ, or Obsidian).
4. For read operations, it returns the results directly.
5. For write operations, it shows you what it plans to change and waits for your approval.

---

## Project Layout

![alt text](assets/project-layout-flat.png)

| Folder                              | What's inside                                                                                                                         | Editable?                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `.github/copilot-instructions.md` | Global Copilot behavior — the "system prompt"                                                                                        | **Yes** — your main customization lever     |
| `.github/instructions/`           | Operational rules loaded by keyword match                                                                                             | **Yes** — add your team's workflow gates    |
| `.github/skills/`                 | 27 atomic domain skills (loaded on demand by keyword match)                                                                           | **Yes** — tailor to your operating model    |
| `.github/prompts/`                | Reusable prompt templates (slash commands in VS Code; copyable prompts elsewhere)                                                      | **Yes** — create workflows you repeat often |
| `.vscode/mcp.json`                | MCP server definitions (CRM, WorkIQ, Power BI, Obsidian)                                                                              | **Yes** — add/remove data sources           |
| `mcp/msx/`                        | MSX CRM MCP server *(subtree: [microsoft/msx-copilot-mcp](https://github.com/microsoft/msx-copilot-mcp))*                                  | Optional — works out of the box                   |
| `mcp/oil/`                        | Obsidian Intelligence Layer *(subtree: [microsoft/Obsidian-Intelligence-Layer](https://github.com/microsoft/Obsidian-Intelligence-Layer))* | Optional — enables persistent vault memory        |
| `docs/`                           | Architecture docs and supporting material                                                                                             | Reference only                                     |

---

## MSX CRM MCP Tools

These tools let Copilot interact with MSX CRM on your behalf:

| Tool                              | What it does                                                 |
| --------------------------------- | ------------------------------------------------------------ |
| `crm_whoami`                    | Checks who you are in MSX (validates authentication)         |
| `crm_query`                     | Runs read-only OData queries against CRM                     |
| `crm_get_record`                | Fetches a specific CRM record by ID                          |
| `list_opportunities`            | Lists opportunities, filterable by customer                  |
| `get_milestones`                | Lists milestones for an opportunity or owner                 |
| `find_milestones_needing_tasks` | Finds milestones across customers that need task attention   |
| `view_milestone_timeline`       | Returns a timeline view of milestones                        |
| `view_opportunity_cost_trend`   | Returns cost trend data for an opportunity                   |
| `create_task`                   | ⚠️ Creates a new task under a milestone *(write — staged)* |
| `update_task` / `close_task`  | ⚠️ Updates or closes an existing task *(write — staged)*   |
| `update_milestone`              | ⚠️ Updates milestone status or details *(write — staged)*  |

---

## Role Cards & Atomic Skills

The system uses **role cards** (identity and accountability rules) combined with **27 atomic skills** (focused domain playbooks). Role cards live in `.github/instructions/` and are loaded by keyword match; atomic skills live in `.github/skills/` and are loaded on demand.

**Role cards** (one per MCAPS role):

- **[Specialist](../.github/instructions/role-card-specialist.instructions.md)** — pipeline creation, opportunity qualification, Stage 2-3 progression
- **[Solution Engineer](../.github/instructions/role-card-se.instructions.md)** — technical proof, architecture reviews, task hygiene
- **[Cloud Solution Architect](../.github/instructions/role-card-csa.instructions.md)** — execution readiness, architecture handoff, delivery ownership
- **[Customer Success Account Manager](../.github/instructions/role-card-csam.instructions.md)** — milestone health, adoption, value realization, commit gates

**Atomic skills** (examples — see `.github/skills/` for all 27):

| Skill                            | What it does                                     |
| -------------------------------- | ------------------------------------------------ |
| `pipeline-qualification`       | Qualifies new opportunities at Stages 1-2        |
| `milestone-health-review`      | Reviews committed milestone health at Stages 4-5 |
| `proof-plan-orchestration`     | Manages technical proof plans for SE             |
| `risk-surfacing`               | Proactively identifies deal/execution risks      |
| `handoff-readiness-validation` | Validates handoff quality between roles          |
| `workiq-query-scoping`         | Scopes M365 searches for effective retrieval     |

You don't need to memorize these — just tell Copilot your role and it will load the right card and activate relevant skills automatically.

---

## WorkIQ (M365 Evidence Retrieval)

WorkIQ connects Copilot to your Microsoft 365 data. It can search across:

- **Teams** — chat/thread decisions, channel updates, action ownership
- **Meetings** — transcript evidence, decisions, blockers, next steps
- **Outlook** — stakeholder communication trail, commitments, follow-ups
- **SharePoint/OneDrive** — latest proposal/design docs and revision context

Learn more: [WorkIQ overview (Microsoft Learn)](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/workiq-overview)

---

## MCP Server Configuration

The file [.vscode/mcp.json](../.vscode/mcp.json) defines which MCP servers are available to Copilot. Each server exposes tools that Copilot can call on your behalf. Out of the box, it includes:

| Server      | Status            | Purpose                          | Tools It Provides                                                                                |
| ----------- | ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `msx-crm` | **Enabled** | MSX CRM operations               | `crm_whoami`, `crm_query`, `list_opportunities`, `get_milestones`, `create_task`, etc. |
| `workiq`  | **Enabled** | Microsoft 365 evidence retrieval | `ask_work_iq` (Teams, Outlook, SharePoint)                                                     |
| `powerbi-remote` | **Enabled** | Power BI analytics | `DiscoverArtifacts`, `GetSemanticModelSchema`, `GenerateQuery`, `ExecuteQuery` |
| `oil`     | Commented out     | Obsidian Intelligence Layer      | `get_customer_context`, `search_vault`, `prepare_crm_prefetch`, `promote_findings`, etc. |

You can add any MCP-compatible server to this file. See the [Customization guide](customization.md) for examples.

---

## Note on Subtrees

`mcp/msx` and `mcp/oil` are [git subtrees](https://www.atlassian.com/git/tutorials/git-subtree) — they live in this repo as normal files but are also maintained in their own standalone repos. No special clone flags needed.
