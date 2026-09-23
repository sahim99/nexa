export type OutcomeType = 'INTERVIEW' | 'OFFER' | 'REJECTION' | 'GHOSTED' | 'APPLIED';

export interface OutcomeRecord {
  jobId: string;
  outcome: OutcomeType;
  timestamp: Date;
  roleMatchScore?: number;
  skillsMatchScore?: number;
  company?: string;
  role?: string;
  notes?: string;
}

export interface DimensionWeights {
  role: number;
  skills: number;
  stage: number;
  location: number;
  recency: number;
  salary: number;
}

export const INITIAL_WEIGHTS: DimensionWeights = {
  role: 30,
  skills: 20,
  stage: 15,
  location: 10,
  recency: 15,
  salary: 10
};

export class OutcomeTracker {
  private records: OutcomeRecord[] = [];
  private currentWeights: DimensionWeights = { ...INITIAL_WEIGHTS };

  constructor(private readonly dbClient?: any) {}

  public async recordOutcome(record: Omit<OutcomeRecord, 'timestamp'> & { timestamp?: Date }): Promise<OutcomeRecord> {
    const entry: OutcomeRecord = {
      ...record,
      timestamp: record.timestamp || new Date()
    };

    this.records.push(entry);

    // If 10 or more outcomes have accumulated, recalculate and shift weights
    if (this.records.length >= 10) {
      this.rebalanceWeights();
    }

    return entry;
  }

  public getOutcomes(): OutcomeRecord[] {
    return [...this.records];
  }

  public getWeights(): DimensionWeights {
    return { ...this.currentWeights };
  }

  /**
   * Shifts dimensional weights based on empirical interview conversion patterns.
   */
  private rebalanceWeights(): void {
    const interviews = this.records.filter((r) => r.outcome === 'INTERVIEW' || r.outcome === 'OFFER');
    const positiveRate = interviews.length / this.records.length;

    if (positiveRate > 0.3) {
      // Strong interview conversion: boost skills and role weights
      this.currentWeights = {
        role: 35,
        skills: 25,
        stage: 10,
        location: 10,
        recency: 10,
        salary: 10
      };
    } else {
      // Broaden search: increase location & recency flexibility
      this.currentWeights = {
        role: 25,
        skills: 20,
        stage: 15,
        location: 15,
        recency: 15,
        salary: 10
      };
    }
  }

  public reset(): void {
    this.records = [];
    this.currentWeights = { ...INITIAL_WEIGHTS };
  }
}
