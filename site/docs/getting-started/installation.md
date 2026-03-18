---
title: Installation
description: Clone the repo, install dependencies, and sign in to Azure.
tags:
  - getting-started
  - installation
---

# Installation

<div class="step-indicator" markdown>
<span class="step done">1. Prerequisites ✓</span>
<span class="step active">2. Install</span>
<span class="step">3. First Chat</span>
<span class="step">4. Choose Role</span>
</div>

Three commands and you're done.

---

## Step 1: Clone the Repo

Open VS Code, then open a terminal inside it (**Terminal** → **New Terminal Window**) and run:

```bash
git clone https://github.com/microsoft/mcaps-iq.git
cd mcaps-iq
```

---

## Step 2: Install Dependencies

=== "One command (recommended)"

    ```bash
    npm install
    ```
    
    This runs the setup script automatically (`postinstall`), which:
    
    - Installs the MSX CRM MCP server dependencies
    - Installs the OIL server dependencies (if present)
    - Validates your environment
    - Creates a `.env` file if needed

=== "VS Code Task"

    If you prefer a GUI:
    
    1. Open the repo in VS Code: `code .`
    2. Press ++cmd+shift+p++
    3. Type **"Tasks: Run Task"**
    4. Select **"Setup: Install Everything"**

=== "Manual (advanced)"

    ```bash
    # Install root dependencies
    npm install
    
    # Install MSX MCP server
    cd mcp/msx && npm install && cd ../..
    
    # Install OIL (optional — for Obsidian vault integration)
    cd mcp/oil && npm install && npm run build && cd ../..
    ```

!!! tip "What to expect"
    The install takes about 30 seconds. You'll see npm output for each sub-package. If anything fails, the setup script tells you exactly what went wrong.

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
    npm run check
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

## Common Install Issues

??? failure "npm install fails with permission errors"
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

[:octicons-arrow-right-16: Continue to Your First Chat](first-chat.md){ .md-button .md-button--primary }
