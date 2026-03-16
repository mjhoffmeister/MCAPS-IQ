---
description: "Obsidian vault integration — local knowledge layer, customer roster, durable storage, CRM prefetch context, Connect hook routing. Use when reasoning about vault reads, customer defaults, durable memory, Obsidian notes, OIL tools, customer roster filtering, vault-first storage, or cross-medium context assembly."
applyTo: "mcp/oil/**"
---

# Obsidian Vault — Operational Contract

The vault is the local context layer. CRM is system-of-record for live state.

## Core Rules

- Vault scopes who/what to query; CRM validates current status.
- Run VAULT-PREFETCH before broad CRM retrieval when OIL is available.
- Persist only validated findings to vault (no speculative writes).
- Treat vault-listed customers as active roster for proactive workflows.
- If OIL is unavailable, continue statelessly and state the gap.

## Minimal Structure Model

- Customer note: `Customers/<Name>.md`
- Preferred layout: `Customers/<Name>/<Name>.md` with `opportunities/` and `milestones/` subdirs
- People note: `People/<Name>.md`
- Customer summaries link to entity sub-notes; canonical IDs live in entity frontmatter

## Flat-To-Nested Migration

- Detect with `check_vault_health()` (`structuralIssues`).
- Propose `migrate_customer_structure({ customer })`.
- Confirm with user before execution.

## OIL Tools (Primary)

### Read and scope

- `get_vault_context`
- `get_customer_context`
- `oil_get_opportunity_context`
- `oil_get_milestone_context`
- `prepare_crm_prefetch`
- `search_vault`
- `query_notes`

### Correlate and promote

- `resolve_people_to_customers`
- `correlate_with_vault`
- `promote_findings`
- `capture_connect_hook`

### Entity sync writes (gated)

- `oil_create_opportunity`
- `oil_update_opportunity`
- `oil_create_milestone`
- `oil_update_milestone`
- `manage_pending_writes`

## Vault Protocol Phases

### Availability guard

1. Call `get_vault_context()` once per workflow.
2. Cache availability for the current turn.
3. If unavailable, skip vault phases and continue with CRM-only flow.

### VAULT-PREFETCH

- Use `get_customer_context({ customer })` and/or `prepare_crm_prefetch({ customers })`.
- Reuse GUIDs/TPIDs from vault instead of rediscovering through broad CRM search.

### VAULT-CORRELATE

- After M365/WorkIQ retrieval, run `resolve_people_to_customers` and `correlate_with_vault`.
- Keep vault query date window aligned to source retrieval window.

### VAULT-PROMOTE

- Persist validated outcomes via `promote_findings`.
- Capture measurable impact with `capture_connect_hook`.

### VAULT-SYNC

1. Read current vault entities.
2. Diff against CRM retrieval.
3. Write only new/changed entities with `oil_create_*`/`oil_update_*`.
4. Confirm writes through pending queue.

### VAULT-HYGIENE

- Use `check_vault_health` and `get_drift_report`.
- Recommend fixes; do not auto-delete content.

## Write Safety

- One entity per write call.
- Do not manually synthesize entity markdown when entity tools exist.
- Confirm large sync batches before execution.

## Fallback (No Vault)

- Ask user for customer scope or use `crm_whoami` context.
- Skip vault correlation and promotion.
- Connect hook fallback target: `.connect/hooks/hooks.md`.

## Anti-Patterns

- CRM-wide retrieval without vault scoping when vault is available.
- Treating cached vault status as live CRM truth.
- Persisting unvalidated assumptions.
- Creating customer files for one-off transient lookups.

## Extended Reference

For detailed schemas, examples, and deeper workflow playbooks, read:
`.github/documents/vault-operations-reference.md`
