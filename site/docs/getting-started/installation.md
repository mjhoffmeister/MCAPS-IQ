---
title: Installation
description: Start the MCP servers and verify your setup.
tags:
  - getting-started
  - installation
---

# Installation

<div class="step-indicator" markdown>
<span class="step done">1. Getting Started ✓</span>
<span class="step active">2. Start Servers</span>
<span class="step">3. First Chat</span>
<span class="step">4. Choose Role</span>
</div>

!!! success "Ran the bootstrap script?"
    If you completed [Getting Started](index.md), the repo is cloned, tools are installed, and you're signed in to Azure. **Skip straight to [Start the MCP Servers](#start-the-mcp-servers).**

---

## Start the MCP Servers

This is the key step — it connects Copilot to your CRM and M365 data.

1. Open the repo in VS Code (the bootstrap script does this automatically):

    ```bash
    code .
    ```

2. Open `.vscode/mcp.json` — you'll see a **"Start"** button above each server definition

3. Click **Start** on:
    - **`msx`** (required) — connects to MSX CRM
    - **`workiq`** (optional) — enables M365 searches (email, Teams, calendar)

!!! tip "Don't see the Start buttons?"
    - Requires GitHub Copilot Chat **v0.25+** with **Agent mode** enabled
    - Make sure `mcp.json` is the active editor tab
    - Try: ++cmd+shift+p++ → **"Developer: Reload Window"**, then reopen the file

!!! failure "Server fails with 401/403/404?"
    Run `npm run auth:packages` to fix package auth. This uses your GitHub CLI session to configure access to private npm packages.

### GitHub Packages Auth

If the bootstrap script didn't configure package auth (or you need to redo it):

```bash
npm run auth:packages
```

This uses your `gh` session to write a repo-local `.npmrc` for accessing private MCP packages like `@microsoft/msx-mcp-server`.

---

## Sign In to Azure

!!! success "Bootstrap did this"
    If the bootstrap script signed you in, skip this step. Check with: `az account show`

If you need to sign in manually:

```bash
az login
```

Use your **Microsoft corp account** (`yourname@microsoft.com`). You must be on **VPN**.

??? question "Need a specific tenant?"
    ```bash
    az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
    ```

---

## Verify Your Setup

=== "Automated check"

    ```bash
    node scripts/init.js --check
    ```
    
    Or in VS Code: ++cmd+shift+p++ → **"Tasks: Run Task"** → **"Setup: Check Environment"**

=== "Manual check"

    | What | Command | Expected |
    |------|---------|---------|
    | Node.js | `node --version` | v18+ |
    | Azure CLI | `az --version` | 2.x+ |
    | Azure login | `az account show` | Shows your subscription |
    | MSX access | `az account get-access-token --resource https://microsoftsales.crm.dynamics.com` | Returns a token |

---

## Optional: Local Tooling & `mcaps` Command

The default setup runs MCP servers via `npx`/HTTP — no local install needed. But if you want local eval/docs tooling or a global `mcaps` command:

```bash
npm install
```

This registers a **global `mcaps` command** via `npm link`. After setup, type `mcaps` from **any directory** to launch a [Copilot CLI](../integrations/copilot-cli.md) session with the full toolkit.

---

## Common Issues

??? failure "npx cannot fetch MSX or OIL packages"
    ```bash
    npm run auth:packages
    npx -y --registry https://npm.pkg.github.com @microsoft/msx-mcp-server@latest
    ```
    If still failing, check VPN/proxy and confirm your GitHub account has package access.

??? failure "`az login` hangs or fails"  
    1. Make sure you're on VPN
    2. Try: `az login --use-device-code`
    3. If that fails: `az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47`

??? failure "PowerShell execution policy (Windows)"
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```

??? failure "Node.js version too old"
    ```bash
    # macOS
    brew upgrade node
    # Or: nvm install 18 && nvm use 18
    ```

For more issues, see [Troubleshooting Setup](troubleshooting.md).

---

## Optional: Multi-Agent Squads (Experimental)

!!! warning "Experimental — advanced users only"
    Multi-agent orchestration can deliver real benefits (parallel workstreams, role-specialized reasoning), but without a clear understanding of what you want each agent to do, you can end up with unnecessary complexity and performance issues. **Master single-agent MCAPS IQ first** before reaching for Squads.

Want a team of AI specialists that work in parallel? **Squads** give you persistent, named agents — an orchestrator, data synthesizer, win strategist, artifact builder, and deal coach — all living in your repo.

```bash
npm run squad:setup
```

This installs the [Squad CLI](https://github.com/bradygaster/squad) and initializes a `.squad/` directory with your agent team. Learn more in the [Squads integration guide](../integrations/squads.md).

[:octicons-arrow-right-16: Continue to Your First Chat](first-chat.md){ .md-button .md-button--primary }
