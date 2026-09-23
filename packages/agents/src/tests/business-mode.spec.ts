import { describe, it, expect } from 'vitest';
import {
  MarketResearchAgent,
  ProductManagerAgent,
  BusinessPlanAgent,
  LaunchAgent,
  SelfRepairAgent
} from '../index';

describe('Phase 9: Business Creation Mode & Self-Repair', () => {
  const sampleIdea = 'AI-driven DevOps Observability and Automated Remediation Platform';

  it('MarketResearchAgent returns structured market intelligence with opportunity score', async () => {
    const agent = new MarketResearchAgent();
    const result = await agent.research({
      idea: sampleIdea,
      targetAudience: 'Enterprise Engineering Teams',
      industry: 'Cloud Infrastructure'
    });

    expect(result).toBeDefined();
    expect(result.marketSize).toBeDefined();
    expect(result.marketSize.length).toBeGreaterThan(0);
    expect(Array.isArray(result.competitors)).toBe(true);
    expect(result.competitors.length).toBeGreaterThan(0);
    expect(typeof result.opportunityScore).toBe('number');
    expect(result.opportunityScore).toBeGreaterThanOrEqual(1);
    expect(result.opportunityScore).toBeLessThanOrEqual(100);
    expect(result.rationale).toBeDefined();
  });

  it('ProductManagerAgent generates PRD with non-empty user stories list', async () => {
    const agent = new ProductManagerAgent();
    const result = await agent.generatePRD({
      idea: sampleIdea,
      targetAudience: 'DevOps Engineers'
    });

    expect(result).toBeDefined();
    expect(result.prdTitle).toBeDefined();
    expect(result.overview.length).toBeGreaterThan(0);
    expect(Array.isArray(result.userStories)).toBe(true);
    expect(result.userStories.length).toBeGreaterThan(0);

    const firstStory = result.userStories[0];
    expect(firstStory.asA).toBeDefined();
    expect(firstStory.iWant).toBeDefined();
    expect(firstStory.soThat).toBeDefined();

    expect(Array.isArray(result.mvpFeatures)).toBe(true);
    expect(result.mvpFeatures.length).toBeGreaterThan(0);
  });

  it('BusinessPlanAgent produces 3 non-empty core sections: revenue, GTM, and financials', async () => {
    const agent = new BusinessPlanAgent();
    const result = await agent.generatePlan({
      idea: sampleIdea
    });

    expect(result).toBeDefined();
    expect(result.revenue).toBeDefined();
    expect(result.revenue.trim().length).toBeGreaterThan(15);

    expect(result.gtm).toBeDefined();
    expect(result.gtm.trim().length).toBeGreaterThan(15);

    expect(result.financials).toBeDefined();
    expect(result.financials.trim().length).toBeGreaterThan(15);

    expect(result.executiveSummary).toBeDefined();
  });

  it('LaunchAgent generates copy and strictly queues to approval without external publishing', async () => {
    const agent = new LaunchAgent();
    const result = await agent.prepareLaunch({
      idea: sampleIdea
    });

    expect(result).toBeDefined();
    expect(result.landingPageHeadline.length).toBeGreaterThan(0);
    expect(result.pitchDeckSummary.length).toBeGreaterThan(0);
    expect(result.outreachCopy.length).toBeGreaterThan(0);

    // CRITICAL SECURITY ASSERTIONS
    expect(result.queuedForApproval).toBe(true);
    expect(result.approvalQueueId).toBeDefined();
    expect(result.publishedExternally).toBe(false);
  });

  it('SelfRepairAgent runs algorithm health check and handles injected failure with Telegram alert', async () => {
    const agent = new SelfRepairAgent();

    // 1. Algorithm health check (<5ms)
    const health = await agent.checkHealth();
    expect(health).toBeDefined();
    expect(['HEALTHY', 'DEGRADED', 'DOWN']).toContain(health.overallStatus);
    expect(health.components.length).toBeGreaterThan(0);

    // 2. Injected failure handling
    const issue = agent.handleFailure(
      'greenhouse_collector',
      'API rate limit reached (HTTP 429)',
      'HIGH'
    );

    expect(issue).toBeDefined();
    expect(issue.issueId).toBeDefined();
    expect(issue.component).toBe('greenhouse_collector');
    expect(issue.telegramAlertQueued).toBe(true);
    expect(issue.recommendedAction.length).toBeGreaterThan(0);

    // Check issues history
    const issues = agent.getIssues();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].issueId).toBe(issue.issueId);
  });
});
