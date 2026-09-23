export type PermissionTier = 'READONLY' | 'COMMUNICATE' | 'WRITE_DATA' | 'WRITE_SYSTEM' | 'ADMIN';

export const PERMISSION_TIER_WEIGHTS: Record<PermissionTier, number> = {
  READONLY: 0,
  COMMUNICATE: 1,
  WRITE_DATA: 2,
  WRITE_SYSTEM: 3,
  ADMIN: 4
};

export class PermissionError extends Error {
  constructor(
    public readonly agentName: string,
    public readonly requiredTier: PermissionTier,
    public readonly grantedTier: PermissionTier,
    public readonly action: string
  ) {
    super(
      `Permission Denied: Agent '${agentName}' with tier ${grantedTier} cannot perform action '${action}' requiring tier ${requiredTier}`
    );
    this.name = 'PermissionError';
  }
}

export interface PermissionContext {
  userId: string;
  agentName: string;
  action: string;
  payload?: any;
}

export interface IAuditLogger {
  log(entry: {
    userId: string;
    agentName: string;
    action: string;
    permission: string;
    riskLevel: string;
    status: 'ALLOWED' | 'BLOCKED';
    payload?: any;
  }): Promise<void>;
}

export class PermissionGuard {
  constructor(private readonly auditLogger?: IAuditLogger) {}

  /**
   * Asserts that granted permission tier meets or exceeds required tier.
   * If blocked, records an audit log entry and throws PermissionError.
   */
  public async assertPermission(
    grantedTier: PermissionTier,
    requiredTier: PermissionTier,
    context: PermissionContext
  ): Promise<void> {
    const grantedWeight = PERMISSION_TIER_WEIGHTS[grantedTier] ?? 0;
    const requiredWeight = PERMISSION_TIER_WEIGHTS[requiredTier] ?? 4;

    if (grantedWeight < requiredWeight) {
      if (this.auditLogger) {
        await this.auditLogger.log({
          userId: context.userId,
          agentName: context.agentName,
          action: context.action,
          permission: grantedTier,
          riskLevel: requiredTier,
          status: 'BLOCKED',
          payload: context.payload
        });
      }

      throw new PermissionError(context.agentName, requiredTier, grantedTier, context.action);
    }

    if (this.auditLogger) {
      await this.auditLogger.log({
        userId: context.userId,
        agentName: context.agentName,
        action: context.action,
        permission: grantedTier,
        riskLevel: requiredTier,
        status: 'ALLOWED',
        payload: context.payload
      });
    }
  }
}
