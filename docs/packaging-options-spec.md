# Packaging Options Spec: Simplified Onboarding for Non-Technical Users

**Date:** 2026-04-05  
**Status:** Draft — exploration phase  
**Goal:** Reduce the MCAPS IQ setup path from "install 6 CLI tools + clone + auth + az login" to something an AE or CSAM can do without terminal literacy.

---

## Current Pain Points

The existing setup requires users to independently install and configure:

| Step | What | Blocker for non-technical users |
|------|------|---------------------------------|
| 1 | VPN connection | Low — most already do this |
| 2 | GitHub EMU linking | Medium — unfamiliar flow, billing verification step |
| 3 | VS Code + Copilot extension | Low-Medium — winget commands, extension install |
| 4 | Git | Medium — often confused with GitHub CLI; `winget` + PATH refresh needed |
| 5 | Node.js 18+ | Medium — version management, PATH issues on Windows |
| 6 | GitHub CLI (`gh`) | High — must use personal (not EMU) account, scoping confusion |
| 7 | Azure CLI + `az login` | Medium — tenant ID, VPN-dependent, token expiry |
| 8 | `git clone` | Medium — terminal fluency, directory choice |
| 9 | `npm run auth:packages` | High — private registry auth, `.npmrc` generation |
| 10 | Start MCP servers via `mcp.json` | Medium — CodeLens discovery, agent mode toggle |

**Net:** ~10 distinct steps across 4+ tools, each with its own failure mode. The troubleshooting page alone covers 15+ failure scenarios. A Specialist or SE can navigate this; an AE or CSAM often cannot.

---

## Options

### Option A: One-Click Bootstrap Script (PowerShell / bash)

**Concept:** A single script (hosted at an `aka.ms` short link) that detects OS, checks/installs all prerequisites, clones the repo, runs auth, and opens VS Code with servers ready.

**How it works:**
```
# User pastes one line into any terminal:
irm https://aka.ms/mcaps-iq-setup | iex          # Windows PowerShell
curl -fsSL https://aka.ms/mcaps-iq-setup | bash   # macOS
```

The script:
1. Checks VPN reachability (ping CRM endpoint)
2. Installs missing tools via `winget` (Windows) / `brew` (macOS)
3. Clones the repo to a default location
4. Runs `npm run auth:packages` interactively
5. Runs `az login` with the Microsoft tenant
6. Opens VS Code in the workspace
7. Prints a "you're ready" summary with next steps

**Pros:**
- Lowest engineering effort — mostly orchestration of existing scripts
- Users still end up with a normal local repo setup (no ongoing divergence)
- Can be versioned and iterated quickly
- Works on both Windows and macOS

**Cons:**
- Users must still open a terminal to paste one command (could be intimidating)
- Silent `winget` installs may trigger UAC prompts (Windows)
- Network/proxy/VPN issues still surface during the script run
- No GUI feedback — failure messages are terminal-based
- `irm | iex` pattern can raise security eyebrows internally

**Effort:** Small (1-2 days)  
**Reach:** Moderate — helps anyone comfortable pasting one command

---

### Option B: VS Code Extension

**Concept:** Publish a private VS Code extension (`mcaps-iq-setup`) to the internal marketplace or `.vsix` sideload. The extension provides a GUI wizard that walks through setup, manages MCP server lifecycle, and surfaces errors in VS Code UI instead of terminal output.

**How it works:**
1. User installs the extension (one click from marketplace or `code --install-extension mcaps-iq-setup.vsix`)
2. Extension detects missing prerequisites and shows a checklist panel with install buttons
3. "Clone & Configure" button handles repo clone, auth, and `.env` configuration
4. MCP server start/stop exposed as status bar items or command palette commands
5. Health check command validates everything end-to-end
6. Guided walkthrough (VS Code Walkthrough API) replaces the docs site for first-time setup

**Pros:**
- Fully GUI — no terminal required for basic setup
- Can auto-detect and prompt for missing tools with one-click fix buttons
- VS Code Walkthrough API provides a polished first-run experience
- Can show real-time server status in status bar
- Can bundle the `.vscode/mcp.json` and prompt files, removing the git clone requirement entirely
- Extension updates propagate automatically

