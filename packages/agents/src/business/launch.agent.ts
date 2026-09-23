import { AgentCapability, AgentResult, AgentTask } from '@nexa/shared';
import { BaseAgent } from '@nexa/agent-runtime';
import { LlmGateway } from '@nexa/llm';
import { UntrustedWrapper } from '@nexa/security';
import { EventBus } from '@nexa/events';
import { DatabaseService } from '@nexa/database';

export interface LaunchAgentInput {
  idea: string;
  targetAudience?: string;
  businessPlan?: any;
  nodeId?: string;
}

export interface LaunchAgentOutput {
  landingPageHeadline: string;
  pitchDeckSummary: string;
  outreachCopy: string;
  approvalQueueId: string;
  queuedForApproval: boolean;
  publishedExternally: boolean;
  provider: string;
  model: string;
}

export class LaunchAgent extends BaseAgent {
  id = 'agent_launch';
  name = 'Launch Agent';
  version = '1.0.0';
  capabilities: AgentCapability[] = ['COMMUNICATION'];
  tools: string[] = [];
  permissions: string[] = ['COMMUNICATE'];

  inputSchema = {
    type: 'object',
    properties: {
      idea: { type: 'string' },
      targetAudience: { type: 'string' }
    },
    required: ['idea']
  };

  outputSchema = {
    type: 'object',
    properties: {
      landingPageHeadline: { type: 'string' },
      pitchDeckSummary: { type: 'string' },
      outreachCopy: { type: 'string' },
      approvalQueueId: { type: 'string' },
      queuedForApproval: { type: 'boolean' },
      publishedExternally: { type: 'boolean' }
    }
  };

  constructor(
    private readonly gateway: LlmGateway = new LlmGateway(),
    private readonly eventBus: EventBus = new EventBus(),
    private readonly db?: DatabaseService
  ) {
    super();
  }

  public async prepareLaunch(input: LaunchAgentInput): Promise<LaunchAgentOutput> {
    const safeIdea = UntrustedWrapper.wrapUntrusted(input.idea, 'launch_idea');

    const prompt = `Compose high-conversion launch assets for this new business:
Concept:
${safeIdea}
Target Audience: ${input.targetAudience || 'Modern tech teams & businesses'}

Format response as JSON:
"landingPageHeadline": string (bold, compelling hero headline + subheadline),
"pitchDeckSummary": string (concise elevator pitch, max 40 words),
"outreachCopy": string (cold email/DM copy for initial beta customers).`;

    const response = await this.gateway.complete({
      taskType: 'OUTREACH_EMAIL',
      prompt,
      variables: {
        company: input.idea,
        role: 'Founder',
        name: 'Early Adopter'
      }
    });

    let landingPageHeadline = 'Automate Your High-Leverage Workflows in Minutes, Not Months.';
    let pitchDeckSummary = `Nexa empowers teams to launch and scale autonomous agent teams with deterministic reliability and zero wasted spend.`;
    let outreachCopy = `Hi there,\n\nWe built a lightweight, algorithm-first engine designed to solve the exact bottlenecks your team faces daily. Would you be open to an exclusive 15-minute preview of our beta?\n\nBest,\nThe Founders`;

    try {
      const match = response.content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.landingPageHeadline) landingPageHeadline = String(parsed.landingPageHeadline);
        if (parsed.pitchDeckSummary) pitchDeckSummary = String(parsed.pitchDeckSummary);
        if (parsed.outreachCopy) outreachCopy = String(parsed.outreachCopy);
      }
    } catch {
      // Deterministic values preserved
    }

    const approvalQueueId = `apr_launch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // HARD SECURITY GATE: Zero external publishing!
    // All launch copy MUST be placed into the human approval queue.
    this.eventBus.emit({
      id: `evt_${Date.now()}`,
      eventType: 'approval.requested',
      timestamp: new Date(),
      source: 'agent_launch',
      payload: {
        approvalQueueId,
        nodeId: input.nodeId || 'node_business_launch',
        description: `External Launch Campaign: "${landingPageHeadline}"`,
        riskLevel: 'COMMUNICATE',
        status: 'PENDING',
        payload: {
          landingPageHeadline,
          pitchDeckSummary,
          outreachCopy
        }
      }
    });

    if (this.db?.prisma?.approvalRequest && input.nodeId) {
      try {
        await this.db.prisma.approvalRequest.create({
          data: {
            nodeId: input.nodeId,
            description: `Launch Campaign: ${landingPageHeadline}`,
            riskLevel: 'COMMUNICATE',
            status: 'PENDING'
          }
        });
      } catch {
        // Fallback for offline/test DB
      }
    }

    return {
      landingPageHeadline,
      pitchDeckSummary,
      outreachCopy,
      approvalQueueId,
      queuedForApproval: true,
      publishedExternally: false, // ALWAYS false until human approval
      provider: response.provider,
      model: response.model
    };
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const input = task.payload as LaunchAgentInput;
      const data = await this.prepareLaunch(input);
      return {
        taskId: task.id,
        success: true,
        data
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
