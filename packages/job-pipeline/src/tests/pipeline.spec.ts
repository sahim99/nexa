import { describe, it, expect } from 'vitest';
import { JobNormalizer } from '../normalizer';
import { DecisionEngine } from '../decision.engine';
import { JobDeduplicator } from '@nexa/algorithms';
import { CollectorJob } from '@nexa/job-collectors';
import { metrics } from '@nexa/observability';
import { LlmGateway } from '@nexa/llm';

describe('Job Pipeline: Normalization, Deduplication & Decision Engine', () => {
  const normalizer = new JobNormalizer();
  const deduplicator = new JobDeduplicator();

  const userProfile = {
    targetRoles: ['Senior Backend Engineer', 'Staff Engineer'],
    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
    preferredStages: ['Series B', 'Series C'],
    locations: ['Remote', 'San Francisco'],
    minSalary: 160000
  };

  it('normalizes raw CollectorJob with skill taxonomy extraction and canonical title normalization without LLM', () => {
    const rawJob: CollectorJob = {
      id: 'job_raw_1',
      title: 'sr swe - distributed platforms',
      company: 'TechCorp',
      url: 'https://techcorp.com/jobs/1',
      location: 'Remote',
      description: 'We require 5+ years of experience with React.js, Node.js, and AWS.',
      source: 'greenhouse',
      postedAt: new Date(),
      companyStage: 'Series B',
      salaryMin: 180000
    };

    const normalized = normalizer.normalize(rawJob);

    expect(normalized.normalizedTitle).toBe('senior software engineer - distributed platforms');
    expect(normalized.skills).toContain('React.js');
    expect(normalized.skills).toContain('Node.js');
    expect(normalized.skills).toContain('AWS');
  });

  it('deduplicates jobs deterministically using SHA256', () => {
    const first = deduplicator.deduplicate('Stripe', 'Staff Engineer', 'https://stripe.com/jobs/99');
    expect(first.isNew).toBe(true);

    const second = deduplicator.deduplicate('Stripe', 'Staff Engineer', 'https://stripe.com/jobs/99');
    expect(second.isNew).toBe(false);
    expect(second.jobId).toBe(first.jobId);
  });

  it('algorithm gate decides APPLY for high-match jobs with ZERO LLM calls', async () => {
    metrics.reset();
    const decisionEngine = new DecisionEngine(); // No LLM gateway needed for high scores!

    const highMatchJob = normalizer.normalize({
      id: 'job_high_match',
      title: 'Senior Backend Engineer',
      company: 'Series B Cloud Unicorn',
      companyStage: 'Series B',
      url: 'https://cloudunicorn.io/jobs/123',
      location: 'Remote',
      description: 'Looking for a Senior Backend Engineer proficient in TypeScript, Node.js, PostgreSQL, Docker, and AWS.',
      source: 'lever',
      postedAt: new Date(),
      salaryMin: 175000
    });

    const result = await decisionEngine.decide(highMatchJob, userProfile);

    expect(result.decision).toBe('APPLY');
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.llmUsed).toBe(false);
    expect(metrics.get('llmCalls')).toBe(0);
    expect(metrics.get('algorithmDecisions')).toBe(1);
  });

  it('algorithm gate decides SKIP for unrelated low-match jobs with ZERO LLM calls', async () => {
    metrics.reset();
    const decisionEngine = new DecisionEngine();

    const lowMatchJob = normalizer.normalize({
      id: 'job_low_match',
      title: 'Artisan Pastry Chef',
      company: 'French Bakery',
      companyStage: 'Small Business',
      url: 'https://bakery.fr/jobs/chef',
      location: 'Paris, France',
      description: 'Must have 10 years experience baking authentic baguettes and brioche.',
      source: 'naukri',
      postedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000) // 60 days old
    });

    const result = await decisionEngine.decide(lowMatchJob, userProfile);

    expect(result.decision).toBe('SKIP');
    expect(result.score).toBeLessThan(25);
    expect(result.llmUsed).toBe(false);
    expect(metrics.get('llmCalls')).toBe(0);
  });

  it('evaluates ambiguous jobs using LlmGateway fallback', async () => {
    metrics.reset();
    const mockGateway = new LlmGateway();
    const decisionEngine = new DecisionEngine(mockGateway);

    // Medium match job (score in 25-74 range)
    const ambiguousJob = normalizer.normalize({
      id: 'job_ambiguous',
      title: 'Software Engineer',
      company: 'Midsize Co',
      companyStage: 'Seed',
      url: 'https://midsize.co/jobs/1',
      location: 'New York',
      description: 'General software development with some Node.js knowledge.',
      source: 'ycombinator',
      postedAt: new Date()
    });

    const result = await decisionEngine.decide(ambiguousJob, userProfile);

    expect(result.decision).toBeDefined();
    expect(result.llmUsed).toBe(true);
    expect(metrics.get('llmCalls')).toBe(1);
  });
});
