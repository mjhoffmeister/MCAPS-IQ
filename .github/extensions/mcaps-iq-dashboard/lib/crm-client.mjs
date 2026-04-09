/**
 * CRM Client Bridge — connects to the MSX MCP server via stdio transport
 * using @modelcontextprotocol/sdk. Provides typed methods for CRM operations
 * with in-memory TTL caching to avoid hammering CRM on tab switches.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CONNECT_TIMEOUT_MS = 15_000;

export function createCrmClient(options = {}) {
  const ttlMs = options.ttl ?? DEFAULT_TTL_MS;
  let client = null;
  let transport = null;
  let connectPromise = null;
  let connected = false;
  const cache = new Map();

  // ── Cache helpers ─────────────────────────────────────────────

  function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > ttlMs) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  function setCache(key, data) {
    cache.set(key, { data, ts: Date.now() });
  }

  function invalidateCache(prefix) {
    if (!prefix) { cache.clear(); return; }
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  }

  // ── Connection ────────────────────────────────────────────────

  async function ensureConnected() {
    if (connected && client) return client;
    if (connectPromise) return connectPromise;

    connectPromise = (async () => {
      try {
        transport = new StdioClientTransport({
          command: 'npx',
          args: ['-y', '@microsoft/msx-mcp-server@latest'],
          env: {
            ...process.env,
            'npm_config_@microsoft:registry': 'https://npm.pkg.github.com',
            MSX_CRM_URL: options.crmUrl || 'https://microsoftsales.crm.dynamics.com',
            MSX_TENANT_ID: options.tenantId || '72f988bf-86f1-41af-91ab-2d7cd011db47'
          }
        });

        client = new Client(
          { name: 'mcaps-iq-dashboard', version: '1.0.0' },
          { capabilities: {} }
        );

        // Connect with timeout
        const connectResult = await Promise.race([
          client.connect(transport),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('MCP connection timeout')), CONNECT_TIMEOUT_MS)
          )
        ]);

        connected = true;
        console.log('[crm-client] Connected to MSX MCP server');
        return client;
      } catch (err) {
        connected = false;
        client = null;
        transport = null;
        connectPromise = null;
        throw err;
      }
    })();

    return connectPromise;
  }

  // ── Tool call wrapper ─────────────────────────────────────────

  async function callTool(name, args = {}) {
    const c = await ensureConnected();
    const result = await c.callTool({ name, arguments: args });

    // MCP tools return { content: [{ type: 'text', text: '...' }] }
    if (result?.content?.[0]?.text) {
      try {
        return JSON.parse(result.content[0].text);
      } catch {
        return result.content[0].text;
      }
    }
    return result;
  }

  // ── Public API ────────────────────────────────────────────────

  async function whoami() {
    const cached = getCached('whoami');
    if (cached) return cached;
    const data = await callTool('crm_whoami');
    setCache('whoami', data);
    return data;
  }

  async function getAuthStatus() {
    const cached = getCached('auth_status');
    if (cached) return cached;
    const data = await callTool('crm_auth_status');
    setCache('auth_status', data);
    return data;
  }

  async function getMyOpportunities(opts = {}) {
    const key = `my_opps_${opts.customerKeyword || 'all'}_${opts.includeDealTeam ?? true}`;
    const cached = getCached(key);
    if (cached) return cached;

    const args = {};
    if (opts.customerKeyword) args.customerKeyword = opts.customerKeyword;
    if (opts.includeDealTeam !== undefined) args.includeDealTeam = opts.includeDealTeam;
    if (opts.maxResults) args.maxResults = opts.maxResults;

    const data = await callTool('get_my_active_opportunities', args);
    setCache(key, data);
    return data;
  }

  async function getMilestones(opts = {}) {
    const key = `milestones_${opts.opportunityId || opts.customerKeyword || 'none'}`;
    const cached = getCached(key);
    if (cached) return cached;

    const args = {};
    if (opts.opportunityId) args.opportunityId = opts.opportunityId;
    if (opts.customerKeyword) args.customerKeyword = opts.customerKeyword;
    if (opts.statusFilter) args.statusFilter = opts.statusFilter;
    if (opts.includeTasks) args.includeTasks = opts.includeTasks;

    const data = await callTool('get_milestones', args);
    setCache(key, data);
    return data;
  }

  async function listAccountsByTpid(tpids) {
    const key = `accounts_${tpids.sort().join(',')}`;
    const cached = getCached(key);
    if (cached) return cached;

    const data = await callTool('list_accounts_by_tpid', { tpids });
    setCache(key, data);
    return data;
  }

  async function getConnectionStatus() {
    try {
      await ensureConnected();
      return { connected: true, error: null };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  }

  function disconnect() {
    if (transport) {
      try { transport.close(); } catch { /* noop */ }
    }
    client = null;
    transport = null;
    connected = false;
    connectPromise = null;
    cache.clear();
  }

  return {
    whoami,
    getAuthStatus,
    getMyOpportunities,
    getMilestones,
    listAccountsByTpid,
    getConnectionStatus,
    invalidateCache,
    disconnect,
    callTool
  };
}
