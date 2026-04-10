/**
 * MCAPS IQ Dashboard — Copilot CLI Extension Entry Point
 *
 * Connects to a shared dashboard server via WebSocket and relays
 * session events (responses, tool calls, thinking, intents, tasks)
 * from the CLI session to the browser-based dashboard.
 */

import { CopilotClient } from '@github/copilot-sdk';
import { join } from 'path';
import { exec, execSync } from 'child_process';
import { randomUUID } from 'crypto';

import { createSessionClient } from './lib/session-client.mjs';
import { filterResponse } from './lib/response-filter.mjs';
import { deriveToolDetail } from './lib/tool-event-detail.mjs';
import { ensureServer } from './lib/server-launcher.mjs';

const DEFAULT_PORT = 3850;
const PUBLIC_DIR = join(import.meta.dirname, 'public');

let sessionClient = null;
let serverPort = DEFAULT_PORT;
const sessionId = randomUUID();
let filterOptions = { showCode: false, verbosity: 'normal' };

// ── Tool approval state ────────────────────────────────────────

let autoApprove = true; // default: approve all tools (matches original behavior)
const pendingApprovals = new Map(); // toolCallId → { resolve, timer }
const pendingUserInputs = new Map(); // requestId → { resolve, timer }

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function getBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
  } catch { return null; }
}

function parseAgentDescription(description) {
  if (!description || typeof description !== 'string') {
    return { emoji: '🔧', agentName: 'agent', task: description || '' };
  }
  const match = description.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s+([^:]+):\s*(.*)/su);
  if (match) {
    return { emoji: match[1], agentName: match[2].trim(), task: match[3].trim() };
  }
  return { emoji: '🔧', agentName: 'agent', task: description };
}

// ── Copilot SDK client (shared for session + model discovery) ──

let copilotClient = null;

// ── Model discovery ────────────────────────────────────────────

async function fetchAndPushModels() {
  if (!sessionClient || !sessionClient.isConnected() || !copilotClient) return;
  try {
    const models = await copilotClient.listModels();
    const compact = models.map(m => ({
      id: m.id,
      name: m.name,
      capabilities: m.capabilities || {},
      supportedReasoningEfforts: m.supportedReasoningEfforts || null
    }));
    sessionClient.pushEvent('models:update', { models: compact });
  } catch {
    // Model listing not available — dashboard falls back to empty list
  }
}

// ── Dashboard init ─────────────────────────────────────────────

async function initDashboard(source) {
  if (sessionClient) return;

  try {
    const { port, isNew } = await ensureServer({
      port: DEFAULT_PORT,
      publicDir: PUBLIC_DIR,
      repoRoot: process.cwd()
    });
    serverPort = port;

    const metadata = {
      startTime: Date.now(),
      cwd: process.cwd(),
      branch: getBranch(),
      label: null,
      nodeVersion: process.version
    };
    sessionClient = createSessionClient({ port, sessionId, metadata });
    await sessionClient.connect();

    sessionClient.onChat((message) => {
      setTimeout(() => {
        session.send({ prompt: message }).catch(() => {});
      }, 0);
    });

    sessionClient.onFilterChange((data) => {
      if (data.showCode !== undefined) filterOptions.showCode = data.showCode;
      if (data.verbosity) filterOptions.verbosity = data.verbosity;
    });

    sessionClient.onToolApproval((data) => {
      const { toolCallId, decision } = data;
      const pending = pendingApprovals.get(toolCallId);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingApprovals.delete(toolCallId);
      pending.resolve(decision === 'approve'
        ? { kind: 'approved' }
        : { kind: 'denied-interactively-by-user' });
    });

    sessionClient.onAutoApproveChange((value) => {
      autoApprove = !!value;
    });

    sessionClient.onStop(async () => {
      try {
        await session.abort();
        sessionClient?.pushEvent('session:stopped', { timestamp: Date.now() });
      } catch (err) {
        // Session may already be idle — not an error
      }
    });

    sessionClient.onUserInputResponse((data) => {
      const { requestId, answer, wasFreeform } = data;
      const pending = pendingUserInputs.get(requestId);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingUserInputs.delete(requestId);
      pending.resolve({ answer: answer || '', wasFreeform: wasFreeform !== false });
    });

    if (source === 'startup' && isNew) {
      openBrowser(`http://127.0.0.1:${serverPort}`);
    }

    // Fetch available models from the copilot SDK and push to server
    fetchAndPushModels().catch(() => {});

    await session.log(`📊 MCAPS IQ Dashboard available at http://127.0.0.1:${serverPort}`);
  } catch (err) {
    try { await session.log(`⚠️ MCAPS IQ Dashboard failed: ${err.message}`); } catch { /* noop */ }
    sessionClient = null;
  }
}

