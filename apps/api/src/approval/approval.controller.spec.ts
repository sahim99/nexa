import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalController } from './approval.controller';

describe('ApprovalController (Full Lifecycle)', () => {
  let controller: ApprovalController;
  let mockDb: any;
  let mockApprovalService: any;

  beforeEach(() => {
    mockDb = {
      prisma: {
        approvalRequest: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'appr_1', description: 'Outreach email to Stripe', status: 'PENDING' }
          ]),
          findUnique: vi.fn().mockResolvedValue({
            id: 'appr_1',
            description: 'Outreach email to Stripe',
            riskLevel: 'WRITE_SYSTEM',
            node: { id: 'node_1', name: 'Email Outreach Node', agentId: 'agent_application', payload: { to: 'recruiter@stripe.com' } }
          }),
          update: vi.fn()
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit_1' })
        }
      }
    };

    mockApprovalService = {
      resolveApproval: vi.fn().mockResolvedValue(undefined)
    };

    controller = new ApprovalController(mockDb, mockApprovalService);
  });

  it('lists approvals', async () => {
    const list = await controller.getApprovals();
    expect(list.length).toBe(1);
    expect(mockDb.prisma.approvalRequest.findMany).toHaveBeenCalled();
  });

  it('approves request, executes Gmail dry-run, and logs to AuditLog as ALLOWED', async () => {
    const result = await controller.approve('appr_1', { userId: 'admin_1' });

    expect(result.success).toBe(true);
    expect(result.status).toBe('APPROVED');
    expect(result.sendResult).toBeDefined();
    expect(result.sendResult?.dryRun).toBe(true);
    expect(mockApprovalService.resolveApproval).toHaveBeenCalledWith('appr_1', true, 'admin_1');
  });

  it('rejects request, sets status to REJECTED, and logs to AuditLog as BLOCKED', async () => {
    const result = await controller.reject('appr_1', { userId: 'admin_1', reason: 'Not interested in role' });

    expect(result.success).toBe(true);
    expect(result.status).toBe('REJECTED');
    expect(mockApprovalService.resolveApproval).toHaveBeenCalledWith('appr_1', false, 'admin_1');
  });
});
