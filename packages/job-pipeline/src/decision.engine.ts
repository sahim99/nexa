import { RuleScorer, ScorerUserProfile } from '@nexa/algorithms';
import { LlmGateway } from '@nexa/llm';
import { metrics } from '@nexa/observability';
import { NormalizedJob } from './normalizer';

export type JobDecision = 'APPLY' | 'APPLY_LATER' | 'WATCH' | 'SKIP';

export interface DecisionResult {
  decision: JobDecision;
  score: number;
  reason: string;
  llmUsed: boolean;
  timestamp: Date;
}

export class DecisionEngine {
  private scorer: RuleScorer;

  constructor(private readonly llmGateway?: LlmGateway) {
    this.scorer = new RuleScorer();
  }

  /**
   * Deterministic-first decision pipeline:
   * 1. Rule scoring across 6 dimensions
   * 2. Score > 75 -> APPLY (0 LLM calls, <1ms)
   * 3. Score < 25 -> SKIP (0 LLM calls, <1ms)
   * 4. Ambiguous range (25-75) -> LlmGateway.route('JD_ANALYSIS')
   */
  public async decide(job: NormalizedJob, profile: ScorerUserProfile): Promise<DecisionResult> {
    const scorableJob = {
      title: job.normalizedTitle || job.title,
      description: job.description,
      company: job.company,
      companyStage: job.companyStage,
      location: job.location,
      postedAt: job.postedAt,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax
    };

    const ruleResult = this.scorer.score(scorableJob, profile);
    let finalScore = ruleResult.score;
    let reason = ruleResult.reasons.join('; ') || 'Standard evaluation';
    let llmUsed = false;

    // High score gate: immediate APPLY
    if (finalScore >= 75) {
      metrics.increment('algorithmDecisions');
      return {
        decision: 'APPLY',
        score: finalScore,
        reason: `[High Rule Match] ${reason}`,
        llmUsed: false,
        timestamp: new Date()
      };
    }

    // Low score gate: immediate SKIP
    if (finalScore < 25) {
      metrics.increment('algorithmDecisions');
      return {
        decision: 'SKIP',
        score: finalScore,
        reason: `[Low Rule Match] Insufficient alignment with target criteria (<25)`,
        llmUsed: false,
        timestamp: new Date()
      };
    }

    // Ambiguous zone (25 - 74): evaluate with LLM if gateway is provided
    if (this.llmGateway) {
      try {
        metrics.increment('llmCalls');
        llmUsed = true;

        const prompt = `Evaluate job fit: Role: ${job.title} at ${job.company}. Requirements: ${job.skills.join(', ')}. Candidate Profile: ${profile.targetRoles.join(', ')} with skills: ${profile.skills.join(', ')}.`;
        const llmRes = await this.llmGateway.complete({
          taskType: 'JD_ANALYSIS',
          prompt,
          variables: {
            role: job.title,
            company: job.company,
            skills: profile.skills.slice(0, 5).join(', ')
          }
        });

        // Boost or adjust based on LLM response
        if (llmRes.content.includes('APPLY') || llmRes.content.includes('"recommendation": "APPLY"')) {
          finalScore = Math.min(100, finalScore + 15);
          reason += ` | LLM: Recommended fit`;
        } else if (llmRes.content.includes('SKIP') || llmRes.content.includes('"recommendation": "SKIP"')) {
          finalScore = Math.max(0, finalScore - 15);
          reason += ` | LLM: Disrecommended`;
        }
      } catch {
        // Fall back to rule-based decision
      }
    } else {
      metrics.increment('algorithmDecisions');
    }

    // Map final score to 4-state decision
    let decision: JobDecision;
    if (finalScore >= 75) {
      decision = 'APPLY';
    } else if (finalScore >= 55) {
      decision = 'APPLY_LATER';
    } else if (finalScore >= 35) {
      decision = 'WATCH';
    } else {
      decision = 'SKIP';
    }

    return {
      decision,
      score: finalScore,
      reason,
      llmUsed,
      timestamp: new Date()
    };
  }
}
