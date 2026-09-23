import * as crypto from 'crypto';
import { LlmResponse, TaskType } from '../providers/base.provider';

export interface CacheEntry {
  cacheKey: string;
  promptHash: string;
  taskType: TaskType;
  provider: string;
  model: string;
  response: string;
  usage?: any;
  expiresAt: Date;
  createdAt: Date;
}

export class PromptCache {
  private inMemoryCache = new Map<string, CacheEntry>();

  // TTL in milliseconds per task type
  private readonly ttlMap: Record<TaskType, number> = {
    FAST_CLASSIFICATION: 7 * 24 * 3600 * 1000, // 7 days
    JD_ANALYSIS: 7 * 24 * 3600 * 1000,         // 7 days
    BRIEFING_SUMMARY: 24 * 3600 * 1000,        // 1 day (24h)
    COVER_LETTER: 24 * 3600 * 1000,            // 24 hours
    OUTREACH_EMAIL: 24 * 3600 * 1000,          // 1 day
    BUSINESS_REASONING: 3 * 24 * 3600 * 1000,  // 3 days
    FUNCTION_CALLING: 3600 * 1000,             // 1 hour
    GENERAL_CHAT: 600 * 1000,                  // 10 minutes
    EMBEDDING: 30 * 24 * 3600 * 1000           // 30 days
  };

  public getTtl(taskType: TaskType): number {
    return this.ttlMap[taskType];
  }

  constructor(private readonly prismaClient?: any) {}

  public static normalizePrompt(prompt: string): string {
    return prompt.trim().replace(/\s+/g, ' ');
  }

  public static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  public static generateCacheKey(taskType: TaskType, prompt: string, model: string = 'default'): string {
    const normalized = PromptCache.normalizePrompt(prompt);
    const hash = PromptCache.hash(normalized);
    return `${taskType}:${model}:${hash}`;
  }

  async get(taskType: TaskType, prompt: string, model: string = 'default'): Promise<LlmResponse | null> {
    const key = PromptCache.generateCacheKey(taskType, prompt, model);
    const now = new Date();

    // Check DB first if prismaClient provided
    if (this.prismaClient?.llmCache) {
      try {
        const row = await this.prismaClient.llmCache.findUnique({
          where: { cacheKey: key }
        });
        if (row && new Date(row.expiresAt) > now) {
          return {
            content: row.response,
            provider: row.provider as any,
            model: row.model,
            taskType,
            usage: (row.usage as any) || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            cached: true,
            cost: 0,
            latencyMs: 0
          };
        }
      } catch {
        // Fall back to in-memory
      }
    }

    const memoryEntry = this.inMemoryCache.get(key);
    if (memoryEntry) {
      if (memoryEntry.expiresAt > now) {
        return {
          content: memoryEntry.response,
          provider: memoryEntry.provider as any,
          model: memoryEntry.model,
          taskType,
          usage: memoryEntry.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          cached: true,
          cost: 0,
          latencyMs: 0
        };
      } else {
        this.inMemoryCache.delete(key);
      }
    }

    return null;
  }

  async set(taskType: TaskType, prompt: string, response: LlmResponse, customTtlMs?: number, modelOverride?: string): Promise<void> {
    const modelToUse = modelOverride || response.model || 'default';
    const key = PromptCache.generateCacheKey(taskType, prompt, modelToUse);
    const normalized = PromptCache.normalizePrompt(prompt);
    const promptHash = PromptCache.hash(normalized);
    const ttl = customTtlMs ?? this.ttlMap[taskType] ?? (3600 * 1000);
    const expiresAt = new Date(Date.now() + ttl);

    const entry: CacheEntry = {
      cacheKey: key,
      promptHash,
      taskType,
      provider: response.provider,
      model: response.model,
      response: response.content,
      usage: response.usage,
      expiresAt,
      createdAt: new Date()
    };

    this.inMemoryCache.set(key, entry);

    if (this.prismaClient?.llmCache) {
      try {
        await this.prismaClient.llmCache.upsert({
          where: { cacheKey: key },
          update: {
            response: response.content,
            usage: response.usage,
            expiresAt
          },
          create: entry
        });
      } catch {
        // Silent catch for tests/offline DB
      }
    }
  }

  async pruneExpired(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [key, entry] of this.inMemoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.inMemoryCache.delete(key);
        count++;
      }
    }
    if (this.prismaClient?.llmCache) {
      try {
        const res = await this.prismaClient.llmCache.deleteMany({
          where: { expiresAt: { lte: now } }
        });
        count += res.count || 0;
      } catch {
        // Fallback
      }
    }
    return count;
  }

  public clear(): void {
    this.inMemoryCache.clear();
  }
}
