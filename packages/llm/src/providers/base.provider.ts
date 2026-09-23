export type TaskType =
  | 'FAST_CLASSIFICATION'
  | 'JD_ANALYSIS'
  | 'COVER_LETTER'
  | 'OUTREACH_EMAIL'
  | 'BRIEFING_SUMMARY'
  | 'BUSINESS_REASONING'
  | 'FUNCTION_CALLING'
  | 'EMBEDDING'
  | 'GENERAL_CHAT';

export type ProviderName = 'ollama' | 'groq' | 'openrouter' | 'huggingface' | 'template';

export interface Quota {
  remainingMinute: number;
  remainingDay: number;
  resetMinuteAt?: Date;
  resetDayAt?: Date;
  isAvailable: boolean;
}

export interface ProviderHealth {
  name: ProviderName;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  message?: string;
  checkedAt: Date;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  taskType: TaskType;
  prompt?: string;
  messages?: LlmMessage[];
  model?: string;
  variables?: Record<string, string>;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  stop?: string[];
}

export interface LlmResponse {
  content: string;
  provider: ProviderName;
  model: string;
  taskType: TaskType;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cached?: boolean;
  cost?: number;
  latencyMs?: number;
}

export class QuotaExceededError extends Error {
  constructor(public readonly provider: ProviderName, message: string) {
    super(`[${provider}] Quota exceeded: ${message}`);
    this.name = 'QuotaExceededError';
  }
}

export interface LlmProvider {
  readonly name: ProviderName;
  readonly models: Partial<Record<TaskType, string>>;
  readonly rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  readonly costPerMillionTokens: {
    input: number;
    output: number;
  };

  complete(req: LlmRequest): Promise<LlmResponse>;
  embed?(text: string): Promise<number[]>;
  isAvailable(): Promise<boolean>;
  getRemainingQuota(): Promise<Quota>;
  getHealthStatus(): Promise<ProviderHealth>;
}
