import {
  GreenhouseCollector,
  LeverCollector,
  YCombinatorCollector,
  GitHubCollector,
  NaukriCollector
} from '@nexa/job-collectors';
import { JobNormalizer, DecisionEngine, NormalizedJob, JobDecision } from '@nexa/job-pipeline';
import { JobDeduplicator, ScorerUserProfile } from '@nexa/algorithms';
import { LlmGateway } from '@nexa/llm';
import { MetricsCollector } from '@nexa/observability';

export interface DailyJobScanOptions {
  userProfile?: ScorerUserProfile;
  companies?: string[];
  maxJobsToEvaluate?: number;
  seedJobs?: any[];
}

export interface JobScanItem {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string;
  decision: JobDecision;
  score: number;
  reason: string;
  llmUsed: boolean;
  skills: string[];
}

export interface DailyJobScanResult {
  totalScanned: number;
  dedupedCount: number;
  decisions: {
    APPLY: number;
    APPLY_LATER: number;
    WATCH: number;
    SKIP: number;
  };
  metrics: {
    algorithmDecisions: number;
    llmCalls: number;
    algorithmRatioPercent: number;
  };
  jobs: JobScanItem[];
}

export class DailyJobScanWorkflow {
  private normalizer = new JobNormalizer();
  private deduplicator = new JobDeduplicator();
  private decisionEngine: DecisionEngine;
  private metrics = MetricsCollector.getInstance();

  constructor(private readonly gateway: LlmGateway = new LlmGateway()) {
    this.decisionEngine = new DecisionEngine(this.gateway);
  }

  public async run(
    userId: string = 'default_user',
    options?: DailyJobScanOptions
  ): Promise<DailyJobScanResult> {
    const profile: ScorerUserProfile = options?.userProfile || {
      targetRoles: ['Software Engineer', 'Senior Backend Engineer', 'Infrastructure Engineer', 'Lead Developer'],
      skills: ['TypeScript', 'Node.js', 'Go', 'Python', 'AWS', 'PostgreSQL', 'Docker', 'Kubernetes'],
      preferredStages: ['Series B', 'Series C', 'Series D', 'Public', 'growth'],
      locations: ['Remote', 'San Francisco', 'New York', 'Bangalore, India']
    };

    const maxToEvaluate = options?.maxJobsToEvaluate || 25;
    const rawJobs: any[] = [];

    if (options?.seedJobs && options.seedJobs.length > 0) {
      rawJobs.push(...options.seedJobs);
    } else {
      const greenhouse = new GreenhouseCollector();
      const lever = new LeverCollector();
      const yc = new YCombinatorCollector();
      const github = new GitHubCollector();
      const naukri = new NaukriCollector();

      // Collect in parallel with safe error isolation
      const collectors = [
        greenhouse.collect({ board: 'stripe' }).catch(() => []),
        lever.collect().catch(() => []),
        yc.collect().catch(() => []),
        github.collect().catch(() => []),
        naukri.collect().catch(() => [])
      ];

      const results = await Promise.all(collectors);
      for (const batch of results) {
        if (Array.isArray(batch)) {
          rawJobs.push(...batch);
        }
      }
    }

    let algorithmDecisions = 0;
    let llmCalls = 0;
    const processedJobs: JobScanItem[] = [];
    const decisionCounts = {
      APPLY: 0,
      APPLY_LATER: 0,
      WATCH: 0,
      SKIP: 0
    };

    for (const raw of rawJobs) {
      if (processedJobs.length >= maxToEvaluate) {
        break;
      }

      const dedup = this.deduplicator.deduplicate(
        raw.company || 'Unknown',
        raw.title || 'Unknown',
        raw.url || ''
      );

      if (!dedup.isNew) {
        continue;
      }

      const normalized: NormalizedJob = this.normalizer.normalize(raw);
      const decision = await this.decisionEngine.decide(normalized, profile);

      if (decision.llmUsed) {
        llmCalls++;
      } else {
        algorithmDecisions++;
      }

      decisionCounts[decision.decision]++;

      processedJobs.push({
        id: normalized.id,
        title: normalized.title,
        company: normalized.company,
        url: normalized.url,
        location: normalized.location,
        decision: decision.decision,
        score: decision.score,
        reason: decision.reason,
        llmUsed: decision.llmUsed,
        skills: normalized.skills
      });
    }

    const totalEvaluated = algorithmDecisions + llmCalls;
    const algorithmRatioPercent = totalEvaluated > 0
      ? Math.round((algorithmDecisions / totalEvaluated) * 100)
      : 100;

    return {
      totalScanned: rawJobs.length,
      dedupedCount: processedJobs.length,
      decisions: decisionCounts,
      metrics: {
        algorithmDecisions,
        llmCalls,
        algorithmRatioPercent
      },
      jobs: processedJobs
    };
  }
}
