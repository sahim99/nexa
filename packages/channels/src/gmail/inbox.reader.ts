import { ChannelEmailClassifier, EmailClassificationResult } from './email-classifier';
import { ChannelDateExtractor } from './date-extractor';
import { MetricsCollector } from '@nexa/observability';

export interface RawEmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  date: Date | string;
}

export interface ProcessedEmail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  classification: EmailClassificationResult;
  extractedInterviewDate: Date | null;
  receivedAt: Date;
}

export class InboxReader {
  constructor(
    private readonly classifier: ChannelEmailClassifier = new ChannelEmailClassifier(),
    private readonly dateExtractor: ChannelDateExtractor = new ChannelDateExtractor(),
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Processes a list of raw email messages:
   * 1. Classifies recruiter/spam/other via pure algorithm (zero LLM).
   * 2. Extracts interview schedule dates via regex algorithm (zero LLM).
   */
  public processMessages(messages: RawEmailMessage[], referenceDate?: Date): ProcessedEmail[] {
    const results: ProcessedEmail[] = [];

    for (const msg of messages) {
      const classification = this.classifier.classify(msg.subject, msg.body);
      const combinedText = `${msg.subject}\n${msg.body}`;
      const extractedInterviewDate = this.dateExtractor.extract(combinedText, referenceDate);

      results.push({
        id: msg.id,
        threadId: msg.threadId,
        from: msg.from,
        subject: msg.subject,
        classification,
        extractedInterviewDate,
        receivedAt: new Date(msg.date)
      });
    }

    return results;
  }
}
