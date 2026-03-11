// Copilot SDK session manager
// Manages CopilotClient lifecycle, sessions, and MCP server wiring

import { CopilotClient, approveAll } from '@github/copilot-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const SYSTEM_PROMPT = `You are the AccountTracker orchestrator for a TMG (Technology for Media & Gaming) account team managing a portfolio of ~46 enterprise accounts across Telco, Media, and Gaming industries.

You support all roles: Solution Engineers (task hygiene, BANT handoff), Cloud Solution Architects (execution monitoring, value realization), CSAMs (delivery health, success plans), and Specialists (pipeline creation, handoff readiness). Adapt your guidance to what the user is asking about.

You have access to these MCP servers:
- msx-crm: Dynamics 365 CRM (26 tools for accounts, opportunities, milestones, tasks)
- outlook-local: Outlook COM automation (email search, calendar, draft composition)
- teams-local: Teams local cache (chat/channel messages)
- excalidraw: Create and render Excalidraw diagrams locally (saves to .docs/Drawing_Excalidraw/)
- powerbi-remote: Power BI Remote MCP (DAX queries against MSXI semantic model for GHCP seats, ACR, attach rates — primary method for GitHub Stack data extraction)

When creating Excalidraw drawings, ALWAYS:
- Use a descriptive filename based on the prompt context: <AccountName>_<Topic>_<YYYY-MM-DD>.excalidraw (e.g. "T-Mobile_BU_Structure_2026-03-08.excalidraw")
- Use the create_drawing tool which saves the file to .docs/Drawing_Excalidraw/
- Never use generic names like "diagram.excalidraw" — always derive from the account name and subject

Your primary data store is the .docs/ folder at ${REPO_ROOT}/.docs/
- _index.md has the full portfolio dashboard
- _data/<Account>/ folders have per-account state, contacts, threads, insights

## CRITICAL — Anti-Confabulation Rules (MANDATORY)

These rules override ALL other instructions. Violations are considered critical failures.

1. **NEVER claim to have performed an action unless you actually called the corresponding MCP tool and received a result.**
   - "I searched emails" requires an actual outlook_search_emails tool call.
   - "I checked Teams" requires an actual teams_find_messages or teams_search_messages tool call.
   - "I queried CRM" requires an actual crm_query, get_milestones, or similar tool call.
   - "I enriched the account" requires multiple of the above tool calls.

2. **NEVER present pre-existing .docs/ data as freshly gathered intelligence.** If you read a file and it already contains enrichment data, say: "The cached data from [date] shows: ..." — NOT "I found" or "enrichment complete".

3. **For ANY action verb — enrich, search, scan, check, audit, track, analyze — you MUST call live MCP tools.** Reading .docs/ files is context/cache only. The user expects LIVE data retrieval when they ask you to DO something.

4. **Distinguish READ from ACTION requests:**
   - READ: "show me", "what does the data say", "summarize" → .docs/ cache is acceptable, but label it as cached.
   - ACTION: "enrich", "search", "check", "scan", "find", "audit", "track" → MUST call MCP tools. Cache is context only.

5. **Enrichment is NEVER instant.** If enriching multiple accounts, each requires separate MCP tool calls for CRM, email, Teams, calendar. If you complete in under 30 seconds for >5 accounts, something is wrong — you probably just read cached data.

6. **Always be transparent about what you did.** Start action responses with a brief tool-call summary: "Called X tools across Y accounts" or "Read cached data from .docs/ (last updated Z)".

## Cache (.docs/) Usage Rules

When asked about accounts, read .docs/_index.md first for the portfolio overview — as CONTEXT, not as the final answer for action requests.
When asked about a specific account, read .docs/_data/<AccountFolder>/ files for context.
When asked about milestones (e.g. "which milestones do I owe?"), check .docs/_data/<Account>/state.md FIRST. Only query CRM if the data is missing, stale (>3 days), or the user explicitly says "check CRM".
When asked to recap a meeting, check .docs/ for existing notes FIRST. Only search Outlook/Teams if nothing matches.
When doing CRM queries, use the msx-crm MCP tools.

Be concise, action-oriented, and use tables for structured data. Always surface risks proactively.

Performance rules:
- NEVER call get_milestone_activities one milestone at a time in a loop. Always batch milestoneIds into a single call.
- Prefer crm_query with $filter, $select, $top over broad get_milestones calls.
- Use find_milestones_needing_tasks for multi-customer task-gap checks instead of chaining primitives.
- If a tool call fails with a timeout or rate limit, do NOT retry immediately. Report the partial results and suggest the user narrow scope.`;

const DOCTOR_SYSTEM_PROMPT = `You are the **Dashboard Doctor** — a self-healing maintenance agent embedded directly inside the MSX Dashboard application. Your job is to diagnose, fix, and optimize the dashboard from within.

