import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from './embedding.service';

export class MemoryService {
  private prisma: PrismaClient;
  private embeddingService: EmbeddingService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    this.embeddingService = new EmbeddingService();
  }

  async storeMemory(type: string, content: string, metadata: Record<string, any> = {}): Promise<void> {
    const vector = await this.embeddingService.generateEmbedding(content);
    const vectorString = `[${vector.join(',')}]`;

    // We must use raw query for pgvector inserts
    await this.prisma.$executeRaw`
      INSERT INTO "MemoryRecord" ("id", "type", "content", "metadata", "createdAt", "vector")
      VALUES (gen_random_uuid()::text, ${type}, ${content}, ${metadata}::jsonb, NOW(), ${vectorString}::vector)
    `;
  }

  async searchMemory(query: string, limit: number = 5): Promise<any[]> {
    const vector = await this.embeddingService.generateEmbedding(query);
    const vectorString = `[${vector.join(',')}]`;

    // pgvector cosine distance `<=>` operator
    const results = await this.prisma.$queryRaw`
      SELECT id, type, content, metadata, 1 - (vector <=> ${vectorString}::vector) AS similarity
      FROM "MemoryRecord"
      ORDER BY vector <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

    return results as any[];
  }
}
