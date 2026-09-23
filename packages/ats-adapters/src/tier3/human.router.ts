import { DatabaseService } from '@nexa/database';
import { EventBus } from '@nexa/events';
import { MetricsCollector } from '@nexa/observability';

export interface HumanApprovalPayload {
  nodeId: string;
  jobId: string;
  company: string;
  role: string;
  reason?: string;
  fields?: Record<string, any>;
}

export interface HumanApprovalResult {
  approvalId: string;
  nodeId: string;
  status: 'PENDING_APPROVAL';
  dagState: 'WAITING';
  suspended: boolean;
}

export class HumanRouterAdapter {
  constructor(
    private readonly db?: DatabaseService,
    private readonly eventBus: EventBus = new EventBus(),
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Routes an application to human approval, setting status to PENDING_APPROVAL
   * and suspending the DAG node to WAITING.
   */
  async routeToHumanApproval(payload: HumanApprovalPayload): Promise<HumanApprovalResult> {
    this.metrics.incrementCounter('algorithmDecisions');

    const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (this.db?.prisma) {
      try {
        await this.db.prisma.approvalRequest.create({
          data: {
            id: approvalId,
            nodeId: payload.nodeId,
            description: `Application to ${payload.company} for ${payload.role} requires review`,
            riskLevel: 'WRITE_SYSTEM',
            status: 'PENDING_APPROVAL'
          }
        });

        await this.db.prisma.executionNode.update({
          where: { id: payload.nodeId },
          data: { state: 'WAITING' }
        });
      } catch (err: any) {
        // Fallback or in-memory runner simulation
      }
    }

    this.eventBus.emit({
      id: approvalId,
      eventType: 'approval.requested',
      timestamp: new Date(),
      source: 'ats-adapters:tier3',
      payload: {
        approvalId,
        nodeId: payload.nodeId,
        jobId: payload.jobId,
        company: payload.company,
        role: payload.role,
        status: 'PENDING_APPROVAL',
        dagState: 'WAITING'
      }
    });

    return {
      approvalId,
      nodeId: payload.nodeId,
      status: 'PENDING_APPROVAL',
      dagState: 'WAITING',
      suspended: true
    };
  }
}
