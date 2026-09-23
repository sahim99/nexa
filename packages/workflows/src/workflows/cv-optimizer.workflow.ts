import { SynonymRotator } from '@nexa/algorithms';
import { MetricsCollector } from '@nexa/observability';

export interface CvOptimizerWorkflowOptions {
  skills?: string[];
  dayOfYear?: number;
}

export interface CvOptimizerWorkflowResult {
  originalSkills: string[];
  optimizedSkills: string[];
  swapsMade: number;
  algorithm: string;
  llmCalls: number;
  timestamp: string;
}

export class CvOptimizerWorkflow {
  private metrics = MetricsCollector.getInstance();

  /**
   * Deterministically rotates CV skills according to current day and tech thesaurus.
   * STRICTLY ZERO LLM calls.
   */
  public async run(
    userId: string = 'default_user',
    options?: CvOptimizerWorkflowOptions
  ): Promise<CvOptimizerWorkflowResult> {
    const inputSkills = options?.skills || [
      'Node.js',
      'React.js',
      'TypeScript',
      'PostgreSQL',
      'Kubernetes',
      'Amazon Web Services',
      'Docker'
    ];

    const day = options?.dayOfYear !== undefined ? options.dayOfYear : SynonymRotator.getDayOfYear();
    let swaps = 0;

    const optimized = inputSkills.map((skill) => {
      const rotated = SynonymRotator.rotate(skill, day);
      if (rotated !== skill) {
        swaps++;
      }
      return rotated;
    });

    this.metrics.incrementCounter('algorithmDecisions');

    return {
      originalSkills: inputSkills,
      optimizedSkills: optimized,
      swapsMade: swaps,
      algorithm: 'SynonymRotator',
      llmCalls: 0,
      timestamp: new Date().toISOString()
    };
  }
}
