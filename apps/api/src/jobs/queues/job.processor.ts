import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('jobs-queue')
export class JobProcessor extends WorkerHost {
  private readonly logger = new Logger(JobProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
    this.logger.debug(job.data);
    
    // Process logic here
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    this.logger.log(`Job ${job.id} completed.`);
    return { success: true };
  }
}
