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

### :material-github: GitHub Account + Microsoft EMU

You need a GitHub account linked to Microsoft's Enterprise Managed Users (EMU) to get unlimited Copilot access.

=== "Check"

    Go to [https://aka.ms/copilot](https://aka.ms/copilot) — if it shows your Copilot license is active, you're all set.

=== "Set up"

    1. **Create a free GitHub account** — if you don't have a personal GitHub account, register [here](https://github.com/signup)
    2. **Link it to Microsoft EMU**: Go to [https://aka.ms/copilot](https://aka.ms/copilot) and sign in with your `@microsoft.com` account. Follow the prompts to associate your GitHub account with Microsoft's enterprise organization.

    Once linked, you'll have unlimited GitHub Copilot tokens through Microsoft's enterprise license — no personal subscription needed.

!!! tip "Why do I need this?"
    MCAPS IQ runs on GitHub Copilot. The EMU link gives you the enterprise license so Copilot works without token limits or personal billing.

---

### :material-microsoft-visual-studio-code: VS Code + GitHub Copilot Extension

=== "Check"

    Open VS Code and verify the Copilot extension is installed:
    
    1. Open VS Code
    2. Press ++cmd+shift+x++ (Extensions)
    3. Search for "GitHub Copilot" — it should show as installed

=== "Install"

    1. Install VS Code and GitHub CLI:

        ??? example "Step-by-step: Install VS Code and GitHub CLI via PowerShell"

            **Open PowerShell:**

            1. Click the **Windows Start menu** (or press the ++win++ key)
            2. Type **`powershell`** in the search bar
            3. Click **Windows PowerShell** to open it (no need to run as administrator)

            **Run these commands** one at a time:

            ```powershell
            # Install VS Code
            winget install Microsoft.VisualStudioCode --silent --accept-package-agreements --accept-source-agreements

            # Install GitHub CLI
            winget install GitHub.cli --silent --accept-package-agreements --accept-source-agreements
            ```

            If Windows asks for permission to make changes, click **Yes**. After both finish, close PowerShell.

    2. Install the GitHub Copilot extension:

        ??? example "Step-by-step: Install Copilot via the terminal"

            **Open VS Code as Administrator:**

            1. Click the **Windows Start menu** (or press the ++win++ key)
            2. Type **`vsc`** in the search bar
            3. When **Visual Studio Code** appears, right-click it and choose **Run as administrator**

            **Open a terminal window inside VS Code:**

            1. In VS Code, click **Terminal** in the top menu bar
            2. Click **New Terminal Window**

            **Run this command** in the terminal to install the Copilot extension:

            ```powershell
            code --install-extension GitHub.copilot-chat
            ```

            You should see a message confirming the extension was installed. If VS Code asks you to reload the window, click **Reload**.

    3. Sign in with your GitHub account that has a Copilot license.

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
    
    # Windows (run in VS Code terminal — see "Step-by-step" above for how to open it)
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    
    # After install, close and reopen your terminal, then verify:
    node --version
    # Should print v18.x.x or higher
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
    ```

    ```powershell
    # Windows (run in VS Code terminal — see "Step-by-step" above for how to open it)
    winget install Microsoft.AzureCLI --silent --accept-package-agreements --accept-source-agreements

    # Refresh the PATH in your current terminal so "az" works immediately:
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    # Verify it works:
    az --version
    ```

---

### :material-account: Microsoft Corp Account

You'll sign in with your `@microsoft.com` alias (e.g., `yourname@microsoft.com`). This is the same account you use for MSX.

After installing Azure CLI, sign in to the Microsoft corporate tenant by running this in your terminal:

```powershell
az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
```

A browser window will open — sign in with your `@microsoft.com` account. After authentication, the terminal will show "Select a subscription and tenant." **Just press Enter** — it doesn't matter which subscription is selected. The app only uses the login session to talk to CRM, not to manage Azure resources.

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
