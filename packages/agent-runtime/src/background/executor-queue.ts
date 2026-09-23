export interface QueuedTask {
  id: string;
  userId: string;
  agentId: string;
  payload: any;
  priority?: number;
  enqueuedAt: Date;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export class ExecutorQueue {
  private inMemoryQueues = new Map<string, QueuedTask[]>();

  constructor(private readonly redisClient?: any) {}

  private getQueueKey(userId: string): string {
    return `nexa:queue:${userId}:fifo`;
  }

  public async enqueue(task: QueuedTask): Promise<void> {
    const serialized = JSON.stringify({
      ...task,
      status: 'QUEUED',
      enqueuedAt: task.enqueuedAt || new Date()
    });

    if (this.redisClient) {
      try {
        await this.redisClient.rpush(this.getQueueKey(task.userId), serialized);
        return;
      } catch {
        // Fallback to memory
      }
    }

    const list = this.inMemoryQueues.get(task.userId) || [];
    list.push({ ...task, status: 'QUEUED', enqueuedAt: task.enqueuedAt || new Date() });
    this.inMemoryQueues.set(task.userId, list);
  }

  public async dequeue(userId: string): Promise<QueuedTask | null> {
    if (this.redisClient) {
      try {
        const item = await this.redisClient.lpop(this.getQueueKey(userId));
        if (item) {
          const parsed = JSON.parse(item);
          parsed.enqueuedAt = new Date(parsed.enqueuedAt);
          return parsed;
        }
        return null;
      } catch {
        // Fallback
      }
    }

    const list = this.inMemoryQueues.get(userId);
    if (!list || list.length === 0) {
      return null;
    }

    const task = list.shift() || null;
    return task;
  }

  public async size(userId: string): Promise<number> {
    if (this.redisClient) {
      try {
        return await this.redisClient.llen(this.getQueueKey(userId));
      } catch {
        // Fallback
      }
    }

    return this.inMemoryQueues.get(userId)?.length || 0;
  }

  public async clear(userId: string): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.del(this.getQueueKey(userId));
      } catch {
        // Fallback
      }
    }

    this.inMemoryQueues.delete(userId);
  }
}
