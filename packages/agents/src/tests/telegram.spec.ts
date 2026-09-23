import { describe, it, expect } from 'vitest';
import { TelegramAgent } from '../communication/telegram.agent';
import { MetricsCollector } from '@nexa/observability';
import { UntrustedWrapper } from '@nexa/security';

describe('TelegramAgent (Keyword Intent Rules + Untrusted Wrap)', () => {
  it('resolves common commands via keyword rules with zero LLM calls', async () => {
    const metrics = MetricsCollector.getInstance();
    const initialLlmCalls = metrics.getCounter('llmCalls');
    const agent = new TelegramAgent();

    // 1. "run scan"
    const resScan = await agent.handleMessage({ message: 'run scan' });
    expect(resScan.resolvedByAlgorithm).toBe(true);
    expect(resScan.intent).toBe('TRIGGER_JOB_SCAN');

    // 2. "show jobs"
    const resJobs = await agent.handleMessage({ message: 'show jobs' });
    expect(resJobs.resolvedByAlgorithm).toBe(true);
    expect(resJobs.intent).toBe('LIST_JOBS');

    // 3. "status"
    const resStatus = await agent.handleMessage({ message: 'status' });
    expect(resStatus.resolvedByAlgorithm).toBe(true);
    expect(resStatus.intent).toBe('SYSTEM_STATUS');

    // 4. "pending approvals"
    const resApprovals = await agent.handleMessage({ message: 'pending approvals' });
    expect(resApprovals.resolvedByAlgorithm).toBe(true);
    expect(resApprovals.intent).toBe('LIST_APPROVALS');

    // Assert ZERO LLM calls were made for all 4 commands!
    expect(metrics.getCounter('llmCalls')).toBe(initialLlmCalls);
  });

  it('wraps messages in <untrusted> tags and handles conversational queries', async () => {
    const agent = new TelegramAgent();
    const res = await agent.handleMessage({ message: 'Can you help me understand what my top skill match is?' });

    expect(res.response).toBeDefined();
    expect(res.response.length).toBeGreaterThan(10);
    expect(res.resolvedByAlgorithm).toBe(false);
    expect(res.intent).toBe('GENERAL_CHAT');
  });
});
