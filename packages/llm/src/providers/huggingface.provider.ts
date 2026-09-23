import { getSecret } from '@nexa/credentials';
import {
  LlmProvider,
  LlmRequest,
  LlmResponse,
  ProviderHealth,
  ProviderName,
  Quota,
  QuotaExceededError,
  TaskType
} from './base.provider';
import { IQuotaChecker } from './groq.provider';

export class HuggingFaceProvider implements LlmProvider {
  readonly name: ProviderName = 'huggingface';

  readonly models: Partial<Record<TaskType, string>> = {
    EMBEDDING: 'sentence-transformers/all-MiniLM-L6-v2'
  };

  readonly rateLimit = {
    requestsPerMinute: 20,
    requestsPerDay: 1000
  };

  readonly costPerMillionTokens = {
    input: 0,
    output: 0
  };

  private apiKey?: string;

  constructor(
    private readonly quotaChecker?: IQuotaChecker,
    apiKey?: string
  ) {
    if (apiKey) {
      this.apiKey = apiKey;
    } else {
      try {
        this.apiKey = getSecret('HF_API_KEY');
      } catch {
        this.apiKey = undefined;
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    if (this.quotaChecker) {
      const withinMin = await this.quotaChecker.isWithinLimit(this.name, 'minute');
      const withinDay = await this.quotaChecker.isWithinLimit(this.name, 'day');
      return withinMin && withinDay;
    }
    return true;
  }

  async getRemainingQuota(): Promise<Quota> {
    if (this.quotaChecker) {
      return this.quotaChecker.getRemaining(this.name);
    }
    return {
      remainingMinute: this.rateLimit.requestsPerMinute,
      remainingDay: this.rateLimit.requestsPerDay,
      isAvailable: !!this.apiKey
    };
  }

  async getHealthStatus(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        name: this.name,
        status: 'DOWN',
        latencyMs: 0,
        message: 'HF_API_KEY is not configured',
        checkedAt: new Date()
      };
    }

    const start = Date.now();
    try {
      const quota = await this.getRemainingQuota();
      return {
        name: this.name,
        status: quota.isAvailable ? 'HEALTHY' : 'DEGRADED',
        latencyMs: Date.now() - start,
        message: quota.isAvailable ? undefined : 'Quota reached',
        checkedAt: new Date()
      };
    } catch (err: any) {
      return {
        name: this.name,
        status: 'DOWN',
        latencyMs: Date.now() - start,
        message: err.message,
        checkedAt: new Date()
      };
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('[HuggingFace] HF_API_KEY is not set');
    }

    if (this.quotaChecker) {
      const withinMin = await this.quotaChecker.isWithinLimit(this.name, 'minute');
      const withinDay = await this.quotaChecker.isWithinLimit(this.name, 'day');
      if (!withinMin || !withinDay) {
        throw new QuotaExceededError(this.name, 'HuggingFace rate limit reached');
      }
    }

    const model = this.models.EMBEDDING || 'sentence-transformers/all-MiniLM-L6-v2';
    const url = `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      signal: AbortSignal.timeout(20000)
    });

    if (response.status === 429) {
      throw new QuotaExceededError(this.name, 'Hugging Face API 429 rate limit');
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Hugging Face API error ${response.status}: ${err}`);
    }

    if (this.quotaChecker) {
      await this.quotaChecker.recordUsage(this.name);
    }

    const data: any = await response.json();
    if (Array.isArray(data)) {
      if (Array.isArray(data[0])) {
        return data[0]; // mean pooled or first token
      }
      return data as number[];
    }

    throw new Error('Unexpected response format from Hugging Face embedding endpoint');
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    throw new Error('[HuggingFace] HF provider is configured for embedding backup only');
  }
}
