---
title: Installation
description: Clone the repo, configure runtime, and sign in to Azure.
tags:
  - getting-started
  - installation
hide:
  - toc
---

# Installation

<div class="timeline-nav">
<a href="../" class="tl-step done"><div class="tl-node"><span class="tl-num">1</span></div><div class="tl-label">Getting Started</div></a>
<a href="./" class="tl-step active"><div class="tl-node"><span class="tl-num">2</span></div><div class="tl-label">Install</div></a>
<a href="../first-chat/" class="tl-step"><div class="tl-node"><span class="tl-num">3</span></div><div class="tl-label">First Chat</div></a>
<a href="../choose-role/" class="tl-step"><div class="tl-node"><span class="tl-num">4</span></div><div class="tl-label">Choose Role</div></a>
</div>

!!! success "Used the bootstrap script?"
    If you ran the one-command bootstrap from [Getting Started](index.md), you can skip to [Step 3: Sign In to Azure](#step-3-sign-in-to-azure) — the repo is already cloned and tools are installed.

---

## Step 1: Clone the Repo

=== "Bootstrap (already done)"

    If you used the bootstrap script, the repo is already cloned and VS Code is open. Skip to Step 2.

=== "Windows (manual)"

    Open VS Code, then open a terminal inside it (**Terminal** → **New Terminal**) and run:

    ```powershell
    # Navigate to C:\Temp (create it if it doesn't exist)
    if (-not (Test-Path "C:\Temp")) { New-Item -ItemType Directory -Path "C:\Temp" }
    cd C:\Temp

    # Clone the repo
    git clone https://github.com/microsoft/mcaps-iq.git
    cd mcaps-iq
    ```

=== "macOS / Linux (manual)"

    ```bash
    cd ~
    git clone https://github.com/microsoft/mcaps-iq.git
    cd mcaps-iq
    ```

!!! tip "Where is the repo?"
    Default locations: `C:\Temp\mcaps-iq` (Windows bootstrap), `~/mcaps-iq` (macOS bootstrap). You can change this to any folder you prefer.

---

## Step 2: Runtime Setup

=== "Default runtime (recommended)"

    ```bash
    code .
    ```

    Then open `.vscode/mcp.json` and click **Start** on `msx` (and `workiq` if needed).
    The default servers run via `npx`/HTTP, so no local server source install is required.

=== "Optional local tooling"

    Use this only if you want local eval/docs tooling or automatic global `mcaps` alias setup:
    
    ```bash
    npm install
    ```

    Or in VS Code: ++cmd+shift+p++ → **Tasks: Run Task** → **Setup: Optional Local Tooling**

=== "Manual (advanced)"

    ```bash
    # Check runtime prerequisites without local installs
    node scripts/init.js --check

    # Optional local tooling bootstrap
    node scripts/init.js
    ```

!!! tip "What to expect"
    Runtime startup is immediate once servers are started in `.vscode/mcp.json`. Optional local tooling setup may take longer depending on npm/network conditions.

### One-time GitHub Packages auth

Private MCP packages such as `@microsoft/msx-mcp-server` and `@microsoft/workiq` can be bootstrapped through GitHub CLI instead of a manually created PAT:

```bash
npm run auth:packages
```

The script looks for a signed-in GitHub account with `read:packages`, falls back to `gh auth login` if needed, and writes a repo-local `.npmrc` for this workspace.

!!! success "Global `mcaps` command"
    Optional local tooling setup registers a **global `mcaps` command** on your system via `npm link`. After setup, you can type `mcaps` from **any directory** in **any terminal window** to launch a [Copilot CLI](../integrations/copilot-cli.md) session with the full MCAPS IQ toolkit — MCP servers, agents, and skills are auto-loaded regardless of where you are.

    ```bash
    # Works from anywhere — no need to cd into the repo
    mcaps
    ```

    If the global link fails (permissions, PATH issues), the installer prints manual steps. You can always re-run it:

    ```bash
    cd mcaps-iq
    npm link --ignore-scripts
    ```

---

## Step 3: Sign In to Azure

```bash
az login
```

This opens your browser for Azure authentication. Use your **Microsoft corp account** (e.g., `yourname@microsoft.com`).

!!! warning "VPN required"
    You must be on the Microsoft corporate VPN for Azure login to work with MSX CRM.

??? question "What if I need a specific tenant?"
    ```bash
    az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
    ```
    This is the Microsoft tenant ID. The MCP server uses this by default.

---

## Verify Your Setup

Want to double-check everything before moving on?

=== "Automated check"

    ```bash
    node scripts/init.js --check
    ```
    
    Or in VS Code: ++cmd+shift+p++ → **"Tasks: Run Task"** → **"Setup: Check Environment"**

=== "Manual check"

    | What | Command | Expected |
    |------|---------|---------|
    | Node.js | `node --version` | v18+ |
    | npm | `npm --version` | 8+ |
    | Azure CLI | `az --version` | 2.x+ |
    | Azure login | `az account show` | Shows your subscription |
    | MSX access | `az account get-access-token --resource https://microsoftsales.crm.dynamics.com` | Returns a token |

---

## Common Setup Issues

??? failure "Optional local tooling install fails with permission errors"
    ```bash
    # Fix npm permissions (macOS/Linux)
    sudo chown -R $(whoami) ~/.npm
    npm install
    ```

??? failure "PowerShell execution policy (Windows)"
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```
    Then retry `npm install`.

??? failure "npx cannot fetch MSX or OIL packages"
    ```bash
    npm run auth:packages
    npm ping
    npx -y --registry https://npm.pkg.github.com @microsoft/msx-mcp-server@latest
    npx -y @jinlee794/obsidian-intelligence-layer@latest mcp
    ```
    If package fetch still fails, check VPN/proxy and confirm your GitHub account has package access.

??? failure "`az login` hangs or fails"  
    1. Make sure you're on VPN
    2. Try: `az login --use-device-code` (uses a device code instead of browser)
    3. If that fails: `az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47`

??? failure "Node.js version too old"
    ```bash
    # macOS
    brew upgrade node
    
    # Or use nvm
    nvm install 18
    nvm use 18
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
