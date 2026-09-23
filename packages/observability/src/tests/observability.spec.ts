import { describe, it, expect } from 'vitest';
import { JsonLogger } from '../logger';
import { MetricsService } from '../metrics';

describe('Observability (Logger & Metrics)', () => {
  it('outputs valid JSON containing userId, agentName, taskId, ts', () => {
    let captured = '';
    const logger = new JsonLogger(
      { userId: 'user_123', agentName: 'JobHunterAgent', taskId: 'task_abc' },
      (line) => {
        captured = line;
      }
    );

    const entry = logger.info('Pipeline execution started', { extraField: 42 });

    expect(captured).not.toBe('');
    const parsed = JSON.parse(captured);

    expect(parsed.userId).toBe('user_123');
    expect(parsed.agentName).toBe('JobHunterAgent');
    expect(parsed.taskId).toBe('task_abc');
    expect(parsed.ts).toBeDefined();
    expect(parsed.msg).toBe('Pipeline execution started');
    expect(parsed.extraField).toBe(42);
    expect(entry.level).toBe('info');
  });

  it('accurately increments and retrieves metrics counters', () => {
    const metrics = new MetricsService();
    metrics.reset();

    expect(metrics.get('llmCalls')).toBe(0);
    metrics.increment('llmCalls');
    metrics.increment('llmCalls');
    expect(metrics.get('llmCalls')).toBe(2);

    metrics.increment('cacheHits', 5);
    expect(metrics.get('cacheHits')).toBe(5);

    const all = metrics.getAll();
    expect(all.llmCalls).toBe(2);
    expect(all.cacheHits).toBe(5);
  });
});
