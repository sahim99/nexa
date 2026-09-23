import { describe, it, expect } from 'vitest';
import { RuleScorer } from '../scoring/rule-scorer';
import { EmbeddingScorer } from '../scoring/embedding-scorer';
import { SkillExtractor } from '../extraction/skill-extractor';
import { DateExtractor } from '../extraction/date-extractor';
import { EmailClassifier } from '../extraction/email-classifier';
import { TitleNormalizer } from '../normalization/title-normalizer';
import { SynonymRotator } from '../normalization/synonym-rotator';
import { JobDeduplicator } from '../deduplication/job-deduplicator';
import { EntityResolver } from '../deduplication/entity-resolver';

describe('Algorithm Layer (Zero LLM, Pure Code)', () => {
  describe('RuleScorer', () => {
    const scorer = new RuleScorer();
    const profile = {
      targetRoles: ['Senior Backend Engineer', 'Staff Engineer'],
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
      preferredStages: ['Series B', 'Series C', 'Growth'],
      locations: ['San Francisco', 'Remote'],
      minSalary: 160000
    };

    const job = {
      title: 'Senior Backend Engineer',
      description: 'Looking for a Senior Backend Engineer with strong expertise in TypeScript, Node.js, PostgreSQL, Docker, and AWS.',
      company: 'TechCorp',
      companyStage: 'Series B',
      location: 'Remote',
      postedAt: new Date(),
      salaryMin: 175000
    };

    it('scores deterministically (<5ms, identical across runs)', () => {
      // Warm up JIT compiler
      scorer.score(job, profile);

      const start = performance.now();
      const res1 = scorer.score(job, profile);
      const elapsed = performance.now() - start;

      const res2 = scorer.score(job, profile);
      const res3 = scorer.score(job, profile);

      expect(elapsed).toBeLessThan(5);
      expect(res1.score).toBe(res2.score);
      expect(res2.score).toBe(res3.score);
      expect(res1.score).toBeGreaterThanOrEqual(80);
      expect(res1.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('EmbeddingScorer', () => {
    it('computes cosine similarity accurately', () => {
      const vecA = [0.8, 0.6, 0.0];
      const vecB = [0.8, 0.6, 0.0]; // identical
      const vecC = [-0.8, -0.6, 0.0]; // opposite

      const simHigh = EmbeddingScorer.cosineSimilarity(vecA, vecB);
      const simLow = EmbeddingScorer.cosineSimilarity(vecA, vecC);

      expect(simHigh).toBeGreaterThan(0.95);
      expect(simLow).toBeLessThan(0.1);
    });
  });

  describe('SkillExtractor', () => {
    const extractor = new SkillExtractor();

    it('extracts technical skills without LLM dependency', () => {
      const jd = 'We need 5 years of React.js, Node.js, and AWS experience for building scalable systems.';
      const skills = extractor.extract(jd);

      expect(skills).toContain('React.js');
      expect(skills).toContain('Node.js');
      expect(skills).toContain('AWS');
    });
  });

  describe('DateExtractor', () => {
    it('extracts scheduled interview dates from text', () => {
      const text = 'Interview scheduled for Monday, June 15, 2026 at 10:00 AM';
      const date = DateExtractor.extract(text);

      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(5); // June is index 5
      expect(date?.getDate()).toBe(15);

      const noDate = DateExtractor.extract('There are no dates in this sentence.');
      expect(noDate).toBeNull();
    });
  });

  describe('EmailClassifier', () => {
    it('accurately classifies recruiter and spam emails', () => {
      const recruiterRes = EmailClassifier.classify(
        'Exciting opportunity at Stripe',
        'Hi, I saw your background and would love to schedule a phone screen interview.'
      );
      expect(recruiterRes.classification).toBe('RECRUITER');

      const spamRes = EmailClassifier.classify(
        'Special offer discount code',
        'Click here to claim your promotional gift. Unsubscribe from newsletter.'
      );
      expect(spamRes.classification).toBe('SPAM');
    });
  });

  describe('TitleNormalizer', () => {
    it('normalizes titles via dictionary and Levenshtein fallback', () => {
      expect(TitleNormalizer.normalize('sr swe')).toBe('senior software engineer');
      expect(TitleNormalizer.normalize('fullstack dev')).toBe('full stack engineer');
      expect(TitleNormalizer.normalize('sre')).toBe('site reliability engineer');
    });
  });

  describe('SynonymRotator', () => {
    it('deterministically rotates synonyms based on day of year', () => {
      const rot1 = SynonymRotator.rotate('Node.js', 1);
      const rot2 = SynonymRotator.rotate('Node.js', 2);
      const rot1Repeat = SynonymRotator.rotate('Node.js', 1);

      expect(rot1).toBe('NodeJS');
      expect(rot2).toBe('Node');
      expect(rot1Repeat).toBe('NodeJS');
    });
  });

  describe('JobDeduplicator', () => {
    const deduplicator = new JobDeduplicator();

    it('identifies duplicate job URLs and maintains count', () => {
      const job1 = deduplicator.deduplicate('Stripe', 'Staff Engineer', 'https://stripe.com/jobs/123');
      expect(job1.isNew).toBe(true);

      const job2 = deduplicator.deduplicate('Stripe', 'Staff Engineer', 'https://stripe.com/jobs/123');
      expect(job2.isNew).toBe(false);
      expect(job2.jobId).toBe(job1.jobId);
    });
  });

  describe('EntityResolver', () => {
    it('resolves corporate entity variants and typos', () => {
      expect(EntityResolver.isSameEntity('Stripe Inc', 'stripe')).toBe(true);
      expect(EntityResolver.isSameEntity('Stripe', 'Stripe LLC')).toBe(true);
      expect(EntityResolver.isSameEntity('Stripe', 'Strip')).toBe(true); // typo distance 1
      expect(EntityResolver.isSameEntity('Google', 'Microsoft')).toBe(false);
    });
  });
});
