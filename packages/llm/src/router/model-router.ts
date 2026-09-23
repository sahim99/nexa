import { LLMRequest, LLMResponse } from '@nexa/shared';
import { LlmGateway } from '../gateway';

export type ModelTier = 'FAST' | 'REASONING' | 'EXTRACTION';

export class ModelRouter {
  private gateway: LlmGateway;

  constructor(provider?: any, customGateway?: LlmGateway) {
    this.gateway = customGateway || new LlmGateway();
  }

  /**
   * Routes a request through LlmGateway based on tier.
   */
  async route(tier: ModelTier, messages: any[], options?: any): Promise<LLMResponse> {
    const prompt = messages.map((m: any) => `${m.role || 'user'}: ${m.content || ''}`).join('\n');
    const taskType =
      tier === 'FAST'
        ? 'FAST_CLASSIFICATION'
        : tier === 'REASONING'
        ? 'BUSINESS_REASONING'
        : 'JD_ANALYSIS';

    const res = await this.gateway.complete({
      taskType: taskType as any,
      prompt,
      messages
    });

    return {
      content: res.content,
      model: res.model,
      usage: res.usage
    };
  }
}
