![alt text](docs/assets/avatar.png)

# MCAPS IQ

> **Talk to Copilot in plain English to manage your MSX pipeline — no coding required.**

> [!CAUTION]
> **Agentic AI can make mistakes.** This toolkit uses AI models that may produce incorrect, incomplete, or misleading outputs — including CRM queries, record updates, and strategic recommendations. **You are responsible for reviewing and validating every action before it takes effect.** Never blindly trust AI-generated data or let it execute changes without your confirmation. Treat all outputs as drafts that require human judgment.

MCAPS IQ connects GitHub Copilot (in VS Code) to your MSX CRM and Microsoft 365 data. Instead of clicking through MSX screens, you describe what you need in the Copilot chat window and the tools handle it.

> **Copilot CLI plugin quick install:**`copilot plugin install microsoft/MCAPS-IQ`

> [!TIP]
> **Best experience:** Use VS Code Copilot Chat with this repository checked out locally. Plugin deployment for Copilot CLI is supported, but it is not the ideal default because it does not include this repo's `.github/prompts/` and `.github/instructions/` files. For power users, Copilot CLI + the `mcaps-iq` plugin is still a great terminal-first pattern.
>

- **Read your pipeline** — look up opportunities, milestones, tasks, and ownership
- **Update CRM records** — create tasks, close milestones, update statuses (always asks before writing)
- **Search M365** — find Teams chats, meeting transcripts, emails, and documents
- **Role-aware** — knows your MCAPS role (Specialist, SE, CSA, CSAM) and tailors guidance accordingly

---

## Quick Start (5 Minutes)

**Before you begin:** Connect to the **Microsoft corporate VPN** and have your `@microsoft.com` account ready.

### Option A: One-Command Bootstrap (recommended)

The bootstrap script checks your system, installs any missing tools, clones the repo, and opens VS Code — all in one step.

**Windows** — open PowerShell and paste:
```powershell
irm https://raw.githubusercontent.com/microsoft/MCAPS-IQ/main/scripts/bootstrap.ps1 | iex
```

**macOS** — open Terminal and paste:
```bash
curl -fsSL https://raw.githubusercontent.com/microsoft/MCAPS-IQ/main/scripts/bootstrap.sh | bash
```

The script installs VS Code, Git, Node.js, GitHub CLI, Azure CLI, and the Copilot extension if missing, then clones the repo, authenticates, and opens VS Code.

> [!TIP]
> **Already have the repo cloned?** Run the bootstrap locally instead:
> ```bash
> # macOS/Linux
> ./scripts/bootstrap.sh --skip-clone
>
> # Windows PowerShell
> .\scripts\bootstrap.ps1 -SkipClone
> ```

> [!TIP]
> **Just want to check what's missing?** Run with `--check-only` / `-CheckOnly` to see a report without installing anything.

### Option B: Manual Setup

<details>
<summary>Click to expand manual prerequisites and steps</summary>

Make sure you have:

