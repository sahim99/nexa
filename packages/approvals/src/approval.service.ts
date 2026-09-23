import { DatabaseService } from '@nexa/database';
import { EventBus } from '@nexa/events';

export class ApprovalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Pauses an execution node and requests user approval.
   */
  async requestApproval(nodeId: string, description: string, riskLevel: string): Promise<void> {
    await this.db.prisma.$transaction(async (tx) => {
      // Create approval request
      await tx.approvalRequest.create({
        data: {
          nodeId,
          description,
          riskLevel,
          status: 'PENDING'
        }
      });

      // Update node state to NEEDS_APPROVAL
      await tx.executionNode.update({
        where: { id: nodeId },
        data: { state: 'NEEDS_APPROVAL' }
      });
    });

    this.eventBus.emit({
      id: `evt_${Date.now()}`,
      eventType: 'approval.requested',
      timestamp: new Date(),
      source: 'approvals',
      payload: { nodeId, description, riskLevel }
    });
  }

  /**
   * Resolves a pending approval request and resumes (or fails) the node.
   */
  async resolveApproval(requestId: string, approved: boolean, userId: string): Promise<void> {
    const status = approved ? 'APPROVED' : 'REJECTED';

    await this.db.prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.update({
        where: { id: requestId },
        data: { 
          status,
          approvedAt: new Date(),
          approvedBy: userId
        }
      });

      // If approved, we set the node back to READY so the QueueWorker picks it up again
      // If rejected, we fail the node
      const nextState = approved ? 'READY' : 'FAILED';
      
      await tx.executionNode.update({
        where: { id: request.nodeId },
        data: { state: nextState }
      });

      this.eventBus.emit({
        id: `evt_${Date.now()}`,
        eventType: `approval.${status.toLowerCase()}`,
        timestamp: new Date(),
        source: 'approvals',
        payload: { nodeId: request.nodeId, requestId, status, userId }
      });
    });
  }
}