// ── Extension entry point ──────────────────────────────────────

// Inline joinSession() so we retain a reference to the CopilotClient
// (needed for listModels and other client-level APIs).
const cliSessionId = process.env.SESSION_ID;
if (!cliSessionId) {
  throw new Error('Extension must run as a child process of the Copilot CLI (SESSION_ID missing).');
}
copilotClient = new CopilotClient({ isChildProcess: true });

const session = await copilotClient.resumeSession(cliSessionId, {
  disableResume: true,
  onUserInputRequest: async (request) => {
    // If dashboard is connected, route to UI
    if (sessionClient && sessionClient.isConnected()) {
      const requestId = randomUUID();
      sessionClient.pushEvent('user-input:request', {
        requestId,
        question: request.question || '',
        choices: request.choices || null,
        allowFreeform: request.allowFreeform !== false,
        timestamp: Date.now()
      });

      return new Promise((resolve) => {
        const USER_INPUT_TIMEOUT_MS = 300_000; // 5 minutes
        const timer = setTimeout(() => {
          pendingUserInputs.delete(requestId);
          resolve({ answer: '', wasFreeform: true });
        }, USER_INPUT_TIMEOUT_MS);
        pendingUserInputs.set(requestId, { resolve, timer });
      });
    }
    // Fallback: empty answer if dashboard not connected
    return { answer: '', wasFreeform: true };
  },

  onPermissionRequest: (request) => {
    // Auto-approve if toggle is on or dashboard is not connected
    if (autoApprove || !sessionClient || !sessionClient.isConnected()) {
      return { kind: 'approved' };
    }

    // Push approval request to the dashboard and wait for response
    const toolCallId = request.toolCallId || randomUUID();
    sessionClient.pushEvent('tool:approval-request', {
      toolCallId,
      toolName: request.toolName || null,
      kind: request.kind,
      fileName: request.fileName || null,
      commandText: request.fullCommandText || null,
      timestamp: Date.now()
    });

    return new Promise((resolve) => {
      const APPROVAL_TIMEOUT_MS = 120_000; // 2 minutes
      const timer = setTimeout(() => {
        pendingApprovals.delete(toolCallId);
        // Timeout → deny to be safe
        resolve({ kind: 'denied-interactively-by-user' });
      }, APPROVAL_TIMEOUT_MS);
      pendingApprovals.set(toolCallId, { resolve, timer });
    });
  },

  hooks: {
    async onSessionStart(input) {
      await initDashboard(input?.source);
      return {};
    },

    async onSessionEnd() {
      if (sessionClient) {
        try {
          // Push idle state so dashboard stops showing "agent is working" immediately
          sessionClient.pushEvent('session:idle', { backgroundTasks: [] });
        } catch { /* noop */ }
        try { sessionClient.close(); } catch { /* noop */ }
        sessionClient = null;
      }
      return {};
    }
  },

  tools: [
    {
      name: 'dashboard_status',
      description: 'Returns the MCAPS IQ Dashboard URL and connection status',
      parameters: {},
      handler: async () => {
        let connCount = 0;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 200);
          const res = await fetch(`http://127.0.0.1:${serverPort}/api/health`, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok) {
            const data = await res.json();
            connCount = data.sessions ?? 0;
          }
        } catch { /* noop */ }
        return {
          textResultForLlm: `MCAPS IQ Dashboard: http://127.0.0.1:${serverPort} — ${connCount} active session(s)`,
          resultType: 'text'
        };
      }
    }
  ]
});

