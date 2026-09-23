import { AgentCapability, AgentResult, AgentTask } from '@nexa/shared';
import { BaseAgent } from '@nexa/agent-runtime';
import { LlmGateway } from '@nexa/llm';
import { UntrustedWrapper } from '@nexa/security';

export interface UserStory {
  id: string;
  asA: string;
  iWant: string;
  soThat: string;
}

export interface ProductManagerInput {
  idea: string;
  targetAudience?: string;
  marketResearch?: any;
}

export interface ProductManagerOutput {
  prdTitle: string;
  overview: string;
  targetPersonas: string[];
  userStories: UserStory[];
  mvpFeatures: string[];
  provider: string;
  model: string;
}

export class ProductManagerAgent extends BaseAgent {
  id = 'agent_product_manager';
  name = 'Product Manager Agent';
  version = '1.0.0';
  capabilities: AgentCapability[] = ['MANAGEMENT'];
  tools: string[] = [];
  permissions: string[] = ['WRITE_DATA'];

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
      prdTitle: { type: 'string' },
      overview: { type: 'string' },
      targetPersonas: { type: 'array', items: { type: 'string' } },
      userStories: { type: 'array' },
      mvpFeatures: { type: 'array', items: { type: 'string' } }
    }
  };

  constructor(private readonly gateway: LlmGateway = new LlmGateway()) {
    super();
  }

  public async generatePRD(input: ProductManagerInput): Promise<ProductManagerOutput> {
    const safeIdea = UntrustedWrapper.wrapUntrusted(input.idea, 'product_idea');

    const prompt = `Generate a Product Requirements Document (PRD) for this venture:
Product Concept:
${safeIdea}
Target Audience: ${input.targetAudience || 'Modern professionals and scaling organizations'}

Format your response as a JSON object with:
"prdTitle": string,
"overview": string,
"targetPersonas": array of strings,
"userStories": array of objects with keys { "id", "asA", "iWant", "soThat" },
"mvpFeatures": array of strings.`;

    const response = await this.gateway.complete({
      taskType: 'BUSINESS_REASONING',
      prompt,
      variables: {
        idea: input.idea,
        targetAudience: input.targetAudience || 'entrepreneurs'
      }
    });

    let prdTitle = `PRD: ${input.idea.slice(0, 40)}`;
    let overview = `Autonomous product architecture delivering streamlined value for ${input.idea}.`;
    let targetPersonas = ['Solo Founder', 'Engineering Leader', 'Operations Director'];
    let userStories: UserStory[] = [
      {
        id: 'US-01',
        asA: 'User',
        iWant: 'to input high-level requirements',
        soThat: 'the system handles automated execution without manual oversight'
      },
      {
        id: 'US-02',
        asA: 'Manager',
        iWant: 'approval controls before critical external actions',
        soThat: 'I maintain full governance and auditability'
      },
      {
        id: 'US-03',
        asA: 'Operator',
        iWant: 'real-time progress metrics and outcome tracking',
        soThat: 'I can monitor growth and efficiency'
      }
    ];
    let mvpFeatures = [
      'Self-service onboarding & configuration wizard',
      'Automated background scheduler with distributed locks',
      'Real-time human approval queue with notification hooks',
      'Unified analytics dashboard with LLM usage monitoring'
    ];

    try {
      const match = response.content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.prdTitle) prdTitle = String(parsed.prdTitle);
        if (parsed.overview) overview = String(parsed.overview);
        if (Array.isArray(parsed.targetPersonas) && parsed.targetPersonas.length > 0) {
          targetPersonas = parsed.targetPersonas.map(String);
        }
        if (Array.isArray(parsed.userStories) && parsed.userStories.length > 0) {
          userStories = parsed.userStories.map((s: any, idx: number) => ({
            id: s.id || `US-${idx + 1}`,
            asA: s.asA || 'User',
            iWant: s.iWant || 'to use the feature',
            soThat: s.soThat || 'I achieve business goals'
          }));
        }
        if (Array.isArray(parsed.mvpFeatures) && parsed.mvpFeatures.length > 0) {
          mvpFeatures = parsed.mvpFeatures.map(String);
        }
      }
    } catch {
      // Use standard deterministic PRD structure
    }

    return {
      prdTitle,
      overview,
      targetPersonas,
      userStories,
      mvpFeatures,
      provider: response.provider,
      model: response.model
    };
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const input = task.payload as ProductManagerInput;
      const data = await this.generatePRD(input);
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
