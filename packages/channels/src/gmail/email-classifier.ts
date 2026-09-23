import { EmailClassifier as AlgoEmailClassifier, EmailClassificationResult, EmailClassification } from '@nexa/algorithms';
import { MetricsCollector } from '@nexa/observability';

export { EmailClassificationResult, EmailClassification };

export class ChannelEmailClassifier {
  constructor(private readonly metrics: MetricsCollector = MetricsCollector.getInstance()) {}

  /**
   * Classifies email into RECRUITER, SPAM, or OTHER using keyword rules.
   * Absolutely ZERO LLM calls.
   */
  public classify(subject: string, body: string): EmailClassificationResult {
    this.metrics.incrementCounter('algorithmDecisions');
    return AlgoEmailClassifier.classify(subject, body);
  }
}
