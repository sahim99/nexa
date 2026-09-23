import { ExecutorQueue, QueuedTask } from './executor-queue';
import { AgentRegistry } from '../registry/agent.registry';
import { AgentResult } from '@nexa/shared';

export interface RunnerState {
  runningTaskId?: string;
  isLocked: boolean;
  lastProcessedAt?: Date;
}

export class ExecutorRunner {
  private activeLocks = new Set<string>();

  constructor(
    private readonly queue: ExecutorQueue,
    private readonly registry: AgentRegistry,
    private readonly redisClient?: any,
    private readonly dbClient?: any
  ) {}

  private getLockKey(userId: string): string {
    return `nexa:lock:runner:${userId}`;
  }

  public async acquireLock(userId: string, ttlMs: number = 30000): Promise<boolean> {
    if (this.redisClient) {
      try {
        const res = await this.redisClient.set(this.getLockKey(userId), 'LOCKED', 'PX', ttlMs, 'NX');
        return res === 'OK';
      } catch {
        // Fallback
      }
    }

    if (this.activeLocks.has(userId)) {
      return false;
    }
    this.activeLocks.add(userId);
    return true;
  }

  public async releaseLock(userId: string): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.del(this.getLockKey(userId));
        return;
      } catch {
        // Fallback
      }
    }

    this.activeLocks.delete(userId);
  }

  /**
   * Dequeues and executes the next task for a user safely with distributed lock.
   */
  public async processNext(userId: string): Promise<{ task: QueuedTask | null; result?: AgentResult }> {
    const hasLock = await this.acquireLock(userId);
    if (!hasLock) {
      return { task: null };
    }

    try {
      const task = await this.queue.dequeue(userId);
      if (!task) {
        return { task: null };
      }

      task.status = 'RUNNING';

      // Persist state to DB if client exists
      if (this.dbClient?.task) {
        try {
          await this.dbClient.task.update({
            where: { id: task.id },
            data: { state: 'RUNNING' }
          });
        } catch {
          // Silent fallback
        }
      }

      const agent = this.registry.get(task.agentId);
      if (!agent) {
        throw new Error(`Agent '${task.agentId}' not found in registry`);
      }

      const agentTask = {
        id: task.id,
        agentId: task.agentId,
        payload: task.payload,
        state: 'RUNNING' as any,
        createdAt: task.enqueuedAt,
        updatedAt: new Date()
      };

      const result = await agent.execute(agentTask);
      task.status = result.success ? 'COMPLETED' : 'FAILED';

      if (this.dbClient?.task) {
        try {
          await this.dbClient.task.update({
            where: { id: task.id },
            data: { state: task.status }
          });
        } catch {
          // Silent fallback
        }
      }

      return { task, result };
    } finally {
      await this.releaseLock(userId);
    }
  }
}
