import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';
import { JobNormalizer, DecisionEngine, JobDecision } from '@nexa/job-pipeline';
import { GreenhouseCollector, LeverCollector } from '@nexa/job-collectors';
import { ProfileStore } from '../profile/profile.store.js';

export type ApiDecision = 'APPLY' | 'REVIEW' | 'SKIP';

export interface ApiJobRecord {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string;
  description: string;
  skills: string[];
  decision: ApiDecision;
  pipelineDecision: JobDecision;
  score: number;
  reason: string;
  source: string;
  postedAt: string;
  createdAt: string;
}

@Controller('jobs')
export class JobsController {
  private normalizer = new JobNormalizer();
  private decisionEngine = new DecisionEngine();
  private storedJobs: ApiJobRecord[] = [];

  constructor(
    private readonly db: DatabaseService,
    private readonly profiles?: ProfileStore
  ) {}

  @Get()
  async getJobs(
    @Query('decision') decision?: string,
    @Query('limit') limit?: string
  ): Promise<ApiJobRecord[]> {
    let results = [...this.storedJobs];

    if (decision) {
      const targetDecision = decision.toUpperCase();
      results = results.filter((job) => job.decision === targetDecision);
    }

    const max = limit ? parseInt(limit, 10) : 50;
    return results.slice(0, max);
  }

  @Post('collect')
  async triggerCollection(@Body() body?: { source?: string }) {
    const greenhouse = new GreenhouseCollector();
    const lever = new LeverCollector();

    const [ghJobs, leverJobs] = await Promise.all([
      greenhouse.collect(),
      lever.collect()
    ]);

    const collected = [...ghJobs, ...leverJobs];
    const profile = this.scoringProfile();
    const records: ApiJobRecord[] = [];

    for (const job of collected) {
      const normalized = this.normalizer.normalize(job);
      const decision = await this.decisionEngine.decide(normalized, profile);
      records.push({
        id: normalized.id,
        title: normalized.title,
        company: normalized.company,
        url: normalized.url,
        location: normalized.location,
        description: normalized.description,
        skills: normalized.skills,
        decision: toApiDecision(decision.decision),
        pipelineDecision: decision.decision,
        score: decision.score,
        reason: decision.reason,
        source: normalized.source,
        postedAt: toIso(normalized.postedAt),
        createdAt: new Date().toISOString(),
      });
    }

    this.storedJobs = records;
    return {
      success: true,
      collectedCount: collected.length,
      storedCount: records.length,
      persistence: 'memory' as const,
      jobs: collected,
    };
  }

  private scoringProfile() {
    const saved = this.profiles?.get('default');
    if (!saved) {
      return { targetRoles: [], skills: [], preferredStages: [], locations: [], minSalary: 0 };
    }
    return {
      targetRoles: saved.targetRoles,
      skills: saved.skills,
      preferredStages: saved.preferredStages,
      locations: saved.locations,
      minSalary: saved.minSalary,
    };
  }
}

function toIso(value: Date | string | undefined): string {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toApiDecision(decision: JobDecision): ApiDecision {
  if (decision === 'APPLY') return 'APPLY';
  if (decision === 'SKIP') return 'SKIP';
  return 'REVIEW';
}
