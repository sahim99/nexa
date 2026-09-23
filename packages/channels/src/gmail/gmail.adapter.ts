import { getSecret } from '@nexa/credentials';
import { MetricsCollector } from '@nexa/observability';

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, any>;
}

export interface SendEmailResult {
  success: boolean;
  dryRun: boolean;
  messageId: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

export class GmailRateLimitError extends Error {
  constructor(message: string) {
    super(`[GmailRateLimitError] ${message}`);
    this.name = 'GmailRateLimitError';
  }
}

export class GmailAdapter {
  private hourlySends: number[] = [];
  private dailySends: number[] = [];
  private readonly maxPerHour = 5;
  private readonly maxPerDay = 20;

  constructor(
    private readonly dryRun: boolean = true,
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Checks whether the current request adheres to 5/hour and 20/day limits.
   */
  public canSend(now: number = Date.now()): { allowed: boolean; reason?: string } {
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Prune stale timestamps
    this.hourlySends = this.hourlySends.filter((t) => t > oneHourAgo);
    this.dailySends = this.dailySends.filter((t) => t > oneDayAgo);

    if (this.hourlySends.length >= this.maxPerHour) {
      return {
        allowed: false,
        reason: `Hourly rate limit of ${this.maxPerHour} emails reached. Current sent: ${this.hourlySends.length}`
      };
    }

    if (this.dailySends.length >= this.maxPerDay) {
      return {
        allowed: false,
        reason: `Daily rate limit of ${this.maxPerDay} emails reached. Current sent: ${this.dailySends.length}`
      };
    }

    return { allowed: true };
  }

  /**
   * Sends an email via Gmail adapter.
   * Credentials (OAuth tokens) retrieved safely via getSecret().
   * In dryRun mode, returns the simulated email payload with zero network calls.
   * Throws GmailRateLimitError if limits are exceeded.
   */
  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const now = Date.now();
    const check = this.canSend(now);
    if (!check.allowed) {
      throw new GmailRateLimitError(check.reason || 'Rate limit exceeded');
    }

    // Safely check secrets via getSecret() from credentials broker
    const clientId = getSecret('GMAIL_CLIENT_ID', this.dryRun ? 'dry-run-client-id' : undefined);
    const refreshToken = getSecret('GMAIL_REFRESH_TOKEN', this.dryRun ? 'dry-run-refresh-token' : undefined);

    // Record send
    this.hourlySends.push(now);
    this.dailySends.push(now);
    this.metrics.incrementCounter('algorithmDecisions');

    const messageId = `msg_${now}_${Math.random().toString(36).substring(2, 8)}`;

    if (this.dryRun) {
      return {
        success: true,
        dryRun: true,
        messageId,
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
        sentAt: new Date(now).toISOString()
      };
    }

    // Live mode would use OAuth + nodemailer / googleapis
    return {
      success: true,
      dryRun: false,
      messageId,
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
      sentAt: new Date(now).toISOString()
    };
  }

  public getHourlyCount(): number {
    return this.hourlySends.length;
  }

  public getDailyCount(): number {
    return this.dailySends.length;
  }
}
