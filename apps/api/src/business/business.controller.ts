import { Controller, Post, Get, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';
import {
  MarketResearchAgent,
  ProductManagerAgent,
  BusinessPlanAgent,
  LaunchAgent
} from '@nexa/agents';

export interface BusinessIdeaRecord {
  id: string;
  idea: string;
  targetAudience: string;
  userId: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  marketResearch: any;
  prd: any;
  businessPlan: any;
  launch: any;
  approvalQueueId: string;
  createdAt: string;
}

@Controller('api/business')
export class BusinessController {
  private marketResearchAgent = new MarketResearchAgent();
  private productManagerAgent = new ProductManagerAgent();
  private businessPlanAgent = new BusinessPlanAgent();
  private launchAgent: LaunchAgent;

  private storedIdeas: BusinessIdeaRecord[] = [];

  constructor(private readonly db: DatabaseService) {
    this.launchAgent = new LaunchAgent(undefined, undefined, this.db);
  }

  @Post('idea')
  @HttpCode(HttpStatus.ACCEPTED)
  async submitIdea(
    @Body() body: { idea: string; targetAudience?: string; userId?: string }
  ) {
    const ideaText = body?.idea || 'Autonomous AI Assistant for Developer Operations';
    const targetAudience = body?.targetAudience || 'Modern Software Engineering Teams';
    const userId = body?.userId || 'default_user';
    const ideaId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Run Market Research Agent
    const marketResearch = await this.marketResearchAgent.research({
      idea: ideaText,
      targetAudience
    });

    // 2. Run Product Manager Agent
    const prd = await this.productManagerAgent.generatePRD({
      idea: ideaText,
      targetAudience,
      marketResearch
    });

    // 3. Run Business Plan Agent
    const businessPlan = await this.businessPlanAgent.generatePlan({
      idea: ideaText,
      targetAudience,
      prd
    });

    // 4. Run Launch Agent
    const launch = await this.launchAgent.prepareLaunch({
      idea: ideaText,
      targetAudience,
      businessPlan,
      nodeId: ideaId
    });

    // Persist to approval request in database if available
    let approvalDbRecord = null;
    try {
      // Find or create default plan/task for FK constraints if needed, or create approvalRequest
      if (this.db.prisma.approvalRequest) {
        // Create task and execution plan node if needed
        const task = await this.db.prisma.task.create({
          data: {
            description: `Business Venture: ${ideaText.slice(0, 50)}`,
            state: 'WAITING',
            budget: { maxSteps: 5, maxLlmCalls: 5, maxToolCalls: 2, maxRuntimeMs: 60000, maxCost: 0 }
          }
        });

        const plan = await this.db.prisma.executionPlan.create({
          data: {
            taskId: task.id
          }
        });

        const node = await this.db.prisma.executionNode.create({
          data: {
            planId: plan.id,
            name: `Launch Campaign: ${launch.landingPageHeadline.slice(0, 40)}`,
            agentId: 'agent_launch',
            dependencies: [],
            payload: {
              ideaId,
              idea: ideaText,
              marketResearch,
              prd,
              businessPlan,
              launch
            } as any,
            state: 'NEEDS_APPROVAL'
          }
        });

        approvalDbRecord = await this.db.prisma.approvalRequest.create({
          data: {
            nodeId: node.id,
            description: `Approve External Launch for "${ideaText}": ${launch.landingPageHeadline}`,
            riskLevel: 'COMMUNICATE',
            status: 'PENDING'
          }
        });
      }
    } catch {
      // Graceful fallback for environments with transient DB state
    }

    const record: BusinessIdeaRecord = {
      id: ideaId,
      idea: ideaText,
      targetAudience,
      userId,
      status: 'PENDING_APPROVAL',
      marketResearch,
      prd,
      businessPlan,
      launch,
      approvalQueueId: approvalDbRecord ? approvalDbRecord.id : launch.approvalQueueId,
      createdAt: new Date().toISOString()
    };

    this.storedIdeas.unshift(record);

    return {
      statusCode: HttpStatus.ACCEPTED,
      success: true,
      message: 'Business orchestration initiated and launch assets queued for human approval',
      ideaId,
      approvalQueueId: record.approvalQueueId,
      outputs: {
        marketResearch,
        prd,
        businessPlan,
        launch
      }
    };
  }

  @Get('ideas')
  getIdeas() {
    return this.storedIdeas;
  }

  @Get('ideas/:id')
  getIdea(@Param('id') id: string) {
    const found = this.storedIdeas.find(i => i.id === id);
    if (!found) {
      return { success: false, error: 'Business idea not found' };
    }
    return { success: true, data: found };
  }
}
