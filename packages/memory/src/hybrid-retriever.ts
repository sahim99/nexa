import { EmbeddingService } from './embedding.service';
import { EmbeddingScorer } from '@nexa/algorithms';
import { MetricsCollector } from '@nexa/observability';

export interface StoredMemoryRecord {
  id: string;
  userId: string;
  type: string;
  content: string;
  metadata: Record<string, any>;
  vector: number[];
  createdAt: Date;
}

export interface HybridSearchOptions {
  userId: string;
  query?: string;
  filter?: Record<string, any>;
  limit?: number;
}

export interface HybridSearchResult {
  id: string;
  userId: string;
  type: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export class HybridRetriever {
  private inMemoryStore: StoredMemoryRecord[] = [];

  constructor(
    private readonly prismaClient?: any,
    private readonly embeddingService: EmbeddingService = new EmbeddingService(),
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Stores a memory record with vector embedding and metadata, namespaced by userId.
   * Zero LLM calls.
   */
  async store(record: {
    userId: string;
    type: string;
    content: string;
    metadata?: Record<string, any>;
    id?: string;
  }): Promise<StoredMemoryRecord> {
    this.metrics.incrementCounter('algorithmDecisions');
    const id = record.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const vector = await this.embeddingService.generateEmbedding(record.content);
    const metadata = record.metadata || {};

    const entry: StoredMemoryRecord = {
      id,
      userId: record.userId,
      type: record.type,
      content: record.content,
      metadata,
      vector,
      createdAt: new Date()
    };

    if (this.prismaClient?.memoryRecord) {
      try {
        const vectorStr = `[${vector.join(',')}]`;
        await this.prismaClient.$executeRaw`
          INSERT INTO "MemoryRecord" ("id", "type", "content", "metadata", "createdAt", "vector")
          VALUES (${id}, ${record.type}, ${record.content}, ${JSON.stringify({ ...metadata, userId: record.userId })}::jsonb, NOW(), ${vectorStr}::vector)
        `;
      } catch {
        // Fallback to in-memory
      }
    }

    this.inMemoryStore.push(entry);
    return entry;
  }

  /**
   * Hybrid retrieval:
   * 1. Namespaced by userId.
   * 2. Strict metadata filtering (e.g. { source: 'job' }).
   * 3. Vector distance ordering (ORDER BY vector <=> query_embedding).
   * Absolutely ZERO LLM calls.
   */
  async search(options: HybridSearchOptions): Promise<HybridSearchResult[]> {
    this.metrics.incrementCounter('algorithmDecisions');
    const limit = options.limit || 10;

    // Filter in-memory by userId and metadata
    let candidates = this.inMemoryStore.filter((r) => r.userId === options.userId);

    if (options.filter) {
      candidates = candidates.filter((r) => {
        for (const [k, v] of Object.entries(options.filter!)) {
          if (r.metadata[k] !== v) {
            return false;
          }
        }
        return true;
      });
    }

    let queryVector: number[] = [];
    if (options.query) {
      queryVector = await this.embeddingService.generateEmbedding(options.query);
    }

    // Rank candidates by cosine similarity
    const scored: HybridSearchResult[] = candidates.map((item) => {
      let similarity = 1.0;
      if (queryVector.length > 0 && item.vector.length > 0) {
        similarity = EmbeddingScorer.cosineSimilarity(queryVector, item.vector);
      }
      return {
        id: item.id,
        userId: item.userId,
        type: item.type,
        content: item.content,
        metadata: item.metadata,
        similarity
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  public getStore(): StoredMemoryRecord[] {
    return [...this.inMemoryStore];
  }
}
