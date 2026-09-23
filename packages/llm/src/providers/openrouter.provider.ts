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

export class OpenRouterProvider implements LlmProvider {
  readonly name: ProviderName = 'openrouter';

  readonly models: Partial<Record<TaskType, string>> = {
    JD_ANALYSIS: 'qwen/qwen-2.5-72b-instruct:free',
    COVER_LETTER: 'meta-llama/llama-3.1-70b-instruct:free',
    BUSINESS_REASONING: 'deepseek/deepseek-r1:free',
    OUTREACH_EMAIL: 'mistralai/mistral-7b-instruct:free',
    FAST_CLASSIFICATION: 'meta-llama/llama-3.1-8b-instruct:free',
    GENERAL_CHAT: 'meta-llama/llama-3.1-8b-instruct:free',
    FUNCTION_CALLING: 'qwen/qwen-2.5-72b-instruct:free',
    BRIEFING_SUMMARY: 'meta-llama/llama-3.1-8b-instruct:free'
  };

  readonly rateLimit = {
    requestsPerMinute: 60,
    requestsPerDay: 2000
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
        this.apiKey = getSecret('OPENROUTER_API_KEY');
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
        message: 'OPENROUTER_API_KEY is not configured',
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

  async complete(req: LlmRequest): Promise<LlmResponse> {
    if (!this.apiKey) {
      throw new Error('[OpenRouter] OPENROUTER_API_KEY is not set');
    }

    if (this.quotaChecker) {
      const withinMin = await this.quotaChecker.isWithinLimit(this.name, 'minute', req.userId);
      const withinDay = await this.quotaChecker.isWithinLimit(this.name, 'day', req.userId);
      if (!withinMin || !withinDay) {
        throw new QuotaExceededError(this.name, 'OpenRouter rate limit window reached');
      }
    }

    const start = Date.now();
    const model = req.model || this.models[req.taskType] || 'meta-llama/llama-3.1-8b-instruct:free';

    let messages = req.messages;
    if (!messages && req.prompt) {
      messages = [{ role: 'user', content: req.prompt }];
    } else if (!messages) {
      messages = [{ role: 'user', content: '' }];
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://nexa.local',
          'X-Title': 'Nexa AI Platform',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 1024,
          stop: req.stop
        }),
        signal: AbortSignal.timeout(35000)
      });

      if (response.status === 429) {
        throw new QuotaExceededError(this.name, 'Upstream OpenRouter 429 rate limit exceeded');
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
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
      throw new Error(`[OpenRouter] Complete failed: ${err.message}`);
    }
  }
}
