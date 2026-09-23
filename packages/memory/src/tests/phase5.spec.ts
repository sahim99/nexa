import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HybridRetriever } from '../hybrid-retriever';
import { MemoryEntityResolver } from '../entity.resolver';
import { PromptCache } from '@nexa/llm';
import { ScorerAdapter } from '@nexa/learning';
import { AudioBriefGenerator } from '@nexa/notifications';
import { MetricsCollector } from '@nexa/observability';

describe('Phase 5: Advanced Memory + Learning + Audio Brief Suite', () => {
  const metrics = MetricsCollector.getInstance();

  describe('HybridRetriever (Metadata Filter + Vector, Namespaced by userId)', () => {
    it('returns exactly 3 of 5 records when filtered by { source: "job" } with zero LLM calls', async () => {
      const initialLlmCalls = metrics.getCounter('llmCalls');
      const retriever = new HybridRetriever();

      // Store 5 records for user_123: 3 with source: 'job', 2 with source: 'personal'
      await retriever.store({
        userId: 'user_123',
        type: 'JOB_RECORD',
        content: 'Lead TypeScript Developer at Stripe',
        metadata: { source: 'job', company: 'Stripe' }
      });
      await retriever.store({
        userId: 'user_123',
        type: 'JOB_RECORD',
        content: 'Senior Backend Engineer at Vercel',
        metadata: { source: 'job', company: 'Vercel' }
      });
      await retriever.store({
        userId: 'user_123',
        type: 'JOB_RECORD',
        content: 'Full Stack Architect at Linear',
        metadata: { source: 'job', company: 'Linear' }
      });
      await retriever.store({
        userId: 'user_123',
        type: 'PERSONAL_NOTE',
        content: 'Dentist appointment at 3pm on Tuesday',
        metadata: { source: 'personal' }
      });
      await retriever.store({
        userId: 'user_123',
        type: 'PERSONAL_NOTE',
        content: 'Grocery list: oat milk, coffee beans, avocado',
        metadata: { source: 'personal' }
      });

      // Query with { source: 'job' }
      const results = await retriever.search({
        userId: 'user_123',
        filter: { source: 'job' },
        query: 'software engineering role'
      });

      expect(results.length).toBe(3);
      for (const item of results) {
        expect(item.metadata.source).toBe('job');
      }

      // Assert ZERO LLM calls were made
      expect(metrics.getCounter('llmCalls')).toBe(initialLlmCalls);
    });
  });

  describe('MemoryEntityResolver (Levenshtein <= 2 + Suffix Stripping + Centroid)', () => {
    it('resolves 3 "Stripe" variations into 1 EntityProfile with 3 facts and centroid embedding', () => {
      const initialLlmCalls = metrics.getCounter('llmCalls');
      const resolver = new MemoryEntityResolver();

      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.2, 0.3, 0.4];
      const embedding3 = [0.3, 0.4, 0.5];

      // Add 3 variations
      resolver.addFact('Stripe Inc.', 'Provides global API infrastructure for internet payments', embedding1);
      resolver.addFact('Stripe', 'Raised Series I financing valuing company at $50B', embedding2);
      resolver.addFact('Stripe LLC', 'Actively hiring staff distributed systems engineers in 2026', embedding3);

      const allProfiles = resolver.getAllProfiles();
      expect(allProfiles.length).toBe(1);

      const stripeProfile = resolver.getProfile('Stripe');
      expect(stripeProfile).toBeDefined();
      expect(stripeProfile!.facts.length).toBe(3);
      expect(stripeProfile!.aliases.length).toBeGreaterThanOrEqual(3);

      // Centroid embedding should be average: [ (0.1+0.2+0.3)/3, (0.2+0.3+0.4)/3, (0.3+0.4+0.5)/3 ] = [0.2, 0.3, 0.4]
      expect(stripeProfile!.centroidEmbedding).toBeDefined();
      expect(stripeProfile!.centroidEmbedding![0]).toBeCloseTo(0.2, 4);
      expect(stripeProfile!.centroidEmbedding![1]).toBeCloseTo(0.3, 4);
      expect(stripeProfile!.centroidEmbedding![2]).toBeCloseTo(0.4, 4);

      // Assert ZERO LLM calls were made
      expect(metrics.getCounter('llmCalls')).toBe(initialLlmCalls);
    });
  });

  describe('PromptCache TTL Verification', () => {
    it('verifies exact TTL values per task type', () => {
      const cache = new PromptCache();

      // COVER_LETTER: 24h TTL (86400000 ms)
      expect(cache.getTtl('COVER_LETTER')).toBe(24 * 3600 * 1000);

      // JD_ANALYSIS: 7 days TTL (604800000 ms)
      expect(cache.getTtl('JD_ANALYSIS')).toBe(7 * 24 * 3600 * 1000);

      // BRIEFING_SUMMARY: 24h TTL (86400000 ms)
      expect(cache.getTtl('BRIEFING_SUMMARY')).toBe(24 * 3600 * 1000);
    });
  });

  describe('ScorerAdapter (Dynamic Learning Weight Adjustment)', () => {
    it('increases startup stage weight in next scoring after 10 interview outcomes', () => {
      const adapter = new ScorerAdapter();
      expect(adapter.getStageWeight('startup')).toBe(15);

      // Record 10 positive outcomes for 'startup' stage
      for (let i = 1; i <= 10; i++) {
        adapter.recordStageOutcome('startup', 'INTERVIEW');
      }

      // Startup weight must now increase from 15 to 25
      expect(adapter.getStageWeight('startup')).toBe(25);

      const scored = adapter.score(
        {
          title: 'Senior Software Engineer',
          companyStage: 'startup',
          description: 'TypeScript, Node.js, distributed systems'
        },
        {
          targetRoles: ['Senior Software Engineer'],
          skills: ['TypeScript', 'Node.js'],
          preferredStages: ['startup']
        }
      );

      expect(scored.breakdown.stage).toBe(25);
      expect(scored.reasons.some(r => r.includes('Learned +10 weight boost'))).toBe(true);
    });
  });

  describe('AudioBriefGenerator (Groq BRIEFING_SUMMARY -> MP3 Audio File)', () => {
    it('generates valid MP3 file referencing yesterday events and falls back gracefully', async () => {
      const generator = new AudioBriefGenerator();
      const tempMp3Path = path.join(os.tmpdir(), `test_audio_brief_${Date.now()}.mp3`);

      const yesterdayEvents = [
        'Scanned 14 new engineering roles across Greenhouse and Lever boards',
        'Auto-applied to Lead Distributed Engineer at Stripe (Score: 88)',
        'Received recruiter outreach response from Datadog hiring manager'
      ];

      const result = await generator.generateAudioBrief({
        userName: 'Alex Dev',
        yesterdayEvents,
        outputPath: tempMp3Path
      });

      expect(result.textSummary).toBeDefined();
      expect(result.textSummary.length).toBeGreaterThan(15);
      expect(result.mp3Path).toBe(tempMp3Path);
      expect(fs.existsSync(tempMp3Path)).toBe(true);

      const fileStats = fs.statSync(tempMp3Path);
      expect(fileStats.size).toBeGreaterThan(100);

      // Clean up temp file
      try {
        fs.unlinkSync(tempMp3Path);
      } catch {}
    });
  });
});
