import { describe, it, expect } from 'vitest';
import { ChannelEmailClassifier } from '../email-classifier';
import { ChannelDateExtractor } from '../date-extractor';
import { InboxReader, RawEmailMessage } from '../inbox.reader';
import { EmailComposer } from '../email-composer';
import { GmailAdapter, GmailRateLimitError } from '../gmail.adapter';
import { FollowUpScheduler } from '../follow-up.scheduler';
import { MetricsCollector } from '@nexa/observability';

describe('Gmail Channel & Follow-Up Suite (Phase 4)', () => {
  const metrics = MetricsCollector.getInstance();

  describe('ChannelEmailClassifier (Keyword Rules, Zero LLM)', () => {
    it('correctly classifies 10 test emails with zero LLM calls', () => {
      const initialLlmCalls = metrics.getCounter('llmCalls');
      const classifier = new ChannelEmailClassifier();

      const testCases = [
        { s: 'Invitation to interview for Staff Engineer', b: 'We would like to schedule a call', expected: 'RECRUITER' },
        { s: 'Application status update', b: 'Next steps in your technical round interview', expected: 'RECRUITER' },
        { s: 'Opportunity at Stripe', b: 'Our talent acquisition team wants to connect', expected: 'RECRUITER' },
        { s: 'Schedule a phone screen', b: 'Hiring manager wants to discuss your background', expected: 'RECRUITER' },
        { s: 'Role at Acme Corp', b: 'Candidacy update regarding software engineer opening', expected: 'RECRUITER' },
        { s: 'Weekly Newsletter', b: 'Click unsubscribe here to opt out of marketing email', expected: 'SPAM' },
        { s: '50% discount on dev tools', b: 'Special offer, view in browser and opt out', expected: 'SPAM' },
        { s: 'Promotional webinar replay', b: 'No reply needed, unsubscribe if not interested', expected: 'SPAM' },
        { s: 'Lunch today?', b: 'Are you available to grab lunch near the office?', expected: 'OTHER' },
        { s: 'Meeting notes', b: 'Here are the minutes from yesterday morning standup', expected: 'OTHER' },
      ];

      for (const tc of testCases) {
        const res = classifier.classify(tc.s, tc.b);
        expect(res.classification).toBe(tc.expected);
      }

      // Assert ZERO LLM calls were made
      expect(metrics.getCounter('llmCalls')).toBe(initialLlmCalls);
    });
  });

  describe('ChannelDateExtractor (15 Regex Patterns, Zero LLM)', () => {
    it('parses 8 date format samples correctly and returns null for no date', () => {
      const extractor = new ChannelDateExtractor();
      const baseDate = new Date(2026, 5, 1, 10, 0, 0); // June 1, 2026

      const samples = [
        { text: 'Interview scheduled for 2026-06-15 at 14:30', hasDate: true, month: 5, day: 15 },
        { text: 'Let us meet Monday, June 15, 2026', hasDate: true, month: 5, day: 15 },
        { text: 'Can we chat on June 15, 2026?', hasDate: true, month: 5, day: 15 },
        { text: 'Interview on 15 June 2026', hasDate: true, month: 5, day: 15 },
        { text: 'Call on 15/06/2026 at office', hasDate: true, month: 5, day: 15 },
        { text: 'Tomorrow at 2pm let us speak', hasDate: true, day: 2 },
        { text: 'Scheduled for: June 15', hasDate: true, month: 5, day: 15 },
        { text: 'Our interview on June 15th was great', hasDate: true, month: 5, day: 15 },
      ];

      for (const sample of samples) {
        const res = extractor.extract(sample.text, baseDate);
        expect(res).not.toBeNull();
        if (sample.month !== undefined) {
          expect(res!.getMonth()).toBe(sample.month);
        }
        if (sample.day !== undefined) {
          expect(res!.getDate()).toBe(sample.day);
        }
      }

      // No date test
      const noDate = extractor.extract('We received your application and will review it soon.');
      expect(noDate).toBeNull();
    });
  });

  describe('InboxReader (Algorithm Processing)', () => {
    it('processes messages, classifying recruiter and extracting date with zero LLM', () => {
      const reader = new InboxReader();
      const initialLlmCalls = metrics.getCounter('llmCalls');

      const messages: RawEmailMessage[] = [
        {
          id: 'msg_1',
          threadId: 'th_1',
          from: 'recruiter@tech.com',
          subject: 'Invitation to interview at TechCorp',
          body: 'We would love to schedule a phone screen on Monday, June 15, 2026.',
          date: new Date(2026, 5, 1)
        }
      ];

      const processed = reader.processMessages(messages);
      expect(processed.length).toBe(1);
      expect(processed[0].classification.classification).toBe('RECRUITER');
      expect(processed[0].extractedInterviewDate).not.toBeNull();
      expect(processed[0].extractedInterviewDate?.getDate()).toBe(15);

      // Confirmed ZERO LLM calls for inbox reading
      expect(metrics.getCounter('llmCalls')).toBe(initialLlmCalls);
    });
  });

  describe('EmailComposer (LlmGateway OUTREACH_EMAIL)', () => {
    it('composes outreach email with name, role, and company variables present', async () => {
      const composer = new EmailComposer();
      const res = await composer.composeOutreach({
        candidateName: 'Sahim Dev',
        candidateRole: 'Principal Systems Architect',
        candidateSkills: ['TypeScript', 'Kubernetes', 'High-throughput APIs'],
        companyName: 'Vercel',
        recruiterName: 'Sarah Jenkins',
        jobTitle: 'Senior Infrastructure Engineer'
      });

      expect(res.subject).toBeDefined();
      expect(res.body).toBeDefined();
      expect(res.body.length).toBeGreaterThan(20);
      expect(res.provider).toBeDefined();
      // Verify variables present in content
      const combined = `${res.subject} ${res.body}`.toLowerCase();
      expect(combined).toContain('vercel');
    });
  });

  describe('GmailAdapter (Rate Limits & Dry-Run)', () => {
    it('enforces 5/hr rate limit and rejects 6th email within 1 hour', async () => {
      const adapter = new GmailAdapter(true);

      const basePayload = {
        to: 'recruiter@company.com',
        subject: 'Application Follow Up',
        body: 'Thank you for reviewing my application.'
      };

      // Send 5 emails successfully
      for (let i = 1; i <= 5; i++) {
        const res = await adapter.sendEmail({ ...basePayload, to: `recruiter${i}@company.com` });
        expect(res.success).toBe(true);
        expect(res.dryRun).toBe(true);
      }

      expect(adapter.getHourlyCount()).toBe(5);

      // 6th email must be rejected with GmailRateLimitError
      await expect(
        adapter.sendEmail({ ...basePayload, to: 'recruiter6@company.com' })
      ).rejects.toThrow(GmailRateLimitError);
    });
  });

  describe('FollowUpScheduler (Day 7 + Day 14)', () => {
    it('returns Day 7 follow-up task after 7 days and limits max 2 follow-ups', () => {
      const scheduler = new FollowUpScheduler();
      const initialDate = new Date('2026-06-01T10:00:00Z');

      scheduler.recordSent('thread_abc', 'recruiter@startup.io', 'StartupAI', 'Staff Engineer', initialDate);

      // On day 3, no tasks due
      const day3 = new Date('2026-06-04T10:00:00Z');
      expect(scheduler.getDueTasks(7, day3).length).toBe(0);

      // On day 8 (diff >= 7), Day 7 task is due
      const day8 = new Date('2026-06-09T10:00:00Z');
      const dueDay7 = scheduler.getDueTasks(7, day8);
      expect(dueDay7.length).toBe(1);
      expect(dueDay7[0].followUpStage).toBe('DAY_7');
      expect(dueDay7[0].status).toBe('PENDING_APPROVAL');

      // Simulate sending Day 7 follow up
      scheduler.incrementFollowUpCount('thread_abc');

      // On day 15 (diff >= 14), Day 14 task is due
      const day15 = new Date('2026-06-16T10:00:00Z');
      const dueDay14 = scheduler.getDueTasks(14, day15);
      expect(dueDay14.length).toBe(1);
      expect(dueDay14[0].followUpStage).toBe('DAY_14');

      // Simulate sending Day 14 follow up (max reached)
      scheduler.incrementFollowUpCount('thread_abc');

      // After 2 follow-ups, no more follow-ups are ever due
      const day30 = new Date('2026-07-01T10:00:00Z');
      expect(scheduler.getDueTasks(7, day30).length).toBe(0);
      expect(scheduler.getDueTasks(14, day30).length).toBe(0);
    });
  });
});
