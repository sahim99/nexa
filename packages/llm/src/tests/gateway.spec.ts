import { describe, it, expect, beforeEach } from 'vitest';
import { LlmGateway } from '../gateway';
import { PromptCache } from '../cache/prompt.cache';
import { ProviderRegistry } from '../registry';
import { QuotaManager } from '../quota.manager';
import { LlmProvider, LlmRequest, LlmResponse, ProviderHealth, ProviderName, Quota, QuotaExceededError } from '../providers/base.provider';

class MockFailingProvider implements LlmProvider {
  readonly name: ProviderName;
  readonly models = {};
  readonly rateLimit = { requestsPerMinute: 10, requestsPerDay: 100 };
  readonly costPerMillionTokens = { input: 0, output: 0 };

  constructor(name: ProviderName) {
    this.name = name;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    throw new QuotaExceededError(this.name, 'Simulated quota exhaustion');
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getRemainingQuota(): Promise<Quota> {
    return { remainingMinute: 0, remainingDay: 0, isAvailable: false };
  }

  async getHealthStatus(): Promise<ProviderHealth> {
    return { name: this.name, status: 'DOWN', latencyMs: 0, checkedAt: new Date() };
  }
}

class MockSuccessProvider implements LlmProvider {
  readonly name: ProviderName;
  readonly models = {};
  readonly rateLimit = { requestsPerMinute: 10, requestsPerDay: 100 };
  readonly costPerMillionTokens = { input: 0, output: 0 };
  public callCount = 0;

  constructor(name: ProviderName, private responseText: string) {
    this.name = name;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    this.callCount++;
    return {
      content: this.responseText,
      provider: this.name,
      model: req.model || 'mock-model',
      taskType: req.taskType,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getRemainingQuota(): Promise<Quota> {
    return { remainingMinute: 10, remainingDay: 100, isAvailable: true };
  }

  async getHealthStatus(): Promise<ProviderHealth> {
    return { name: this.name, status: 'HEALTHY', latencyMs: 5, checkedAt: new Date() };
  }
}

describe('LlmGateway Detachable Architecture', () => {
  let registry: ProviderRegistry;
  let cache: PromptCache;
  let quotaManager: QuotaManager;
  let gateway: LlmGateway;

  beforeEach(() => {
    registry = new ProviderRegistry();
    cache = new PromptCache();
    quotaManager = new QuotaManager();
    gateway = new LlmGateway(registry, cache, quotaManager);
  });

  it('routes correctly according to provider map', () => {
    const route = gateway.route('COVER_LETTER');
    expect(route.length).toBeGreaterThanOrEqual(1);
    expect(route[0].provider).toBe('openrouter');
    expect(route.some((step) => step.provider === 'template')).toBe(true);

    const fast = gateway.route('FAST_CLASSIFICATION');
    expect(fast[0]).toEqual({ provider: 'groq', model: 'openai/gpt-oss-20b' });
    expect(fast.some((step) => step.provider === 'template')).toBe(true);

    const analysis = gateway.route('JD_ANALYSIS');
    expect(analysis[0].provider).toBe('openrouter');
    expect(analysis[1]).toEqual({ provider: 'groq', model: 'qwen/qwen3.8-27b' });
    expect(analysis.some((step) => step.provider === 'template')).toBe(true);
  });

  it('points Groq at current free-tier models and limits', async () => {
    const { GroqProvider } = await import('../providers/groq.provider');
    const { DEFAULT_PROVIDER_LIMITS } = await import('../quota.manager');
    const groq = new GroqProvider();
    const ids = Object.values(groq.models);
    expect(ids).not.toContain('llama-3.1-8b-instant');
    expect(ids).not.toContain('gemma2-9b-it');
    expect(groq.models.FAST_CLASSIFICATION).toBe('openai/gpt-oss-20b');
    expect(groq.models.JD_ANALYSIS).toBe('qwen/qwen3.8-27b');
    expect(groq.rateLimit).toEqual({ requestsPerMinute: 30, requestsPerDay: 1000 });
    expect(DEFAULT_PROVIDER_LIMITS.groq.requestsPerDay).toBe(1000);
  });

  it('cascades to fallback when primary throws QuotaExceededError', async () => {
    registry.register('openrouter', new MockFailingProvider('openrouter'));
    const successGroq = new MockSuccessProvider('groq', 'Tailored cover letter from Groq');
    registry.register('groq', successGroq);

    const res = await gateway.complete({
      taskType: 'JD_ANALYSIS',
      prompt: 'Analyze Senior Backend Engineer job description'
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe('groq');
    expect(res.content).toBe('Tailored cover letter from Groq');
  });

  it('falls back to deterministic template when ALL upstream providers fail', async () => {
    registry.register('openrouter', new MockFailingProvider('openrouter'));
    registry.register('groq', new MockFailingProvider('groq'));
    registry.register('ollama', new MockFailingProvider('ollama'));

    const res = await gateway.complete({
      taskType: 'COVER_LETTER',
      prompt: 'Write a cover letter for Stripe',
      variables: {
        company: 'Stripe',
        role: 'Staff Infrastructure Engineer',
        name: 'Alex Developer'
      }
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe('template');
    expect(res.content).toContain('Stripe');
    expect(res.content).toContain('Staff Infrastructure Engineer');
    expect(res.content).toContain('Alex Developer');
  });

  it('returns cached response on identical logical prompt with whitespace variation', async () => {
    const successProvider = new MockSuccessProvider('groq', 'Cached analysis content');
    registry.register('groq', successProvider);

    const prompt1 = 'Classify this email: Urgent interview request tomorrow';
    const prompt2 = '  Classify this email:   Urgent interview request tomorrow \n ';

    const res1 = await gateway.complete({
      taskType: 'FAST_CLASSIFICATION',
      prompt: prompt1
    });

    expect(successProvider.callCount).toBe(1);
    expect(res1.cached).toBeUndefined();

    const res2 = await gateway.complete({
      taskType: 'FAST_CLASSIFICATION',
      prompt: prompt2
    });

    expect(successProvider.callCount).toBe(1); // Provider NOT called again!
    expect(res2.cached).toBe(true);
    expect(res2.content).toBe('Cached analysis content');
  });

  it('tracks quota limits in QuotaManager', async () => {
    const qm = new QuotaManager({
      groq: { requestsPerMinute: 2, requestsPerDay: 10 }
    });

    expect(await qm.isWithinLimit('groq', 'minute')).toBe(true);
    await qm.recordUsage('groq');
    expect(await qm.isWithinLimit('groq', 'minute')).toBe(true);
    await qm.recordUsage('groq');
    expect(await qm.isWithinLimit('groq', 'minute')).toBe(false);

    const remaining = await qm.getRemaining('groq');
    expect(remaining.remainingMinute).toBe(0);
    expect(remaining.isAvailable).toBe(false);
  });
});
