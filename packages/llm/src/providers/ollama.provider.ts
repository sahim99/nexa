import {
  LlmProvider,
  LlmRequest,
  LlmResponse,
  ProviderHealth,
  ProviderName,
  Quota,
  TaskType
} from './base.provider';

export class OllamaProvider implements LlmProvider {
  readonly name: ProviderName = 'ollama';

  readonly models: Partial<Record<TaskType, string>> = {
    FUNCTION_CALLING: 'qwen2.5:7b',
    BUSINESS_REASONING: 'llama3.1:8b',
    GENERAL_CHAT: 'llama3.1:8b',
    COVER_LETTER: 'llama3.1:8b',
    FAST_CLASSIFICATION: 'qwen2.5:7b',
    JD_ANALYSIS: 'qwen2.5:7b',
    OUTREACH_EMAIL: 'llama3.1:8b',
    BRIEFING_SUMMARY: 'llama3.1:8b',
    EMBEDDING: 'nomic-embed-text'
  };

  readonly rateLimit = {
    requestsPerMinute: 0, // 0 = unlimited
    requestsPerDay: 0
  };

  readonly costPerMillionTokens = {
    input: 0,
    output: 0
  };

  constructor(private readonly baseUrl: string = 'http://127.0.0.1:11434') {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getRemainingQuota(): Promise<Quota> {
    const available = await this.isAvailable();
    return {
      remainingMinute: available ? 999999 : 0,
      remainingDay: available ? 999999 : 0,
      isAvailable: available
    };
  }

  async getHealthStatus(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return {
          name: this.name,
          status: 'HEALTHY',
          latencyMs,
          checkedAt: new Date()
        };
      }
      return {
        name: this.name,
        status: 'DEGRADED',
        latencyMs,
        message: `HTTP ${res.status}`,
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
    const start = Date.now();
    const model = req.model || this.models[req.taskType] || 'llama3.1:8b';

    let prompt = req.prompt;
    let messages = req.messages;

    if (!messages && prompt) {
      messages = [{ role: 'user', content: prompt }];
    } else if (!messages) {
      messages = [{ role: 'user', content: '' }];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: req.temperature ?? 0.7,
            num_predict: req.maxTokens ?? 1024,
            stop: req.stop
          }
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const latencyMs = Date.now() - start;

      return {
        content: data.message?.content || '',
        provider: this.name,
        model,
        taskType: req.taskType,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        cost: 0,
        latencyMs
      };
    } catch (error: any) {
      throw new Error(`[Ollama] Chat failed: ${error.message}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    const model = this.models.EMBEDDING || 'nomic-embed-text';
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Ollama embed error: ${response.status}`);
      }

      const data: any = await response.json();
      return data.embedding || [];
    } catch (error: any) {
      throw new Error(`[Ollama] Embedding failed: ${error.message}`);
    }
  }
}
