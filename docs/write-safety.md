# Write Operations & Responsible AI Use

> **CRM is shared production data.** Incorrect writes can affect your entire account team and customer-facing records. Use AI-assisted write operations responsibly.

---

## Current Status: Writes Are Experimental

The write tools (`create_task`, `update_task`, `close_task`, `update_milestone`) are included in the MCP server but should be treated as **experimental**. They are designed with safety guardrails, but you should understand the risks before relying on them.

---

## How Write Safety Works

All write operations use a **Stage → Review → Execute** pattern (see [STAGED_OPERATIONS.md](../mcp/msx/STAGED_OPERATIONS.md) for technical details):

1. **Stage** — When you ask Copilot to create/update/close a record, the change is validated and staged locally. **Nothing is written to CRM yet.**
2. **Review** — Copilot shows you a before/after diff of the proposed change and asks for your approval.
3. **Execute** — Only after you explicitly approve does the change get sent to CRM. You can cancel at any time.

Staged operations expire automatically after 10 minutes if not acted on.

---

## Responsible AI Guidelines

- **Always review before approving.** Read the staged diff carefully. Verify field values, dates, and record IDs.
- **Don't batch-approve blindly.** If Copilot stages multiple operations, review each one. Use `cancel_operation` to discard any you're unsure about.
- **Verify the right record.** CRM GUIDs can look similar. Confirm the opportunity/milestone name matches what you expect.
- **Start with reads.** Before writing, use read tools (`crm_query`, `get_milestones`) to confirm the current state of the record.
- **You are accountable.** AI suggests changes, but you own the approval. Treat every write approval as if you were making the change manually in MSX.
