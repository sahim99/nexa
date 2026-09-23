import { describe, it, expect } from 'vitest';
import { ChannelEmailClassifier, EmailComposer, FollowUpScheduler } from '@nexa/channels';
import { MetricsCollector } from '@nexa/observability';

describe('E2E: Communication & Outreach Flow', () => {
  it('classifies email via algorithm (zero LLM) and composes outreach via LlmGateway', async () => {
    const metrics = MetricsCollector.getInstance();
    const classifier = new ChannelEmailClassifier();
    const composer = new EmailComposer();
    const scheduler = new FollowUpScheduler();

    // 1. Inbound email classified via algorithm
    const initialLlmCalls = metrics.getCounter('llmCalls');
    const classification = classifier.classify(
      'Invitation to interview for Staff Infrastructure Engineer',
      'We would love to schedule a technical round with our hiring manager.'
    );

    expect(classification.classification).toBe('RECRUITER');
    // Confirm zero LLM calls for classification
    expect(metrics.getCounter('llmCalls')).toBe(initialLlmCalls);

    // 2. Outbound outreach generated via LlmGateway
    const outreach = await composer.composeOutreach({
      candidateName: 'Jane Dev',
      candidateRole: 'Staff Infrastructure Engineer',
      candidateSkills: ['TypeScript', 'Kubernetes', 'Go'],
      companyName: 'Datadog',
      recruiterName: 'Alex'
    });

    expect(outreach.subject).toBeDefined();
    expect(outreach.body).toBeDefined();
    expect(outreach.body.length).toBeGreaterThan(20);

    // 3. Register with follow-up scheduler
    scheduler.recordSent('thread_test_1', 'alex@datadog.com', 'Datadog', 'Staff Infrastructure Engineer');
    expect(scheduler.getRecord('thread_test_1')).toBeDefined();
  });
});
