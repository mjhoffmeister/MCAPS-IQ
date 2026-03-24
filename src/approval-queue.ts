// Lightweight approval queue for CRM write operations.
// Stages operations for human-in-the-loop review without blocking the agent.
// Emits events so frontends / agent flows can subscribe to queue changes.

import { EventEmitter } from 'node:events';

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

let counter = 0;

export type OperationStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';

export interface StagedOperation {
  id: string;
  type: string;
  entitySet: string;
  method: 'POST' | 'PATCH';
  payload: Record<string, unknown>;
  beforeState: Record<string, unknown> | null;
  description: string;
  stagedAt: string;
  expiresAt: number;
  status: OperationStatus;
  // Attached by specific tools after staging
  identity?: Record<string, unknown>;
  fallbackEntitySet?: string;
  fallbackPayload?: Record<string, unknown>;
}

export interface StageInput {
  type: string;
  entitySet: string;
  method: 'POST' | 'PATCH';
  payload: Record<string, unknown>;
  beforeState?: Record<string, unknown> | null;
  description: string;
}

export interface ApprovalQueueOptions {
  ttlMs?: number;
}

/**
 * Events emitted:
 *   'staged'   (op)           – new operation added to queue
 *   'approved' (op)           – operation approved by human
 *   'rejected' (op)           – operation rejected by human
 *   'executed' (op, result)   – operation executed against CRM
 *   'expired'  (op)           – operation expired via TTL
 *   'op:error' (op, error)    – execution failed
 */
export class ApprovalQueue extends EventEmitter {
  #ops = new Map<string, StagedOperation>();
  #ttlMs: number;
  #sweepTimer: ReturnType<typeof setInterval>;

  constructor({ ttlMs = DEFAULT_TTL_MS }: ApprovalQueueOptions = {}) {
    super();
    this.#ttlMs = ttlMs;
    // Periodic sweep for expired ops (every 60s)
    this.#sweepTimer = setInterval(() => this.#sweep(), 60_000);
    if (this.#sweepTimer.unref) this.#sweepTimer.unref(); // don't keep process alive
  }

  /** Stage a new write operation. Returns the operation with its assigned ID. */
  stage({ type, entitySet, method, payload, beforeState = null, description }: StageInput): StagedOperation {
    counter += 1;
    const id = `OP-${counter}`;
    const now = Date.now();
    const op: StagedOperation = {
      id,
      type,
      entitySet,
      method,
      payload,
      beforeState,
      description,
      stagedAt: new Date(now).toISOString(),
      expiresAt: now + this.#ttlMs,
      status: 'pending',
    };
    this.#ops.set(id, op);
    this.emit('staged', op);
    return op;
  }

  /** Approve a pending operation. Returns the approved op or null. */
  approve(id: string): StagedOperation | null {
    const op = this.#ops.get(id);
    if (!op || op.status !== 'pending') return null;
    if (Date.now() > op.expiresAt) {
      op.status = 'expired';
      this.emit('expired', op);
      this.#ops.delete(id);
      return null;
    }
    op.status = 'approved';
    this.emit('approved', op);
    return op;
  }

  /** Reject / cancel a pending operation. Returns the rejected op or null. */
  reject(id: string): StagedOperation | null {
    const op = this.#ops.get(id);
    if (!op || op.status !== 'pending') return null;
    op.status = 'rejected';
    this.emit('rejected', op);
    this.#ops.delete(id);
    return op;
  }

  /** Mark an approved operation as executed. Stores result and cleans up. */
  markExecuted(id: string, result: unknown): StagedOperation | null {
    const op = this.#ops.get(id);
    if (!op) return null;
    op.status = 'executed';
    this.emit('executed', op, result);
    this.#ops.delete(id);
    return op;
  }

  /** Mark an approved operation as failed. */
  markFailed(id: string, err: unknown): StagedOperation | null {
    const op = this.#ops.get(id);
    if (!op) return null;
    this.emit('op:error', op, err);
    // Keep in map so caller can retry or cancel
    op.status = 'pending';
    return op;
  }

  /** Get a single operation by ID. */
  get(id: string): StagedOperation | null {
    const op = this.#ops.get(id);
    if (op && Date.now() > op.expiresAt && op.status === 'pending') {
      op.status = 'expired';
      this.emit('expired', op);
      this.#ops.delete(id);
      return null;
    }
    return op ?? null;
  }

  /** List all pending operations. */
  listPending(): StagedOperation[] {
    this.#sweep();
    return [...this.#ops.values()].filter(op => op.status === 'pending');
  }

  /** List all operations regardless of status (still in map). */
  listAll(): StagedOperation[] {
    this.#sweep();
    return [...this.#ops.values()];
  }

  /** Number of pending operations. */
  get pendingCount() {
    return this.listPending().length;
  }

  /** Approve all pending operations. Returns approved ops. */
  approveAll(): StagedOperation[] {
    const approved: StagedOperation[] = [];
    for (const op of this.#ops.values()) {
      if (op.status === 'pending') {
        const result = this.approve(op.id);
        if (result) approved.push(result);
      }
    }
    return approved;
  }

  /** Reject all pending operations. Returns rejected ops. */
  rejectAll(): StagedOperation[] {
    const rejected: StagedOperation[] = [];
    for (const [, op] of [...this.#ops.entries()]) {
      if (op.status === 'pending') {
        const result = this.reject(op.id);
        if (result) rejected.push(result);
      }
    }
    return rejected;
  }

  /** Clear the entire queue (for testing / shutdown). */
  clear(): void {
    this.#ops.clear();
  }

  /** Stop the sweep timer (for clean shutdown). */
  dispose(): void {
    clearInterval(this.#sweepTimer);
  }

  // Expire stale operations
  #sweep(): void {
    const now = Date.now();
    for (const [id, op] of this.#ops) {
      if (op.status === 'pending' && now > op.expiresAt) {
        op.status = 'expired';
        this.emit('expired', op);
        this.#ops.delete(id);
      }
    }
  }
}

/** Singleton instance — shared across MCP tools and external consumers. */
let _instance: ApprovalQueue | null = null;

export function getApprovalQueue(opts?: ApprovalQueueOptions): ApprovalQueue {
  if (!_instance) {
    _instance = new ApprovalQueue(opts);
  }
  return _instance;
}

/** Reset singleton (for testing). */
export function resetApprovalQueue(): void {
  if (_instance) {
    _instance.dispose();
    _instance = null;
  }
  counter = 0;
}
