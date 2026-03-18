# Customization Guide

This repo is designed to be forked and tailored. The `.github/` directory is where all of Copilot's behavior is defined — in plain Markdown files you can edit directly. No code changes required.

> **Think of `.github/` as your team's operating manual for Copilot.**
> Every file in it shapes what Copilot knows, how it reasons, and what it says. Edit freely — you can't break CRM by editing a Markdown file.

---

## How GitHub Copilot Custom Instructions Work

GitHub Copilot looks for special files in your repo's `.github/` folder and loads them automatically:

| File / Folder                              | What Copilot Does With It                                                                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/copilot-instructions.md`        | **Always loaded.** The "system prompt" — top-level rules Copilot follows on every turn.                                                      |
| `.github/instructions/*.instructions.md` | **Loaded when relevant.** Each file has a `description` in its YAML frontmatter. Copilot loads it when your request matches those keywords. |
| `.github/skills/*/SKILL.md`              | **Loaded on demand.** Deep role/domain playbooks. Copilot picks the right one based on `name` and `description` in frontmatter.           |
| `.github/prompts/*.prompt.md`            | **Reusable prompt templates.** In VS Code, these appear in the Copilot chat slash-command menu (`/`). In Copilot CLI and other clients, they're plain Markdown files you can open and paste. Either way, they package complex workflows into repeatable one-shot prompts.            |

You don't need to register these files anywhere — just create or edit them and Copilot picks them up automatically.

---

## What's in `.github/` Right Now

Here's what ships out of the box and what each piece does:

```
.github/
├── copilot-instructions.md          ← Global behavior: MCP routing, role detection, response style
├── instructions/
│   ├── intent.instructions.md       ← "Why does this agent exist?" — strategic intent
│   ├── mcem-flow.instructions.md    ← MCEM process model, stages, exit criteria
│   ├── shared-patterns.instructions.md ← Shared definitions and runtime contract
│   ├── role-card-specialist.instructions.md  ← Specialist identity + accountability
│   ├── role-card-se.instructions.md          ← Solution Engineer identity + accountability
│   ├── role-card-csa.instructions.md         ← Cloud Solution Architect identity + accountability
│   ├── role-card-csam.instructions.md        ← CSAM identity + accountability
│   ├── msx-role-and-write-gate.instructions.md ← Confirmation gates before any CRM write
│   ├── crm-entity-schema.instructions.md     ← CRM field names so Copilot builds correct queries
│   ├── crm-query-strategy.instructions.md    ← CRM read query scoping strategy
│   ├── connect-hooks.instructions.md         ← Evidence capture for Connect impact reporting
│   ├── obsidian-vault.instructions.md        ← Vault integration conventions
│   └── powerbi-mcp.instructions.md           ← Power BI auth, DAX discipline, prompt conventions
├── skills/                          ← 27 atomic domain skills (loaded on demand)
│   ├── pipeline-qualification/SKILL.md       ← Qualify new opportunities (Stages 1-2)
│   ├── milestone-health-review/SKILL.md      ← Committed milestone health (Stages 4-5)
│   ├── proof-plan-orchestration/SKILL.md     ← Technical proof management
│   ├── risk-surfacing/SKILL.md               ← Proactive risk identification
│   ├── handoff-readiness-validation/SKILL.md ← Cross-role handoff quality
│   ├── mcem-stage-identification/SKILL.md    ← Identify current MCEM stage
│   ├── workiq-query-scoping/SKILL.md         ← Scope M365 searches effectively
│   ├── pbi-prompt-builder/SKILL.md           ← Interactive Power BI prompt builder
│   ├── skill-authoring-best-practices/SKILL.md ← Guide for writing your own skills
│   ├── ... (19 more atomic skills)           ← See directory for full list
│   └── _legacy/                              ← Archived monolithic role skills (reference only)
├── prompts/
│   ├── prepare-meeting.prompt.md    ← Pre-populate meeting notes from vault + CRM
│   ├── process-meeting-notes.prompt.md ← Structure raw notes into formatted vault entries
│   ├── weekly-digest.prompt.md      ← Weekly summary across customers + CRM
│   ├── project-status.prompt.md     ← Project status from vault + CRM validation
│   ├── create-person.prompt.md      ← Create a People note from meeting context
│   ├── sync-project-from-github.prompt.md ← Pull GitHub activity into vault
│   ├── pbi-azure-portfolio-review.prompt.md ← Azure ACR vs budget + pipeline ranking
│   ├── pbi-ghcp-new-logo-incentive.prompt.md ← GHCP incentive eligibility tracker
│   └── pbi-ghcp-seats-analysis.prompt.md ← GHCP seat opportunity + adoption review
└── documents/                       ← Reference docs (never auto-loaded, read on demand)
```

---

## Quick Customization Examples

### 1. Change How Copilot Talks to You

Edit `.github/copilot-instructions.md` — this is the master prompt. For example, to make responses more concise:

```markdown
## Response Expectations

- Keep outputs concise and action-oriented.
- Use bullet points, not paragraphs.
- Lead with the answer, then context.
```

### 2. Add Your Team's Workflow Rules

Create a new file in `.github/instructions/` with a descriptive YAML header. Copilot will load it whenever your request matches the `description` keywords.

**Example:** `.github/instructions/deal-review-checklist.instructions.md`

```markdown
---
description: "Deal review checklist and qualification gates. Use when preparing for deal reviews, pipeline calls, or qualification discussions."
---

# Deal Review Checklist

Before any deal review, verify:
- [ ] Customer pain confirmed in their own words
- [ ] Technical win plan documented (or N/A for renewals)
- [ ] Competitor landscape noted
- [ ] Next steps have owners and dates
```

### 3. Customize Role Cards or Atomic Skills

**Role cards** (in `.github/instructions/`) define each role's identity, accountability, and boundaries. **Atomic skills** (in `.github/skills/`) define focused domain playbooks. Each has YAML frontmatter that controls when it activates.

Skill frontmatter:

```yaml
---
name: milestone-health-review
description: 'Reviews committed milestone health for CSAM at MCEM Stages 4-5...'
argument-hint: 'Provide opportunityId(s) or run across all CSAM-owned committed milestones'
---
```

- `name` — internal identifier
- `description` — **the trigger**: Copilot matches this against your request to decide whether to load the skill. Make it keyword-rich.
- `argument-hint` — tells Copilot what inputs to ask for

**Tip:** You can duplicate a skill and create a variation for a sub-team (e.g., a `milestone-health-review-fasttrack/SKILL.md` with FastTrack-specific patterns).

### 4. Create Reusable Prompt Templates

Files in `.github/prompts/` appear as slash commands in the VS Code Copilot chat panel (type `/` to see them). In Copilot CLI and other clients, these are just plain Markdown files — open them and paste the prompt content into your session. Create one for any multi-step workflow you repeat often.

**Example:** `.github/prompts/quarterly-review-prep.prompt.md`

```markdown
---
description: "Prepare a quarterly business review deck by pulling CRM pipeline data, milestone status, and customer health signals."
---

# Quarterly Review Prep

## Workflow

1. Use `list_opportunities` for {customer} — get all active opportunities.
2. Use `get_milestones` for each opportunity — summarize status and blockers.
3. Use `ask_work_iq` — find recent executive emails or meeting decisions.
4. Format as a QBR summary: pipeline, delivery, risks, asks.
```

After saving, type `/` in the VS Code Copilot chat panel to see it in the menu. In Copilot CLI, paste the prompt content directly.

### 5. Add a New MCP Server

> [!CAUTION]
> **This workspace handles live MSX sales data — customer names, deal values, pipeline status, internal stakeholders, and engagement history. Treat every MCP server you connect as having full visibility into that data.**
>
> **Before adding any MCP server, verify ALL of the following:**
>
> - **Runs locally.** Prefer servers that execute entirely on your machine via `stdio` (like `msx-crm` and `workiq` in this repo). A local process never sends your data to a third party.
> - **No network-facing servers.** Do NOT expose MCP servers over HTTP/SSE to the network. A network-listening MCP server is an open door to your CRM data for anyone who can reach the port.
> - **Trusted source only.** Only install MCP servers from publishers you trust — your own org, Microsoft, or packages you have personally reviewed. Random community servers can exfiltrate data, inject prompts, or modify CRM records.
> - **Review what it does.** Before running `npx some-unknown-package`, read its source or README. Understand what tools it registers and what data it accesses.
> - **No secrets in plain text.** Never hardcode API keys, tokens, or credentials in `mcp.json`. Use `${input:...}` prompts or environment variables instead.
> - **Principle of least privilege.** Only connect servers that need access to what you're working on. Don't add a server "just in case."
>
> **If you wouldn't paste your pipeline data into a random website, don't pipe it through a random MCP server.**

Edit `.vscode/mcp.json` to connect additional data sources. Each server gets its own tools that Copilot can call.

```jsonc
{
  "servers": {
    // Existing servers...

    "my-custom-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@my-org/my-mcp-server"],
      "env": {
        "API_KEY": "${input:myApiKey}"
      }
    }
  }
}
```

Browse the [MCP Server Registry](https://github.com/modelcontextprotocol/servers) for community servers, or build your own following the [MCP spec](https://spec.modelcontextprotocol.io/). **Always vet servers against the security checklist above before connecting them.**

---

## The Context Loading Model

Understanding the loading tiers helps you decide where to put new content:

| Tier             | Location                           | When Copilot Loads It                         | Best For                                              |
| ---------------- | ---------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| **Tier 0** | `copilot-instructions.md`        | Every single turn                             | Global rules, routing, response style (~80 lines max) |
| **Tier 1** | `instructions/*.instructions.md` | When request matches `description` keywords | Operational contracts, workflow gates, schemas        |
| **Tier 2** | `skills/*/SKILL.md`              | When request matches `name`/`description` | Deep role playbooks, domain expertise                 |
| **Tier 3** | `documents/`                     | Only when explicitly read via tool call       | Large reference material, specs, protocol docs        |

**Rule of thumb:** Put universals in Tier 0, conditionals in Tier 1, role-specific depth in Tier 2, and bulky references in Tier 3.

---

## Writing Good Skills

See [skill-authoring-best-practices/SKILL.md](../.github/skills/skill-authoring-best-practices/SKILL.md) for a full checklist. The short version: keep the `description` keyword-rich so Copilot finds it, structure the body as a step-by-step workflow, and don't exceed ~150 lines per file.
