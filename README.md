![alt text](docs/assets/avatar.png)

# MCAPS IQ

> **Talk to Copilot in plain English to manage your MSX pipeline — no coding required.**

> [!CAUTION]
> **Agentic AI can make mistakes.** This toolkit uses AI models that may produce incorrect, incomplete, or misleading outputs — including CRM queries, record updates, and strategic recommendations. **You are responsible for reviewing and validating every action before it takes effect.** Never blindly trust AI-generated data or let it execute changes without your confirmation. Treat all outputs as drafts that require human judgment.

MCAPS IQ connects GitHub Copilot (in VS Code) to your MSX CRM and Microsoft 365 data. Instead of clicking through MSX screens, you describe what you need in the Copilot chat window and the tools handle it.

- **Read your pipeline** — look up opportunities, milestones, tasks, and ownership
- **Update CRM records** — create tasks, close milestones, update statuses (always asks before writing)
- **Search M365** — find Teams chats, meeting transcripts, emails, and documents
- **Role-aware** — knows your MCAPS role (Specialist, SE, CSA, CSAM) and tailors guidance accordingly

---

## Quick Start (5 Minutes)

**Before you begin**, make sure you have:

- [ ] **Microsoft corporate VPN** connected
- [ ] **Microsoft corp account** (e.g., `your-alias@microsoft.com`)
- [ ] **GitHub Copilot License** (For Microsoft Internal: [https://aka.ms/copilot](https://aka.ms/copilot))
- [ ] [VS Code](https://code.visualstudio.com/) with the [GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)
- [ ] [Node.js 18+](https://nodejs.org/)
- [ ] [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)

### Step 1: Clone and install

```bash
git clone https://github.com/JinLee794/mcaps-iq.git
cd mcaps-iq
npm install
```

> **Prefer a GUI?** Open the repo in VS Code and run **"Setup: Install Everything"** from the Command Palette (`Cmd+Shift+P` → `Tasks: Run Task`).

### Step 2: Sign in to Azure

```bash
az login
```

> You must be on the corporate VPN and use your Microsoft corp account.

### Step 3: Open in VS Code

```bash
code .
```

### Step 4: Start the tools

1. Open `.vscode/mcp.json` in VS Code — you'll see a **"Start"** button above each server definition
2. Click **Start** on `msx-crm` (required) and `workiq` (optional, for M365 searches)

### Step 5: Start chatting

Open the Copilot chat panel (`Cmd+Shift+I`) and type:

```
Who am I in MSX?
```

**That's it — you're up and running.**

> **Something not working?** Run `Cmd+Shift+P` → `Tasks: Run Task` → `Setup: Check Environment` to diagnose.

---

## Your First 3 Prompts

| Prompt                                            | What happens                              |
| ------------------------------------------------- | ----------------------------------------- |
| `Who am I in MSX?`                              | Identifies your CRM role and account team |
| `Show me my active opportunities.`              | Lists your pipeline with stage and health |
| `It's Monday — run my weekly pipeline review.` | Hygiene sweep + prioritized action list   |

---

## What's Your Role?

The system tailors its behavior based on your MCAPS role. Type `/my-role` in Copilot chat to find yours automatically, or jump to the prompts for your role:

| Role                               | Focus                                                                |
| ---------------------------------- | -------------------------------------------------------------------- |
| **Specialist**               | Pipeline creation, deal qualification, Stage 2-3 progression         |
| **Solution Engineer**        | Technical proofs, task hygiene, architecture reviews                 |
| **Cloud Solution Architect** | Execution readiness, architecture handoff, delivery ownership        |
| **CSAM**                     | Milestone health, adoption tracking, commit gates, value realization |

See [all scenario prompts by role →](docs/scenario-prompts.md)

---

## Guided Flows (Slash Commands)

Type `/` in the Copilot chat panel and pick a flow. Each one detects your role and tailors the experience.
*Note: Accessing prompts stored in the .github/prompts directory through `/` only works for VS Code Copilot Chat experience. For GitHub Copilot CLI, try just describing the prompt. `/getting-started` --> 'Help me get this environment set up'"*

| Command              | When to use             | What it does                                                              |
| -------------------- | ----------------------- | ------------------------------------------------------------------------- |
| `/getting-started` | First time              | Checks your environment, identifies your role, walks you to first success |
| `/my-role`         | Anytime                 | Shows your role, responsibilities, and a menu of actions                  |
| `/daily`           | Every morning           | Role-specific hygiene checks + prioritized top-3 action list              |
| `/weekly`          | Monday / pre-governance | Full pipeline or milestone review with shareable status bullets           |
| `/what-next`       | Idle moment             | Recommends exactly 3 things to do, ranked by impact                       |
| `/quick-wins`      | Anytime (~5 min)        | Finds CRM hygiene issues you can fix immediately                          |

### Recommended progression

```
First time:  /getting-started  →  pick an action from the menu
Daily:       /daily            →  work through top 3  →  /quick-wins if time
Weekly:      /weekly           →  drill into flagged items
Ad hoc:      /what-next        →  follow the suggestions
```

> You can also skip slash commands and just describe what you need in plain English.

---

## Safety

All CRM write operations use a **Stage → Review → Execute** pattern:

1. **Stage** — your change is validated locally. Nothing is written to CRM yet.
2. **Review** — Copilot shows a before/after diff and asks for approval.
3. **Execute** — only after you approve does the change go through.

You can cancel at any time. Staged operations expire after 10 minutes.

See [Write Operations &amp; Safety](docs/write-safety.md) for full details.

---

## Go Deeper

| Topic                               | Link                                              |
| ----------------------------------- | ------------------------------------------------- |
| All scenario prompts by role        | [docs/scenario-prompts.md](docs/scenario-prompts.md) |
| Use from the terminal (Copilot CLI) | [docs/copilot-cli.md](docs/copilot-cli.md)           |
| Obsidian vault integration          | [docs/obsidian-setup.md](docs/obsidian-setup.md)     |
| Power BI analytics                  | [docs/powerbi-setup.md](docs/powerbi-setup.md)       |
| Customization guide                 | [docs/customization.md](docs/customization.md)       |
| Architecture, tools & internals     | [docs/architecture.md](docs/architecture.md)         |
| FAQ                                 | [docs/faq.md](docs/faq.md)                           |

---

> [!NOTE]
> **This is a showcase of GitHub Copilot's extensibility.** The core value here is GitHub Copilot and the agentic era it enables. This project tackles MCAPS internal tooling as the problem domain, but the pattern is universal: connect Copilot to your enterprise systems through MCP servers, layer in domain expertise via instructions and skills, and let your team operate complex workflows in plain language. Fork the pattern and build your own version.

---

Big thanks to the original microsoft/MSX-Helper project for the foundation and inspiration that helped shape this into an MCP server.

## License

MIT (see `mcp/msx/package.json`)
