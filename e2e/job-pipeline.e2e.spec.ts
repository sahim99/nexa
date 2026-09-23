import { describe, it, expect } from 'vitest';
import { GreenhouseCollector } from '@nexa/job-collectors';
import { Normalizer } from '@nexa/job-pipeline';
import { DecisionEngine } from '@nexa/job-pipeline';

describe('E2E: Job Pipeline Flow', () => {
  it('collects, normalizes, and computes decision with reason for real job data', async () => {
    const collector = new GreenhouseCollector();
    const normalizer = new Normalizer();
    const decisionEngine = new DecisionEngine();

    // 1. Collect real job postings from Greenhouse board (e.g. stripe or gitlab)
    const rawJobs = await collector.collect('stripe');
    expect(rawJobs.length).toBeGreaterThan(0);

    const firstJob = rawJobs[0];
    expect(firstJob.title).toBeDefined();

    // 2. Normalize job via algorithm (zero LLM)
    const normalized = normalizer.normalize(firstJob);
    expect(normalized.id).toBeDefined();
    expect(normalized.title).toBeDefined();
    expect(Array.isArray(normalized.skills)).toBe(true);

    // 3. Compute decision via DecisionEngine
    const profile = {
      targetRoles: ['Software Engineer', 'Backend Engineer', 'Platform Engineer'],
      skills: ['TypeScript', 'Node.js', 'Go', 'Python', 'Distributed Systems'],
      preferredStages: ['growth', 'public', 'late'],
      locations: ['Remote', 'San Francisco', 'New York']
    };

    const decisionResult = await decisionEngine.decide(normalized, profile);

    expect(decisionResult).toBeDefined();
    expect(['APPLY', 'REVIEW', 'SKIP']).toContain(decisionResult.decision);
    expect(decisionResult.reason).toBeDefined();
    expect(decisionResult.reason.length).toBeGreaterThan(0);
    expect(typeof decisionResult.score).toBe('number');
  });
});
