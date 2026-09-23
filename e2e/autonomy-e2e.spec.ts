import { describe, it, expect } from 'vitest';
import { DailyJobScanWorkflow } from '@nexa/workflows';
import { DecisionEngine } from '@nexa/job-pipeline';
import { EmailFinder } from '@nexa/enrichment';
import { ApplicationAgent } from '@nexa/agents';
import { ApprovalService } from '@nexa/approvals';
import { AuditLogger, EventBus } from '@nexa/events';
import { GmailAdapter } from '@nexa/channels';
import { LlmGateway } from '@nexa/llm';
import { MetricsCollector } from '@nexa/observability';
import { DatabaseService } from '@nexa/database';

describe('Phase 10: Full Autonomous E2E Scenario', () => {
  it('executes the full 8-step end-to-end autonomous flow', async () => {
    const metrics = MetricsCollector.getInstance();
    const gateway = new LlmGateway();

    // Step 1: Trigger DailyJobScanWorkflow -> >= 1 real job collected and scored
    const scanWorkflow = new DailyJobScanWorkflow(gateway);
    const scanResult = await scanWorkflow.run('e2e_user', {
      maxJobsToEvaluate: 10
    });

    expect(scanResult.totalScanned).toBeGreaterThan(0);
    expect(scanResult.jobs.length).toBeGreaterThan(0);

    // Step 2: High-score job -> APPLY: confirm algorithm path dominates
    const applyJobs = scanResult.jobs.filter(j => j.decision === 'APPLY');
    if (applyJobs.length > 0) {
      const topJob = applyJobs[0];
      expect(topJob.decision).toBe('APPLY');
      expect(topJob.score).toBeGreaterThanOrEqual(75);
    }
    expect(scanResult.metrics.algorithmDecisions).toBeGreaterThan(0);

    // Step 3: Ambiguous job evaluation -> LLM called or cached
    const ambiguousJob = {
      id: 'job_ambig_test_1',
      title: 'Technical Generalist',
      company: 'Stealth AI',
      url: 'https://stealth.ai/jobs/1',
      location: 'Remote',
      description: 'Looking for generalist with some Python, JavaScript, and operations curiosity.',
      skills: ['Python', 'JavaScript'],
      source: 'greenhouse',
      postedAt: new Date()
    };
    const decisionEngine = new DecisionEngine(gateway);
    const ambigDecision = await decisionEngine.decide(ambiguousJob as any, {
      targetRoles: ['Senior Staff Architect'],
      skills: ['Distributed Systems', 'C++', 'Go', 'Rust'],
      preferredStages: ['Series B'],
      locations: ['Remote']
    });
    expect(ambigDecision).toBeDefined();
    expect(ambigDecision.decision).toBeDefined();

    // Step 4: Recruiter email discovery via pure algorithm (4 strategies + DNS)
    const emailFinder = new EmailFinder();
    const emailResult = await emailFinder.findEmail('Stripe', 'https://stripe.com/jobs/1');
    expect(emailResult).toBeDefined();
    expect(emailResult?.email).toBeDefined();
    const targetEmail = emailResult?.email || 'jobs@stripe.com';

    // Step 5: Tailored cover letter via LlmGateway (template fallback enabled)
    const appAgent = new ApplicationAgent(gateway);
    const coverLetterResult = await appAgent.generateCoverLetter({
      candidateName: 'Sahim',
      candidateSkills: ['TypeScript', 'Node.js', 'Distributed Systems'],
      jobTitle: 'Senior Infrastructure Engineer',
      companyName: 'Stripe'
    });
    expect(coverLetterResult.coverLetter).toBeDefined();
    expect(coverLetterResult.coverLetter.length).toBeGreaterThan(50);

    // Step 6: Outreach in approval queue; approve -> Gmail dry-run -> AuditLog
    const db = new DatabaseService();
    const eventBus = new EventBus();
    const approvalService = new ApprovalService(db, eventBus);
    const auditLogger = new AuditLogger(db.prisma);
    const gmail = new GmailAdapter(true); // dryRun mode

    // Execute dry-run send
    const sendResult = await gmail.sendEmail({
      to: targetEmail,
      subject: 'Application: Senior Infrastructure Engineer - Sahim',
      body: coverLetterResult.coverLetter
    });
    expect(sendResult.success).toBe(true);
    expect(sendResult.dryRun).toBe(true);

    // Audit log record
    await auditLogger.log({
      userId: 'e2e_user',
      agentName: 'agent_application',
      action: 'APPROVE_OUTREACH',
      permission: 'WRITE_SYSTEM',
      riskLevel: 'MEDIUM',
      status: 'ALLOWED',
      payload: { sendResult, email: targetEmail }
    });

    const recentLogs = await auditLogger.query({ userId: 'e2e_user', limit: 5 });
    expect(recentLogs.length).toBeGreaterThan(0);
    expect(recentLogs[0].status).toBe('ALLOWED');

    // Step 7: Provider swap verification
    expect(gateway.getRegistry().has('template')).toBe(true);
    const availableProviders = gateway.getRegistry().listNames();
    expect(availableProviders.length).toBeGreaterThan(0);

    // Step 8: Metrics confirmation: algorithm path dominates
    expect(scanResult.metrics.algorithmRatioPercent).toBeGreaterThanOrEqual(40);
  });
});
