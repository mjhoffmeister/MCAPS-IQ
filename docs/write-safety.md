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

---

## Endpoint Security Requirements (RH-1)

MCAPS-IQ relies on Azure CLI tokens cached in process memory. Your machine must be treated as a **trusted endpoint**, secured by corporate MDM and EDR. To safely use this tool, your device must have:

- **Intune Enrollment** — enforces compliance policies including mandatory disk encryption (FileVault/BitLocker) for local vault/audit logs, automatic screen locks (≤ 5 min idle), and prevents operation on compromised devices.
- **Microsoft Defender** — provides active Endpoint Detection and Response (EDR) to prevent unauthorized local processes from scraping unencrypted access tokens from Node.js memory.
- **VPN** — connect to corpnet VPN when accessing CRM and M365 services.
- **No shared accounts** — each user must authenticate with their own Entra ID via `az login`.
- **Keep Azure CLI updated** — run `az upgrade` periodically to receive security patches.

---

## Prompt Injection Awareness (RC-2)

MCAPS-IQ scans data returned from CRM, M365, and other external services for common prompt injection patterns. When suspicious content is detected:

- **Read operations**: A `⚠️ PROMPT INJECTION INDICATORS DETECTED` warning is prepended to the response.
- **Write operations**: An `injectionWarning` field is included in the staged operation for review before approval.
- **Audit trail**: All detections are logged to the persistent audit log with pattern IDs and field locations.

If you see these warnings, **do not blindly approve write operations**. Review the flagged content and verify it is legitimate before proceeding.

---

## AI Attribution (RH-2)

CRM writes made through MCAPS-IQ include an attribution suffix `[AI-assisted via MCAPS-IQ]` in description/comments fields. This makes AI-initiated changes distinguishable from manual edits for audit and compliance purposes.
