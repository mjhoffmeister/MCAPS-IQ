---
title: Troubleshooting Setup
description: Fix common installation and setup issues.
tags:
  - troubleshooting
  - setup
---

# Troubleshooting Setup

Can't get things running? This page covers every common issue, organized by symptom.

!!! tip "Quick diagnostic"
    Run the automated check first — it catches most problems:
    ```bash
    npm run check
    ```
    Or in VS Code: ++cmd+shift+p++ → **"Tasks: Run Task"** → **"Setup: Check Environment"**

---

## Installation Problems

??? failure "`npm install` fails with EACCES permission errors"
    **Symptom:** Error messages about missing write permissions to `~/.npm` or `node_modules`.
    
    **Fix (macOS/Linux):**
    ```bash
    sudo chown -R $(whoami) ~/.npm
    npm install
    ```
    
    **Fix (Windows):** Run your terminal as Administrator, or use:
    ```powershell
    npm install --no-optional
    ```

??? failure "`npm install` fails on Windows with execution policy error"
    **Symptom:** PowerShell blocks script execution during install.
    
    **Fix:**
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```
    Then retry `npm install`.

??? failure "`npm install` hangs indefinitely"
    **Cause:** Usually a proxy or VPN issue blocking npm registry access.
    
    **Fix:**
    ```bash
    # Check if npm can reach the registry
    npm ping
    
    # If behind a proxy
    npm config set proxy http://your-proxy:port
    npm config set https-proxy http://your-proxy:port
    ```

??? failure "Node.js version too old"
    **Symptom:** Error about unsupported Node.js version or missing features.
    
    **Fix:**
    ```bash
    node --version  # check current
    
    # Upgrade via Homebrew (macOS)
    brew upgrade node
    
    # Or use nvm
    nvm install 18 && nvm use 18
    ```

---

## Authentication Problems

??? failure "`az login` opens browser but fails"
    **Cause:** Usually means you're not on VPN, or the browser is blocking the redirect.
    
    **Fix:**
    1. Verify VPN is connected
    2. Try device code flow instead:
       ```bash
       az login --use-device-code
       ```
    3. If you need a specific tenant:
       ```bash
       az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
       ```

??? failure "`az login` succeeds but CRM says 'Not authenticated'"
    **Cause:** Your Azure token doesn't include MSX CRM scope, or it expired.
    
    **Fix:**
    ```bash
    # Check if you can get a CRM token
    az account get-access-token --resource https://microsoftsales.crm.dynamics.com
    
    # If this fails, re-login with the Microsoft tenant
    az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
    ```

??? failure "Token expires mid-session"
    **Symptom:** Things were working, then suddenly you get authentication errors.
    
    **Cause:** Azure CLI tokens expire after ~1 hour.
    
    **Fix:** Run `az login` again. You don't need to restart the MCP servers — they'll use the new token automatically.

??? failure "`az account show` shows wrong subscription"
    **Fix:**
    ```bash
    az account list --output table
    az account set --subscription "Your-Subscription-Name"
    ```

---

## MCP Server Problems

??? failure "Server won't start — 'Start' button does nothing"
    **Check:**
    1. Is Node.js installed? (`node --version`)
    2. Were dependencies installed? (`ls mcp/msx/node_modules`)
    3. Try starting manually in terminal:
       ```bash
       node mcp/msx/src/index.js
       ```
       This shows the actual error.

??? failure "Server starts but shows 0 tools"
    **Cause:** The server started but failed to register tools (usually an auth issue).
    
    **Fix:**
    1. Check Azure login: `az account get-access-token --resource https://microsoftsales.crm.dynamics.com`
    2. Restart the server (click **Stop** then **Start** in `mcp.json`)

??? failure "Copilot doesn't see the MCP tools"
    **Fix:**
    1. Verify the server shows as **"Running"** in `.vscode/mcp.json`
    2. Try reloading VS Code: ++cmd+shift+p++ → **"Developer: Reload Window"**
    3. Check that your Copilot extension is up to date

??? failure "`workiq` server fails to start"
    **Cause:** WorkIQ requires the `@microsoft/workiq` npm package.
    
    **Fix:**
    ```bash
    npx -y @microsoft/workiq mcp
    ```
    If this fails, WorkIQ may not be available in your region yet. Everything else works without it.

---

## Copilot Chat Problems

??? failure "Copilot doesn't respond to MSX-related prompts"
    **Checklist:**
    
    1. Is the `msx-crm` server running? (check `.vscode/mcp.json`)
    2. Is Copilot Chat open? (++cmd+shift+i++)
    3. Try a simple test: `Who am I in MSX?`
    4. If no response: reload VS Code (++cmd+shift+p++ → **"Developer: Reload Window"**)

??? failure "Copilot ignores my custom instructions or skills"
    **Cause:** The `description` field in the YAML frontmatter doesn't match your prompt's keywords.
    
    **Fix:** Check the `description` in the file's YAML front matter. Copilot matches your prompt text against these keywords. Add more trigger phrases to the description.
    
    **Example:** If your skill has `description: "milestone health review"` but you ask "how are my milestones doing?" — the match may be weak. Add variations:
    ```yaml
    description: "milestone health review, how are my milestones, milestone status, governance prep"
    ```

??? failure "Copilot gives generic answers instead of using MCP tools"
    **Cause:** Copilot may not be recognizing that MCP tools are relevant.
    
    **Fix:** Be explicit about wanting CRM data:
    ```
    # Instead of:
    "How's my pipeline?"
    
    # Try:
    "Use the MSX CRM tools to show me my active opportunities."
    ```

---

## Still Stuck?

1. Run the full diagnostic: `npm run check`
2. Check the [FAQ](../faq/index.md) for more answers
3. Open an issue: [GitHub Issues](https://github.com/microsoft/MCAPS-IQ/issues)
