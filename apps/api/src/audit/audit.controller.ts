import { Controller, Get, Query } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';
import { AuditLogger } from '@nexa/events';

@Controller('api/audit')
export class AuditController {
  private auditLogger: AuditLogger;

  constructor(private readonly db: DatabaseService) {
    this.auditLogger = new AuditLogger(this.db.prisma);
  }

  @Get()
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('agentName') agentName?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const logs = await this.auditLogger.query({
      userId,
      agentName,
      status,
      limit: parsedLimit
    });
    return logs;
  }
}
