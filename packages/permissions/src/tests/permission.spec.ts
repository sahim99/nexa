import { describe, it, expect } from 'vitest';
import { PermissionGuard, PermissionError, IAuditLogger } from '../permission.guard';

describe('PermissionGuard & Security Boundary', () => {
  it('blocks READONLY agent attempting WRITE_SYSTEM action, records audit log, and throws PermissionError', async () => {
    const auditEntries: any[] = [];
    const mockAudit: IAuditLogger = {
      async log(entry) {
        auditEntries.push(entry);
      }
    };

    const guard = new PermissionGuard(mockAudit);

    let caughtError: any = null;
    try {
      await guard.assertPermission('READONLY', 'WRITE_SYSTEM', {
        userId: 'user_456',
        agentName: 'CollectorAgent',
        action: 'SUBMIT_APPLICATION',
        payload: { jobUrl: 'https://lever.co/apply' }
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(PermissionError);
    expect(caughtError.message).toContain('Permission Denied');
    expect(caughtError.grantedTier).toBe('READONLY');
    expect(caughtError.requiredTier).toBe('WRITE_SYSTEM');

    // Confirm audit record was created and marked BLOCKED
    expect(auditEntries.length).toBe(1);
    expect(auditEntries[0].status).toBe('BLOCKED');
    expect(auditEntries[0].agentName).toBe('CollectorAgent');
    expect(auditEntries[0].action).toBe('SUBMIT_APPLICATION');
  });

  it('allows actions where granted tier is greater than or equal to required tier', async () => {
    const auditEntries: any[] = [];
    const mockAudit: IAuditLogger = {
      async log(entry) {
        auditEntries.push(entry);
      }
    };

    const guard = new PermissionGuard(mockAudit);

    await guard.assertPermission('WRITE_SYSTEM', 'WRITE_DATA', {
      userId: 'user_456',
      agentName: 'ApplicationAgent',
      action: 'SAVE_RESUME_DRAFT'
    });

    expect(auditEntries.length).toBe(1);
    expect(auditEntries[0].status).toBe('ALLOWED');
  });
});
