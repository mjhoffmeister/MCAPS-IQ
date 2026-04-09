/**
 * MCAPS IQ Dashboard — Copilot CLI Extension Entry Point
 *
 * Connects to a shared dashboard server via WebSocket and relays
 * session events (responses, tool calls, thinking, intents, tasks)
 * from the CLI session to the browser-based dashboard.
 */

import { joinSession } from '@github/copilot-sdk/extension';
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

    if (source === 'startup' && isNew) {
      openBrowser(`http://127.0.0.1:${serverPort}`);
    }

    await session.log(`📊 MCAPS IQ Dashboard available at http://127.0.0.1:${serverPort}`);
  } catch (err) {
    try { await session.log(`⚠️ MCAPS IQ Dashboard failed: ${err.message}`); } catch { /* noop */ }
    sessionClient = null;
  }
}

// ── Extension entry point ──────────────────────────────────────

const session = await joinSession({
  hooks: {
    async onSessionStart(input) {
      await initDashboard(input?.source);
      return {};
    },

    async onSessionEnd() {
      if (sessionClient) {
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

  sessionClient?.pushEvent('tool:start', {
    id: toolCallId, toolName, detail, startTime: Date.now()
  });

  if (toolName === 'task' && args) {
    const desc = typeof args === 'string' ? args : args.description || args.prompt || '';
    const { emoji, agentName, task } = parseAgentDescription(desc);
    sessionClient?.pushEvent('task:start', {
      id: toolCallId, agentName, description: task, emoji, startTime: Date.now()
    });
  }
});

session.on('tool.execution_complete', (event) => {
  if (!event?.data) return;
  const { toolCallId, toolName, success, result, error } = event.data;

  sessionClient?.pushEvent('tool:complete', {
    id: toolCallId, toolName, success: success !== false
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
