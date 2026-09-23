import { AgentCapability, AgentResult, AgentTask } from '@nexa/shared';
import { BaseAgent } from '@nexa/agent-runtime';
import { SynonymRotator } from '@nexa/algorithms';
import { MetricsCollector } from '@nexa/observability';

export interface CvOptimizerInput {
  skills: string[];
  dayOfYear?: number;
  profileId?: string;
}

export interface CvOptimizerOutput {
  originalSkills: string[];
  optimizedSkills: string[];
  swapsMade: number;
  algorithm: string;
}

export class CvOptimizerAgent extends BaseAgent {
  id = 'agent_cv_optimizer';
  name = 'CV Optimizer Agent';
  version = '1.0.0';
  capabilities: AgentCapability[] = ['MANAGEMENT'];
  tools: string[] = [];
  permissions: string[] = ['READONLY'];

  inputSchema = {
    type: 'object',
    properties: {
      skills: { type: 'array', items: { type: 'string' } },
      dayOfYear: { type: 'number' }
    },
    required: ['skills']
  };

  outputSchema = {
    type: 'object',
    properties: {
      optimizedSkills: { type: 'array', items: { type: 'string' } },
      swapsMade: { type: 'number' }
    }
  };

  constructor(
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {
    super();
  }

  /**
   * Deterministically rotates CV skills using SynonymRotator.
   * Absolutely ZERO LLM calls. <1ms execution.
   */
  public optimizeSkills(skills: string[], dayOfYear?: number): CvOptimizerOutput {
    this.metrics.incrementCounter('algorithmDecisions');

    const day = dayOfYear !== undefined ? dayOfYear : SynonymRotator.getDayOfYear();
    let swaps = 0;

    const optimized = skills.map((skill) => {
      const rotated = SynonymRotator.rotate(skill, day);
      if (rotated !== skill) {
        swaps++;
      }
      return rotated;
    });

    return {
      originalSkills: skills,
      optimizedSkills: optimized,
      swapsMade: swaps,
      algorithm: 'SynonymRotator'
    };
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { skills = [], dayOfYear } = task.payload as CvOptimizerInput;
      const result = this.optimizeSkills(skills, dayOfYear);

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