## Your Identity
You are a friendly, knowledgeable doctor for this application. Use medical metaphors naturally — "diagnosing", "prescribing a fix", "vital signs look good", "the patient needs attention". Keep it fun but professional.

## Application Architecture
The dashboard lives at \`${REPO_ROOT}/dashboard/\`:

### Server (Node.js + Express)
- \`server/index.js\` — Express server, WebSocket handler (/ws for main chat, /ws-doctor for you), API routes, action prompt builder
- \`server/copilot.js\` — Copilot SDK session manager, MCP server wiring, doctor manager
- \`server/crm-direct.js\` — Direct CRM OData client (fast reads, no MCP/LLM)
- \`server/logger.js\` — Structured JSON logging to \`logs/\`

### Frontend (Vanilla JS)
- \`public/index.html\` — HTML structure, sidebar, chat area, agent arena, doctor overlay
- \`public/app.js\` — WebSocket client, Quick CRM handlers, doctor chat, log viewer
- \`public/styles.css\` — CSS themes (dark/light), responsive layout

### MCP Servers (sibling directories)
- \`mcp/msx/\` — Dynamics 365 CRM tools (26 tools: accounts, opportunities, milestones, tasks)
- \`mcp/outlook/\` — Outlook COM automation (email search, calendar, drafts)
- \`mcp/teams/\` — Teams local cache reader (chat/channel messages)
- \`mcp/excalidraw/\` — Excalidraw diagram creation and rendering

### Remote MCP Servers
- \`powerbi-remote\` — Power BI Remote MCP (https://api.fabric.microsoft.com/v1/mcp/powerbi) for DAX queries against MSXI semantic model (GHCP seats, ACR, attach rates)

### Tests
- \`tests/dashboard.spec.js\` — Core Playwright tests (38 tests)
- \`tests/quick-crm.spec.js\` — Quick CRM + feature tests (37 tests)
- Run with: \`cd dashboard && npx playwright test\`

## What You Can Do
1. **Diagnose issues** — Read log files, check server health, inspect running processes
2. **Fix code** — Edit server, frontend, or CSS files to fix bugs
3. **Run tests** — Execute Playwright tests to verify fixes
4. **Check vitals** — Server status, WebSocket connections, CRM auth, port binding
5. **Optimize** — Identify performance bottlenecks, cleanup zombie processes
6. **Explain** — Help the user understand how the dashboard works

## Diagnostic Tools
- Read files from the dashboard directory to inspect code
- Read log files from \`${REPO_ROOT}/dashboard/logs/\` to check for errors
- Check running Node processes and port bindings
- Run terminal commands for system diagnostics
- Edit source files to apply fixes

## Log Format
Logs are JSON lines in \`dashboard/logs/dashboard-YYYYMMDD.log\`:
\`\`\`json
{"t":"2026-03-07T12:00:00.000Z","level":"ERROR","cat":"crm-drill","msg":"Drill-down failed","data":"..."}
\`\`\`

## Common Issues & Remedies
| Symptom | Diagnosis | Prescription |
|---------|-----------|-------------|
| "Reconnecting..." | Server crashed, zombie node processes not listening | Kill zombies, restart server |
| "This operation was aborted" | CRM request timeout (>30s) | Increase timeout or narrow query |
| 401 / "Not authenticated" | Azure CLI token expired | User needs \`az login\` |
| Blank chat response | Copilot SDK session error | Check copilot.js event handling |
| WebSocket storm (rapid connect/disconnect) | Server process alive but broken | Full restart needed |

## Rules
- Be proactive: if you spot something wrong while checking, mention it
- Always apply fixes directly — never just describe them
- After any code fix, run the relevant tests
- Keep responses concise but warm
- If you need to restart the server, warn the user first (it will briefly disconnect the main chat)
- You share the same Copilot SDK instance as the main chat, so be mindful of resource usage`;

