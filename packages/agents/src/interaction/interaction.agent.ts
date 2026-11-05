import { AgentCapability, AgentResult, AgentTask, ExecutionPlan } from '@nexa/shared';
import { BaseAgent } from '@nexa/agent-runtime';
import { ModelRouter } from '@nexa/llm';

export class InteractionAgent extends BaseAgent {
  id = 'agent_interaction_1';
  name = 'Interaction Agent';
  version = '1.0.0';
  capabilities: AgentCapability[] = ['INTERACTION'];
  tools: string[] = [];
  permissions: string[] = [];
  
  inputSchema = {
    type: 'object',
    properties: {
      userInput: { type: 'string' }
    },
    required: ['userInput']
  };

  outputSchema = {
    type: 'object',
    properties: {
      intent: { type: 'string' },
      clarificationNeeded: { type: 'boolean' },
      response: { type: 'string' },
      forwardPayload: { type: 'object' }
    }
  };

  constructor(private readonly modelRouter: ModelRouter) {
    super();
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { userInput } = task.payload;

      // In a full implementation, we'd pull context (profile, memory) here
      
      const messages = [
        { 
          role: 'system', 
          content: 'You are the Nexa Interaction Agent. Return JSON only with keys intent (EXECUTE_TASK or CLARIFY), clarificationNeeded (boolean), and response (string). Use CLARIFY when the request is too vague to plan.'
        },
        {
          role: 'user',
          content: userInput
        }
      ];

      // Use FAST tier for quick interaction routing
      const response = await this.modelRouter.route('FAST', messages);
      const parsed = parseIntent(response.content);

      return {
        taskId: task.id,
        success: true,
        data: {
          intent: parsed.intent,
          clarificationNeeded: parsed.clarificationNeeded,
          response: parsed.response,
          modelResponse: response.content,
          forwardPayload: {
            originalRequest: userInput,
            context: {}
          }
        },
        metadata: {
          usage: response.usage,
          model: response.model
        }
      };
    } catch (error: any) {
      return {
        taskId: task.id,
        success: false,
        error: error.message
      };
    }
  }
}

function parseIntent(content: string): { intent: string; clarificationNeeded: boolean; response: string } {
  const fallback = {
    intent: 'EXECUTE_TASK',
    clarificationNeeded: false,
    response: 'I will handle that for you right away.'
  };
  if (!content) return fallback;
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return { ...fallback, response: content.trim() || fallback.response };
  }
  try {
    const parsed = JSON.parse(content.slice(start, end + 1));
    return {
      intent: typeof parsed.intent === 'string' ? parsed.intent : fallback.intent,
      clarificationNeeded: typeof parsed.clarificationNeeded === 'boolean' ? parsed.clarificationNeeded : false,
      response: typeof parsed.response === 'string' ? parsed.response : fallback.response
    };
  } catch {
    return fallback;
  }
}
