import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private db: DatabaseService) {}

  async storeEmbedding(type: string, content: string, metadata: any, embedding: number[]) {
    this.logger.log(`Storing embedding for type: ${type}`);
    
    // In Prisma, pgvector requires raw SQL for the vector operations
    const vectorStr = `[${embedding.join(',')}]`;
    
    await this.db.prisma.$executeRawUnsafe(
      `INSERT INTO "MemoryRecord" ("id", "type", "content", "metadata", "vector")
       VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4::vector)`,
      type,
      content,
      JSON.stringify(metadata),
      vectorStr
    );
  }

  async searchSimilar(embedding: number[], limit: number = 5) {
    const vectorStr = `[${embedding.join(',')}]`;
    
    // Using L2 distance operator <-> for pgvector
    const results = await this.db.prisma.$queryRawUnsafe(`
      SELECT id, type, content, metadata, 1 - (vector <-> $1::vector) as similarity
      FROM "MemoryRecord"
      ORDER BY vector <-> $1::vector
      LIMIT $2
    `, vectorStr, limit);

    return results;
  }
}
