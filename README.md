# MSX Dashboard

Portfolio dashboard powered by the GitHub Copilot SDK with MCP tool integration for MSX/CRM, Outlook, Teams, and calendar intelligence.

![MSX Dashboard](.docs/documents/dashboard_info/dashboard-screenshot.png)

## Windows Installer (Recommended)

Double-click `dashboard/Install-MSXDashboard.bat` to launch the GUI installer. It will:
- Install Node.js 22 LTS (if not already installed)
- Copy application files to `C:\Program Files\MSX Dashboard`
- Install npm dependencies
- Create Desktop and Start Menu shortcuts
- Register in Add/Remove Programs for clean uninstall

To uninstall, use **Add/Remove Programs** in Windows Settings, or run `Uninstall-MSXDashboard.bat` from `C:\Program Files\MSX Dashboard\`.

## Quick Start (Development)

```bash
cd dashboard
npm install
npm start
```

Open **http://localhost:3737** in your browser.

> **Copilot Agent**: For the Copilot chat agent to work, link your GitHub account with Microsoft at [aka.ms/copilot](https://aka.ms/copilot).

### Prerequisites

- Node.js 20+
- MCP servers configured in `.vscode/mcp.json` (msx-crm, outlook-local, teams-local)

### Running Tests

```bash
cd dashboard
npm test
```

Runs 75 Playwright E2E tests in headless mode (no visible browser). The server starts automatically.

To watch tests run in a visible browser:

```bash
npx playwright test --headed
```

For interactive step-by-step debugging with pause controls:

```bash
npx playwright test --ui
```
