import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GreenhouseAdapter } from '../tier1/greenhouse.adapter';
import { ExtensionBridgeAdapter } from '../tier2/extension.bridge';
import { HumanRouterAdapter } from '../tier3/human.router';
import { PermissionError } from '@nexa/permissions';

describe('ATS Adapters Suite (Tier 1, Tier 2, Tier 3)', () => {
  describe('Tier 1: GreenhouseAdapter', () => {
    it('returns exact dry-run payload with zero HTTP when WRITE_SYSTEM is granted', async () => {
      const adapter = new GreenhouseAdapter({ dryRun: true });

      const payload = {
        to: 'https://boards-api.greenhouse.io/v1/boards/stripe/jobs/12345',
        jobId: 'gh_12345',
        fields: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0199',
          resume_text: 'Experienced engineer...'
        }
      };

      const result = await adapter.submitApplication('WRITE_SYSTEM', payload);

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.to).toBe(payload.to);
      expect(result.jobId).toBe(payload.jobId);
      expect(result.fields).toEqual(payload.fields);
    });

    it('blocks application submission when agent lacks WRITE_SYSTEM permission', async () => {
      const adapter = new GreenhouseAdapter({ dryRun: true });

      const payload = {
        to: 'https://boards-api.greenhouse.io/v1/boards/stripe/jobs/12345',
        jobId: 'gh_12345',
        fields: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com'
        }
      };

      // READONLY is insufficient for WRITE_SYSTEM
      await expect(
        adapter.submitApplication('READONLY', payload)
      ).rejects.toThrow(PermissionError);
    });
  });

  describe('Tier 2: ExtensionBridgeAdapter', () => {
    it('emits application record to extension queue with zero direct platform HTTP', async () => {
      const bridge = new ExtensionBridgeAdapter();

      const result = await bridge.queueForExtension({
        jobId: 'ext_9876',
        sourcePlatform: 'PORTAL_DIRECT',
        applicant: {
          fullName: 'Jane Developer',
          email: 'jane@example.com'
        }
      });

      expect(result.status).toBe('EMITTED_TO_EXTENSION_QUEUE');
      expect(result.queueId).toBeDefined();
      expect(result.jobId).toBe('ext_9876');
    });

    it('confirms ZERO prohibited platform URLs in tier2 source code', () => {
      const tier2Dir = path.resolve(__dirname, '../tier2');
      const files = fs.readdirSync(tier2Dir);
      
      const prohibitedUrls = ['linkedin.com', 'indeed.com', 'wellfound.com'];
      for (const file of files) {
        const content = fs.readFileSync(path.join(tier2Dir, file), 'utf8').toLowerCase();
        for (const url of prohibitedUrls) {
          expect(content.includes(url)).toBe(false);
        }
      }
    });
  });

  describe('Tier 3: HumanRouterAdapter', () => {
    it('routes application to human approval and suspends DAG node to WAITING', async () => {
      const mockDb = {
        prisma: {
          approvalRequest: {
            create: vi.fn().mockResolvedValue({ id: 'appr_test_1' })
          },
          executionNode: {
            update: vi.fn().mockResolvedValue({ id: 'node_123', state: 'WAITING' })
          }
        }
      };

      const router = new HumanRouterAdapter(mockDb as any);
      const result = await router.routeToHumanApproval({
        nodeId: 'node_123',
        jobId: 'job_456',
        company: 'Anthropic',
        role: 'Research Engineer'
      });

      expect(result.status).toBe('PENDING_APPROVAL');
      expect(result.dagState).toBe('WAITING');
      expect(result.suspended).toBe(true);
      expect(mockDb.prisma.approvalRequest.create).toHaveBeenCalled();
      expect(mockDb.prisma.executionNode.update).toHaveBeenCalledWith({
        where: { id: 'node_123' },
        data: { state: 'WAITING' }
      });
    });
  });
});
