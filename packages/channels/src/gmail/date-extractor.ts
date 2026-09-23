import { DateExtractor as AlgoDateExtractor } from '@nexa/algorithms';
import { MetricsCollector } from '@nexa/observability';

export class ChannelDateExtractor {
  constructor(private readonly metrics: MetricsCollector = MetricsCollector.getInstance()) {}

  /**
   * Extracts interview/call dates using 15 regex patterns.
   * Absolutely ZERO LLM calls. Returns null if no date pattern matches.
   */
  public extract(text: string, referenceDate: Date = new Date()): Date | null {
    this.metrics.incrementCounter('algorithmDecisions');
    return AlgoDateExtractor.extract(text, referenceDate);
  }
}
