import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';
import { createHash } from 'crypto';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(private db: DatabaseService) {}

  generatePayloadHash(payload: any): string {
    const data = JSON.stringify(payload);
    return createHash('sha256').update(data).digest('hex');
  }

  async requestApproval(nodeId: string, description: string, riskLevel: string, payload: any) {
    const hash = this.generatePayloadHash(payload);
    this.logger.log(`Requesting approval for node ${nodeId} with risk ${riskLevel}`);

    return this.db.prisma.approvalRequest.create({
      data: {
        nodeId,
        description,
        riskLevel,
        status: 'PENDING',
        payloadHash: hash,
      },
    });
  }

  async verifyAndApprove(approvalId: string, providedHash: string, approvedBy: string) {
    const request = await this.db.prisma.approvalRequest.findUnique({ where: { id: approvalId } });
    if (!request) throw new Error('Approval request not found');

    if (request.payloadHash !== providedHash) {
      throw new Error('Payload hash mismatch. The requested action may have been tampered with.');
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Approval is already in state: ${request.status}`);
    }

    return this.db.prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy,
      },
    });
  }
}
