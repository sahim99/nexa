import { FollowUpScheduler, DueFollowUpTask } from '@nexa/channels';
import { MetricsCollector } from '@nexa/observability';

export interface FollowUpCheckResult {
  checkedApplications: number;
  scheduledFollowUps: number;
  tasks: DueFollowUpTask[];
  timestamp: string;
}

export class FollowUpCheckWorkflow {
  private scheduler = new FollowUpScheduler();
  private metrics = MetricsCollector.getInstance();

  public async run(userId: string = 'default_user'): Promise<FollowUpCheckResult> {
    const dueDay7 = this.scheduler.getDueTasks(7);
    const dueDay14 = this.scheduler.getDueTasks(14);
    const tasks = [...dueDay7, ...dueDay14];

    this.metrics.incrementCounter('algorithmDecisions');

    return {
      checkedApplications: tasks.length,
      scheduledFollowUps: tasks.length,
      tasks,
      timestamp: new Date().toISOString()
    };
  }
}
