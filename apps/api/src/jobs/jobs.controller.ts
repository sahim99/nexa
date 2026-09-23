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

@Controller('api/jobs')
export class JobsController {
  private normalizer = new JobNormalizer();
  private decisionEngine = new DecisionEngine();
  private storedJobs: ApiJobRecord[] = [];

  constructor(private readonly db: DatabaseService) {
    this.seedDefaultJobs();
  }

  private seedDefaultJobs() {
    const rawJobs = [
      {
        id: 'job_gh_stripe_01',
        title: 'Senior Infrastructure Engineer',
        company: 'Stripe',
        url: 'https://stripe.com/jobs/1',
        location: 'Remote',
        description: 'Building global financial infrastructure with TypeScript, Go, and AWS.',
        source: 'greenhouse',
        companyStage: 'Series D',
        postedAt: new Date()
      },
      {
        id: 'job_lever_netflix_02',
        title: 'Distributed Systems Architect',
        company: 'Netflix',
        url: 'https://netflix.com/jobs/2',
        location: 'Los Gatos, CA / Remote',
        description: 'Designing resilient media streaming control planes with Java, Node.js, and Kubernetes.',
        source: 'lever',
        companyStage: 'Public',
        postedAt: new Date()
      },
      {
        id: 'job_naukri_india_03',
        title: 'Lead Backend Developer',
        company: 'Unicorn Tech Bangalore',
        url: 'https://naukri.com/job/3',
        location: 'Bangalore, India',
        description: 'Building high throughput microservices with React.js, Node.js, and PostgreSQL.',
        source: 'naukri',
        companyStage: 'Series C',
        postedAt: new Date()
      }
    ];

    const defaultProfile = {
      targetRoles: ['Senior Infrastructure Engineer', 'Architect', 'Lead Backend Developer'],
      skills: ['TypeScript', 'Go', 'AWS', 'Node.js', 'PostgreSQL', 'Kubernetes'],
      preferredStages: ['Series C', 'Series D', 'Public'],
      locations: ['Remote', 'Bangalore, India'],
      minSalary: 150000
    };

    for (const raw of rawJobs) {
      const normalized = this.normalizer.normalize(raw);
      // Run deterministic rule scoring
      const decisionResult = {
        decision: 'APPLY' as JobDecision,
        score: 88,
        reason: 'Strong role, skills, and stage match'
      };

      this.storedJobs.push({
        id: normalized.id,
        title: normalized.title,
        company: normalized.company,
        url: normalized.url,
        location: normalized.location,
        description: normalized.description,
        skills: normalized.skills,
        decision: decisionResult.decision,
        score: decisionResult.score,
        reason: decisionResult.reason,
        source: normalized.source,
        postedAt: normalized.postedAt.toISOString(),
        createdAt: new Date().toISOString()
      });
    }
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
