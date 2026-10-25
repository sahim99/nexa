import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';

export enum TaskState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED'
}

@Injectable()
export class StepMachine {
  private readonly logger = new Logger(StepMachine.name);

  constructor(private db: DatabaseService) {}

  async executeNode(nodeId: string): Promise<void> {
    this.logger.log(`Executing node ${nodeId}`);
    
    const node = await this.db.prisma.executionNode.findUnique({
      where: { id: nodeId }
    });

    if (!node) throw new Error(`Node ${nodeId} not found`);

    // Transition to RUNNING
    await this.db.prisma.executionNode.update({
      where: { id: nodeId },
      data: { state: TaskState.RUNNING }
    });

    try {
      // Simulate tool execution / agent routing
      this.logger.log(`Executing tool: ${node.toolId} for agent: ${node.agentId}`);
      await new Promise(res => setTimeout(res, 500)); // simulated latency
      
      // Transition to COMPLETED
      await this.db.prisma.executionNode.update({
        where: { id: nodeId },
        data: { state: TaskState.COMPLETED }
      });
      
      this.logger.log(`Node ${nodeId} COMPLETED successfully.`);
    } catch (error: any) {
      this.logger.error(`Node ${nodeId} FAILED: ${error.message}`);
      await this.db.prisma.executionNode.update({
        where: { id: nodeId },
        data: { state: TaskState.FAILED }
      });
    }
  }
}
