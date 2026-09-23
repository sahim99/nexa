import { describe, it, expect, vi } from 'vitest';
import { EmbeddingService } from '../embedding.service';

describe('EmbeddingService Semantic Similarity', () => {
  const service = new EmbeddingService();

  function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  it('computes 384-dimensional embeddings locally with zero network fetch calls', async () => {
    // Warm up and initialize local model
    await service.generateEmbedding('warmup');

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const emb1 = await service.generateEmbedding('Senior Software Engineer building distributed Node.js backends');
    const emb2 = await service.generateEmbedding('Senior Backend Developer working with distributed systems in NodeJS');
    const embUnrelated = await service.generateEmbedding('Pastry chef specializing in french croissants and artisan baking');

    expect(emb1.length).toBe(384);
    expect(emb2.length).toBe(384);
    expect(embUnrelated.length).toBe(384);

    // Verify ZERO fetch network calls occurred
    expect(fetchSpy).not.toHaveBeenCalled();

    const simParaphrase = cosineSimilarity(emb1, emb2);
    const simUnrelated = cosineSimilarity(emb1, embUnrelated);

    expect(simParaphrase).toBeGreaterThan(0.85);
    expect(simUnrelated).toBeLessThan(0.7);

    fetchSpy.mockRestore();
  }, 30000); // 30s timeout for model weight loading if downloaded
});
