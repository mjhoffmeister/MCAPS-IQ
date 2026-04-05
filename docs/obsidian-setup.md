# Obsidian Vault Integration (OIL)

> **Strongly recommended.** While MCAPS IQ works without Obsidian (stateless CRM-only mode), the vault is what makes the agent truly yours — the difference between a chatbot that forgets everything and an assistant that accumulates institutional knowledge over time.

The **[Obsidian Intelligence Layer (OIL)](https://github.com/JinLee794/Obsidian-Intelligence-Layer)** turns your local Obsidian vault into a durable knowledge layer for AI agents. Instead of starting every conversation from scratch, OIL gives agents persistent memory — customer context, meeting history, relationship maps, and accumulated insights — all indexed and queryable through MCP tools.

---

## Why Obsidian Is the Perfect Agentic Sandbox

Obsidian isn't just a note-taking app — it's a **fully local, extensible, programmable knowledge environment** uniquely suited as the persistence and rendering layer for AI agent workflows.

- **100% local** — your notes never leave your machine. No cloud sync required, no data residency questions for enterprise account data.
- **Graph-based** — Obsidian's `[[wikilink]]` model gives OIL a pre-built relationship graph (people ↔ customers ↔ meetings ↔ projects) queryable in O(1) via a pre-indexed backlink map.
- **Markdown-native** — plain `.md` files you own forever. No proprietary format, no vendor lock-in.
- **Import from existing tools** — built-in importers for **OneNote**, Evernote, Notion, Apple Notes, Google Keep, and HTML. Bootstrap your vault with years of accumulated customer knowledge on day one.
- **Renders HTML & JavaScript** — plugins like Dataview, DataviewJS, Charts, Templater, Meta Bind, and Excalidraw turn the vault into a **living dashboard** with interactive scorecards, computed views, and visual diagrams — all running locally with zero infrastructure.
- **Works offline** — Obsidian doesn't even need to be running. OIL reads the vault folder directly.

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

OIL v2 exposes 7 tools in two categories. See the upstream [OIL README](https://github.com/JinLee794/Obsidian-Intelligence-Layer#readme) for full details.

---

## What OIL Provides (7 Tools)

### Retrieve (5 tools) — Token-efficient reads and search

| Tool | Purpose |
|------|---------|
| `get_note_metadata` | Peek before loading — frontmatter, timestamps, word count, headings, `mtime_ms` (needed for writes) |
| `read_note_section` | Read a single heading section. Most token-efficient read — request `## Team` instead of a 5,000-word note |
| `get_related_entities` | Deduped flat list of linked notes from the graph index — paths and titles, max 3 hops, capped at 50 |
| `semantic_search` | Fuzzy search (fuse.js) with lexical content fallback. Returns match snippets with scores, capped at 20 |
| `query_frontmatter` | Fast cached frontmatter index lookup by key + value fragment. No disk scan — runs against in-memory index |

### Write (2 tools) — Atomic writes with mtime concurrency

| Tool | Purpose |
|------|---------|
| `atomic_append` | Append content under a specific heading. Requires `expected_mtime` — rejects if file changed since last read |
| `atomic_replace` | Replace entire note content. Same mtime check. For full-file rewrites when section-level append isn't sufficient |

> **Note:** OIL v1 had 22 tools across Orient, Retrieve, Write, and Composite categories. v2 consolidated these into 7 — the LLM handles orchestration, OIL focuses on token-efficient reads and safe writes.

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
