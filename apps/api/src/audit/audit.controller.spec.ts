import { describe, it, expect, beforeEach } from 'vitest';
import { AuditController } from './audit.controller.js';
import { DatabaseService } from '@nexa/database';

describe('AuditController', () => {
  let controller: AuditController;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      prisma: {}
    };
    controller = new AuditController(mockDb as DatabaseService);
  });

  it('GET /api/audit returns 200 with recorded audit entries', async () => {
    // Populate an entry via auditLogger internal
    await (controller as any).auditLogger.log({
      userId: 'test_user_api',
      agentName: 'JobHunter',
      action: 'QUERY_JOBS',
      permission: 'READONLY',
      riskLevel: 'LOW',
      status: 'ALLOWED',
      payload: { query: 'TypeScript Engineer' }
    });

    const logs = await controller.getAuditLogs('test_user_api');
    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('QUERY_JOBS');
    expect(logs[0].status).toBe('ALLOWED');
  });
});
