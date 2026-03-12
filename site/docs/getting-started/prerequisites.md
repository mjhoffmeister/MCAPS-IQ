---
title: Prerequisites
description: Everything you need before installing MCAPS IQ.
tags:
  - getting-started
  - prerequisites
---

# Prerequisites

<div class="step-indicator" markdown>
<span class="step active">1. Prerequisites</span>
<span class="step">2. Install</span>
<span class="step">3. First Chat</span>
<span class="step">4. Choose Role</span>
</div>

Before you begin, verify you have everything in this checklist. Each item takes 30 seconds to check.

---

## Checklist

!!! abstract "Quick check"
    Run each command in your terminal. If it prints a version or succeeds, you're good.

### :material-wifi: Microsoft Corporate VPN

You must be connected to the Microsoft corporate network (VPN) to access MSX CRM.

**How to check:** Try opening [https://microsoftsales.crm.dynamics.com](https://microsoftsales.crm.dynamics.com) in your browser. If it loads, you're connected.

!!! failure "Not on VPN?"
    Connect to the Microsoft corporate VPN before proceeding. CRM authentication will fail without it.

---

### :material-microsoft-visual-studio-code: VS Code + GitHub Copilot Extension

=== "Check"

    Open VS Code and verify the Copilot extension is installed:
    
    1. Open VS Code
    2. Press ++cmd+shift+x++ (Extensions)
    3. Search for "GitHub Copilot" — it should show as installed

=== "Install"

    1. Download [VS Code](https://code.visualstudio.com/)
    2. Install the [GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)
    3. Sign in with your GitHub account that has a Copilot license

!!! info "Copilot license"
    You need a GitHub Copilot subscription (Free, Pro, Pro+, Business, or Enterprise). If you don't have one, ask your manager — Microsoft provides Copilot Business for internal use.

---

### :material-nodejs: Node.js 18+

=== "Check"

    ```bash
    node --version
    # Should print v18.x.x or higher
    ```

=== "Install"

    ```bash
    # macOS (Homebrew)
    brew install node
    
    # Windows (Chocolatey)
    choco install nodejs
    
    # Or download from https://nodejs.org/
    ```

---

### :material-microsoft-azure: Azure CLI

=== "Check"

    ```bash
    az --version
    # Should print azure-cli 2.x.x or higher
    ```

=== "Install"

    ```bash
    # macOS
    brew install azure-cli
    
    # Windows
    winget install Microsoft.AzureCLI
    
    # Or see https://learn.microsoft.com/cli/azure/install-azure-cli
    ```

---

### :material-account: Microsoft Corp Account

You'll sign in with your `@microsoft.com` alias (e.g., `yourname@microsoft.com`). This is the same account you use for MSX.

---

## All Good?

If every item above checks out, you're ready to install:

[:octicons-arrow-right-16: Continue to Installation](installation.md){ .md-button .md-button--primary }

??? failure "Something missing?"
    | Problem | Fix |
    |---------|-----|
    | Node.js too old | Run `brew upgrade node` or download from nodejs.org |
    | No Copilot extension | Install from VS Code Marketplace |
    | No Azure CLI | `brew install azure-cli` on Mac |
    | Can't access VPN | Contact your IT support |
    | No Copilot license | Ask your manager for GitHub Copilot Business access |
