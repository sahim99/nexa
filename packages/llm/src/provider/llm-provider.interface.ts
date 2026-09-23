import { LLMRequest, LLMResponse } from '@nexa/shared';

export interface LLMProvider {
  /**
   * Complete a chat request.
   */
  chat(request: LLMRequest): Promise<LLMResponse>;
}
