// CRM request execution layer
// Adapted from electron/main.js fetch + ipcHandlers patterns

import type { AuthService } from './auth.js';

const API_VERSION = 'v9.2';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF_MS = 500;
const MAX_RETRY_AFTER_MS = 60_000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export interface CrmResponse {
  ok: boolean;
  status: number;
  data: CrmData | null;
  entityId?: string | null;
}

/** Shape of CRM response `data`. `value` is the array of records when present. */
export interface CrmData {
  [key: string]: unknown;
  value?: Record<string, unknown>[];
  message?: string;
}

export interface CrmRequestOptions {
  method?: string;
  query?: Record<string, string | number | undefined | null>;
  body?: Record<string, unknown> | string;
  contentType?: string;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  maxRecords?: number;
  _authRetried?: boolean;
}

export interface CrmClient {
  request(entityPath: string, opts?: CrmRequestOptions): Promise<CrmResponse>;
  requestAllPages(entityPath: string, opts?: CrmRequestOptions): Promise<CrmResponse>;
  buildUrl(entityPath: string, query?: Record<string, string | number | undefined | null>): URL;
  getCrmUrl(): string;
}

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const getRetryAfterMs = (response: Response): number | null => {
  const val = response.headers.get('Retry-After');
  if (!val) return null;
  const seconds = parseInt(val, 10);
  if (!isNaN(seconds)) return Math.min(Math.max(seconds * 1000, 0), MAX_RETRY_AFTER_MS);
  const date = Date.parse(val);
  if (!isNaN(date)) return Math.min(Math.max(0, date - Date.now()), MAX_RETRY_AFTER_MS);
  return null;
};

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const data = await response.json() as { error?: { message?: string }; message?: string };
    return data?.error?.message || data?.message || `HTTP ${response.status}`;
  } catch {
    try { return (await response.text()) || `HTTP ${response.status}`; }
    catch { return `HTTP ${response.status}`; }
  }
};

