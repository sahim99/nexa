import { describe, it, expect } from 'vitest';
import { ApplicationAgent } from '@nexa/agents';
import { ResumeService } from '@nexa/resume';
import { MetricsCollector } from '@nexa/observability';

describe('E2E: Application System Flow', () => {
  it('generates cover letter on first call and returns cached response on second request', async () => {
    const agent = new ApplicationAgent();

    const requestPayload = {
      candidateName: 'Jane Architect',
      candidateSkills: ['TypeScript', 'GraphQL', 'Microservices'],
      jobTitle: 'Principal Systems Architect',
      companyName: 'Linear',
      rawJobDescription: 'Build high-performance collaboration tools for developers.'
    };

    // First request: generates cover letter
    const firstResult = await agent.generateCoverLetter(requestPayload);
    expect(firstResult.coverLetter).toBeDefined();
    expect(firstResult.coverLetter.length).toBeGreaterThan(30);

    // Second identical request: prompt cache hit
    const secondResult = await agent.generateCoverLetter(requestPayload);
    expect(secondResult.coverLetter).toBeDefined();
    expect(secondResult.cached).toBe(true);
    expect(secondResult.coverLetter).toBe(firstResult.coverLetter);
  });
});
