import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowsController } from './workflows.controller.js';

describe('WorkflowsController', () => {
  let controller: WorkflowsController;

  beforeEach(() => {
    controller = new WorkflowsController();
  });

  it('lists registered workflows', () => {
    const res = controller.getWorkflows();
    expect(res).toBeDefined();
    expect(res.workflows).toContain('daily-job-scan');
    expect(res.workflows).toContain('daily-briefing');
    expect(res.workflows).toContain('cv-optimizer');
    expect(res.workflows).toContain('nightly-sync');
    expect(res.workflows).toContain('follow-up-check');
  });

  it('triggers a workflow manually and records history', async () => {
    const triggerRes = await controller.runWorkflow('cv-optimizer', {
      userId: 'test_user_api',
      params: { skills: ['Node.js', 'React.js', 'PostgreSQL'], dayOfYear: 5 }
    });

    expect(triggerRes.success).toBe(true);
    expect(triggerRes.status).toBe('SUCCESS');
    expect(triggerRes.result).toBeDefined();
    expect(triggerRes.result.llmCalls).toBe(0);

    const history = controller.getHistory('10');
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].workflowName).toBe('cv-optimizer');
    expect(history[0].status).toBe('SUCCESS');
  });
});
