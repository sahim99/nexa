import * as crypto from 'crypto';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  agentName: string;
  action: string;
  permission: string;
  riskLevel: string;
  status: 'ALLOWED' | 'BLOCKED' | 'REJECTED';
  payload: any;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  private inMemoryAuditLogs: AuditLogEntry[] = [];

  constructor(private readonly dbClient?: any) {}

  /**
   * Appends an immutable audit log entry.
   */
  public async log(params: Omit<AuditLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: params.id || `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: params.timestamp || new Date(),
      userId: params.userId,
      agentName: params.agentName,
      action: params.action,
      permission: params.permission,
      riskLevel: params.riskLevel,
      status: params.status,
      payload: params.payload,
      metadata: params.metadata
    };

    if (this.dbClient?.auditLog) {
      try {
        const created = await this.dbClient.auditLog.create({
          data: {
            id: entry.id,
            timestamp: entry.timestamp,
            userId: entry.userId,
            agentName: entry.agentName,
            action: entry.action,
            permission: entry.permission,
            riskLevel: entry.riskLevel,
            status: entry.status,
            payload: entry.payload,
            metadata: entry.metadata
          }
        });
        return created as AuditLogEntry;
      } catch {
        // Fallback to in-memory store
      }
    }

    this.inMemoryAuditLogs.push(Object.freeze({ ...entry }));
    return entry;
  }

  /**
   * Reads back recorded audit logs for a given user or filter.
   */
  public async query(filter: { userId?: string; agentName?: string; status?: string; limit?: number }): Promise<AuditLogEntry[]> {
    if (this.dbClient?.auditLog) {
      try {
        const rows = await this.dbClient.auditLog.findMany({
          where: {
            ...(filter.userId ? { userId: filter.userId } : {}),
            ...(filter.agentName ? { agentName: filter.agentName } : {}),
            ...(filter.status ? { status: filter.status } : {})
          },
          orderBy: { timestamp: 'desc' },
          take: filter.limit || 100
        });
        return rows as AuditLogEntry[];
      } catch {
        // Fallback
      }
    }

    let results = [...this.inMemoryAuditLogs];
    if (filter.userId) {
      results = results.filter((r) => r.userId === filter.userId);
    }
    if (filter.agentName) {
      results = results.filter((r) => r.agentName === filter.agentName);
    }
    if (filter.status) {
      results = results.filter((r) => r.status === filter.status);
    }

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return results.slice(0, filter.limit || 100);
  }

  /**
   * Immutable constraint: updates are strictly forbidden.
   */
  public async update(): Promise<never> {
    throw new Error('Audit logs are append-only. Modification is strictly forbidden.');
  }

  /**
   * Immutable constraint: deletions are strictly forbidden.
   */
  public async delete(): Promise<never> {
    throw new Error('Audit logs are append-only. Deletion is strictly forbidden.');
  }

  public clear(): void {
    this.inMemoryAuditLogs = [];
  }
}
