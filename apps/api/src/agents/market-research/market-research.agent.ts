import { Injectable } from '@nestjs/common';
import { LLMProvider } from '../../agent-runtime/providers/llm.provider.js';

@Injectable()
export class MarketResearchAgent {
  constructor(private llm: LLMProvider) {}

  async evaluateCompany(companyName: string): Promise<any> {
    const prompt = `Analyze the recent market trajectory of ${companyName}. Determine if they are in growth, stable, or layoff mode based on recent news.`;
    
    const response = await this.llm.generate(prompt, 'groq-llama3-70b');
    return JSON.parse(response);
  }
}
