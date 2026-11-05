import { ExecutionPlan } from '@nexa/shared';

/**
 * Manager.execute returns both id and planId. PlanCompiler persists plan.id.
 * Accept either field so the two sides share one identifier.
 */
export function toExecutionPlan(managerData: any, taskId: string): ExecutionPlan {
  const id = managerData?.id || managerData?.planId;
  if (!id || typeof id !== 'string') {
    throw new Error('Manager result is missing plan id (expected id or planId)');
  }
  if (!Array.isArray(managerData?.nodes)) {
    throw new Error('Manager result is missing nodes');
  }
  return {
    id,
    taskId,
    nodes: managerData.nodes
  };
}
