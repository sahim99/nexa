import { describe, it, expect, beforeEach } from 'vitest';
import { BusinessController } from './business.controller.js';
import { DatabaseService } from '@nexa/database';

describe('BusinessController', () => {
  let controller: BusinessController;
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService();
    controller = new BusinessController(db);
  });

  it('POST /api/business/idea returns 202 Accepted and queues launch assets for approval', async () => {
    const res = await controller.submitIdea({
      idea: 'Autonomous Workflow Engine for Multi-Cloud Ops',
      targetAudience: 'Infrastructure Architects',
      userId: 'test_founder_01'
    });

    expect(res).toBeDefined();
    expect(res.statusCode).toBe(202);
    expect(res.success).toBe(true);
    expect(res.ideaId).toBeDefined();
    expect(res.approvalQueueId).toBeDefined();

    // Verify all 4 agent outputs are present
    expect(res.outputs.marketResearch).toBeDefined();
    expect(res.outputs.marketResearch.marketSize).toBeDefined();

    expect(res.outputs.prd).toBeDefined();
    expect(res.outputs.prd.userStories.length).toBeGreaterThan(0);

    expect(res.outputs.businessPlan).toBeDefined();
    expect(res.outputs.businessPlan.revenue.length).toBeGreaterThan(0);
    expect(res.outputs.businessPlan.gtm.length).toBeGreaterThan(0);
    expect(res.outputs.businessPlan.financials.length).toBeGreaterThan(0);

    expect(res.outputs.launch).toBeDefined();
    expect(res.outputs.launch.queuedForApproval).toBe(true);
    expect(res.outputs.launch.publishedExternally).toBe(false);

    // Verify list endpoint
    const ideas = controller.getIdeas();
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas[0].id).toBe(res.ideaId);
  });
});