- [ ] [VS Code](https://code.visualstudio.com/) with the [GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)
- [ ] [Git](https://git-scm.com/) — `git --version` to check (`gh` CLI is not a substitute)
- [ ] [Node.js 18+](https://nodejs.org/)
- [ ] [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [ ] [GitHub CLI (`gh`)](https://cli.github.com/) — required for private package auth
- [ ] **GitHub Copilot License** ([https://aka.ms/copilot](https://aka.ms/copilot))

> **Heads-up:** If you install any CLI tools while VS Code is open, **close and reopen VS Code entirely**. VS Code terminals inherit the system PATH from launch — newly installed tools won't be visible until you restart.

```bash
git clone https://github.com/microsoft/mcaps-iq.git
cd mcaps-iq
npm install
```

> [!IMPORTANT]
> **Use your personal GitHub account** (e.g. `JohnDoe`) when prompted during install.
> **Do NOT use your Enterprise Managed User (EMU) account** — the one ending in `_microsoft`.

</details>

### Sign in to Azure

```bash
az login
```

> You must be on the corporate VPN and use your Microsoft corp account.

### Open and start

```bash
code .
```

1. Open `.vscode/mcp.json` in VS Code — you'll see a **"Start"** button above each server definition
2. Click **Start** on `msx` (required) and `workiq` (optional, for M365 searches)

> [!TIP]
> **Don't see the Start buttons?** The CodeLens buttons require GitHub Copilot Chat **v0.25+** with **Agent mode** enabled. Make sure `mcp.json` is the active editor tab. If nothing appears, reload VS Code (`Cmd+Shift+P` → "Developer: Reload Window"), then reopen the file.

> [!TIP]
> If a server fails to start with a 401/403/404 error, run `npm run auth:packages` to fix package auth. If that doesn't help, open Copilot Chat and ask: *"Help me debug my MCP package auth setup"*

### Step 4: Start chatting

Open the Copilot chat panel (`Cmd+Shift+I`) and type:

```
Who am I in MSX?
```

**That's it — you're up and running.**

> **Something not working?** Run `Cmd+Shift+P` → `Tasks: Run Task` → `Setup: Check Environment` to diagnose.

### Use from any terminal: the `mcaps` command

Prefer working in the terminal? After install, the `mcaps` command is available globally:

```bash
# From your home directory, a project folder, anywhere:
mcaps
```

This launches [GitHub Copilot CLI](https://github.com/features/copilot/cli/) with the repo's MCP servers, agents, and skills auto-loaded — no need to `cd` into the repo. It works the same as opening VS Code in the repo, but entirely in your terminal.

> **Requires Copilot CLI.** Install with `brew install copilot-cli` (macOS) or `npm install -g @github/copilot`. If Copilot CLI isn't installed, `mcaps` falls back to opening VS Code.

---

## Alternative: Copilot CLI (Terminal)

Prefer the terminal? Install as a Copilot CLI plugin:

```bash
copilot plugin install microsoft/MCAPS-IQ
```

**Prerequisites:** Node.js 20+, [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), `az login` on VPN.

Plugin deployment is **supported** and gives you the MSX CRM MCP server (27 tools) and Power BI analytics. It is best for terminal-first power users.

For most users, VS Code Copilot Chat is the better default because plugin deployment does not include this repo's `.github/prompts/` and `.github/instructions/` files.

Skills and agents from the repo are included, though some workflows (e.g., `morning-brief`) depend on additional MCP servers (WorkIQ, Calendar, Mail) that are only available in VS Code.

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

See [all scenario prompts by role →](site/docs/prompts/scenario-prompts.md)

---

## Guided Flows (Slash Commands)

Type `/` in the Copilot chat panel and pick a flow. Each one detects your role and tailors the experience.

> Note: Accessing prompts stored in `.github/prompts` through `/` only works in VS Code Copilot Chat. In GitHub Copilot CLI, describe the flow in natural language (for example: "Help me get this environment set up").

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

See [Write Operations &amp; Safety](site/docs/architecture/safety.md) for full details.

---

## Go Deeper

| Topic                           | Link                                                                        |
| ------------------------------- | --------------------------------------------------------------------------- |
| All scenario prompts by role    | [site/docs/prompts/scenario-prompts.md](site/docs/prompts/scenario-prompts.md) |
| `mcaps` command & Copilot CLI | [site/docs/integrations/copilot-cli.md](site/docs/integrations/copilot-cli.md) |
| Obsidian vault integration      | [site/docs/integrations/obsidian.md](site/docs/integrations/obsidian.md)       |
| Power BI analytics              | [site/docs/integrations/powerbi.md](site/docs/integrations/powerbi.md)         |
| Customization guide             | [site/docs/customization/index.md](site/docs/customization/index.md)           |
| Architecture, tools & internals | [site/docs/architecture/index.md](site/docs/architecture/index.md)             |
| FAQ                             | [site/docs/faq/index.md](site/docs/faq/index.md)                               |

---

> [!NOTE]
> **This is a showcase of GitHub Copilot's extensibility.** The core value here is GitHub Copilot and the agentic era it enables. This project tackles MCAPS internal tooling as the problem domain, but the pattern is universal: connect Copilot to your enterprise systems through MCP servers, layer in domain expertise via instructions and skills, and let your team operate complex workflows in plain language. Fork the pattern and build your own version.

---

Big thanks to the original microsoft/MSX-Helper project for the foundation and inspiration that helped shape this into an MCP server.

## License

MIT (see `LICENSE.md`)
