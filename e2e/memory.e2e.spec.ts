import { describe, it, expect } from 'vitest';
import { HybridRetriever } from '@nexa/memory';
import { MemoryEntityResolver } from '@nexa/memory';
import { MetricsCollector } from '@nexa/observability';

describe('E2E: Advanced Memory & Entity Resolution', () => {
  it('executes hybrid search and entity clustering with zero LLM calls', async () => {
    const metrics = MetricsCollector.getInstance();
    const retriever = new HybridRetriever();
    const resolver = new MemoryEntityResolver();

    const initialLlmCalls = metrics.getCounter('llmCalls');

    // 1. Store memories with metadata
    await retriever.store({
      userId: 'user_e2e',
      type: 'JOB',
      content: 'Senior Platform Engineer at Stripe',
      metadata: { source: 'job', company: 'Stripe' }
    });
    await retriever.store({
      userId: 'user_e2e',
      type: 'JOB',
      content: 'Cloud Architect at Stripe',
      metadata: { source: 'job', company: 'Stripe' }
    });
    await retriever.store({
      userId: 'user_e2e',
      type: 'JOB',
      content: 'Backend Developer at Vercel',
      metadata: { source: 'job', company: 'Vercel' }
    });
    await retriever.store({
      userId: 'user_e2e',
      type: 'PERSONAL',
      content: 'Book flight tickets to Berlin',
      metadata: { source: 'personal' }
    });

    // 2. Hybrid search with metadata filter
    const jobResults = await retriever.search({
      userId: 'user_e2e',
      filter: { source: 'job' }
    });
    expect(jobResults.length).toBe(3);

    // 3. Entity resolution across name variants
    resolver.addFact('Stripe Inc.', 'Provides developer payment APIs', [0.1, 0.2]);
    resolver.addFact('Stripe LLC', 'HQ in South San Francisco', [0.3, 0.4]);
    resolver.addFact('Stripe', 'Processes hundreds of billions annually', [0.2, 0.3]);

    const stripeProfile = resolver.getProfile('Stripe');
    expect(stripeProfile).toBeDefined();
    expect(stripeProfile!.facts.length).toBe(3);
    expect(stripeProfile!.centroidEmbedding).toBeDefined();

    // Confirm ZERO LLM calls for hybrid retrieval & entity clustering
    expect(metrics.getCounter('llmCalls')).toBe(initialLlmCalls);
  });
});
