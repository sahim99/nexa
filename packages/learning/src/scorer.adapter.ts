import { RuleScorer, ScorableJob, ScorerUserProfile, RuleScoreResult } from '@nexa/algorithms';
import { OutcomeTracker, OutcomeType } from './outcome.tracker';
import { MetricsCollector } from '@nexa/observability';

export interface StageOutcome {
  stage: string;
  outcome: OutcomeType;
}

export class ScorerAdapter {
  private stageOutcomes: StageOutcome[] = [];
  private stageWeightBoosts = new Map<string, number>();

  constructor(
    private readonly tracker: OutcomeTracker = new OutcomeTracker(),
    private readonly ruleScorer: RuleScorer = new RuleScorer(),
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Records an outcome with company stage information.
   * After 10 outcomes for a given stage with positive results, increases weight for that stage.
   */
  public recordStageOutcome(stage: string, outcome: OutcomeType): void {
    this.stageOutcomes.push({ stage: stage.toLowerCase(), outcome });

    const matching = this.stageOutcomes.filter((s) => s.stage === stage.toLowerCase());
    if (matching.length >= 10) {
      const positiveCount = matching.filter((s) => s.outcome === 'INTERVIEW' || s.outcome === 'OFFER').length;
      if (positiveCount / matching.length >= 0.5) {
        // Boost stage weight by +10 points
        this.stageWeightBoosts.set(stage.toLowerCase(), 10);
      }
    }
  }

  /**
   * Scores a job using RuleScorer, dynamically augmenting score and breakdown
   * based on learned stage conversion weights.
   */
  public score(job: ScorableJob, profile: ScorerUserProfile): RuleScoreResult {
    this.metrics.incrementCounter('algorithmDecisions');

    const baseResult = this.ruleScorer.score(job, profile);
    const stage = job.companyStage?.toLowerCase() || '';

    const boost = this.stageWeightBoosts.get(stage) || 0;
    if (boost > 0) {
      const adjustedStage = baseResult.breakdown.stage + boost;
      const adjustedScore = Math.min(100, baseResult.score + boost);
      return {
        score: adjustedScore,
        reasons: [...baseResult.reasons, `Learned +${boost} weight boost from high conversion in ${stage} stage`],
        breakdown: {
          ...baseResult.breakdown,
          stage: adjustedStage
        }
      };
    }

    return baseResult;
  }

  public getStageWeight(stage: string): number {
    const base = 15; // Base stage weight
    const boost = this.stageWeightBoosts.get(stage.toLowerCase()) || 0;
    return base + boost;
  }
}
