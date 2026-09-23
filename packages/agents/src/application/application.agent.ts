import { AgentCapability, AgentResult, AgentTask } from '@nexa/shared';
import { BaseAgent } from '@nexa/agent-runtime';
import { LlmGateway } from '@nexa/llm';
import { UntrustedWrapper } from '@nexa/security';

export interface ApplicationAgentInput {
  candidateName: string;
  candidateSkills: string[];
  jobTitle: string;
  companyName: string;
  rawJobDescription?: string;
  candidateBio?: string;
}

export interface ApplicationAgentOutput {
  coverLetter: string;
  provider: string;
  model: string;
  cached: boolean;
  cost: number;
}

export class ApplicationAgent extends BaseAgent {
  id = 'agent_application';
  name = 'Application Agent';
  version = '1.0.0';
  capabilities: AgentCapability[] = ['MANAGEMENT'];
  tools: string[] = [];
  permissions: string[] = ['COMMUNICATE'];

  inputSchema = {
    type: 'object',
    properties: {
      candidateName: { type: 'string' },
      candidateSkills: { type: 'array', items: { type: 'string' } },
      jobTitle: { type: 'string' },
      companyName: { type: 'string' },
      rawJobDescription: { type: 'string' }
    },
    required: ['candidateName', 'jobTitle', 'companyName']
  };

  outputSchema = {
    type: 'object',
    properties: {
      coverLetter: { type: 'string' },
      provider: { type: 'string' }
    }
  };

  constructor(private readonly gateway: LlmGateway = new LlmGateway()) {
    super();
  }

  /**
   * Generates a tailored cover letter using LlmGateway.route('COVER_LETTER').
   * Enforces <untrusted> wrapping on raw job descriptions.
   * Asserts assertNoRawExternal passes before sending to LLM.
   */
  async generateCoverLetter(input: ApplicationAgentInput): Promise<ApplicationAgentOutput> {
    let safeDescription = '';
    if (input.rawJobDescription) {
      // 1. Wrap untrusted external content
      safeDescription = UntrustedWrapper.wrapUntrusted(input.rawJobDescription, 'job_description');
      
      // 2. Validate boundary tags
      UntrustedWrapper.assertNoRawExternal(safeDescription, true);
    }

    const skillsStr = input.candidateSkills?.length > 0 
      ? input.candidateSkills.join(', ') 
      : 'Full-stack engineering, TypeScript, System design';

    const prompt = `Candidate: ${input.candidateName}
Key Skills: ${skillsStr}
Background: ${input.candidateBio || 'Experienced software professional'}

Target Position:
Title: ${input.jobTitle}
Company: ${input.companyName}
${safeDescription ? `Job Details:\n${safeDescription}` : ''}

Please compose a tailored, professional cover letter expressing enthusiasm for the role and highlighting relevant expertise.`;

    const response = await this.gateway.complete({
      taskType: 'COVER_LETTER',
      prompt,
      variables: {
        name: input.candidateName,
        role: input.jobTitle,
        company: input.companyName,
        skills: skillsStr
      }
    });

    return {
      coverLetter: response.content,
      provider: response.provider,
      model: response.model,
      cached: !!response.cached,
      cost: response.cost ?? 0
    };
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const input = task.payload as ApplicationAgentInput;
      const result = await this.generateCoverLetter(input);

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
