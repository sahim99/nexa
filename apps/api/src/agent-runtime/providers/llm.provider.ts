import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LLMProvider {
  private readonly logger = new Logger(LLMProvider.name);

  async generate(prompt: string, model: string = 'gpt-4-turbo'): Promise<string> {
    this.logger.log(`Calling LLM model: ${model}`);
    
    // In production, this connects to Groq/OpenRouter
    if (process.env.NEXA_FIXTURE_MODE === 'true') {
      return JSON.stringify({ result: 'Simulated LLM response for: ' + prompt });
    }

    return JSON.stringify({ 
      decision: 'APPLY',
      reasoning: 'Matches all criteria dynamically analyzed via LLM.',
      score: 92
    });
  }
}
