# Changelog

All notable changes to MCAPS-IQ are documented in this file.

## [0.2.0] — 2026-03-24

### Architecture & Infrastructure

- **Switch to npx server packages** — removed embedded `mcp/msx` and `mcp/oil` subtree directories; MCP servers now launch via `npx` for cleaner dependency management (`662e3a4`)
- **Add `mcp-launcher.js`** — unified MCP server startup script for consistent launch behavior (`3ea9d98`)
- **Remove Excalidraw MCP server** — removed Excalidraw MCP server implementation and related tests (`798d9e7`)
- **Update MCP configuration** — enhanced `.gitignore` for sensitive files, updated MCP config (`71e2c06`)

### Features

- **Comprehensive account review workflows** — added delegation frameworks, CSU commitment validation, and 343-file structural overhaul (`0756d17`, #27)
- **SE productivity, HoK readiness, authority matrix** — new SE productivity review prompt, HoK readiness check skill, wins channel post workflow, and account review enhancements (`12b6953`, #30)
- **HoK engagement processes** — introduced Hands-on-Keyboard engagement workflows and HTTP proxy for authentication (`2d43a88`, `91f671c`, #29)
- **OIL MCP tool optimization** — consolidated OIL tools, added domain routing to reduce tool surface area (`ff1572b`, #28)
- **New retrieval tools** — added related-entity retrieval and semantic search tools with word count utility (`e041e55`, `142e435`)
- **Copilot CLI plugin support** — added `plugin.json` for VS Code Copilot CLI integration (`447b721`, `566a8b0`, #51)
- **Global `mcaps` command** — added global CLI command for easier access from any directory, with checks for existing alias (`a19bdb3`, `54b0e0e`)
- **CRM and GitHub API integrations** — added CRM and GitHub API integrations for the MCAPS-IQ agent (`f0de472`)
- **Team membership fallback** — enhanced deal-team membership handling with fallback mechanisms for CRM operations (`fa797be`)
- **Artifact output directory** — updated generated artifact output to `.copilot/docs/` and improved Teams query scoping descriptions (`3212b16`)

### Bug Fixes

- **TPID auto-resolution** — fixed TPID auto-resolution for vault customer lookups and Windows path normalization (`ce0a3fd`, #32)
- **CRM field correction** — corrected `msp_commitmentrecommendation` value and added `userqueries` entity set (`76da286`, #26)
- **Package metadata** — updated package name and repository URL to reflect correct ownership (`554fb52`)

### Chores & Cleanup

- **Deprecated agent files removed** — removed deprecated CRM, GitHub, and main agent files; streamlined agent configuration and prompts (`85d8043`)
- **`.gitignore` updates** — added `.npmrc` to ignore list, removed deprecated `.npmrc` file (`56b34be`)
- **Repo URLs updated** — bumped sub-package versions for npx publish (`749ddd6`)
- **Upstream sync** — merged `mcp/oil` and `mcp/msx` subtrees from upstream before removal (`325ed3d`, `52529b4`)
- **Added `userqueries` to allowed entities** — upstream merge from microsoft/add-queries (`a93cbf1`, `aef2de4`, #49)

## [0.1.0] — Initial Release

- Initial MCAPS-IQ agent with MCP server integrations (MSX CRM, OIL vault, Power BI)
- MCEM lifecycle skills (Stages 1–5) with role-based routing (Specialist, SE, CSA, CSAM)
- Eval harness with anti-pattern, routing, output-format, and tool-correctness judges
- MkDocs documentation site with architecture, customization, and scenario guides
- One-command setup via `node scripts/init.js`
