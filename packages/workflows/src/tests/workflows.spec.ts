import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import {
  SchedulerService,
  DailyJobScanWorkflow,
  DailyBriefingWorkflow,
  CvOptimizerWorkflow,
  NightlySyncWorkflow,
  FollowUpCheckWorkflow
} from '../index';

describe('Phase 8: Scheduler + Autonomy Workflows', () => {
  describe('SchedulerService & Dedup Lock', () => {
    let scheduler: SchedulerService;

    beforeEach(() => {
      scheduler = new SchedulerService();
    });

    it('acquires and releases distributed lock', async () => {
      const lockKey = scheduler.getLockKey('test_job', 'user_1');
      const acquired1 = await scheduler.acquireLock(lockKey, 10);
      expect(acquired1).toBe(true);

      // Second attempt on same key must fail
      const acquired2 = await scheduler.acquireLock(lockKey, 10);
      expect(acquired2).toBe(false);

      // Release lock
      await scheduler.releaseLock(lockKey);

      // Third attempt must succeed
      const acquired3 = await scheduler.acquireLock(lockKey, 10);
      expect(acquired3).toBe(true);
      await scheduler.releaseLock(lockKey);
    });

    it('prevents duplicate workflow execution using withLock', async () => {
      let callCount = 0;
      scheduler.registerWorkflow(
        'heavy_sync',
        async () => {
          callCount++;
          await new Promise((r) => setTimeout(r, 50));
          return { done: true };
        },
        { lockTtlSeconds: 5 }
      );

      // Trigger two concurrent runs
      const [res1, res2] = await Promise.all([
        scheduler.triggerWorkflow('heavy_sync', 'user_alpha'),
        scheduler.triggerWorkflow('heavy_sync', 'user_alpha')
      ]);

      const successCount = [res1, res2].filter((r) => r.status === 'SUCCESS').length;
      const lockedCount = [res1, res2].filter((r) => r.status === 'SKIPPED_LOCKED').length;

      expect(successCount).toBe(1);
      expect(lockedCount).toBe(1);
      expect(callCount).toBe(1);

      // Check run history
      const history = scheduler.getRunHistory();
      expect(history.length).toBe(2);
      expect(history.some((h) => h.status === 'SUCCESS')).toBe(true);
      expect(history.some((h) => h.status === 'SKIPPED_LOCKED')).toBe(true);
    });
  });

  describe('DailyJobScanWorkflow', () => {
    it('executes job scan pipeline with algorithm-dominated decisions', async () => {
      const scan = new DailyJobScanWorkflow();
      const result = await scan.run('test_user');

      expect(result).toBeDefined();
      expect(result.totalScanned).toBeGreaterThan(0);
      expect(result.dedupedCount).toBeGreaterThan(0);
      expect(result.metrics.algorithmDecisions).toBeGreaterThan(0);
      expect(result.metrics.algorithmRatioPercent).toBeGreaterThanOrEqual(40);

      // Real jobs have decisions and reasons
      const firstJob = result.jobs[0];
      expect(firstJob).toBeDefined();
      expect(['APPLY', 'APPLY_LATER', 'WATCH', 'SKIP']).toContain(firstJob.decision);
      expect(firstJob.reason.length).toBeGreaterThan(0);
    });
  });

  describe('DailyBriefingWorkflow', () => {
    it('generates summary and MP3 audio brief (with template fallback)', async () => {
      const workflow = new DailyBriefingWorkflow();
      const result = await workflow.run('test_user', {
        userName: 'Sahim',
        activities: [
          'Evaluated 24 new positions from Greenhouse and Lever',
          '3 roles matched target profile: Stripe, Netflix, and Vercel',
          'Outreach emails prepared and queued in approval center'
        ]
      });

      expect(result).toBeDefined();
      expect(result.textSummary).toBeDefined();
      expect(result.textSummary.length).toBeGreaterThan(0);
      expect(result.mp3Path).toBeDefined();
      expect(fs.existsSync(result.mp3Path)).toBe(true);

      const stats = fs.statSync(result.mp3Path);
      expect(stats.size).toBeGreaterThan(64);

      // Clean up
      try {
        fs.unlinkSync(result.mp3Path);
      } catch {}
    });
  });

  describe('CvOptimizerWorkflow', () => {
    it('rotates skills deterministically with strictly zero LLM calls', async () => {
      const workflow = new CvOptimizerWorkflow();
      const skills = ['Node.js', 'React.js', 'TypeScript', 'PostgreSQL'];

      const result = await workflow.run('test_user', { skills, dayOfYear: 1 });

      expect(result.llmCalls).toBe(0);
      expect(result.algorithm).toBe('SynonymRotator');
      expect(result.originalSkills).toEqual(skills);
      expect(result.optimizedSkills.length).toBe(skills.length);
      expect(result.swapsMade).toBeGreaterThan(0);
    });
  });

  describe('NightlySyncWorkflow & FollowUpCheckWorkflow', () => {
    it('executes maintenance sync and follow-up checks', async () => {
      const nightly = new NightlySyncWorkflow();
      const nightlyRes = await nightly.run('test_user');
      expect(nightlyRes.timestamp).toBeDefined();
      expect(nightlyRes.scorerWeightsUpdated).toBe(true);

      const followUp = new FollowUpCheckWorkflow();
      const followUpRes = await followUp.run('test_user');
      expect(followUpRes.timestamp).toBeDefined();
      expect(Array.isArray(followUpRes.tasks)).toBe(true);
    });
  });
});
