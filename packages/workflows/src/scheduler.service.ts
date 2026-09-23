import { MetricsCollector } from '@nexa/observability';

export interface WorkflowRunRecord {
  id: string;
  workflowName: string;
  userId: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED_LOCKED';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  result?: any;
  error?: string;
}

export type WorkflowHandler = (userId: string, params?: any) => Promise<any>;

export interface WorkflowRegistration {
  name: string;
  handler: WorkflowHandler;
  defaultCron?: string;
  lockTtlSeconds?: number;
}

export interface WorkflowExecutionResult {
  workflowName: string;
  executed: boolean;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED_LOCKED';
  result?: any;
  error?: string;
  durationMs: number;
}

export class SchedulerService {
  private inMemoryLocks = new Map<string, number>();
  private workflows = new Map<string, WorkflowRegistration>();
  private history: WorkflowRunRecord[] = [];
  private metrics: MetricsCollector;

  constructor(private readonly redisClient?: any) {
    this.metrics = MetricsCollector.getInstance();
  }

  public getLockKey(workflowName: string, userId: string): string {
    return `nexa:lock:workflow:${workflowName}:${userId}`;
  }

  /**
   * Acquire a distributed lock. Returns true if acquired, false if already locked.
   */
  public async acquireLock(lockKey: string, ttlSeconds: number = 60): Promise<boolean> {
    if (this.redisClient) {
      try {
        const res = await this.redisClient.set(lockKey, 'locked', 'NX', 'EX', ttlSeconds);
        return res === 'OK' || res === true;
      } catch {
        // Fallback to in-memory lock
      }
    }

    const now = Date.now();
    const expiresAt = this.inMemoryLocks.get(lockKey);
    if (expiresAt && now < expiresAt) {
      return false;
    }

    this.inMemoryLocks.set(lockKey, now + ttlSeconds * 1000);
    return true;
  }

  /**
   * Release a distributed lock.
   */
  public async releaseLock(lockKey: string): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.del(lockKey);
      } catch {
        // Ignore fallback
      }
    }

    this.inMemoryLocks.delete(lockKey);
  }

  /**
   * Execute an action protected by a distributed lock.
   * If lock cannot be acquired, returns { executed: false, error: '...' }.
   */
  public async withLock<T>(
    lockKey: string,
    ttlSeconds: number,
    fn: () => Promise<T>
  ): Promise<{ executed: boolean; result?: T; error?: string }> {
    const acquired = await this.acquireLock(lockKey, ttlSeconds);
    if (!acquired) {
      return {
        executed: false,
        error: `Action blocked: lock '${lockKey}' is active.`
      };
    }

    try {
      const result = await fn();
      return { executed: true, result };
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Register a workflow definition.
   */
  public registerWorkflow(
    name: string,
    handler: WorkflowHandler,
    options?: { defaultCron?: string; lockTtlSeconds?: number }
  ): void {
    this.workflows.set(name, {
      name,
      handler,
      defaultCron: options?.defaultCron,
      lockTtlSeconds: options?.lockTtlSeconds || 60
    });
  }

  /**
   * Trigger a registered workflow by name with dedup lock protection.
   */
  public async triggerWorkflow(
    name: string,
    userId: string = 'default_user',
    params?: any
  ): Promise<WorkflowExecutionResult> {
    const reg = this.workflows.get(name);
    if (!reg) {
      throw new Error(`Workflow '${name}' is not registered`);
    }

    const startTime = Date.now();
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const lockKey = this.getLockKey(name, userId);
    const ttl = reg.lockTtlSeconds || 60;

    const locked = await this.acquireLock(lockKey, ttl);
    if (!locked) {
      const record: WorkflowRunRecord = {
        id: runId,
        workflowName: name,
        userId,
        status: 'SKIPPED_LOCKED',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        error: `Workflow '${name}' is already running for user '${userId}' (dedup lock active).`
      };
      this.history.unshift(record);

      return {
        workflowName: name,
        executed: false,
        status: 'SKIPPED_LOCKED',
        error: record.error,
        durationMs: record.durationMs
      };
    }

    try {
      this.metrics.incrementCounter('pipelineRuns');
      const result = await reg.handler(userId, params);
      const completedAt = Date.now();
      const durationMs = completedAt - startTime;

      const record: WorkflowRunRecord = {
        id: runId,
        workflowName: name,
        userId,
        status: 'SUCCESS',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(completedAt).toISOString(),
        durationMs,
        result
      };
      this.history.unshift(record);

      return {
        workflowName: name,
        executed: true,
        status: 'SUCCESS',
        result,
        durationMs
      };
    } catch (err: any) {
      const completedAt = Date.now();
      const durationMs = completedAt - startTime;

      const record: WorkflowRunRecord = {
        id: runId,
        workflowName: name,
        userId,
        status: 'FAILED',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(completedAt).toISOString(),
        durationMs,
        error: err.message
      };
      this.history.unshift(record);

      return {
        workflowName: name,
        executed: true,
        status: 'FAILED',
        error: err.message,
        durationMs
      };
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  public getRunHistory(limit: number = 50): WorkflowRunRecord[] {
    return this.history.slice(0, limit);
  }

  public getRegisteredWorkflows(): string[] {
    return Array.from(this.workflows.keys());
  }
}
