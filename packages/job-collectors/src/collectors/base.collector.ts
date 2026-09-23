import { CircuitBreaker } from '../circuit-breaker';

export interface CollectorJob {
  id: string;
  title: string;
  company: string;
  url: string;
  location?: string;
  description?: string;
  companyStage?: string;
  postedAt?: Date;
  salaryMin?: number;
  salaryMax?: number;
  source: string;
  rawPayload?: any;
}

export abstract class BaseCollector {
  abstract readonly name: string;
  protected circuitBreaker: CircuitBreaker;

  constructor(circuitBreaker?: CircuitBreaker) {
    this.circuitBreaker = circuitBreaker || new CircuitBreaker(this.constructor.name);
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  abstract collect(options?: any): Promise<CollectorJob[]>;
}
