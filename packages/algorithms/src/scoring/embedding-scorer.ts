export class EmbeddingScorer {
  /**
   * Calculates cosine similarity between two vector embeddings.
   * Returns a normalized float between 0.0 and 1.0.
   */
  public static cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (!vectorA || !vectorB || vectorA.length === 0 || vectorB.length === 0) {
      return 0;
    }

    const minLen = Math.min(vectorA.length, vectorB.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLen; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    // Normalize from [-1, 1] to [0, 1] for intuitive scoring
    const normalized = (similarity + 1) / 2;
    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Scores a candidate embedding against a target user profile embedding.
   */
  public score(candidateEmbedding: number[], profileEmbedding: number[]): { similarity: number; matchLevel: 'HIGH' | 'MEDIUM' | 'LOW' } {
    const similarity = EmbeddingScorer.cosineSimilarity(candidateEmbedding, profileEmbedding);
    let matchLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    if (similarity >= 0.75) {
      matchLevel = 'HIGH';
    } else if (similarity >= 0.5) {
      matchLevel = 'MEDIUM';
    }

    return { similarity, matchLevel };
  }
}
