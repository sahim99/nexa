import { AudioBriefGenerator, AudioBriefInput, AudioBriefOutput } from '@nexa/notifications';
import { LlmGateway } from '@nexa/llm';

export interface DailyBriefingOptions {
  userName?: string;
  activities?: string[];
  outputPath?: string;
}

export class DailyBriefingWorkflow {
  private generator: AudioBriefGenerator;

  constructor(gateway: LlmGateway = new LlmGateway()) {
    this.generator = new AudioBriefGenerator(gateway);
  }

  public async run(
    userId: string = 'default_user',
    options?: DailyBriefingOptions
  ): Promise<AudioBriefOutput> {
    const defaultActivities = [
      'Discovered and evaluated 18 new positions across Greenhouse, Lever, and YC',
      'Determined 3 strong matches: Stripe (Senior Infrastructure), Netflix (Distributed Systems), and Vercel',
      'Prepared tailored outreach draft pending user approval',
      'Completed overnight database and entity cache synchronization'
    ];

    const input: AudioBriefInput = {
      userName: options?.userName || 'Sahim',
      yesterdayEvents: options?.activities && options.activities.length > 0 ? options.activities : defaultActivities,
      outputPath: options?.outputPath
    };

    return await this.generator.generateAudioBrief(input);
  }
}
