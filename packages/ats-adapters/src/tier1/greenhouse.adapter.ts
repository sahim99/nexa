import { PermissionGuard, PermissionTier } from '@nexa/permissions';
import { MetricsCollector } from '@nexa/observability';

export interface GreenhouseSubmitPayload {
  to: string;
  jobId: string;
  fields: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    resume_text?: string;
    cover_letter_text?: string;
    [key: string]: any;
  };
}

export interface GreenhouseAdapterConfig {
  dryRun?: boolean;
}

export class GreenhouseAdapter {
  constructor(
    private readonly config: GreenhouseAdapterConfig = { dryRun: true },
    private readonly guard: PermissionGuard = new PermissionGuard(),
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Submits an application to Greenhouse.
   * Requires WRITE_SYSTEM permission tier.
   * In dry-run mode, returns exact { to, jobId, fields } payload with zero HTTP calls.
   */
  async submitApplication(
    agentPermission: PermissionTier,
    payload: GreenhouseSubmitPayload,
    userId: string = 'system'
  ): Promise<{
    success: boolean;
    dryRun: boolean;
    to: string;
    jobId: string;
    fields: Record<string, any>;
    response?: any;
  }> {
    // Enforce WRITE_SYSTEM permission
    await this.guard.assertPermission(agentPermission, 'WRITE_SYSTEM', {
      userId,
      agentName: 'GreenhouseAdapter',
      action: 'GreenhouseAdapter.submitApplication'
    });

    this.metrics.incrementCounter('algorithmDecisions');

    if (this.config.dryRun !== false) {
      return {
        success: true,
        dryRun: true,
        to: payload.to,
        jobId: payload.jobId,
        fields: payload.fields
      };
    }

    // Real HTTP post when dryRun is explicitly false
    const res = await fetch(payload.to, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload.fields)
    });

    const json = await res.json();
    return {
      success: res.ok,
      dryRun: false,
      to: payload.to,
      jobId: payload.jobId,
      fields: payload.fields,
      response: json
    };
  }
}
