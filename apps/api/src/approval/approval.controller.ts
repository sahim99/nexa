import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';
import { AuditLogger } from '@nexa/events';
import { ApprovalService } from '@nexa/approvals';
import { GmailAdapter } from '@nexa/channels';

@Controller('api/approvals')
export class ApprovalController {
  private auditLogger: AuditLogger;
  private gmailAdapter: GmailAdapter;

  constructor(
    private readonly db: DatabaseService,
    private readonly approvalService: ApprovalService
  ) {
    this.auditLogger = new AuditLogger(this.db.prisma);
    this.gmailAdapter = new GmailAdapter(true); // dryRun mode
  }

  @Get()
  async getApprovals(@Query('status') status?: string) {
    const where = status ? { status } : {};
    return this.db.prisma.approvalRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: { node: true }
    });
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: { userId?: string }
  ) {
    const userId = body?.userId || 'system_user';
    const request = await this.db.prisma.approvalRequest.findUnique({
      where: { id },
      include: { node: true }
    });

    if (!request) {
      return { success: false, error: 'Approval request not found' };
    }

    // Resolve via approvalService
    await this.approvalService.resolveApproval(id, true, userId);

    // If this was an email outreach/action, execute Gmail dry-run
    let sendResult = null;
    const descLower = (request.description || '').toLowerCase();
    const nodeNameLower = (request.node?.name || '').toLowerCase();
    if (descLower.includes('email') || nodeNameLower.includes('email') || descLower.includes('outreach')) {
      const payload = (request.node?.payload as any) || {};
      sendResult = await this.gmailAdapter.sendEmail({
        to: payload.to || 'recruiter@company.com',
        subject: payload.subject || 'Application Outreach',
        body: payload.body || request.description
      });
    }

    // Log to AuditLog: ALLOWED
    await this.auditLogger.log({
      userId,
      agentName: request.node?.agentId || 'approval_controller',
      action: 'APPROVE_REQUEST',
      permission: request.riskLevel || 'WRITE_SYSTEM',
      riskLevel: request.riskLevel || 'MEDIUM',
      status: 'ALLOWED',
      payload: { requestId: id, sendResult }
    });

    return {
      success: true,
      status: 'APPROVED',
      requestId: id,
      sendResult
    };
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { userId?: string; reason?: string }
  ) {
    const userId = body?.userId || 'system_user';
    const request = await this.db.prisma.approvalRequest.findUnique({
      where: { id },
      include: { node: true }
    });

    if (!request) {
      return { success: false, error: 'Approval request not found' };
    }

    await this.approvalService.resolveApproval(id, false, userId);

    // Log to AuditLog: BLOCKED
    await this.auditLogger.log({
      userId,
      agentName: request.node?.agentId || 'approval_controller',
      action: 'REJECT_REQUEST',
      permission: request.riskLevel || 'WRITE_SYSTEM',
      riskLevel: request.riskLevel || 'MEDIUM',
      status: 'BLOCKED',
      payload: { requestId: id, reason: body?.reason }
    });

    return {
      success: true,
      status: 'REJECTED',
      requestId: id
    };
  }

  @Post(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() body: { approved: boolean; userId: string }
  ) {
    if (body.approved) {
      return this.approve(id, { userId: body.userId });
    } else {
      return this.reject(id, { userId: body.userId });
    }
  }
}
