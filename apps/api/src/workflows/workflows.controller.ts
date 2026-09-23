import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import {
  SchedulerService,
  DailyJobScanWorkflow,
  DailyBriefingWorkflow,
  CvOptimizerWorkflow,
  NightlySyncWorkflow,
  FollowUpCheckWorkflow
} from '@nexa/workflows';

@Controller('api/workflows')
export class WorkflowsController {
  private scheduler = new SchedulerService();
  private dailyJobScan = new DailyJobScanWorkflow();
  private dailyBriefing = new DailyBriefingWorkflow();
  private cvOptimizer = new CvOptimizerWorkflow();
  private nightlySync = new NightlySyncWorkflow();
  private followUpCheck = new FollowUpCheckWorkflow();

  constructor() {
    this.registerDefaultWorkflows();
  }

  private registerDefaultWorkflows() {
    this.scheduler.registerWorkflow(
      'daily-job-scan',
      async (userId, params) => await this.dailyJobScan.run(userId, params),
      { defaultCron: '0 8 * * *', lockTtlSeconds: 120 }
    );

    this.scheduler.registerWorkflow(
      'daily-briefing',
      async (userId, params) => await this.dailyBriefing.run(userId, params),
      { defaultCron: '0 9 * * *', lockTtlSeconds: 60 }
    );

    this.scheduler.registerWorkflow(
      'cv-optimizer',
      async (userId, params) => await this.cvOptimizer.run(userId, params),
      { defaultCron: '0 0 * * 1', lockTtlSeconds: 60 }
    );

    this.scheduler.registerWorkflow(
      'nightly-sync',
      async (userId) => await this.nightlySync.run(userId),
      { defaultCron: '0 2 * * *', lockTtlSeconds: 180 }
    );

    this.scheduler.registerWorkflow(
      'follow-up-check',
      async (userId) => await this.followUpCheck.run(userId),
      { defaultCron: '0 10 * * *', lockTtlSeconds: 60 }
    );
  }

  @Get()
  getWorkflows() {
    return {
      workflows: this.scheduler.getRegisteredWorkflows()
    };
  }

  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    const max = limit ? parseInt(limit, 10) : 50;
    return this.scheduler.getRunHistory(max);
  }

  @Post(':name/run')
  async runWorkflow(
    @Param('name') name: string,
    @Body() body?: { userId?: string; params?: any }
  ) {
    const userId = body?.userId || 'default_user';
    const result = await this.scheduler.triggerWorkflow(name, userId, body?.params);
    return {
      success: result.status === 'SUCCESS',
      ...result
    };
  }
}
