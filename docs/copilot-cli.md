# Using MCAPS IQ with GitHub Copilot CLI

[GitHub Copilot CLI](https://github.com/features/copilot/cli/) is a terminal-native agentic coding agent that supports MCP servers, custom agents, and skills — the same ones in this repo. You can run the full MCAPS toolkit from your shell without opening VS Code.

## Install Copilot CLI

```bash
# macOS
brew install copilot-cli

# or via npm
npm install -g @github/copilot
```

> Included in Copilot Free, Pro, Pro+, Business, and Enterprise subscriptions. See the [documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) for setup details.

## Prerequisites

- Azure CLI signed in (same as the VS Code flow — **VPN required**):
  ```bash
  az login
  ```
- Dependencies installed (`mcp/msx/` and optionally `mcp/oil/`)

## How It Works with This Repo

Copilot CLI automatically picks up the project's configuration when you run it from the repo root:

- **MCP servers** — reads `.vscode/mcp.json` and connects to the same `msx-crm`, `workiq`, and `oil` servers.
- **AGENTS.md** — loads the agent instructions from the repo root.
- **Skills & instructions** — loads `.github/skills/` and `.github/instructions/` the same way VS Code does, matching by keyword.

## Run It

```bash
cd mcaps-iq
# Start Copilot CLI — it will detect the MCP servers and agent config
copilot

# Copilot CLI has its own built-in slash commands:
#   /plan    — outline work before executing
#   /model   — switch between models
#   /fleet   — parallelize across subagents
#   /agent   — select a custom agent
#   /skills  — browse available skills
#   /resume  — pick up a previous session
#
# Note: The custom /daily, /weekly, etc. slash commands from
# .github/prompts/ are a VS Code Copilot Chat feature and do NOT
# appear in Copilot CLI. Instead, open the prompt file and paste
# its content, or just describe what you need in natural language.
```

## Example Prompts (Same as VS Code)

Once inside a Copilot CLI session, use the same natural language prompts:

```
Who am I in MSX?
Show me my active opportunities.
Run my weekly pipeline review — what needs cleanup across my Stage 2 and 3 opps?
How are my committed milestones doing?
```

Write operations still use the Stage → Review → Execute pattern and require your explicit approval.

## CLI ↔ IDE Handoff

Copilot CLI supports seamless handoff to VS Code. Start with `/plan` in the terminal, then use the CLI-to-IDE flow to continue refining in your editor — or go the other direction.

> **Tip:** If you primarily work in the terminal, Copilot CLI gives you the same MCP tools, role-aware skills, and safety guardrails as the VS Code experience — just in your shell.
