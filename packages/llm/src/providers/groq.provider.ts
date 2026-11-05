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

  /**
   * Free-tier chat models as of 2026-11-05 (console.groq.com/docs/models and /rate-limits).
   * llama-3.1-8b-instant shut down 2026-08-16 (replacement: openai/gpt-oss-20b).
   * gemma2-9b-it shut down 2025-10-08.
   * qwen/qwen3.6-27b shut down 2026-09-14 (replacement: qwen/qwen3.8-27b).
   * Free-plan limits for these chat models: 30 RPM, 1,000 RPD, 8K TPM, 200K TPD.
   */
  readonly models: Partial<Record<TaskType, string>> = {
    FAST_CLASSIFICATION: 'openai/gpt-oss-20b',
    BRIEFING_SUMMARY: 'openai/gpt-oss-20b',
    OUTREACH_EMAIL: 'openai/gpt-oss-20b',
    GENERAL_CHAT: 'openai/gpt-oss-20b',
    COVER_LETTER: 'openai/gpt-oss-20b',
    JD_ANALYSIS: 'qwen/qwen3.8-27b',
    FUNCTION_CALLING: 'qwen/qwen3.8-27b',
    BUSINESS_REASONING: 'openai/gpt-oss-120b'
  };

  readonly rateLimit = {
    requestsPerMinute: 30,
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
        throw new QuotaExceededError(this.name, !withinMin ? 'Per-minute limit (30) reached' : 'Daily limit (1000) reached');
      }
    }

    const start = Date.now();
    const model = req.model || this.models[req.taskType] || 'openai/gpt-oss-20b';

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