export function createCrmClient(authService: AuthService): CrmClient {
  const buildUrl = (entityPath: string, query?: Record<string, string | number | undefined | null>): URL => {
    const base = authService.getCrmUrl();
    const url = new URL(`${base}/api/data/${API_VERSION}/${entityPath}`);
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    return url;
  };

  const getHeaders = (token: string, contentType?: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Content-Type': contentType || 'application/json',
    Accept: 'application/json',
    Prefer: 'odata.include-annotations="*"',
    'Cache-Control': 'no-cache',
    'If-None-Match': ''
  });

  const fetchWithRetry = async (url: URL | string, options: RequestInit, { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, backoffMs = DEFAULT_BACKOFF_MS } = {}): Promise<Response> => {
    const method = ((options.method || 'GET') as string).toUpperCase();
    const isWrite = WRITE_METHODS.has(method);
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retries) {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url.toString(), { ...options, signal: controller.signal });
        clearTimeout(tid);

        if (response.ok) return response;

        if (response.status === 429) {
          const retryMs = getRetryAfterMs(response);
          if (retryMs !== null && attempt < retries) {
            await delay(retryMs);
            attempt++;
            continue;
          }
        }

        if (isWrite && RETRYABLE_STATUS.has(response.status) && attempt < retries) {
          await delay(backoffMs * 2 ** attempt);
          attempt++;
          continue;
        }

        const msg = await parseErrorBody(response);
        const err: Error & { status?: number } = new Error(msg);
        err.status = response.status;
        throw err;
      } catch (err) {
        clearTimeout(tid);
        lastError = err as Error;
        if (attempt < retries && ((err as { name?: string })?.name === 'AbortError' || err instanceof TypeError)) {
          await delay(backoffMs * 2 ** attempt);
          attempt++;
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error('Request failed');
  };

  /**
   * Execute a CRM request.
   */
  const request = async (entityPath: string, opts: CrmRequestOptions = {}): Promise<CrmResponse> => {
    const authResult = await authService.ensureAuth();
    if (!authResult.success) {
      return { ok: false, status: 401, data: { message: authResult.error || 'Not authenticated' } };
    }

    const token = authService.getToken()!;
    const url = buildUrl(entityPath, opts.query as Record<string, string | number | undefined | null>);
    const method = ((opts.method || 'GET') as string).toUpperCase();
    const headers = getHeaders(token, opts.contentType);
    const fetchOpts: RequestInit = { method, headers };

    if (opts.body !== undefined && opts.body !== null) {
      fetchOpts.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }

    try {
      const response = await fetchWithRetry(url, fetchOpts, {
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        retries: opts.retries ?? (WRITE_METHODS.has(method) ? DEFAULT_RETRIES : 0),
        backoffMs: opts.backoffMs ?? DEFAULT_BACKOFF_MS
      });

      let data: CrmData | null = null;
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        try { data = await response.json() as CrmData; } catch { /* empty 204 */ }
      }

      // For POST creates, capture new entity ID from OData-EntityId header
      let entityId: string | null = null;
      if (method === 'POST') {
        const oeid = response.headers.get('OData-EntityId');
        if (oeid) {
          const m = oeid.match(/\(([0-9a-f-]{36})\)/i);
          if (m) entityId = m[1];
        }
      }

      return { ok: true, status: response.status, data, entityId };
    } catch (err) {
      // On 401, clear the cached token and retry once with a fresh token
      if ((err as { status?: number }).status === 401 && !opts._authRetried) {
        authService.clearToken();
        return request(entityPath, { ...opts, _authRetried: true });
      }
      return {
        ok: false,
        status: (err as { status?: number }).status || 500,
        data: { message: (err as Error).message }
      };
    }
  };

  /**
   * Execute a request and auto-paginate if @odata.nextLink is present.
   */
  const requestAllPages = async (entityPath: string, opts: CrmRequestOptions = {}): Promise<CrmResponse> => {
    const maxRecords = opts.maxRecords || 0; // 0 = no cap (caller-controlled)
    const first = await request(entityPath, opts);
    if (!first.ok || !(first.data as CrmData)?.value) return first;

    const allValues = [...((first.data as CrmData).value as Record<string, unknown>[])];
    let nextLink = (first.data as CrmData)['@odata.nextLink'] as string | undefined;

    const paginationFailure = (status: number, message: string): CrmResponse => ({
      ok: false,
      status: status || 500,
      data: {
        message: `Pagination failed: ${message || 'Unknown error'}`,
        partialCount: allValues.length,
        partial: { ...(first.data as CrmData), value: allValues }
      }
    });

    const fetchPage = async (link: string, token: string): Promise<CrmData> => {
      const resp = await fetchWithRetry(link, {
        method: 'GET',
        headers: getHeaders(token)
      }, {
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        retries: opts.retries ?? DEFAULT_RETRIES,
        backoffMs: opts.backoffMs ?? DEFAULT_BACKOFF_MS
      });
      try {
        return await resp.json() as CrmData;
      } catch {
        throw new Error('Invalid pagination response body');
      }
    };

    // Respect ceiling
    if (maxRecords > 0 && allValues.length >= maxRecords) {
      allValues.length = maxRecords;
      return { ok: true, status: 200, data: { ...(first.data as CrmData), value: allValues, truncated: true } };
    }

    while (nextLink) {
      const authResult = await authService.ensureAuth();
      if (!authResult.success) {
        return paginationFailure(401, authResult.error || 'Authentication failed during pagination');
      }

      const token = authService.getToken()!;
      let page: CrmData;
      try {
        page = await fetchPage(nextLink, token);
      } catch (err) {
        if ((err as { status?: number }).status === 401) {
          // Clear stale token and retry this page once with fresh auth
          authService.clearToken();
          const retryAuth = await authService.ensureAuth();
          if (!retryAuth.success) {
            return paginationFailure(401, retryAuth.error || 'Authentication failed during pagination retry');
          }
          try {
            page = await fetchPage(nextLink, authService.getToken()!);
          } catch (retryErr) {
            return paginationFailure((retryErr as { status?: number }).status || 500, (retryErr as Error).message || 'Unknown pagination error');
          }
        } else {
          return paginationFailure((err as { status?: number }).status || 500, (err as Error).message || 'Unknown pagination error');
        }
      }

      if (page?.value) allValues.push(...(page.value as Record<string, unknown>[]));
      // Enforce ceiling mid-pagination
      if (maxRecords > 0 && allValues.length >= maxRecords) {
        allValues.length = maxRecords;
        return { ok: true, status: 200, data: { ...(first.data as CrmData), value: allValues, truncated: true } };
      }
      nextLink = page['@odata.nextLink'] as string | undefined;
    }

    return { ok: true, status: 200, data: { ...(first.data as CrmData), value: allValues } };
  };

  return { request, requestAllPages, buildUrl, getCrmUrl: () => authService.getCrmUrl() };
}
