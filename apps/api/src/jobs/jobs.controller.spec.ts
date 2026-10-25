import { describe, it, expect, beforeEach } from 'vitest';
import { JobsController } from './jobs.controller.js';
import { DatabaseService } from '@nexa/database';

describe('JobsController', () => {
  let controller: JobsController;
  let mockDb: any;

  beforeEach(() => {
    mockDb = { prisma: {} };
    controller = new JobsController(mockDb as DatabaseService);
  });

  it('GET /api/jobs?decision=APPLY returns empty array when no jobs are stored', async () => {
    const jobs = await controller.getJobs('APPLY');

    expect(jobs).toBeDefined();
    expect(jobs.length).toBe(0);
  });

  it('triggerCollection runs collectors successfully and returns count', async () => {
    const result = await controller.triggerCollection();
    expect(result.success).toBe(true);
    expect(result.collectedCount).toBeGreaterThanOrEqual(1);
    expect(result.jobs.length).toBeGreaterThanOrEqual(1);
  }, 15000);
});
