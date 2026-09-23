import { describe, it, expect, vi } from 'vitest';
import { ResumeService } from '../resume.service';
import { LlmGateway } from '@nexa/llm';

describe('ResumeService', () => {
  it('generates tailored summary via LlmGateway and does not throw', async () => {
    const service = new ResumeService();

    const summary = await service.generateTailoredSummary({
      profile: {
        fullName: 'Jane Doe',
        skills: ['TypeScript', 'Node.js', 'Distributed Systems'],
        bio: 'Senior Software Engineer with 7 years of experience',
        experienceYears: 7
      },
      job: {
        title: 'Lead Platform Engineer',
        company: 'Stripe',
        skills: ['TypeScript', 'Kubernetes']
      },
      rawJobDescription: 'We are seeking an engineer to build distributed payment pipelines.'
    });

    expect(summary).toBeDefined();
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(30);
    expect(summary.toLowerCase()).toContain('stripe');
  });

  it('guarantees deterministic template fallback if upstream gateway throws', async () => {
    const mockGateway = {
      complete: vi.fn().mockRejectedValue(new Error('All upstream providers rate-limited')),
      route: vi.fn()
    } as unknown as LlmGateway;

    const resilientService = new ResumeService(mockGateway);

    const fallbackResult = await resilientService.generateTailoredSummary({
      profile: {
        fullName: 'Alex Smith',
        skills: ['Python', 'Docker']
      },
      job: {
        title: 'Backend Developer',
        company: 'Acme Corp'
      }
    });

    expect(fallbackResult).toBeDefined();
    expect(fallbackResult).toContain('Acme Corp');
    expect(fallbackResult).toContain('Backend Developer');
    expect(fallbackResult).toContain('Alex Smith');
  });
});
