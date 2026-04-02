# Obsidian Vault Integration (OIL)

The **[Obsidian Intelligence Layer (OIL)](https://github.com/JinLee794/Obsidian-Intelligence-Layer)** turns your local Obsidian vault into a durable knowledge layer for AI agents. Instead of starting every conversation from scratch, OIL gives agents persistent memory — customer context, meeting history, relationship maps, and accumulated insights — all indexed and queryable through MCP tools.

> **Don't use Obsidian?** No worries — everything works without it. The system operates statelessly (CRM-only) and you can bring your own persistence layer if desired.

---

## How to Enable It

1. Open `.vscode/mcp.json` and enable the `"oil"` block:

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

2. When prompted, enter the absolute path to your Obsidian vault (for example, `/Users/yourname/Documents/MyVault`) — or set `OBSIDIAN_VAULT_PATH` in `.env`.

    > **Entered the wrong path?** Run `npm run vault:reconfigure` to re-enter it, or edit `.env` directly.

3. Click **Start** on `oil` in VS Code just like the other servers.

OIL exposes domain-specific tools including `get_customer_context`, `search_vault`, `prepare_crm_prefetch`, `promote_findings`, and `check_vault_health`. See the upstream [OIL README](https://github.com/JinLee794/Obsidian-Intelligence-Layer#readme) for full tool coverage and configuration details.

---

## Why Obsidian?

- **100% local** — your notes never leave your machine. No cloud sync required.
- **Graph-based** — Obsidian's wikilink model gives OIL a pre-built relationship graph (people ↔ customers ↔ meetings ↔ projects) queryable in O(1) via a pre-indexed backlink map.
- **Markdown-native** — plain `.md` files you own forever. No proprietary format, no vendor lock-in.
- **Works offline** — Obsidian doesn't even need to be running. OIL reads the vault folder directly.

---

## What OIL Provides

| Category            | Tools                                                                                                                        | Purpose                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Orient**    | `get_vault_context`, `get_customer_context`, `get_person_context`, `query_graph`, `resolve_people_to_customers`    | Understand who/what/where before querying CRM          |
| **Retrieve**  | `search_vault`, `query_notes`, `find_similar_notes`                                                                    | 3-tier search: lexical → fuzzy → semantic embeddings |
| **Write**     | `patch_note`, `capture_connect_hook`, `draft_meeting_note`, `update_customer_file`, `create_customer_file`, + more | Gated writes with diffs and human confirmation         |
| **Composite** | `prepare_crm_prefetch`, `correlate_with_vault`, `promote_findings`, `check_vault_health`, `get_drift_report`       | Cross-MCP workflows that bridge vault ↔ CRM ↔ M365   |

---

## Setting Up Your Own Vault

1. **Create a vault** — Open [Obsidian](https://obsidian.md/) and create a new vault (or point to an existing folder of Markdown files).
2. **Add the folder structure OIL expects** — at minimum:

   ```
   YourVault/
   ├── Customers/       # One .md per customer (e.g., Contoso.md)
   ├── People/          # One .md per contact (e.g., Alice Smith.md)
   ├── Meetings/        # Meeting notes with wikilinks to customers/people
   └── oil.config.yaml  # Optional — customize folder paths and field names
   ```

    See the upstream repository for sample vault fixtures and conventions.
3. **Enable in `.vscode/mcp.json`** and set your vault path:

   ```jsonc
   "oil": {
       "type": "stdio",
         "command": "npx",
         "args": ["-y", "@jinlee794/obsidian-intelligence-layer@latest", "mcp"],
       "env": {
           "OBSIDIAN_VAULT_PATH": "/absolute/path/to/YourVault"
       }
   }
   ```
4. Click **Start** on `oil` in VS Code — the agent now has persistent memory.

> You can also bring any MCP-compatible note server — just wire it into `.vscode/mcp.json`.

See the full [OIL README](https://github.com/JinLee794/Obsidian-Intelligence-Layer#readme) for configuration options, tool details, and architecture.