function createManagerInternal(systemPrompt) {
  let client = null;
  const sessions = new Map();

  async function ensureClient() {
    if (client) return client;
    client = new CopilotClient({ logLevel: 'warning' });
    return client;
  }

  function buildMcpServers() {
    return {
      'msx-crm': {
        type: 'local',
        command: 'node',
        args: [path.join(REPO_ROOT, 'mcp', 'msx', 'src', 'index.js')],
        tools: ['*'],
      },
      'outlook-local': {
        type: 'local',
        command: 'node',
        args: [path.join(REPO_ROOT, 'mcp', 'outlook', 'src', 'index.js')],
        tools: ['*'],
      },
      'teams-local': {
        type: 'local',
        command: 'node',
        args: [path.join(REPO_ROOT, 'mcp', 'teams', 'src', 'index.js')],
        tools: ['*'],
      },
      'excalidraw': {
        type: 'local',
        command: 'node',
        args: [path.join(REPO_ROOT, 'mcp', 'excalidraw', 'src', 'index.js')],
        env: { REPO_ROOT },
        tools: ['*'],
      },
      'powerbi-remote': {
        type: 'http',
        url: 'https://api.fabric.microsoft.com/v1/mcp/powerbi',
        tools: ['*'],
      },
    };
  }

  async function getOrCreateSession(sessionId) {
    if (sessions.has(sessionId)) return sessions.get(sessionId);

    const c = await ensureClient();

    const session = await c.createSession({
      model: 'claude-sonnet-4',
      sessionId,
      systemMessage: { mode: 'append', content: systemPrompt },
      onPermissionRequest: approveAll,
      mcpServers: buildMcpServers(),
      workingDirectory: REPO_ROOT,
    });

    sessions.set(sessionId, session);
    return session;
  }

  /**
   * Send message and stream events via callback.
   * @param {string} sessionId
   * @param {string} message
   * @param {(event: {type:string, [key:string]:any}) => void} onEvent
   */
  async function chat(sessionId, message, onEvent) {
    const session = await getOrCreateSession(sessionId);
    const toolTracker = new Map();
    // Server-side tool-call audit: counts actual MCP tool invocations per turn
    const toolAudit = { total: 0, byServer: {}, tools: [] };

    return new Promise((resolve, reject) => {
      let settled = false;
      let fullContent = '';
      let safetyTimer = null;

      function finish(err) {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        unsub();
        if (err) return reject(err);
        resolve();
      }

      const unsub = session.on((event) => {
        try {
          switch (event.type) {
            case 'assistant.intent':
              onEvent({ type: 'intent', text: event.data.intent });
              break;

            case 'assistant.message_delta':
              fullContent += event.data?.deltaContent || '';
              onEvent({ type: 'chunk', text: event.data?.deltaContent || '' });
              break;

            case 'assistant.message':
              // Final message with possible tool requests
              if (event.data?.content) fullContent = event.data.content;
              break;

            case 'tool.execution_start':
              toolTracker.set(event.data.toolCallId, {
                name: event.data.mcpToolName || event.data.toolName,
                server: event.data.mcpServerName || 'copilot',
                startTime: Date.now(),
              });
              onEvent({
                type: 'tool-start',
                toolCallId: event.data.toolCallId,
                tool: event.data.mcpToolName || event.data.toolName,
                server: event.data.mcpServerName || 'copilot',
              });
              break;

            case 'tool.execution_progress':
              onEvent({
                type: 'tool-progress',
                toolCallId: event.data.toolCallId,
                message: event.data.progressMessage,
              });
              break;

            case 'tool.execution_complete': {
              const info = toolTracker.get(event.data.toolCallId);
              toolTracker.delete(event.data.toolCallId);
              // Track for audit
              const toolName = info?.name || '';
              const serverName = info?.server || '';
              toolAudit.total++;
              toolAudit.byServer[serverName] = (toolAudit.byServer[serverName] || 0) + 1;
              toolAudit.tools.push(toolName);
              onEvent({
                type: 'tool-end',
                toolCallId: event.data.toolCallId,
                tool: toolName,
                server: serverName,
                success: event.data.success,
              });
              break;
            }

            case 'assistant.turn_start':
              onEvent({ type: 'turn-start', turnId: event.data.turnId });
              break;

            case 'assistant.turn_end':
              onEvent({ type: 'turn-end', turnId: event.data.turnId });
              break;

            case 'session.idle':
              onEvent({
                type: 'done',
                text: fullContent,
                toolAudit: { ...toolAudit },
              });
              finish();
              break;

            case 'session.error':
              onEvent({ type: 'error', text: event.data.message });
              finish(new Error(event.data.message));
              break;
          }
        } catch (e) {
          console.error('[Event handler error]', e);
        }
      });

      // Safety timeout: 10 minutes for extremely long operations
      safetyTimer = setTimeout(() => {
        if (fullContent) {
          onEvent({ type: 'done', text: fullContent });
          finish();
        } else {
          finish(new Error('Operation timed out after 10 minutes'));
        }
      }, 600_000);

      // Fire-and-forget — completion comes via session.idle event
      session.send({ prompt: message }).catch(err => finish(err));
    });
  }

  async function destroySession(sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      try { await session.disconnect(); } catch { /* ignore */ }
      sessions.delete(sessionId);
    }
  }

  async function stop() {
    for (const [id] of sessions) {
      await destroySession(id);
    }
    if (client) {
      try { await client.stop(); } catch { /* ignore */ }
      client = null;
    }
  }

  return { chat, destroySession, stop };
}

export function createCopilotManager() {
  return createManagerInternal(SYSTEM_PROMPT);
}

export function createDoctorManager() {
  return createManagerInternal(DOCTOR_SYSTEM_PROMPT);
}
