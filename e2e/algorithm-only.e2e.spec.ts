import { describe, it, expect } from 'vitest';
import { DecisionEngine } from '@nexa/job-pipeline';
import { NormalizedJob } from '@nexa/job-pipeline';
import { MetricsCollector } from '@nexa/observability';

describe('E2E: Algorithm-Only Fast Path (Zero LLM)', () => {
  it('processes high-scoring jobs (score >= 75) purely via algorithms with zero LLM calls', async () => {
    const metrics = MetricsCollector.getInstance();
    const initialLlmCalls = metrics.getCounter('llmCalls');

    const decisionEngine = new DecisionEngine();

    // Construct a high-matching job (Score will exceed 75)
    const highMatchJob: NormalizedJob = {
      id: 'job_high_match_99',
      source: 'greenhouse',
      company: 'Stripe',
      title: 'Senior Software Engineer',
      location: 'Remote',
      url: 'https://boards.greenhouse.io/stripe/jobs/999',
      description: 'Looking for a Senior Software Engineer skilled in TypeScript, Node.js, PostgreSQL, and Kubernetes.',
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Kubernetes'],
      companyStage: 'growth',
      postedAt: new Date(),
      salaryMin: 160000,
      salaryMax: 220000,
      normalizedTitle: 'Senior Software Engineer'
    };

    const userProfile = {
      targetRoles: ['Senior Software Engineer', 'Staff Engineer'],
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Kubernetes'],
      preferredStages: ['growth', 'public'],
      locations: ['Remote'],
      minSalary: 140000
    };

    const decision = await decisionEngine.decide(highMatchJob, userProfile);

    expect(decision.score).toBeGreaterThanOrEqual(75);
    expect(decision.decision).toBe('APPLY');
    expect(decision.reason).toContain('Rule Match');

    // Confirm that llmCalls metric counter did NOT increase!
    const finalLlmCalls = metrics.getCounter('llmCalls');
    expect(finalLlmCalls).toBe(initialLlmCalls);
  });
});
