import { describe, it, expect } from 'vitest';
import { AuditLogger } from '../audit.logger';

describe('AuditLogger Append-Only Integrity', () => {
  const auditLogger = new AuditLogger();

  it('records an audit log and reads it back accurately', async () => {
    const entry = await auditLogger.log({
      userId: 'user_sec_01',
      agentName: 'SecurityGuard',
      action: 'EVALUATE_PERMISSIONS',
      permission: 'READONLY',
      riskLevel: 'LOW',
      status: 'ALLOWED',
      payload: { target: 'job_board' }
    });

    expect(entry.id).toBeDefined();
    expect(entry.status).toBe('ALLOWED');

    const logs = await auditLogger.query({ userId: 'user_sec_01' });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].action).toBe('EVALUATE_PERMISSIONS');
  });

  it('strictly rejects any update or delete operations on audit logs', async () => {
    await expect(auditLogger.update()).rejects.toThrow('Audit logs are append-only. Modification is strictly forbidden.');
    await expect(auditLogger.delete()).rejects.toThrow('Audit logs are append-only. Deletion is strictly forbidden.');
  });
});
