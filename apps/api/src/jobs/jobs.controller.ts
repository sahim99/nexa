import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';
import { JobNormalizer, DecisionEngine, JobDecision } from '@nexa/job-pipeline';
import { GreenhouseCollector, LeverCollector, YCombinatorCollector, GitHubCollector, NaukriCollector } from '@nexa/job-collectors';

export interface ApiJobRecord {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string;
  description: string;
  skills: string[];
  decision: JobDecision;
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

  constructor(private readonly db: DatabaseService) {
    // DB will be used here. No fake data!
  }

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
    return {
      success: true,
      collectedCount: collected.length,
      jobs: collected
    };
  }
}
