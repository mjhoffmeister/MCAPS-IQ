// Structured audit logger for MCP tool invocations.
// Writes NDJSON (newline-delimited JSON) to:
//   1. stderr  — real-time (visible in VS Code MCP output)
//   2. durable file — append-only NDJSON for forensic/compliance retention
//
// File path is configurable via MCAPS_AUDIT_LOG env var.
// Default: .copilot/logs/audit.ndjson (workspace-relative).

import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const LOG_TARGET = process.stderr;

// ── Durable file sink setup ───────────────────────────────────
const DEFAULT_AUDIT_PATH = resolve(process.cwd(), '.copilot', 'logs', 'audit.ndjson');
const AUDIT_FILE = process.env.MCAPS_AUDIT_LOG || DEFAULT_AUDIT_PATH;

let _fileReady = false;
function ensureAuditDir(): void {
  if (_fileReady) return;
  try {
    const dir = dirname(AUDIT_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    _fileReady = true;
  } catch {
    // Fail silently — stderr logging still works
  }
}

export interface AuditEntry {
  tool: string;
  entitySet?: string;
  method?: string;
  recordCount?: number;
  blocked?: boolean;
  reason?: string;
  params?: Record<string, unknown>;
  operationId?: string;
  upn?: string;
  status?: string;
  source?: string;
  detections?: Array<{ id: string; field: string; severity: string; description: string }>;
  [key: string]: unknown;
}

export function auditLog(entry: AuditEntry): void {
  const record = {
    ts: new Date().toISOString(),
    ...entry,
  };
  const line = JSON.stringify(record) + '\n';
  try {
    LOG_TARGET.write(line);
  } catch {
    // Never crash the server for a logging failure
  }
  // Append to durable file
  try {
    ensureAuditDir();
    appendFileSync(AUDIT_FILE, line, 'utf-8');
  } catch {
    // Best-effort — never crash
  }
}

/** Returns the resolved path of the audit log file. */
export function getAuditLogPath(): string {
  return AUDIT_FILE;
}
