import { DatabaseService } from '@nexa/database';
import { ExecutionPlan as SharedExecutionPlan, ExecutionNode as SharedExecutionNode } from '@nexa/shared';

export class PlanCompiler {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Compiles an ExecutionPlan from the ManagerAgent into the database.
   * Topologically sorts and sets initial state.
   */
  async compile(taskId: string, plan: SharedExecutionPlan): Promise<void> {
    // Determine initial state for each node
    const nodesToCreate = plan.nodes.map(node => {
      // If a node has no dependencies, it's READY to run immediately.
      // Otherwise, it is BLOCKED waiting for its dependencies.
      const state = (node.dependencies && node.dependencies.length > 0) ? 'BLOCKED' : 'READY';

      return {
        id: node.id, // Prefer keeping the ID from the planner for graph mapping
        name: node.name,
        agentId: node.agentId,
        toolId: node.toolId,
        dependencies: node.dependencies || [],
        payload: node.payload as any,
        state: state
      };
    });

    await this.db.prisma.$transaction(async (tx) => {
      // 1. Create the ExecutionPlan record
      const dbPlan = await tx.executionPlan.create({
        data: {
          id: plan.id,
          taskId: taskId
        }
      });

      // 2. Insert all ExecutionNodes
      for (const node of nodesToCreate) {
        await tx.executionNode.create({
          data: {
            id: node.id,
            planId: dbPlan.id,
            name: node.name,
            agentId: node.agentId,
            toolId: node.toolId,
            dependencies: node.dependencies,
            payload: node.payload,
            state: node.state
          }
        });
      }
    });

    console.log(`[PlanCompiler] Compiled plan ${plan.id} for task ${taskId} with ${nodesToCreate.length} nodes.`);
  }
}
