---
title: Copilot CLI
description: Run MCAPS IQ from your terminal without opening VS Code.
tags:
  - integrations
  - cli
---

# Copilot CLI

[GitHub Copilot CLI](https://github.com/features/copilot/cli/) runs the same MCP tools, agents, and skills directly in your terminal — no VS Code required.

---

## Install

=== "macOS"

    ```bash
    brew install copilot-cli
    ```

=== "npm"

    ```bash
    npm install -g @github/copilot
    ```

!!! info "License"
    Included in Copilot Free, Pro, Pro+, Business, and Enterprise subscriptions.

---

## Prerequisites

Same as the VS Code flow:

- Azure CLI signed in (`az login`)
- VPN connected
- Dependencies installed (`npm install`)

---

## How It Works

Copilot CLI picks up the project configuration automatically when run from the repo root:

- **MCP servers** — reads `.vscode/mcp.json`
- **AGENTS.md** — loads agent instructions
- **Skills & instructions** — same `.github/` files as VS Code

---

## Run It

```bash
cd mcaps-iq
copilot
```

Built-in CLI commands:

| Command | Purpose |
|---------|---------|
| `/plan` | Outline work before executing |
| `/model` | Switch between models |
| `/fleet` | Parallelize across subagents |
| `/agent` | Select a custom agent |
| `/skills` | Browse available skills |
| `/resume` | Pick up a previous session |

!!! info "Slash commands"
    The custom `/daily`, `/weekly`, etc. from `.github/prompts/` are a VS Code feature. In CLI, describe what you need in natural language or paste prompt content directly.

---

## Example Prompts

Same prompts work in CLI:

```
Who am I in MSX?
Show me my active opportunities.
Run my weekly pipeline review.
```

Write operations still use Stage → Review → Execute with explicit approval.
