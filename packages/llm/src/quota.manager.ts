import { ProviderName, Quota } from './providers/base.provider';
import { IQuotaChecker } from './providers/groq.provider';

export interface ProviderLimits {
  requestsPerMinute: number;
  requestsPerDay: number;
}

export const DEFAULT_PROVIDER_LIMITS: Record<ProviderName, ProviderLimits> = {
  groq: { requestsPerMinute: 30, requestsPerDay: 6000 },
  openrouter: { requestsPerMinute: 60, requestsPerDay: 2000 },
  huggingface: { requestsPerMinute: 20, requestsPerDay: 1000 },
  ollama: { requestsPerMinute: 0, requestsPerDay: 0 },
  template: { requestsPerMinute: 0, requestsPerDay: 0 }
};

export class QuotaManager implements IQuotaChecker {
  private limits: Record<ProviderName, ProviderLimits>;
  
  // In-memory buckets for zero-dependency reliability:
  // Key format: `${provider}:${userId}:${window}:${bucketKey}`
  private counts = new Map<string, number>();

  constructor(
    customLimits?: Partial<Record<ProviderName, ProviderLimits>>,
    private readonly redisClient?: any // optional Redis client
  ) {
    this.limits = {
      ...DEFAULT_PROVIDER_LIMITS,
      ...(customLimits || {})
    };
  }

  private getBucketKeys(provider: ProviderName, userId: string = 'global'): { minuteKey: string; dayKey: string } {
    const now = new Date();
    const minuteBucket = `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}_${now.getUTCHours()}_${now.getUTCMinutes()}`;
    const dayBucket = `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}`;

    return {
      minuteKey: `quota:${provider}:${userId}:min:${minuteBucket}`,
      dayKey: `quota:${provider}:${userId}:day:${dayBucket}`
    };
  }

  async isWithinLimit(provider: ProviderName, window: 'minute' | 'day', userId: string = 'global'): Promise<boolean> {
    const limitCfg = this.limits[provider];
    if (!limitCfg) return true;

    const max = window === 'minute' ? limitCfg.requestsPerMinute : limitCfg.requestsPerDay;
    if (max === 0) return true; // 0 = unlimited

    const { minuteKey, dayKey } = this.getBucketKeys(provider, userId);
    const key = window === 'minute' ? minuteKey : dayKey;

    if (this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        const count = val ? parseInt(val, 10) : 0;
        return count < max;
      } catch {
        // Fallback to memory
      }
    }

    const currentCount = this.counts.get(key) || 0;
    return currentCount < max;
  }

  async recordUsage(provider: ProviderName, userId: string = 'global'): Promise<void> {
    const { minuteKey, dayKey } = this.getBucketKeys(provider, userId);

    if (this.redisClient) {
      try {
        const pipe = this.redisClient.pipeline();
        pipe.incr(minuteKey);
        pipe.expire(minuteKey, 65); // 65 seconds TTL
        pipe.incr(dayKey);
        pipe.expire(dayKey, 86400 * 2); // 2 days TTL
        await pipe.exec();
        return;
      } catch {
        // Fallback to memory
      }
    }

    this.counts.set(minuteKey, (this.counts.get(minuteKey) || 0) + 1);
    this.counts.set(dayKey, (this.counts.get(dayKey) || 0) + 1);

    // Clean up old memory keys periodically if map grows large
    if (this.counts.size > 2000) {
      this.counts.clear();
    }
  }

  async getRemaining(provider: ProviderName, userId: string = 'global'): Promise<Quota> {
    const limitCfg = this.limits[provider];
    if (!limitCfg) {
      return { remainingMinute: 999999, remainingDay: 999999, isAvailable: true };
    }

    if (limitCfg.requestsPerMinute === 0 && limitCfg.requestsPerDay === 0) {
      return { remainingMinute: 999999, remainingDay: 999999, isAvailable: true };
    }

    const { minuteKey, dayKey } = this.getBucketKeys(provider, userId);

    let minCount = 0;
    let dayCount = 0;

    if (this.redisClient) {
      try {
        const [mVal, dVal] = await Promise.all([
          this.redisClient.get(minuteKey),
          this.redisClient.get(dayKey)
        ]);
        minCount = mVal ? parseInt(mVal, 10) : 0;
        dayCount = dVal ? parseInt(dVal, 10) : 0;
      } catch {
        minCount = this.counts.get(minuteKey) || 0;
        dayCount = this.counts.get(dayKey) || 0;
      }
    } else {
      minCount = this.counts.get(minuteKey) || 0;
      dayCount = this.counts.get(dayKey) || 0;
    }

    const remainingMinute = Math.max(0, limitCfg.requestsPerMinute - minCount);
    const remainingDay = Math.max(0, limitCfg.requestsPerDay - dayCount);

    return {
      remainingMinute,
      remainingDay,
      isAvailable: remainingMinute > 0 && remainingDay > 0
    };
  }

  public reset(): void {
    this.counts.clear();
  }
}
