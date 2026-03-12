#!/usr/bin/env node
// MSX Dashboard — Express server with Copilot SDK integration
// Serves the frontend + provides WebSocket-based chat with MCP tool access

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, mkdir } from 'fs/promises';
import { execSync, exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { createCopilotManager, createDoctorManager } from './copilot.js';
import { createCrmDirect } from './crm-direct.js';
import { createLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..');

// Configurable docs path — persisted in a settings file
const SETTINGS_PATH = path.join(__dirname, '..', '.settings.json');
function loadSettings() {
  try { if (existsSync(SETTINGS_PATH)) return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8')); } catch {}
  return {};
}
function saveSettings(s) { writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2)); }
function getRepoRoot() {
  const s = loadSettings();
  return s.docsPath || DEFAULT_REPO_ROOT;
}

const PORT = process.env.PORT || 3737;
const app = express();
const httpServer = createServer(app);

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// ──── Direct CRM API (fast read-only, no MCP/LLM) ────
const crmDirect = createCrmDirect();
const logger = createLogger();
logger.info('server', 'MSX Dashboard starting', { port: PORT });

// Auth status
app.get('/api/crm/auth', async (_req, res) => {
  try {
    const status = await crmDirect.getAuthStatus();
    logger.info('crm', 'Auth check', { authenticated: status.authenticated });
    res.json(status);
  } catch (err) {
    logger.error('crm', 'Auth check failed', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// WhoAmI
app.get('/api/crm/whoami', async (_req, res) => {
  try {
    const result = await crmDirect.whoAmI();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Search accounts by name or TPID
app.get('/api/crm/accounts', async (req, res) => {
  const keyword = req.query.q;
  if (!keyword) return res.status(400).json({ ok: false, error: 'Missing q parameter' });
  try {
    const result = await crmDirect.searchAccounts(keyword);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Search opportunities
app.get('/api/crm/opportunities', async (req, res) => {
  const q = req.query.q;
  const accountId = req.query.accountId;
  if (!q && !accountId) return res.status(400).json({ ok: false, error: 'Missing q or accountId parameter' });
  try {
    const result = accountId
      ? await crmDirect.getOpportunitiesByAccount(accountId)
      : await crmDirect.searchOpportunities(q);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Search milestones
app.get('/api/crm/milestones', async (req, res) => {
  const q = req.query.q;
  const oppId = req.query.opportunityId;
  const status = req.query.status;
  const ownerId = req.query.ownerId;

  try {
    let result;
    if (q) {
      result = await crmDirect.searchMilestones(q);
    } else if (oppId) {
      result = await crmDirect.getMilestonesByOpportunity(oppId);
    } else if (status !== undefined || ownerId) {
      result = await crmDirect.getMilestonesByStatus(status, ownerId);
    } else {
      return res.status(400).json({ ok: false, error: 'Missing q, opportunityId, status, or ownerId parameter' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get tasks by milestone
app.get('/api/crm/tasks', async (req, res) => {
  const milestoneId = req.query.milestoneId;
  if (!milestoneId) return res.status(400).json({ ok: false, error: 'Missing milestoneId parameter' });
  try {
    const result = await crmDirect.getTasksByMilestone(milestoneId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Full account drill-down (accounts → opportunities → milestones)
app.get('/api/crm/drill', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ ok: false, error: 'Missing q parameter' });
  const start = Date.now();
  try {
    const result = await crmDirect.drillDownAccount(q);
    const elapsed = Date.now() - start;
    logger.info('crm-drill', `Drill-down: ${q}`, {
      elapsed,
      accounts: result.data?.accounts?.length,
      opportunities: result.data?.opportunities?.length,
      milestones: result.data?.milestones?.length
    });
    res.json(result);
  } catch (err) {
    logger.error('crm-drill', `Drill-down failed: ${q}`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Custom OData query
app.post('/api/crm/query', async (req, res) => {
  const { entitySet, filter, select, orderby, top, expand } = req.body || {};
  if (!entitySet) return res.status(400).json({ ok: false, error: 'Missing entitySet' });
  try {
    const result = await crmDirect.runCustomQuery(entitySet, { filter, select, orderby, top, expand });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Update milestone fields (inline edit from dashboard)
app.patch('/api/crm/milestone/:id', async (req, res) => {
  const milestoneId = req.params.id;
  const fields = req.body;
  if (!milestoneId || !fields || Object.keys(fields).length === 0) {
    return res.status(400).json({ ok: false, error: 'Missing milestone ID or fields' });
  }
  try {
    const result = await crmDirect.updateMilestone(milestoneId, fields);
    logger.info('crm-write', `Milestone update: ${milestoneId}`, { fields: Object.keys(fields) });
    res.json(result);
  } catch (err) {
    logger.error('crm-write', `Milestone update failed: ${milestoneId}`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Join deal team
app.post('/api/crm/dealteam/join', async (req, res) => {
  const { userId, opportunityId } = req.body || {};
  if (!userId || !opportunityId) {
    return res.status(400).json({ ok: false, error: 'Missing userId or opportunityId' });
  }
  try {
    const result = await crmDirect.joinDealTeam(userId, opportunityId);
    logger.info('crm-write', `Deal team join: opp=${opportunityId}`, { userId });
    res.json(result);
  } catch (err) {
    logger.error('crm-write', `Deal team join failed: ${opportunityId}`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Create task on milestone
app.post('/api/crm/task', async (req, res) => {
  const { milestoneId, subject, category, dueDate } = req.body || {};
  if (!milestoneId || !subject) {
    return res.status(400).json({ ok: false, error: 'Missing milestoneId or subject' });
  }
  try {
    const result = await crmDirect.createTask(milestoneId, { subject, category, dueDate });
    logger.info('crm-write', `Task created on milestone ${milestoneId}`, { subject, category });
    res.json(result);
  } catch (err) {
    logger.error('crm-write', `Task creation failed: ${milestoneId}`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Close/complete task
app.post('/api/crm/task/close', async (req, res) => {
  const { taskId, statusCode } = req.body || {};
  if (!taskId) return res.status(400).json({ ok: false, error: 'Missing taskId' });
  try {
    const result = await crmDirect.closeTask(taskId, statusCode);
    logger.info('crm-write', `Task closed: ${taskId}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Delete task
app.delete('/api/crm/task/:id', async (req, res) => {
  const taskId = req.params.id;
  if (!taskId) return res.status(400).json({ ok: false, error: 'Missing taskId' });
  try {
    const result = await crmDirect.deleteTask(taskId);
    logger.info('crm-write', `Task deleted: ${taskId}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ──── Log Management API ────
app.get('/api/logs', async (_req, res) => {
  const result = await logger.getLogs();
  res.json(result);
});

app.delete('/api/logs', async (_req, res) => {
  await logger.flush();
  const result = await logger.clearLogs();
  res.json(result);
});

app.post('/api/logs/toggle', async (req, res) => {
  const enabled = req.body?.enabled;
  const result = logger.setEnabled(enabled !== false);
  res.json(result);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ──── Settings API (docs path) ────
app.get('/api/settings', (_req, res) => {
  const s = loadSettings();
  res.json({ ok: true, docsPath: s.docsPath || '', defaultPath: DEFAULT_REPO_ROOT });
});

app.post('/api/settings', (req, res) => {
  const { docsPath } = req.body;
  if (docsPath && typeof docsPath === 'string') {
    const s = loadSettings();
    s.docsPath = docsPath.trim();
    saveSettings(s);
    res.json({ ok: true, docsPath: s.docsPath });
  } else {
    res.status(400).json({ ok: false, error: 'docsPath required' });
  }
});

// ──── Drawings API (Excalidraw SVG rendering) ────
function getDrawingsDir() { return path.join(getRepoRoot(), '.docs', 'Drawing_Excalidraw'); }

// Lazy-import the renderer only when needed
let _renderToSvg = null;
async function getRenderToSvg() {
  if (!_renderToSvg) {
    try {
      let rendererPath = path.join(getRepoRoot(), 'mcp', 'excalidraw', 'src', 'renderer.js');
      if (!existsSync(rendererPath)) {
        // Try relative to the dashboard install dir
        rendererPath = path.join(__dirname, '..', '..', 'mcp', 'excalidraw', 'src', 'renderer.js');
      }
      // Windows absolute paths need file:// URL for ESM dynamic import
      const { pathToFileURL } = await import('url');
      const mod = await import(pathToFileURL(rendererPath).href);
      _renderToSvg = mod.renderToSvg;
    } catch {
      _renderToSvg = (doc) => {
        const els = (doc.elements || []).filter(e => !e.isDeleted);
        return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#f8f9fa" rx="8"/><text x="200" y="90" text-anchor="middle" font-size="14" fill="#666">Drawing: ${els.length} elements</text><text x="200" y="120" text-anchor="middle" font-size="12" fill="#999">SVG renderer not available</text></svg>`;
      };
    }
  }
  return _renderToSvg;
}

// List all drawings
app.get('/api/drawings', async (_req, res) => {
  try {
    const drawDir = getDrawingsDir();
    if (!existsSync(drawDir)) {
      await mkdir(drawDir, { recursive: true });
    }
    const files = await readdir(drawDir);
    const { stat } = await import('fs/promises');
    const drawings = [];
    for (const f of files) {
      if (!f.endsWith('.excalidraw')) continue;
      const fp = path.join(drawDir, f);
      try {
        const st = await stat(fp);
        const raw = await readFile(fp, 'utf-8');
        const doc = JSON.parse(raw);
        const visibleEls = (doc.elements || []).filter(e => !e.isDeleted).length;
        drawings.push({ filename: f, elements: visibleEls, size: st.size, modified: st.mtime.toISOString() });
      } catch {
        drawings.push({ filename: f, elements: 0, size: 0, modified: '' });
      }
    }
    drawings.sort((a, b) => b.modified.localeCompare(a.modified));
    res.json({ ok: true, drawings, dir: drawDir });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Render a drawing as SVG
app.get('/api/drawings/:name/svg', async (req, res) => {
  try {
    const name = path.basename(req.params.name);
    if (!name.endsWith('.excalidraw')) {
      return res.status(400).json({ ok: false, error: 'Must be .excalidraw file' });
    }
    const filePath = path.join(getDrawingsDir(), name);
    if (!existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'Drawing not found' });
    }
    const raw = await readFile(filePath, 'utf-8');
    const doc = JSON.parse(raw);
    const renderToSvg = await getRenderToSvg();
    const svg = renderToSvg(doc);
    res.type('image/svg+xml').send(svg);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Open drawings folder in OS file explorer
app.post('/api/drawings/open-folder', (_req, res) => {
  try {
    const drawDir = getDrawingsDir();
    if (!existsSync(drawDir)) {
      return res.json({ ok: false, error: 'Drawings folder does not exist yet' });
    }
    if (process.platform === 'win32') {
      exec(`explorer "${drawDir}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${drawDir}"`);
    } else {
      exec(`xdg-open "${drawDir}"`);
    }
    res.json({ ok: true, dir: drawDir });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// Accounts API — reads .docs/_index.md and .docs/_data/ for account list
app.get('/api/accounts', async (_req, res) => {
  try {
    const accounts = [];
    const indexPath = path.join(getRepoRoot(), '.docs', '_index.md');
    
    // Parse _index.md table for account names and TPIDs
    try {
      const content = await readFile(indexPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.startsWith('|')) continue;
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length < 3) continue;
        const name = cells[0];
        const tpid = cells[1];
        // Skip header, separator, and summary rows
        if (name === 'Account' || name.startsWith('---') || /^[-]+$/.test(tpid)) continue;
        const SUMMARY_ROWS = ['fully enriched', 'partially enriched', 'baseline only', 'total', 'summary'];
        if (SUMMARY_ROWS.some(s => name.toLowerCase().startsWith(s))) continue;
        if (name && tpid && /^\d+$/.test(tpid)) {
          accounts.push({ name, tpid });
        }
      }
    } catch {
      // If no _index.md, fall back to scanning _data/ directories
      const dataDir = path.join(getRepoRoot(), '.docs', '_data');
      try {
        const dirs = await readdir(dataDir, { withFileTypes: true });
        for (const d of dirs) {
          if (d.isDirectory()) {
            const displayName = d.name.replace(/_/g, ' ').replace(/,/g, ', ');
            accounts.push({ name: displayName, tpid: null });
          }
        }
      } catch { /* no _data dir */ }
    }

    res.json(accounts);
  } catch (err) {
    res.json([]);
  }
});

// WebSocket servers (noServer mode — manual upgrade routing prevents conflicts)
const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });
const copilotManager = createCopilotManager();

function wsSend(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  logger.info('ws', 'Client connected');
  let sessionId = null;

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      wsSend(ws, { type: 'error', text: 'Invalid JSON' });
      return;
    }

    const { type, payload } = msg;

    if (type === 'reset') {
      if (sessionId) {
        await copilotManager.destroySession(sessionId).catch(() => {});
        sessionId = null;
      }
      logger.info('ws', 'Session reset');
      wsSend(ws, { type: 'status', text: 'Session reset' });
      return;
    }

    if (type === 'stop') {
      if (sessionId) {
        logger.info('ws', 'Stop requested — destroying session');
        await copilotManager.destroySession(sessionId).catch(() => {});
        sessionId = null;
      }
      wsSend(ws, { type: 'done', text: '' });
      return;
    }

    if (type === 'chat' || type === 'action') {
      sessionId = sessionId || `dash-${Date.now()}`;
      let prompt;

      if (type === 'chat') {
        prompt = payload.message;
      } else {
        prompt = buildActionPrompt(payload.action, payload.params);
      }

      if (!prompt) {
        wsSend(ws, { type: 'error', text: 'Empty prompt' });
        return;
      }

      logger.info('chat', `${type} request`, { action: payload?.action, promptLength: prompt?.length });
      wsSend(ws, { type: 'status', text: type === 'action' ? `Running ${payload.action}...` : 'Thinking...' });

      try {
        await copilotManager.chat(sessionId, prompt, (event) => {
          wsSend(ws, event);
        });
        logger.info('chat', `${type} completed`);
      } catch (err) {
        console.error(`[${type} Error]`, err.message);
        logger.error('chat', `${type} failed`, err.message);
        wsSend(ws, { type: 'error', text: err.message });
      }
    }
  });

  ws.on('close', async () => {
    console.log('[WS] Client disconnected');
    logger.info('ws', 'Client disconnected');
    // Grace period: destroy session after 10 minutes if client doesn't reconnect
    if (sessionId) {
      const orphanedSessionId = sessionId;
      setTimeout(async () => {
        // Only destroy if no new WS reused this sessionId
        try { await copilotManager.destroySession(orphanedSessionId).catch(() => {}); } catch {}
        logger.info('ws', 'Orphaned session cleaned up', { sessionId: orphanedSessionId });
      }, 600_000); // 10 minutes
    }
  });
});

// ──── Doctor WebSocket (self-healing maintenance chat) ────
const wssDoctor = new WebSocketServer({ noServer: true, perMessageDeflate: false });
const doctorManager = createDoctorManager();

wssDoctor.on('connection', (ws) => {
  logger.info('doctor', 'Doctor client connected');
  let sessionId = null;

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      wsSend(ws, { type: 'error', text: 'Invalid JSON' });
      return;
    }

    const { type, payload } = msg;

    if (type === 'reset') {
      if (sessionId) {
        await doctorManager.destroySession(sessionId).catch(() => {});
        sessionId = null;
      }
      wsSend(ws, { type: 'status', text: 'Doctor session reset' });
      return;
    }

    if (type === 'stop') {
      if (sessionId) {
        await doctorManager.destroySession(sessionId).catch(() => {});
        sessionId = null;
      }
      wsSend(ws, { type: 'done', text: '' });
      return;
    }

    if (type === 'chat') {
      sessionId = sessionId || `doctor-${Date.now()}`;
      const prompt = payload.message;
      if (!prompt) {
        wsSend(ws, { type: 'error', text: 'Empty prompt' });
        return;
      }

      logger.info('doctor', 'Doctor chat request', { promptLength: prompt.length });
      wsSend(ws, { type: 'status', text: 'Examining...' });

      try {
        await doctorManager.chat(sessionId, prompt, (event) => {
          wsSend(ws, event);
        });
        logger.info('doctor', 'Doctor chat completed');
      } catch (err) {
        logger.error('doctor', 'Doctor chat failed', err.message);
        wsSend(ws, { type: 'error', text: err.message });
      }
    }
  });

  ws.on('close', async () => {
    logger.info('doctor', 'Doctor client disconnected');
    if (sessionId) {
      await doctorManager.destroySession(sessionId).catch(() => {});
    }
  });
});

// ──── Doctor health check API ────
app.get('/api/doctor/vitals', async (_req, res) => {
  try {
    const vitals = {
      server: 'running',
      uptime: Math.round(process.uptime()),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      wsClients: wss.clients.size,
      doctorClients: wssDoctor.clients.size,
      pid: process.pid,
    };
    // Check CRM auth
    try {
      const auth = await crmDirect.getAuthStatus();
      vitals.crmAuth = auth.authenticated ? 'ok' : 'expired';
    } catch { vitals.crmAuth = 'error'; }
    // Check latest log for errors
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const logPath = path.join(__dirname, '..', 'logs', `dashboard-${today}.log`);
      if (existsSync(logPath)) {
        const content = readFileSync(logPath, 'utf-8');
        const lines = content.trim().split('\n');
        const errors = lines.filter(l => l.includes('"ERROR"')).length;
        vitals.todayErrors = errors;
        vitals.todayLogLines = lines.length;
      }
    } catch { /* ignore */ }
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildActionPrompt(action, params) {
  const actions = {
    'view-portfolio': () =>
      `Show me the portfolio overview. Read .docs/_index.md for the full dashboard with all accounts, seats, attach rates, whitespace, freshness dates, flags, and next actions. Also check for the latest weekly seat report in .docs/Weekly/. Present a clean summary with tranche grouping (A first, then B, then C).`,

    'plan-week': () =>
      `Generate this week's prioritized action plan. Read .docs/_index.md for the portfolio, then check MSX milestones for overdue/no-tasks issues, and M365 for stale accounts. Order by Tranche A first. Output as a structured weekly plan.`,

    'check-comms': () => {
      const account = params?.account || 'all';
      return `Check communication health for ${account}.

**MANDATORY: You MUST call live MCP tools. Do NOT just read .docs/ cached data and present it as a fresh check.**

1. Call outlook_search_emails (outlook-local) to find recent threads and unanswered items
2. Call teams_find_messages (teams-local) for Teams conversations
3. Call outlook_search_calendar (outlook-local) for calendar meetings
4. Calculate response lag, flag going-dark risks (>10 business days no touchpoint)
5. Report per-account status with flagged threads

Label any data from .docs/ as "cached" and any data from MCP tool calls as "live".`;
    },

    'analyze-account': () => {
      const account = params?.account;
      if (!account) return `Which account should I analyze? Please provide an account name or TPID.`;
      return `Run a comprehensive analysis for ${account}.

**MANDATORY: Call live MCP tools for each data domain. Do NOT just read .docs/ cached data.**

1. Read .docs/_data/<Account>/ for context and data timestamps
2. Call msx-crm tools for live CRM milestone/opportunity status
3. Call outlook-local tools for email health (unanswered threads, response lag)
4. Call teams-local tools for Teams activity
5. Call outlook-local calendar tools for meeting activity
6. Cross-validate live data with cached data — report discrepancies
7. Report risks, opportunities, and recommended actions

Label cached vs live data sources in your response.`;
    },

    'review-milestones': () => {
      const account = params?.account || 'all';
      if (account === 'all') {
        return `Audit MSX milestone health across the portfolio.\n\n**Step 1 — Check .docs/ first**: Read .docs/_index.md for the portfolio overview and each account's state.md for cached milestone data. Present what's already known.\n**Step 2 — Only if data is stale or missing**: Use crm_query with entitySet "msp_engagementmilestones" to batch-query milestones filtered by status (exclude Completed status 861980003) with $top=50 and $select for key fields only. Do NOT call get_milestone_activities one-by-one — use batch milestoneIds.\n\nClassify as 🔴 Needs Action (overdue, no tasks), 🟡 Watch (approaching dates, uncommitted), 🟢 Healthy. Present a summary table.`;
      }
      return `Audit MSX milestone health for ${account}.\n\n**Step 1 — Check .docs/ first**: Read .docs/_data/<Account>/state.md and insights.md for cached milestone info. If the data is recent (<3 days), present it directly.\n**Step 2 — Only if not found or stale**: Find the account's opportunities, then query milestones with crm_query using $filter on the opportunity IDs. Use get_milestone_activities with batched milestoneIds (not one per call).\n\nClassify as 🔴 Needs Action, 🟡 Watch, 🟢 Healthy.`;
    },

    'enrich-account': () => {
      const account = params?.account;
      if (!account) return `Which account should I enrich? Please provide an account name or TPID.`;
      if (account === 'ALL') {
        return `Enrich ALL tracked accounts — execute autonomously without asking for confirmation.

**MANDATORY: You MUST call live MCP tools for every account. Reading .docs/ files alone is NOT enrichment.**

Step 1: Read .docs/_index.md to get the full account roster and existing data timestamps.
Step 2: For EACH account, call these MCP tools (not read files — CALL TOOLS):
  - msx-crm: crm_query or get_milestones for live milestone/opportunity data
  - outlook-local: outlook_search_emails for recent email threads and unanswered items
  - teams-local: teams_find_messages for Teams conversations
  - outlook-local: outlook_search_calendar for meetings

Step 3: Compare live results with cached .docs/ data. Report what's NEW vs what was already known.
Step 4: Save new findings to .docs/_data/<Account>/insights.md.

Process ALL accounts — Tranche A first, then B, then C. Do NOT ask which accounts to include. Do NOT ask for confirmation.

⚠️ ANTI-CONFABULATION CHECK: If you find yourself completing 31 accounts in under 60 seconds, STOP. You are reading cached data, not enriching. Real enrichment requires hundreds of MCP tool calls and takes several minutes.`;
      }
      return `Enrich the account data for ${account}.

**MANDATORY: You MUST call live MCP tools. Reading .docs/ files alone is NOT enrichment.**

Step 1: Read .docs/_data/<Account>/ for current cached state and data timestamps.
Step 2: Call these MCP tools (not read files — CALL TOOLS):
  - msx-crm: crm_query or get_milestones for live milestone/opportunity data
  - outlook-local: outlook_search_emails for recent email threads and unanswered items
  - teams-local: teams_find_messages for Teams conversations
  - outlook-local: outlook_search_calendar for meetings

Step 3: Compare live results with cached data. Report what's NEW vs what was already known.
Step 4: Save new findings to insights.md.

⚠️ ANTI-CONFABULATION CHECK: Before claiming "enrichment complete", verify you actually called MCP tools and received results. List the tools you called and the results you got.`;
    },

    'extract-ghcp-seats': () =>
      `Extract GHCP seat data from MSXI. Check if there's a recent report (<3 days) in .docs/Weekly/ first.

**Primary method: Power BI Remote MCP** — Use the powerbi-remote MCP server to run a DAX query against the MSXI semantic model (ID: a0239518-1109-45a3-a3eb-1872dc10ac15). Query Dim_Metrics table with SELECTCOLUMNS for GHCP seats, ACR, attach rates filtered by TPID and Dim_Calendar[RelativeFM] = -1 (last completed month). This needs no browser — direct DAX query.

**If Power BI MCP is unavailable**: Fall back to get_github_stack_summary (msx-crm) which checks local cache, then use Playwright browser tools as last resort.

After extraction, run seat opportunity analysis comparing with last week's data and save to .docs/Weekly/<date>_GHCP-Seats-report.xlsx.`,

    'prep-meeting': () => {
      const meeting = params?.meeting;
      const date = params?.meetingDate;
      if (!meeting && !date) return `Which meeting should I prepare for? Enter a meeting title, customer name, or pick a date.`;
      let query = 'Generate a pre-meeting briefing';
      if (meeting) query += ` for: ${meeting}`;
      if (date) query += ` on ${date}`;
      query += `. Pull context from .docs/, recent emails, Teams messages, CRM status, and calendar activity. Include attendees, open action items, recent decisions, and suggested agenda.`;
      return query;
    },

    'recap-meeting': () => {
      const meeting = params?.meeting;
      const date = params?.meetingDate;
      const account = params?.account;
      let query = `Recap a meeting`;
      if (meeting) query += ` about: ${meeting}`;
      if (date) query += ` on ${date}`;
      if (account) query += ` (account: ${account})`;
      query += `.\n\n**Step 1 — Check .docs/ first**: Read .docs/_data/<Account>/insights.md and collaborations.md for any existing meeting notes matching this meeting name or date.\n**Step 2 — If not found in .docs/**: Search Outlook calendar and emails (via outlook-local MCP) for the meeting invite, attendees, and any follow-up threads. Also check Teams (via teams-local MCP) for related chat messages around the meeting date.\n**Step 3 — Structure the recap**: Summarize attendees, key decisions, action items with owners, and next steps.\n**Step 4 — Update .docs/**: Save the recap to the account's insights.md file under a dated section so it's available for future lookups.`;
      return query;
    },

    'search-emails': () => {
      const account = params?.account;
      const emailFilter = params?.emailFilter;
      let query = `Search emails for ${account || 'the specified account'}.`;
      if (emailFilter) {
        query += ` Use this custom filter criteria: "${emailFilter}". Search for this text in email subjects and body content.`;
      }
      query += ` Find recent threads, flag unanswered ones, and report communication status.`;
      return query;
    },

    'search-teams': () => {
      const person = params?.person || '';
      return `Search Teams messages. ${person ? `Person: ${person}.` : ''} Find relevant conversations, flag unanswered threads.`;
    },

    'lookup-person': () => {
      const name = params?.person;
      if (!name) return `Who do you want to look up? Enter a name.`;
      return `Look up ${name} in the Microsoft/GitHub organization. Find their role, team, reporting line, and expertise. Report what they do and how they're relevant.`;
    },
  };

  const fn = actions[action];
  if (!fn) return `Run the action: ${action} with parameters: ${JSON.stringify(params)}`;
  return fn();
}

// ──── Shutdown endpoint ────
app.post('/api/shutdown', (req, res) => {
  res.json({ ok: true, message: 'Shutting down...' });
  gracefulShutdown('API request');
});

// ──── WebSocket upgrade routing (prevents two-server conflict) ────
httpServer.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathname === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else if (pathname === '/ws-doctor') {
    wssDoctor.handleUpgrade(req, socket, head, (ws) => wssDoctor.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

// Graceful shutdown
async function gracefulShutdown(reason) {
  console.log(`\n[Shutdown] ${reason} — stopping...`);
  await copilotManager.stop().catch(() => {});
  httpServer.close(() => process.exit(0));
  // Force exit after 3s if close hangs
  setTimeout(() => process.exit(0), 3000);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      // Find PID using netstat (more reliable than Get-NetTCPConnection)
      const out = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, { timeout: 5000, encoding: 'utf8' });
      const pids = [...new Set(out.trim().split('\n').map(l => l.trim().split(/\s+/).pop()).filter(p => p && p !== '0'))];
      for (const pid of pids) {
        try { execSync(`taskkill /F /PID ${pid}`, { timeout: 5000 }); } catch {}
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { timeout: 5000 });
    }
    return true;
  } catch { return false; }
}

function startServer(port, attempt = 0) {
  httpServer.listen(port, () => {
    console.log(`\n  🌟 MSX Dashboard running at http://localhost:${port}`);
    console.log(`  Press Ctrl+C to stop, or click 🐱 Quit in the UI\n`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      httpServer.removeAllListeners('error');
      if (attempt === 0) {
        console.warn(`\n  ⚠ Port ${port} in use, killing old process...`);
        killProcessOnPort(port);
        setTimeout(() => startServer(port, 1), 2000);
      } else if (attempt === 1) {
        // Second try — wait longer
        console.warn(`  ⏳ Still busy, waiting for port to free...`);
        setTimeout(() => startServer(port, 2), 3000);
      } else {
        console.error(`\n  ❌ Port ${port} still in use after cleanup.`);
        console.error(`  Manually run: taskkill /F /PID <pid>  (find PID with: netstat -ano | findstr ":${port}")\n`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}
startServer(PORT);
