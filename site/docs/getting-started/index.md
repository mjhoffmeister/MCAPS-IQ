---
title: Getting Started
description: Go from zero to your first Copilot-powered MSX query in 5 minutes.
tags:
  - getting-started
  - setup
---

# Getting Started

!!! success "5 minutes to your first result"
    You'll go from a fresh clone to asking Copilot about your MSX pipeline in about 5 minutes. No coding, no configuration files to hand-edit.

## The Setup Path

<div class="step-indicator" markdown>
<span class="step active">1. Prerequisites</span>
<span class="step">2. Install</span>
<span class="step">3. First Chat</span>
<span class="step">4. Choose Role</span>
</div>

| Step | What You'll Do | Time |
|------|---------------|------|
| [**Prerequisites**](prerequisites.md) | Verify you have VS Code, Node.js, Azure CLI, and VPN | 2 min |
| [**Installation**](installation.md) | Clone the repo, install dependencies, sign in to Azure | 3 min |
| [**Your First Chat**](first-chat.md) | Open Copilot, start the MCP servers, and ask your first question | 1 min |
| [**Choose Your Role**](choose-role.md) | Tell Copilot who you are so it tailors its behavior | 30 sec |

---

## Quick Visual: What You're Building

```mermaid
graph LR
    A[You — VS Code] -->|plain English| B[GitHub Copilot]
    B -->|MCP| C[MSX CRM]
    B -->|MCP| D[M365 / WorkIQ]
    B -->|MCP| E[Obsidian Vault]
    B -->|MCP| F[Power BI]
    style A fill:#4CAF50,color:#fff
    style B fill:#1565C0,color:#fff
```

You're connecting Copilot to your enterprise data sources via MCP servers. Once connected, you just talk to it.

---

## Something Not Working?

Jump to [Troubleshooting Setup](troubleshooting.md) — it covers every common issue with step-by-step fixes.

[:octicons-arrow-right-16: Start with Prerequisites](prerequisites.md){ .md-button .md-button--primary }
