# Optimization Plan v9 — Direct CRM SDK + Dashboard Features

**Date**: March 7, 2026  
**Branch**: `dashboard-cpsdk`  
**Tests**: 71 Playwright tests (36 dashboard + 35 quick-crm), all passing

## Overview

Integrated direct CRM access (modeled after msx-helper's fast OData approach) into the MSX Dashboard alongside the existing Copilot SDK + MCP pipeline. Added logging, screenshot analysis, smart filters, clickable CRM links, and a maintenance agent.

## Architecture: Dual CRM Path

```
User Input
  ├── "quick" prefix → Direct CRM HTTP → Instant results (~1-3s)
  │     └── /api/crm/* endpoints → crm-direct.js → Dynamics 365 OData
  │
  └── Normal prompt → Copilot SDK → MCP tools → LLM analysis (~15-60s)
        └── WebSocket → copilot.js → msx-crm/outlook-local/teams-local
```

Both paths share Azure CLI authentication from `mcp/msx/src/auth.js`.

## Changes Made

### 1. Direct CRM Client (`dashboard/server/crm-direct.js`)
- Reuses `mcp/msx/src/auth.js` for Azure CLI token acquisition
- Direct HTTP to `https://microsoftsales.crm.dynamics.com/api/data/v9.2/`
- OData field selections mirrored from msx-helper
- Functions: `searchAccounts`, `searchOpportunities`, `searchMilestones`, `drillDownAccount`, `getMilestonesByStatus`, `getTasksByMilestone`, `runCustomQuery`
- 30s timeout (increased from 20s to fix T-Mobile abort errors)
- Smart opportunity search: account-name → find accounts → get their opportunities (fixes the "Find Opportunities" abort error)

### 2. Quick CRM UI (sidebar section)
- 6 action buttons: Account Drill-Down, Find Milestones, Find Opportunities, Find Accounts, My Active Milestones, Milestones by Owner
- Search input shared with account datalist for autocomplete
- Owner email input with @microsoft.com validation
- Status line showing query timing
- All results render as formatted tables with clickable CRM links

### 3. "quick" Prefix Chat Bypass
- Chat messages starting with "quick" or "Quick" bypass MCP entirely
- Routed to `/api/crm/quick-chat` → natural language parsed for CRM intent
- Results displayed as formatted tables in chat

### 4. Clickable CRM Links
- Milestone numbers, opportunity IDs, and account IDs link directly to CRM entity pages
- Format: `https://microsoftsales.crm.dynamics.com/main.aspx?forceUCI=1&pagetype=entityrecord&etn=<entity>&id=<guid>`

### 5. File-Based Logging (`dashboard/server/logger.js`)
- Structured JSON logs written to `dashboard/logs/dashboard-YYYYMMDD.log`
- Categories: server, ws, chat, crm, crm-drill, quick-chat
- Levels: INFO, WARN, ERROR
- Buffered writes (1s flush interval)

### 6. Log Viewer (🦔 hedgehog FAB)
- Animated hedgehog button in bottom-right corner (writing animation)
- Click reveals popup with 3 actions: View Logs, Pause/Start Logging, Clear Logs
- Shows log directory path (copyable)
- Displays last 100 log entries with color-coded levels

### 7. Screenshot Paste
- Paste images (Ctrl+V) into the chat textarea
- Preview appears with "Analyze Screenshot" button
- Sends to Copilot SDK with context prompt for .docs/ knowledge-base analysis

### 8. Button Tooltips
- All Quick CRM buttons have `data-tooltip` attributes
- Hover for 400ms shows animated tooltip explaining what the button does

### 9. Email Search Custom Filter
- New input field under "Search Emails" button
- Allows manual filter override (subject, contact, TPID)
- Passed to the search-emails action prompt as custom criteria

### 10. Milestones by Owner
- New "Milestones by Owner" button
- Requires `name@microsoft.com` format in Owner field
- Looks up CRM user by email → fetches their active milestones

### 11. Maintenance Agent (`.github/agents/dashboard-maintenance.agent.md`)
- Custom agent triggered when user pastes logs and says "fix" or "repair"
- Has full read/edit access to dashboard source files
- Documents architecture, common issues, diagnostic workflow

## API Endpoints Added

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/crm/auth` | GET | CRM auth status |
| `/api/crm/whoami` | GET | Current CRM user |
| `/api/crm/accounts?q=` | GET | Search accounts by name/TPID |
| `/api/crm/opportunities?q=` | GET | Search opportunities |
| `/api/crm/milestones?q=` | GET | Search milestones |
| `/api/crm/tasks?milestoneId=` | GET | Get tasks by milestone |
| `/api/crm/drill?q=` | GET | Full account drill-down |
| `/api/crm/query` | POST | Custom OData query |
| `/api/crm/quick-chat` | POST | Natural language CRM query |
| `/api/logs` | GET | View log files |
| `/api/logs` | DELETE | Clear log files |
| `/api/logs/toggle` | POST | Enable/disable logging |

## Files Modified

- `dashboard/server/index.js` — Added CRM routes, log routes, quick-chat, logging integration
- `dashboard/public/index.html` — Quick CRM section, owner filter, email filter, log FAB, tooltip elements, screenshot preview
- `dashboard/public/app.js` — CRM link rendering, quick prefix handler, log viewer, screenshot paste, tooltips, owner-milestones
- `dashboard/public/styles.css` — Log viewer, tooltips, CRM links, screenshot preview, animations

## Files Created

- `dashboard/server/crm-direct.js` — Direct CRM OData client
- `dashboard/server/logger.js` — Structured file logger
- `dashboard/tests/quick-crm.spec.js` — 35 Playwright tests for new features
- `.github/agents/dashboard-maintenance.agent.md` — Maintenance agent definition

## Test Results

```
71 passed (56.8s)
- 36 dashboard.spec.js (original, all pass)
- 35 quick-crm.spec.js (new features, all pass)
```

### Test Coverage

| Category | Tests |
|----------|-------|
| Quick CRM UI structure | 4 |
| Owner email validation | 3 |
| Input validation | 2 |
| CRM API endpoints | 5 |
| Quick-chat endpoint | 2 |
| Log API | 3 |
| Tooltips | 3 |
| Log viewer FAB | 5 |
| Screenshot paste | 2 |
| Email filter | 2 |
| Quick prefix chat | 1 |
| Section ordering | 1 |
| Live CRM E2E | 2 |
| Regression checks | 2 |

## Future Considerations

- Add WebSocket-based log streaming (real-time log tail in browser)
- Add CRM write operations through direct path (with confirmation gate)
- Add saved/favorite CRM queries
- Add CRM data export to Excel
- Screenshot OCR for extracting text from pasted images
