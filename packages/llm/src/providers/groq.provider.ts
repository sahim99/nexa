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

export interface IQuotaChecker {
  isWithinLimit(provider: ProviderName, window: 'minute' | 'day', userId?: string): Promise<boolean>;
  recordUsage(provider: ProviderName, userId?: string): Promise<void>;
  getRemaining(provider: ProviderName, userId?: string): Promise<Quota>;
}

export class GroqProvider implements LlmProvider {
  readonly name: ProviderName = 'groq';

  readonly models: Partial<Record<TaskType, string>> = {
    FAST_CLASSIFICATION: 'llama-3.1-8b-instant',
    BRIEFING_SUMMARY: 'llama-3.1-8b-instant',
    OUTREACH_EMAIL: 'gemma2-9b-it',
    JD_ANALYSIS: 'gemma2-9b-it',
    FUNCTION_CALLING: 'llama-3.1-8b-instant',
    GENERAL_CHAT: 'llama-3.1-8b-instant',
    COVER_LETTER: 'llama-3.1-8b-instant',
    BUSINESS_REASONING: 'llama-3.1-8b-instant'
  };

  readonly rateLimit = {
    requestsPerMinute: 30,
    requestsPerDay: 6000
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
        this.apiKey = getSecret('GROQ_API_KEY');
      } catch {
        this.apiKey = undefined;
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
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
        message: 'GROQ_API_KEY is not configured',
        checkedAt: new Date()
      };
    }

    const start = Date.now();
    try {
      const quota = await this.getRemainingQuota();
      if (!quota.isAvailable) {
        return {
          name: this.name,
          status: 'DEGRADED',
          latencyMs: Date.now() - start,
          message: 'Quota exhausted',
          checkedAt: new Date()
        };
      }

      return {
        name: this.name,
        status: 'HEALTHY',
        latencyMs: Date.now() - start,
        checkedAt: new Date()
      };
    } catch (err: any) {
      return {
        name: this.name,
        status: 'DEGRADED',
        latencyMs: Date.now() - start,
        message: err.message,
        checkedAt: new Date()
      };
    }
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    if (!this.apiKey) {
      throw new Error('[Groq] GROQ_API_KEY is not set');
    }

    if (this.quotaChecker) {
      const withinMin = await this.quotaChecker.isWithinLimit(this.name, 'minute', req.userId);
      const withinDay = await this.quotaChecker.isWithinLimit(this.name, 'day', req.userId);
      if (!withinMin || !withinDay) {
        throw new QuotaExceededError(this.name, !withinMin ? 'Per-minute limit (30) reached' : 'Daily limit (6000) reached');
      }
    }

    const start = Date.now();
    const model = req.model || this.models[req.taskType] || 'llama-3.1-8b-instant';

    let messages = req.messages;
    if (!messages && req.prompt) {
      messages = [{ role: 'user', content: req.prompt }];
    } else if (!messages) {
      messages = [{ role: 'user', content: '' }];
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 1024,
          stop: req.stop
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (response.status === 429) {
        throw new QuotaExceededError(this.name, 'Upstream Groq 429 rate limit exceeded');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errorText}`);
      }

      const data: any = await response.json();
      const latencyMs = Date.now() - start;

      if (this.quotaChecker) {
        await this.quotaChecker.recordUsage(this.name, req.userId);
      }

      return {
        content: data.choices?.[0]?.message?.content || '',
        provider: this.name,
        model: data.model || model,
        taskType: req.taskType,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        cost: 0,
        latencyMs
      };
    } catch (err: any) {
      if (err instanceof QuotaExceededError) throw err;
      throw new Error(`[Groq] Complete failed: ${err.message}`);
    }
  }
}
