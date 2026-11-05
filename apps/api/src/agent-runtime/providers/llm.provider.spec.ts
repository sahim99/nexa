import { afterEach, describe, expect, it } from 'vitest';
import { LLMProvider } from './llm.provider.js';

describe('LLMProvider', () => {
  const previous = process.env.NEXA_FIXTURE_MODE;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NEXA_FIXTURE_MODE;
    } else {
      process.env.NEXA_FIXTURE_MODE = previous;
    }
  });

  it('returns the fixture payload and does not call the gateway', async () => {
    process.env.NEXA_FIXTURE_MODE = 'true';
    let called = false;
    const provider = new LLMProvider({
      complete: async () => {
        called = true;
        throw new Error('gateway should not be called');
      }
    } as any);

    const raw = await provider.generate('hello market');
    expect(called).toBe(false);
    expect(JSON.parse(raw).result).toContain('Simulated LLM response');
  });

  it('returns gateway JSON instead of a canned APPLY score', async () => {
    delete process.env.NEXA_FIXTURE_MODE;
    const provider = new LLMProvider({
      complete: async (req: { taskType: string }) => ({
        content: JSON.stringify({ decision: 'SKIP', score: 10 }),
        provider: 'groq',
        model: 'openai/gpt-oss-20b',
        taskType: req.taskType,
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
      })
    } as any);

    const raw = await provider.generate('Analyze the recent market trajectory of Acme');
    const parsed = JSON.parse(raw);
    expect(parsed.decision).toBe('SKIP');
    expect(parsed.score).toBe(10);
    expect(raw).not.toContain('"score":92');
  });
});
