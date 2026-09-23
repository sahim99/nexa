import { EventBus } from '@nexa/events';
import { MetricsCollector } from '@nexa/observability';

export interface ExtensionQueuePayload {
  jobId: string;
  sourcePlatform: string;
  applicant: {
    fullName: string;
    email: string;
    phone?: string;
    resumeUrl?: string;
    coverLetter?: string;
  };
  customFields?: Record<string, any>;
}

export interface ExtensionBridgeResult {
  queueId: string;
  jobId: string;
  status: 'EMITTED_TO_EXTENSION_QUEUE';
  timestamp: string;
}

export class ExtensionBridgeAdapter {
  constructor(
    private readonly eventBus: EventBus = new EventBus(),
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Emits an application payload into the extension bridge queue.
   * Strictly emits database / bus records for local browser extension pickup.
   * Zero direct platform HTTP requests, zero headless logins.
   */
  async queueForExtension(payload: ExtensionQueuePayload): Promise<ExtensionBridgeResult> {
    this.metrics.incrementCounter('algorithmDecisions');

    const queueId = `ext_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    this.eventBus.emit({
      id: queueId,
      eventType: 'extension.job.queued',
      timestamp: new Date(),
      source: 'ats-adapters:tier2',
      payload
    });

    return {
      queueId,
      jobId: payload.jobId,
      status: 'EMITTED_TO_EXTENSION_QUEUE',
      timestamp: new Date().toISOString()
    };
  }
}