// ── Session events ─────────────────────────────────────────────

session.on('assistant.message', (event) => {
  if (!event?.data?.content) return;
  const raw = event.data.content;
  const { filtered } = filterResponse(raw, filterOptions);
  sessionClient?.pushEvent('response', {
    id: randomUUID(),
    timestamp: Date.now(),
    content: filtered,
    agentName: event.data.agentName || 'assistant',
    raw
  });
});

session.on('tool.execution_start', (event) => {
  if (!event?.data) return;
  const { toolCallId, toolName, arguments: args } = event.data;
  const detail = deriveToolDetail(toolName, args);

  // Truncate args for transport — keep enough for useful display
  let argsSnapshot = null;
  try {
    const raw = typeof args === 'string' ? args : JSON.stringify(args);
    argsSnapshot = raw && raw.length > 2000 ? raw.slice(0, 2000) + '…' : raw;
  } catch { /* noop */ }

  sessionClient?.pushEvent('tool:start', {
    id: toolCallId, toolName, detail, startTime: Date.now(), arguments: argsSnapshot
  });

  if (toolName === 'task' && args) {
    const parsed = typeof args === 'string' ? args : args;
    const desc = typeof parsed === 'string' ? parsed : parsed.description || parsed.prompt || '';
    const { emoji, agentName, task } = parseAgentDescription(desc);
    // Prefer explicit agentName from tool args over parsed name
    const resolvedAgent = (typeof parsed === 'object' && parsed.agentName)
      ? parsed.agentName
      : agentName;
    sessionClient?.pushEvent('task:start', {
      id: toolCallId, agentName: resolvedAgent, description: task, emoji, startTime: Date.now()
    });
  }
});

session.on('tool.execution_complete', (event) => {
  if (!event?.data) return;
  const { toolCallId, toolName, success, result, error } = event.data;

  // Truncate result for transport
  let resultSnapshot = null;
  try {
    const raw = error ? `Error: ${error}` : (typeof result === 'string' ? result : JSON.stringify(result));
    resultSnapshot = raw && raw.length > 1500 ? raw.slice(0, 1500) + '…' : raw;
  } catch { /* noop */ }

  sessionClient?.pushEvent('tool:complete', {
    id: toolCallId, toolName, success: success !== false, result: resultSnapshot
  });

  if (toolName === 'task') {
    const output = error ? `Error: ${error}` : (typeof result === 'string' ? result : 'done');
    sessionClient?.pushEvent('task:complete', {
      id: toolCallId, status: success !== false ? 'complete' : 'failed', output
    });
  }
});

session.on('session.idle', (event) => {
  sessionClient?.pushEvent('session:idle', { backgroundTasks: event?.data?.backgroundTasks });
});

session.on('session.error', (event) => {
  sessionClient?.pushEvent('session:error', {
    message: event?.data?.message || 'Unknown error', context: event?.data
  });
});

session.on('assistant.turn_start', () => {
  sessionClient?.pushEvent('session:turn', { timestamp: Date.now() });
});

session.on('assistant.reasoning', (event) => {
  if (!event?.data) return;
  const { reasoningId, content } = event.data;
  if (reasoningId && content) {
    sessionClient?.pushEvent('thinking', { id: reasoningId, content, timestamp: Date.now() });
  }
});

session.on('assistant.reasoning_delta', (event) => {
  if (!event?.data) return;
  const { reasoningId, deltaContent } = event.data;
  if (reasoningId && deltaContent) {
    sessionClient?.pushEvent('thinking:delta', { id: reasoningId, deltaContent });
  }
});

session.on('assistant.intent', (event) => {
  if (!event?.data) return;
  const { intent } = event.data;
  if (intent) {
    sessionClient?.pushEvent('intent', { intent });
  }
});

// Eager init for mid-session reloads
initDashboard('resume').catch(() => {});
