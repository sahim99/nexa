import { LLMRequest, LLMResponse } from '@nexa/shared';
import { LLMProvider } from './llm-provider.interface';

export class OpenRouterProvider implements LLMProvider {
  constructor(private readonly apiKey: string) {}

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    // In a production app, we would use native fetch or a library like axios
    // For this implementation, we will mock the API call if apiKey is not provided
    // or if we're running tests.
    
    if (this.apiKey === 'mock-key' || !this.apiKey) {
      return this.mockChat(request);
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Nexa AI Workforce',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        model: data.model || request.model
      };
    } catch (error: any) {
      throw new Error(`Failed to call OpenRouter: ${error.message}`);
    }
  }
  
  private mockChat(request: LLMRequest): Promise<LLMResponse> {
    const isJsonRequested = request.messages.some(m => m.content.includes('json') || m.content.includes('JSON'));
    
    return Promise.resolve({
      content: isJsonRequested ? '{"mock": true}' : 'This is a mocked response from OpenRouter.',
      usage: {
        promptTokens: 10,
        completionTokens: 10,
        totalTokens: 20
      },
      model: request.model
    });
  }
}
