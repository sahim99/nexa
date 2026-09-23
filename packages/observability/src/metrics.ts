export type MetricName =
  | 'llmCalls'
  | 'cacheHits'
  | 'algorithmDecisions'
  | 'pipelineRuns'
  | string;

export class MetricsService {
  private static instance: MetricsService;
  private counters = new Map<string, number>();

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  constructor() {
    this.counters.set('llmCalls', 0);
    this.counters.set('cacheHits', 0);
    this.counters.set('algorithmDecisions', 0);
    this.counters.set('pipelineRuns', 0);
  }

  public increment(name: MetricName, by: number = 1): number {
    const current = this.counters.get(name) || 0;
    const next = current + by;
    this.counters.set(name, next);
    return next;
  }

  public get(name: MetricName): number {
    return this.counters.get(name) || 0;
  }

  public getAll(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of this.counters.entries()) {
      out[k] = v;
    }
    return out;
  }

  public reset(): void {
    this.counters.clear();
    this.counters.set('llmCalls', 0);
    this.counters.set('cacheHits', 0);
    this.counters.set('algorithmDecisions', 0);
    this.counters.set('pipelineRuns', 0);
  }

  public incrementCounter(name: MetricName, by: number = 1): number {
    return this.increment(name, by);
  }

  public getCounter(name: MetricName): number {
    return this.get(name);
  }
}

export const MetricsCollector = MetricsService;
export type MetricsCollector = MetricsService;
export const metrics = MetricsService.getInstance();
