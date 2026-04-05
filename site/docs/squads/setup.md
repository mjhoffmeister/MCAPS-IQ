---
title: Squad Setup
description: Install the Squad CLI, initialize your team, and connect it to MCAPS IQ.
tags:
  - squads
  - getting-started
  - installation
hide:
  - toc
---

# Squad Setup

<div class="timeline-nav">
<a href="./" class="tl-step active"><div class="tl-node"><span class="tl-num">1</span></div><div class="tl-label">Install Squad CLI</div></a>
<a href="#initialize" class="tl-step"><div class="tl-node"><span class="tl-num">2</span></div><div class="tl-label">Initialize Squad</div></a>
<a href="#theme" class="tl-step"><div class="tl-node"><span class="tl-num">3</span></div><div class="tl-label">Pick a Theme</div></a>
<a href="#start" class="tl-step"><div class="tl-node"><span class="tl-num">4</span></div><div class="tl-label">Start Working</div></a>
</div>

---

## Prerequisites

Before setting up squads, make sure you have:

- [x] **MCAPS IQ installed** — completed the [Getting Started](../getting-started/index.md) setup
- [x] **Node.js 18+** — required for the Squad CLI
- [x] **GitHub CLI (`gh`)** — already installed if you followed MCAPS IQ prerequisites

---

## Option A: Automated Setup (Recommended)

Run the MCAPS IQ squad setup script, which installs the Squad CLI and initializes with the recommended sales/SA team configuration:

```bash
npm run squad:setup
```

This script will:

1. :material-check: Check if Squad CLI is already installed
2. :material-download: Install `@bradygaster/squad-cli` globally if needed
3. :material-rocket: Run `squad init` in your MCAPS IQ workspace
4. :material-account-group: Provide the recommended 5+1 role configuration for sales teams
5. :material-palette: Help you pick a theme for your agent cast

!!! tip "Safe to run multiple times"
    Both the Squad CLI install and `squad init` are idempotent — running them again won't overwrite your existing team state.

---

## Option B: Manual Setup

### Step 1: Install the Squad CLI

```bash
npm install -g @bradygaster/squad-cli
```

Verify the installation:

```bash
squad doctor
```

??? failure "Install fails with permission errors?"
    ```bash
    # macOS/Linux — fix npm global permissions
    sudo npm install -g @bradygaster/squad-cli

    # Or configure npm to use a local prefix (no sudo needed)
    npm config set prefix ~/.npm-global
    export PATH=~/.npm-global/bin:$PATH
    npm install -g @bradygaster/squad-cli
    ```

    ```powershell
    # Windows — run terminal as administrator
    npm install -g @bradygaster/squad-cli
    ```

### Step 2: Initialize Squad in Your Workspace

Navigate to your MCAPS IQ repo directory and run:

```bash
cd mcaps-iq
squad init
```

This creates the `.squad/` directory structure:

```
.squad/
├── team.md              # Roster — who's on the team
├── routing.md           # Routing — who handles what
├── decisions.md         # Shared brain — team decisions
├── ceremonies.md        # Sprint ceremonies config
├── casting/
│   ├── policy.json      # Casting configuration
│   ├── registry.json    # Persistent name registry
│   └── history.json     # Universe usage history
├── agents/
│   └── {name}/
│       ├── charter.md   # Identity, expertise, voice
│       └── history.md   # What they know about YOUR accounts
├── skills/              # Compressed learnings from work
├── identity/
│   ├── now.md           # Current team focus
│   └── wisdom.md        # Reusable patterns
└── log/                 # Session history
```

### Step 3: Set Up Your Team

Open Copilot Chat (++cmd+shift+i++) or launch the Squad interactive shell:

```bash
squad
```

Then describe your team:

```
I'm setting up a team for MCAPS sales operations and solution architecture.
I need these roles:
1. Experience Orchestrator — routes work and assembles seller-ready bundles
2. Data & Signal Synthesizer — pulls and normalizes CRM + PBI + M365 signals
3. Sales Excellence & Win Strategy Lead — converts signals into plays and positioning
4. Artifact Builder — produces demos, decks, scripts, and workshop kits
5. Contrarian Coach — red-teams plans and coaches seller readiness
```

Squad will propose named agents for each role. Type `yes` to confirm.

!!! info "Want the optional 6th role?"
    Add this to your prompt: "Also add a Work Context Comms Agent for drafting briefs, follow-ups, and action lists."

---

## Step 4: Verify Your Squad

Check that everything is set up:

```bash
squad status
```

Or in the interactive shell:

```
squad > /agents
```

You should see your named agents listed with their roles.

---

## Using Your Squad

### In VS Code

Open Copilot Chat and select the **Squad** agent. Then talk naturally:

```
Prep my account plan for Contoso — pull pipeline, build a deck, and draft follow-ups.
```

### From the Terminal

```bash
squad
```

This opens the interactive shell where you can talk to your agents:

```
squad > @Orchestrator, run a weekly pipeline review for my top 5 accounts
squad > Build meeting prep for tomorrow's QBR with Fabrikam
squad > @Coach, red-team my pitch for the Azure migration deal
```

### With Copilot CLI

```bash
copilot --agent squad
```

!!! tip "Use `--yolo` for uninterrupted flow"
    Squad makes many tool calls per session. Add `--yolo` to skip individual approval prompts:
    ```bash
    copilot --agent squad --yolo
    ```

---

## Upgrading Squad

When a new version of Squad is released:

```bash
# Step 1: Update the CLI
npm install -g @bradygaster/squad-cli@latest

# Step 2: Update Squad-owned files (preserves your team state)
squad upgrade
```

`squad upgrade` updates templates and workflows but **never touches** your `.squad/agents/`, decisions, or history.

---

## What's Next?

<div class="grid cards" markdown>

-   :material-account-details:{ .lg .middle } __[Understand the Roles](roles.md)__

    ---

    Deep dive into each recommended role — what they do in seller mode vs. OU mode.

-   :material-palette:{ .lg .middle } __[Pick a Theme](themes.md)__

    ---

    Choose a personality theme for your agent cast — from classic to creative.

</div>
