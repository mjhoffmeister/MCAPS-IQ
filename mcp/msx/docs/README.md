# MSX MCP Server — Documentation

Welcome to the docs for the MSX MCP server. This server gives AI agents (like GitHub Copilot) read/write access to your Dynamics 365 CRM data — opportunities, milestones, and tasks.

> **New here?** Start with the [Architecture Guide](ARCHITECTURE.md). It covers how the server works end-to-end in plain language.

## What's in This Folder

| Document | What It Covers | Who It's For |
|---|---|---|
| [Architecture Guide](ARCHITECTURE.md) | How the server works: authentication, CRM requests, tools, prompt injection detection, safety guardrails, and known limitations | Everyone — start here |
| [Staged Operations](STAGED_OPERATIONS.md) | The human-in-the-loop write flow: how CRM writes are staged, previewed, and approved before execution | Anyone creating or updating CRM records |
| [Milestone Lookup Optimization](MILESTONE_LOOKUP_OPTIMIZATION.md) | How `get_milestones` consolidates multi-step CRM lookups into a single tool call | Anyone querying milestones or building on top of the server |

## Reading Order

```
┌─────────────────────────────┐
│     Architecture Guide      │  ← Start here. Covers the full picture.
│     (ARCHITECTURE.md)       │
└──────────┬──────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌──────────┐  ┌──────────────────────┐
│  Staged  │  │  Milestone Lookup    │
│  Ops     │  │  Optimization        │
└──────────┘  └──────────────────────┘
  Deep dive     Deep dive on the
  on write      read-side query
  safety        consolidation
```

- **Just want to understand the system?** → Read [Architecture Guide](ARCHITECTURE.md) only.
- **Going to update CRM data?** → Read [Architecture Guide](ARCHITECTURE.md), then [Staged Operations](STAGED_OPERATIONS.md).
- **Working with milestones a lot?** → Read [Architecture Guide](ARCHITECTURE.md), then [Milestone Lookup Optimization](MILESTONE_LOOKUP_OPTIMIZATION.md).

## Quick Glossary

These terms come up throughout the docs:

| Term | Meaning |
|---|---|
| **MCP** | Model Context Protocol — the standard that lets AI editors talk to tool servers |
| **OData** | The REST API protocol that Dynamics 365 uses |
| **Dynamics 365 / CRM** | Microsoft's customer relationship management system, used by Microsoft sellers as "MSX" |
| **Milestone** | A tracked deliverable tied to an opportunity (e.g., "Migrate SQL to Azure") |
| **Staged operation** | A CRM write that's been validated and queued, but not yet executed — waiting for your approval |
| **Entity set** | A CRM table you can query (e.g., `accounts`, `opportunities`, `msp_engagementmilestones`) |
| **Allowlist** | The set of entity sets the server permits queries against — blocks everything else |
| **GUID** | A globally unique identifier (the long hex IDs CRM uses for records) |
| **Azure CLI** | The `az` command — used to authenticate with your Microsoft account |

## Related Resources

- [Main README](../README.md) — Quick start, setup, and full tool reference
- [Source code](../src/) — The implementation (`index.js`, `tools.js`, `crm.js`, etc.)
- [Tests](../src/__tests__/) — Unit tests for each module