**Cons:**
- Significant engineering effort — extension development, testing on Windows/macOS
- Must maintain the extension alongside the repo
- VS Code marketplace publishing pipeline (or `.vsix` distribution channel)
- Some operations (e.g., `az login`, `gh auth`) still require terminal under the hood
- Extension can't install system-level tools (Node.js, Azure CLI) without shelling out

**Effort:** Medium-Large (1-2 weeks for MVP)  
**Reach:** High — fully removes terminal dependency for common path

---

### ~~Option C: GitHub Codespace / Dev Container~~ — RULED OUT

> **Not viable.** MCP servers require on-device access to CRM behind Microsoft corporate VPN + conditional access policies. Codespaces cannot route through VPN, and conditional access enforcement (device compliance, Intune enrollment) will reject auth from cloud-hosted containers. This is a hard blocker, not a solvable networking problem.

---

### Option D: Portable Archive (Self-Contained Bundle)

**Concept:** Ship a `.zip` / `.tar.gz` archive that includes a portable Node.js runtime, pre-installed npm packages (including private ones), and a launcher script. User extracts, double-clicks a launcher, and it opens VS Code with everything configured.

**How it works:**
1. CI/CD builds a platform-specific archive containing:
   - Portable Node.js binary
   - Pre-resolved `node_modules` (including `@microsoft/msx-mcp-server`, `@microsoft/workiq`)
   - Repo source (instructions, skills, prompts, mcp.json)
   - Launcher script (`start-mcaps.cmd` / `start-mcaps.sh`)
2. User downloads from an internal SharePoint/Teams location, extracts, and double-clicks the launcher
3. Launcher sets local `PATH` to bundled Node, runs `az login` if needed, opens VS Code

**Pros:**
- Eliminates Node.js, npm, and GitHub Packages auth entirely
- No `git clone`, no `npm install`, no `npx` resolution
- Works offline after initial download (except for `az login` and CRM calls)
- Can be distributed via SharePoint, Teams, or internal file share
- Familiar "download and unzip" pattern for non-technical users

**Cons:**
- Large download size (~150-300 MB with Node + node_modules)
- Must build and publish per-platform (Windows x64, macOS arm64, macOS x64)
- Updating requires re-downloading the archive (no auto-update)
- Pre-bundled private packages may have license/distribution constraints
- Still requires Azure CLI installed separately (or bundled — adds more size)
- Still requires VS Code + Copilot extension installed separately
- CI/CD pipeline needed for builds + distribution hosting

**Effort:** Medium (3-5 days for build pipeline + distribution)  
**Reach:** High — lowest technical barrier for initial setup; painful for updates

---

### Option E: Web-Based Setup Wizard + Personalized Script

**Concept:** A lightweight internal web app (could be a GitHub Pages site or SharePoint page) that asks the user 3-4 questions (OS, role, which integrations they want) and generates a personalized, copy-paste setup script.

**How it works:**
1. User visits `https://aka.ms/mcaps-iq`
2. Wizard asks: Windows or macOS? Which role? Want Obsidian vault? Want Power BI?
3. Generates a single script block customized to their answers
4. User copies and pastes into their terminal
5. Script handles everything (like Option A, but personalized)

**Pros:**
- Personalized — only installs what the user needs
- Reduces cognitive load (no "which optional steps do I need?")
- Low maintenance — static site, scripts update with repo
- Can include visual progress indicators and troubleshooting links
- Can track adoption (which roles, which OS, where people get stuck)

**Cons:**
- Still requires one terminal paste (same as Option A)
- Engineering effort for the web wizard UI
- Must host and maintain the web app
- Generated script complexity increases with permutations

**Effort:** Medium (3-5 days)  
**Reach:** Moderate-High — good UX improvement over raw docs, but still terminal-dependent

---

### Option F: Hybrid — Extension + Bootstrap Script

**Concept:** Combine Options A and B. Ship a thin VS Code extension that:
1. Detects the environment state (what's installed, what's missing)
2. Offers a "Fix it" button that runs the bootstrap script under the hood
3. Manages MCP server lifecycle via status bar
4. Provides a Walkthrough for first-time setup

This is lighter than a full extension (Option B) because the heavy lifting is done by the existing scripts — the extension is just a GUI shell.

