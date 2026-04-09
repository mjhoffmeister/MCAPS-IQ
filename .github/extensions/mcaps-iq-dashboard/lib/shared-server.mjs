/**
 * Shared Server — Express + WebSocket server for the MCAPS IQ Dashboard.
 * Serves the SPA, relays session events between extensions and browsers,
 * provides API endpoints for skills, settings, and CRM data.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { resolve, join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

import { createMultiSessionState } from './multi-session-state.mjs';
import { readAllCapabilities } from './skills-reader.mjs';
import { createCrmClient } from './crm-client.mjs';

const PORT = Number(process.env.MCAPS_IQ_PORT || 3850);
const PUBLIC_DIR = process.env.MCAPS_IQ_PUBLIC_DIR || join(import.meta.dirname, '..', 'public');
const REPO_ROOT = process.env.MCAPS_IQ_REPO_ROOT || process.cwd();
const SHUTDOWN_GRACE_MS = 5 * 60 * 1000;
const VIEWER_HEARTBEAT_MS = 30_000;
const SESSION_HEARTBEAT_MS = 10_000;
const SESSION_MISSED_LIMIT = 3;
const DISCONNECT_TIMEOUT_MS = 30_000;

const stateManager = createMultiSessionState();
const viewerClients = new Set();
const sessionClients = new Map();
const sessionTimers = new Map();
let shutdownTimer = null;
let cachedCapabilities = null;

// ── Settings persistence ───────────────────────────────────────

const SETTINGS_PATH = join(REPO_ROOT, '.mcaps-iq-settings.json');

function readSettings() {
  try {
    if (existsSync(SETTINGS_PATH)) {
      return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
    }
  } catch { /* corrupt file */ }
  return { role: null, priorityAccounts: [], displayPrefs: { showCode: false, verbosity: 'normal' } };
}

function writeSettings(settings) {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

// ── Express app ────────────────────────────────────────────────

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
wss.on('error', () => {});

app.use(express.json({ limit: '1mb' }));

// Static files
const resolvedPublic = resolve(PUBLIC_DIR);
app.use(express.static(resolvedPublic, { setHeaders: (res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
}}));
app.get('/', (_req, res) => res.sendFile(resolve(resolvedPublic, 'index.html')));
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// ── API: Health ────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    sessions: sessionClients.size,
    viewers: viewerClients.size,
    uptime: process.uptime()
  });
});

// ── API: State ─────────────────────────────────────────────────

app.get('/api/state', (_req, res) => {
  res.json(stateManager.getState());
});

// ── API: Skills ────────────────────────────────────────────────

async function getCapabilities() {
  if (!cachedCapabilities) {
    cachedCapabilities = await readAllCapabilities(REPO_ROOT);
  }
  return cachedCapabilities;
}

app.get('/api/skills', async (_req, res) => {
  try {
    const caps = await getCapabilities();
    res.json({ core: caps.skills });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read skills' });
  }
});

app.get('/api/skills/roles', async (_req, res) => {
  try {
    const caps = await getCapabilities();
    res.json(caps.roleMapping);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read role mapping' });
  }
});

