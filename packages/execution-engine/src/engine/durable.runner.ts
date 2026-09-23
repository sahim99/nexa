import { DatabaseService } from '@nexa/database';
import { EventBus } from '@nexa/events';
import { AgentRegistry } from '@nexa/agent-runtime';
import { AgentTask } from '@nexa/shared';
import { ToolRegistry } from '@nexa/tools';
import { MemoryService } from '@nexa/memory';

export class DurableRunner {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventBus: EventBus,
    private readonly registry: AgentRegistry,
    private readonly toolRegistry?: ToolRegistry,
    private readonly memoryService?: MemoryService
  ) {}

  /**
   * Executes a single node, emits events, and unblocks dependencies if successful.
   */
  async executeNode(nodeId: string): Promise<void> {
    const node = await this.db.prisma.executionNode.findUnique({ where: { id: nodeId } });
    if (!node) return;

    // Emit RUNNING event
    this.eventBus.emit({
      id: `evt_${Date.now()}`,
      eventType: 'node.started',
      timestamp: new Date(),
      source: 'execution-engine',
      payload: { nodeId, name: node.name }
    });

    try {
      // Find the agent to run this
      if (!node.agentId) {
        throw new Error('Node has no assigned agentId');
      }

      const agent = this.registry.getAgent(node.agentId);
      if (!agent) {
        throw new Error(`Agent ${node.agentId} not found in registry`);
      }

      // Convert DB node to AgentTask
      const task: AgentTask = {
        id: node.id,
        agentId: node.agentId,
        payload: node.payload,
        state: 'RUNNING',
        createdAt: node.createdAt,
        updatedAt: node.updatedAt
      };

      // Execute via the agent
      const result = await agent.execute(task);

      if (result.success) {
        await this.handleNodeSuccess(nodeId, result.data);
      } else {
        await this.handleNodeFailure(nodeId, result.error || 'Unknown error');
      }

    } catch (error: any) {
      await this.handleNodeFailure(nodeId, error.message);
    }
  }

  private async handleNodeSuccess(nodeId: string, data: any) {
    // 1. Mark node as COMPLETED
    await this.db.prisma.executionNode.update({
      where: { id: nodeId },
      data: { state: 'COMPLETED' }
    });

    // 2. Emit event
    this.eventBus.emit({
      id: `evt_${Date.now()}`,
      eventType: 'node.completed',
      timestamp: new Date(),
      source: 'execution-engine',
      payload: { nodeId, result: data }
    });

    // 3. Unblock downstream nodes
    // Find all BLOCKED nodes that have this node in their dependencies array
    // Since Prisma scalar lists don't have powerful "array contains" in SQLite,
    // we fetch all BLOCKED nodes for the same plan and check in memory.
    
    await this.db.prisma.$transaction(async (tx) => {
      const node = await tx.executionNode.findUnique({ where: { id: nodeId } });
      if (!node) return;

      const blockedNodes = await tx.executionNode.findMany({
        where: { planId: node.planId, state: 'BLOCKED' }
      });

      for (const blocked of blockedNodes) {
        if (blocked.dependencies.includes(nodeId)) {
          // Remove the dependency
          const newDeps = blocked.dependencies.filter(dep => dep !== nodeId);
          
          // If no more dependencies, mark READY
          const newState = newDeps.length === 0 ? 'READY' : 'BLOCKED';
          
          await tx.executionNode.update({
            where: { id: blocked.id },
            data: { dependencies: newDeps, state: newState }
          });
        }
      }
    });
  }

  private async handleNodeFailure(nodeId: string, error: string) {
    await this.db.prisma.executionNode.update({
      where: { id: nodeId },
      data: { state: 'FAILED' }
    });

    this.eventBus.emit({
      id: `evt_${Date.now()}`,
      eventType: 'node.failed',
      timestamp: new Date(),
      source: 'execution-engine',
      payload: { nodeId, error }
    });
  }

  /**
   * Executes all READY nodes in parallel per dependency level using Promise.allSettled.
   */
  async executeReadyNodesParallel(planId: string): Promise<void> {
    while (true) {
      const readyNodes = await this.db.prisma.executionNode.findMany({
        where: { planId, state: 'READY' }
      });

      if (readyNodes.length === 0) {
        break;
      }

      // Execute all currently unblocked READY nodes in parallel
      await Promise.allSettled(
        readyNodes.map((node) => this.executeNode(node.id))
      );
    }
  }
}
