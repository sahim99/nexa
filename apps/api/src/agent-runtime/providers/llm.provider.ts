import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { LlmGateway, type TaskType } from '@nexa/llm';

const RETIRED_MODEL_IDS = new Set([
  'gpt-4-turbo',
  'groq-llama3-70b',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'gemma2-9b-it',
]);

/**
 * Nest adapter over @nexa/llm LlmGateway.
 * Fixture mode (NEXA_FIXTURE_MODE=true) returns a deterministic string and does not call providers.
 * Otherwise the request goes through the configured Groq → OpenRouter → template cascade.
 */
@Injectable()
export class LLMProvider {
  private readonly logger = new Logger(LLMProvider.name);
  private readonly gateway: LlmGateway;

  constructor(@Optional() @Inject(LlmGateway) gateway?: LlmGateway) {
    this.gateway = gateway ?? new LlmGateway();
  }

  async generate(prompt: string, model: string = 'openai/gpt-oss-20b'): Promise<string> {
    if (process.env.NEXA_FIXTURE_MODE === 'true') {
      this.logger.log('Fixture mode: returning simulated LLM response');
      return JSON.stringify({ result: 'Simulated LLM response for: ' + prompt });
    }

    const taskType = inferTaskType(prompt);
    const explicitModel = resolveExplicitModel(model);
    this.logger.log(`Routing ${taskType} through LlmGateway`);

    const res = await this.gateway.complete({
      taskType,
      prompt,
      ...(explicitModel ? { model: explicitModel } : {}),
    });

    this.logger.log(`LlmGateway answered via ${res.provider}/${res.model}`);
    return asJsonString(res.content, res.provider, res.model);
  }
}

function inferTaskType(prompt: string): TaskType {
  const text = prompt.toLowerCase();
  if (text.includes('cover letter')) return 'COVER_LETTER';
  if (text.includes('outreach') || text.includes('cold email')) return 'OUTREACH_EMAIL';
  if (text.includes('market') || text.includes('business') || text.includes('competitor')) {
    return 'BUSINESS_REASONING';
  }
  if (text.includes('classif')) return 'FAST_CLASSIFICATION';
  if (text.includes('job description') || text.includes('job fit')) return 'JD_ANALYSIS';
  return 'GENERAL_CHAT';
}

/** Pass through only model ids the gateway can send. Retired aliases are left unset so YAML routing wins. */
function resolveExplicitModel(model?: string): string | undefined {
  if (!model || RETIRED_MODEL_IDS.has(model)) return undefined;
  if (
    model.includes('/') ||
    model.startsWith('llama') ||
    model.startsWith('openai') ||
    model.startsWith('qwen') ||
    model.startsWith('meta-llama')
  ) {
    return model;
  }
  return undefined;
}

function asJsonString(content: string, provider: string, model: string): string {
  const trimmed = (content || '').trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }
  return JSON.stringify({ provider, model, content: trimmed });
}
