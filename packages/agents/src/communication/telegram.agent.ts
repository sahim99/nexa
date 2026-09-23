import { AgentCapability, AgentResult, AgentTask } from '@nexa/shared';
import { BaseAgent } from '@nexa/agent-runtime';
import { LlmGateway } from '@nexa/llm';
import { UntrustedWrapper } from '@nexa/security';
import { MetricsCollector } from '@nexa/observability';

export interface TelegramMessageInput {
  message: string;
  chatId?: string;
  userId?: string;
}

export interface TelegramMessageOutput {
  response: string;
  intent: string;
  resolvedByAlgorithm: boolean;
}

export class TelegramAgent extends BaseAgent {
  id = 'agent_telegram';
  name = 'Telegram Communication Agent';
  version = '1.0.0';
  capabilities: AgentCapability[] = ['COMMUNICATION'];
  tools: string[] = [];
  permissions: string[] = ['COMMUNICATE'];

  inputSchema = {
    type: 'object',
    properties: {
      message: { type: 'string' },
      chatId: { type: 'string' }
    },
    required: ['message']
  };

  outputSchema = {
    type: 'object',
    properties: {
      response: { type: 'string' },
      intent: { type: 'string' },
      resolvedByAlgorithm: { type: 'boolean' }
    }
  };

  constructor(
    private readonly gateway: LlmGateway = new LlmGateway(),
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {
    super();
  }

  /**
   * Processes an incoming message from Telegram:
   * 1. Wraps text in <untrusted> boundary tags.
   * 2. Evaluates fast keyword rules before LLM (zero LLM for common commands).
   * 3. Falls back to LLM only for unstructured custom queries.
   */
  async handleMessage(input: TelegramMessageInput): Promise<TelegramMessageOutput> {
    const rawText = input.message || '';
    const safeText = UntrustedWrapper.wrapUntrusted(rawText, 'telegram_message');
    UntrustedWrapper.assertNoRawExternal(safeText, true);

    const normalized = rawText.toLowerCase().trim();

    // Fast keyword intent rules (Zero LLM, <1ms)
    if (
      normalized === 'run scan' ||
      normalized === 'start scan' ||
      normalized.includes('scan jobs')
    ) {
      this.metrics.incrementCounter('algorithmDecisions');
      return {
        response: 'Job collection scan initiated. Check back in ~60 seconds for matched opportunities.',
        intent: 'TRIGGER_JOB_SCAN',
        resolvedByAlgorithm: true
      };
    }

    if (
      normalized === 'show jobs' ||
      normalized === 'list jobs' ||
      normalized === 'my jobs'
    ) {
      this.metrics.incrementCounter('algorithmDecisions');
      return {
        response: 'Fetching your top scoring job matches from the database...',
        intent: 'LIST_JOBS',
        resolvedByAlgorithm: true
      };
    }

    if (
      normalized === 'status' ||
      normalized === 'health' ||
      normalized === 'system status'
    ) {
      this.metrics.incrementCounter('algorithmDecisions');
      return {
        response: 'All Nexa autonomous subsystems operational. Memory and quota caches active.',
        intent: 'SYSTEM_STATUS',
        resolvedByAlgorithm: true
      };
    }

    if (
      normalized.includes('approval') ||
      normalized === 'pending'
    ) {
      this.metrics.incrementCounter('algorithmDecisions');
      return {
        response: 'Listing pending approval requests awaiting your review.',
        intent: 'LIST_APPROVALS',
        resolvedByAlgorithm: true
      };
    }

    // Complex/custom conversation: route via LlmGateway
    const prompt = `You are Nexa Telegram Assistant. Answer the user's message concisely:\n${safeText}`;
    const llmRes = await this.gateway.complete({
      taskType: 'GENERAL_CHAT',
      prompt
    });

    return {
      response: llmRes.content,
      intent: 'GENERAL_CHAT',
      resolvedByAlgorithm: false
    };
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const input = task.payload as TelegramMessageInput;
      const result = await this.handleMessage(input);

      return {
        taskId: task.id,
        success: true,
        data: result
      };
    } catch (err: any) {
      return {
        taskId: task.id,
        success: false,
        error: err.message
      };
    }
  }
}