**How it works:**
1. Distribute the `.vsix` file (or publish to internal marketplace)
2. On install, extension runs `scripts/init.js --check` and shows results in a panel
3. Missing tools → "Install" buttons that shell out to winget/brew
4. "Clone Repo" button → clones to a default location and opens the folder
5. "Sign In" button → runs `az login` in an embedded terminal
6. Status bar shows MCP server status (running/stopped/error)
7. Walkthrough guides first chat experience with inline screenshots

**Pros:**
- Best of both worlds: GUI for non-technical, existing scripts for power users
- Extension stays thin — doesn't duplicate logic from `init.js`
- Walkthrough API is polished and well-supported
- Can ship quickly because it wraps existing tooling

**Cons:**
- Extension development + testing still required
- Must create a distribution channel for the `.vsix`
- Two maintenance surfaces (extension + scripts)

**Effort:** Medium (5-7 days for MVP)  
**Reach:** Highest — covers both technical and non-technical users

---

## Comparison Matrix

| Criterion | A: Script | B: Extension | ~~C: Codespace~~ | D: Archive | E: Wizard | F: Hybrid |
|-----------|:---------:|:------------:|:----------------:|:----------:|:---------:|:---------:|
| No terminal needed | ✗ | ✓ | ~~RULED OUT~~ | ~partial | ✗ | ~mostly |
| No local tool installs | ✗ | ✗ | VPN + conditional access blocker | ~partial | ✗ | ✗ |
| Auto-updates | ✓ (git pull) | ✓ | — | ✗ | ✓ | ✓ |
| Works on VPN | ✓ | ✓ | ✗ (hard blocker) | ✓ | ✓ | ✓ |
| Windows + macOS | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Engineering effort | S | L | — | M | M | M |
| Ongoing maintenance | Low | Med | — | High | Med | Med |
| Adoption tracking | ✗ | ✓ | — | ✗ | ✓ | ✓ |
| Best for daily use | ✓ | ✓ | — | ✓ | ✓ | ✓ |

---

## Recommendation

**Phase 1 (immediate) — SHIPPED:** **Option A — Bootstrap Script.** Single-paste setup for Windows (PowerShell) and macOS/Linux (bash). CI validates across OS matrix (ubuntu, macOS, Windows) x Node versions (18, 20, 22).

- Windows: `irm https://raw.githubusercontent.com/Microsoft/MCAPS-IQ/main/scripts/bootstrap.ps1 | iex`
- macOS: `curl -fsSL https://raw.githubusercontent.com/Microsoft/MCAPS-IQ/main/scripts/bootstrap.sh | bash`
- Both support `--check-only` / `-CheckOnly` for prerequisite verification without installing.
- CI workflow: `.github/workflows/bootstrap.yml` (lint → prereq check → bootstrap dry run)

**Phase 2 (next sprint):** **Option F — Hybrid Extension.** Wraps the bootstrap script in a VS Code GUI with Walkthrough, status bar indicators, and "Fix it" buttons. Targets the users who won't touch a terminal at all.

**~~Phase 3~~:** ~~Option C — Codespace~~ **RULED OUT.** VPN + conditional access (Intune device compliance) make cloud-hosted environments non-viable. CRM auth requires on-device security posture that Codespaces cannot satisfy.

---

## Open Questions

1. **Distribution channel:** Can we publish a private VS Code extension to an internal marketplace, or must we sideload `.vsix` files? (affects Option B/F viability)
2. **Codespace MCP support:** Do MCP stdio servers work in GitHub Codespaces today? Need to validate.
3. **VPN in Codespaces:** Is there an approved pattern for routing Codespace traffic through corp VPN (VNET injection, Tailscale, etc.)?
4. **Private package redistribution:** Can we pre-bundle `@microsoft/msx-mcp-server` in a portable archive, or do license terms require per-user npm auth?
5. **Adoption telemetry:** Do we want to instrument setup success/failure rates? (helps prioritize which pain points to fix)
6. **Scope of "non-technical":** Are we targeting AEs who have never opened a terminal, or CSAMs who are comfortable with basic commands but get stuck on auth/PATH issues? (affects which options to prioritize)
