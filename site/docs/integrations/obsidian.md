---
title: Obsidian Vault Integration (OIL)
description: Turn your Obsidian vault into persistent agent memory.
tags:
  - integrations
  - obsidian
  - oil
---

# Obsidian Vault Integration (OIL)

The **Obsidian Intelligence Layer (OIL)** turns your local Obsidian vault into a durable knowledge layer for AI agents. Instead of starting every conversation from scratch, OIL gives agents persistent memory — customer context, meeting history, relationship maps, and accumulated insights.

!!! info "Don't use Obsidian?"
    Everything works without it. The system operates statelessly (CRM-only) and you can bring your own persistence layer if desired.

---

## Why Obsidian?

- **100% local** — your notes never leave your machine
- **Graph-based** — wikilinks give OIL a pre-built relationship graph (people ↔ customers ↔ meetings)
- **Markdown-native** — plain `.md` files you own forever
- **Works offline** — Obsidian doesn't even need to be running; OIL reads the folder directly

---

## Setup

### 1. Enable in MCP Config

Open `.vscode/mcp.json` and uncomment the `"oil"` block:

```jsonc
"oil": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@jinlee794/obsidian-intelligence-layer@latest", "mcp"],
    "env": {
        "OBSIDIAN_VAULT_PATH": "${input:vault_path}"
    }
}
```

### 2. Start the Server

Click **Start** on `oil` in VS Code. When prompted, enter the absolute path to your vault.

---

## Vault Structure

OIL expects this minimal folder structure:

```
YourVault/
├── Customers/       # One .md per customer (e.g., Contoso.md)
├── People/          # One .md per contact (e.g., Alice Smith.md)
├── Meetings/        # Meeting notes with wikilinks
└── oil.config.yaml  # Optional — customize paths and fields
```

See the upstream OIL repository for example template files and advanced configuration:
https://github.com/JinLee794/Obsidian-Intelligence-Layer

---

## Tools (22 Total)

| Category | Tools | Purpose |
|----------|-------|---------|
| **Orient** | `get_vault_context`, `get_customer_context`, `get_person_context`, `query_graph`, `resolve_people_to_customers` | Understand who/what/where before CRM queries |
| **Retrieve** | `search_vault`, `query_notes`, `find_similar_notes` | 3-tier search: lexical → fuzzy → semantic |
| **Write** | `patch_note`, `capture_connect_hook`, `draft_meeting_note`, `update_customer_file`, `create_customer_file`, + more | Gated writes with human confirmation |
| **Composite** | `prepare_crm_prefetch`, `correlate_with_vault`, `promote_findings`, `check_vault_health`, `get_drift_report` | Cross-MCP workflows bridging vault ↔ CRM ↔ M365 |

---

## Example Prompts with Vault

```
What do I know about the Contoso account from my vault notes?
```

```
Find all my meeting notes mentioning the Northwind project from the last month.
```

```
Prepare CRM prefetch context for my Fabrikam governance meeting.
```
