import { DatabaseService } from '@nexa/database';
import { DurableRunner } from './durable.runner';

export class QueueWorker {
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly runner: DurableRunner,
    private readonly pollIntervalMs: number = 2000
  ) {}

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[QueueWorker] Started polling for READY nodes...');
    
    this.intervalId = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[QueueWorker] Stopped polling.');
  }

  private async poll() {
    try {
      // Find a READY node. We use a transaction with a unique update to simulate locking
      // In a real high-concurrency PostgreSQL setup, we'd use raw SQL with FOR UPDATE SKIP LOCKED
      
      const nodeToRun = await this.db.prisma.$transaction(async (tx) => {
        const readyNode = await tx.executionNode.findFirst({
          where: { state: 'READY' },
          orderBy: { createdAt: 'asc' }
        });

        if (!readyNode) return null;

        // Mark it as RUNNING to lock it
        return tx.executionNode.update({
          where: { id: readyNode.id },
          data: { state: 'RUNNING' }
        });
      });

      if (nodeToRun) {
        // We do not await this, we fire and forget so the poller can pick up other nodes
        this.runner.executeNode(nodeToRun.id).catch(err => {
          console.error(`[QueueWorker] Unhandled error executing node ${nodeToRun.id}:`, err);
        });
      }
    } catch (error) {
      console.error('[QueueWorker] Polling error:', error);
    }
  }
}
