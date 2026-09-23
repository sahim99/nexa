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
          content: 'You are the Nexa Interaction Agent. Your job is to understand the user request, determine if it needs clarification, and extract the intent to forward to the Manager Agent.'
        },
        {
          role: 'user',
          content: userInput
        }
      ];

      // Use FAST tier for quick interaction routing
      const response = await this.modelRouter.route('FAST', messages);
      
      // We would parse the JSON response here.
      // Mocking the parsed structure for now since LLM response format isn't strictly enforced in this stub.
      
      return {
        taskId: task.id,
        success: true,
        data: {
          intent: 'EXECUTE_TASK',
          clarificationNeeded: false,
          response: 'I will handle that for you right away.',
          forwardPayload: {
            originalRequest: userInput,
            context: {}
          }
        },
        metadata: {
          usage: response.usage
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
