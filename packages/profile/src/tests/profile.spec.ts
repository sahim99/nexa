import { describe, it, expect } from 'vitest';
import { ProfileService, UserProfileData } from '../profile.service';
import { RuleScorer } from '@nexa/algorithms';

describe('ProfileService & RuleScorer Integration', () => {
  const profileService = new ProfileService();
  const scorer = new RuleScorer();

  it('saves, retrieves, and updates UserProfile correctly', async () => {
    const profile: UserProfileData = {
      userId: 'user_dev_001',
      name: 'Sahimuzzaman',
      email: 'sahim@nexa.ai',
      targetRoles: ['Staff Software Engineer', 'Lead Architect'],
      skills: ['TypeScript', 'Go', 'Kubernetes', 'PostgreSQL', 'Kafka'],
      preferredStages: ['Series B', 'Series C'],
      locations: ['Remote', 'San Francisco'],
      minSalary: 180000
    };

    const saved = await profileService.saveProfile(profile);
    expect(saved.userId).toBe('user_dev_001');

    const fetched = await profileService.getProfile('user_dev_001');
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Sahimuzzaman');
    expect(fetched?.targetRoles).toContain('Staff Software Engineer');

    // Verify RuleScorer reads user profile dynamically, not hardcoded constants
    const job = {
      title: 'Staff Software Engineer',
      description: 'Looking for Staff Software Engineer with deep expertise in Go, Kubernetes, and Kafka.',
      company: 'HighGrowth AI',
      companyStage: 'Series B',
      location: 'Remote',
      salaryMin: 190000
    };

    const scoreResult = scorer.score(job, fetched!);
    expect(scoreResult.score).toBeGreaterThanOrEqual(80);
    expect(scoreResult.reasons.some((r) => r.includes('Staff Software Engineer'))).toBe(true);
  });
});
