import { EventBus } from '@nexa/events';
import { MetricsCollector } from '@nexa/observability';

export interface SentEmailRecord {
  threadId: string;
  recipientEmail: string;
  companyName: string;
  role: string;
  sentAt: Date;
  followUpCount: number;
}

export interface DueFollowUpTask {
  taskId: string;
  threadId: string;
  recipientEmail: string;
  companyName: string;
  role: string;
  followUpStage: 'DAY_7' | 'DAY_14';
  dueAt: Date;
  status: 'PENDING_APPROVAL';
}

export class FollowUpScheduler {
  private records = new Map<string, SentEmailRecord>();
  private readonly maxFollowUps = 2;

  constructor(
    private readonly eventBus: EventBus = new EventBus(),
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Records an initial outreach email sent for a thread.
   */
  public recordSent(
    threadId: string,
    recipientEmail: string,
    companyName: string,
    role: string,
    sentAt: Date = new Date()
  ): void {
    this.records.set(threadId, {
      threadId,
      recipientEmail,
      companyName,
      role,
      sentAt,
      followUpCount: 0
    });
  }

  /**
   * Checks sent records against a reference date to identify follow-ups due at Day 7 or Day 14.
   * Max 2 follow-ups per thread.
   * All due tasks enter approval queue only.
   */
  public getDueTasks(daysAfter: 7 | 14, now: Date = new Date()): DueFollowUpTask[] {
    this.metrics.incrementCounter('algorithmDecisions');
    const dueTasks: DueFollowUpTask[] = [];

    for (const record of this.records.values()) {
      if (record.followUpCount >= this.maxFollowUps) {
        continue;
      }

      const diffDays = Math.floor((now.getTime() - record.sentAt.getTime()) / (1000 * 60 * 60 * 24));

      if (daysAfter === 7 && diffDays >= 7 && record.followUpCount === 0) {
        dueTasks.push({
          taskId: `fu_7_${record.threadId}`,
          threadId: record.threadId,
          recipientEmail: record.recipientEmail,
          companyName: record.companyName,
          role: record.role,
          followUpStage: 'DAY_7',
          dueAt: new Date(record.sentAt.getTime() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING_APPROVAL'
        });
      } else if (daysAfter === 14 && diffDays >= 14 && record.followUpCount === 1) {
        dueTasks.push({
          taskId: `fu_14_${record.threadId}`,
          threadId: record.threadId,
          recipientEmail: record.recipientEmail,
          companyName: record.companyName,
          role: record.role,
          followUpStage: 'DAY_14',
          dueAt: new Date(record.sentAt.getTime() + 14 * 24 * 60 * 60 * 1000),
          status: 'PENDING_APPROVAL'
        });
      }
    }

    return dueTasks;
  }

  /**
   * Increments follow-up count after an approved follow-up email is sent.
   */
  public incrementFollowUpCount(threadId: string): void {
    const record = this.records.get(threadId);
    if (record) {
      record.followUpCount++;
    }
  }

  public getRecord(threadId: string): SentEmailRecord | undefined {
    return this.records.get(threadId);
  }
}