app.get('/api/prompts', async (_req, res) => {
  try {
    const caps = await getCapabilities();
    res.json(caps.prompts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read prompts' });
  }
});

app.get('/api/agents', async (_req, res) => {
  try {
    const caps = await getCapabilities();
    res.json(caps.agents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read agents' });
  }
});

app.get('/api/capabilities/summary', async (_req, res) => {
  try {
    const caps = await getCapabilities();
    res.json({
      skillCount: caps.skills.length,
      promptCount: caps.prompts.length,
      agentCount: caps.agents.length,
      roleCount: Object.keys(caps.roleMapping).length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// ── API: Settings ──────────────────────────────────────────────

app.get('/api/settings', (_req, res) => {
  res.json(readSettings());
});

app.post('/api/settings', (req, res) => {
  try {
    const current = readSettings();
    const updated = { ...current, ...req.body };
    writeSettings(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

app.post('/api/settings/priority-accounts', (req, res) => {
  try {
    const settings = readSettings();
    const { accounts } = req.body;
    if (Array.isArray(accounts)) {
      settings.priorityAccounts = accounts;
      writeSettings(settings);
    }
    res.json({ priorityAccounts: settings.priorityAccounts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save priority accounts' });
  }
});

// ── API: Sessions ──────────────────────────────────────────────

app.get('/api/sessions', (_req, res) => {
  const state = stateManager.getState();
  const sessions = Object.entries(state.sessions).map(([id, s]) => ({
    sessionId: id,
    metadata: s.metadata,
    session: s.session,
    taskCount: s.backgroundTasks?.length || 0,
    toolCallCount: s.toolCalls?.length || 0,
    responseCount: s.responses?.length || 0
  }));
  res.json(sessions);
});

app.get('/api/sessions/:id', (req, res) => {
  const state = stateManager.getState();
  const session = state.sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// ── CRM Client (lazy singleton) ────────────────────────────────

let crmClient = null;

function getCrmClient() {
  if (!crmClient) {
    crmClient = createCrmClient();
  }
  return crmClient;
}

// ── API: CRM ───────────────────────────────────────────────────

app.get('/api/crm/status', async (_req, res) => {
  try {
    const status = await getCrmClient().getConnectionStatus();
    if (status.connected) {
      const auth = await getCrmClient().getAuthStatus();
      res.json({ ...status, auth });
    } else {
      res.json(status);
    }
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

app.get('/api/crm/whoami', async (_req, res) => {
  try {
    const data = await getCrmClient().whoami();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'CRM unavailable: ' + err.message });
  }
});

app.get('/api/crm/opportunities', async (req, res) => {
  try {
    const opts = {};
    if (req.query.customer) opts.customerKeyword = req.query.customer;
    if (req.query.maxResults) opts.maxResults = Number(req.query.maxResults);
    opts.includeDealTeam = req.query.dealTeam !== 'false';
    const data = await getCrmClient().getMyOpportunities(opts);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'CRM unavailable: ' + err.message });
  }
});

app.get('/api/crm/milestones', async (req, res) => {
  try {
    const opts = {};
    if (req.query.opportunityId) opts.opportunityId = req.query.opportunityId;
    if (req.query.customer) opts.customerKeyword = req.query.customer;
    opts.statusFilter = req.query.status || 'active';
    opts.includeTasks = req.query.tasks === 'true';
    const data = await getCrmClient().getMilestones(opts);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'CRM unavailable: ' + err.message });
  }
});

app.post('/api/crm/refresh', (_req, res) => {
  try {
    getCrmClient().invalidateCache();
    res.json({ refreshed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── WebSocket ──────────────────────────────────────────────────

function broadcast(type, data, excludeWs = null) {
  const msg = JSON.stringify({ type, ...data });
  for (const client of viewerClients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

function resetShutdownTimer() {
  if (shutdownTimer) { clearTimeout(shutdownTimer); shutdownTimer = null; }
}

function scheduleShutdown() {
  if (viewerClients.size > 0 || sessionClients.size > 0) return;
  shutdownTimer = setTimeout(() => {
    console.log('[mcaps-iq] No clients connected, shutting down.');
    server.close(() => process.exit(0));
  }, SHUTDOWN_GRACE_MS);
}

wss.on('connection', (ws, req) => {
  let clientType = null;
  let clientSessionId = null;
  let missedPings = 0;

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; missedPings = 0; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      // Session client registration
      case 'session:register': {
        clientType = 'session';
        clientSessionId = msg.sessionId;
        sessionClients.set(msg.sessionId, ws);
        stateManager.registerSession(msg.sessionId, msg.metadata || {});
        resetShutdownTimer();
        ws.send(JSON.stringify({ type: 'session:registered', sessionId: msg.sessionId }));
        broadcast('session:new', { sessionId: msg.sessionId, metadata: msg.metadata });
        break;
      }

      // Session event relay
      case 'event': {
        if (msg.sessionId && msg.event) {
          stateManager.addEvent(msg.sessionId, msg.event);
          broadcast(msg.event.type, { sessionId: msg.sessionId, ...msg.event.data });
        }
        break;
      }

      // Session ended
      case 'session:end': {
        if (msg.sessionId) {
          stateManager.removeSession(msg.sessionId);
          sessionClients.delete(msg.sessionId);
          broadcast('session:end', { sessionId: msg.sessionId });
        }
        break;
      }

      // Browser requests full state
      case 'request:state': {
        if (!clientType) {
          clientType = 'viewer';
          viewerClients.add(ws);
          resetShutdownTimer();
        }
        ws.send(JSON.stringify({ type: 'state:snapshot', ...stateManager.getState() }));
        break;
      }

      // Browser sends chat message to a session
      case 'chat:send': {
        const targetWs = sessionClients.get(msg.sessionId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify({
            type: 'chat:forward',
            message: msg.data?.message
          }));
        }
        break;
      }

      // Browser updates filter preferences
      case 'filter:update': {
        const targetWs2 = msg.sessionId ? sessionClients.get(msg.sessionId) : null;
        if (targetWs2 && targetWs2.readyState === WebSocket.OPEN) {
          targetWs2.send(JSON.stringify({ type: 'filter:update', data: msg.data }));
        }
        break;
      }

      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      }
    }
  });

  ws.on('close', () => {
    if (clientType === 'viewer') {
      viewerClients.delete(ws);
    } else if (clientType === 'session' && clientSessionId) {
      // Grace period before marking ended
      const timer = setTimeout(() => {
        if (!sessionClients.has(clientSessionId) || sessionClients.get(clientSessionId) !== ws) return;
        stateManager.removeSession(clientSessionId);
        sessionClients.delete(clientSessionId);
        broadcast('session:end', { sessionId: clientSessionId });
      }, DISCONNECT_TIMEOUT_MS);
      sessionTimers.set(clientSessionId, timer);
    }
    scheduleShutdown();
  });
});

// Heartbeats
const viewerHeartbeat = setInterval(() => {
  for (const ws of viewerClients) {
    if (!ws.isAlive) { ws.terminate(); viewerClients.delete(ws); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, VIEWER_HEARTBEAT_MS);

const sessionHeartbeat = setInterval(() => {
  for (const [id, ws] of sessionClients) {
    if (!ws.isAlive) {
      ws.terminate();
      sessionClients.delete(id);
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, SESSION_HEARTBEAT_MS);

// ── Start ──────────────────────────────────────────────────────

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mcaps-iq] Dashboard server listening on http://127.0.0.1:${PORT}`);
});

// Pre-warm capabilities cache
getCapabilities().catch(() => {});

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(viewerHeartbeat);
  clearInterval(sessionHeartbeat);
  server.close(() => process.exit(0));
});
