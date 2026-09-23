import {
  LlmProvider,
  LlmRequest,
  LlmResponse,
  ProviderHealth,
  ProviderName,
  Quota,
  TaskType
} from './base.provider';

export class TemplateProvider implements LlmProvider {
  readonly name: ProviderName = 'template';

  readonly models: Partial<Record<TaskType, string>> = {
    COVER_LETTER: 'deterministic-template-v1',
    OUTREACH_EMAIL: 'deterministic-template-v1',
    BRIEFING_SUMMARY: 'deterministic-template-v1',
    FAST_CLASSIFICATION: 'deterministic-template-v1',
    JD_ANALYSIS: 'deterministic-template-v1',
    BUSINESS_REASONING: 'deterministic-template-v1',
    FUNCTION_CALLING: 'deterministic-template-v1',
    GENERAL_CHAT: 'deterministic-template-v1'
  };

  readonly rateLimit = {
    requestsPerMinute: 0, // unlimited
    requestsPerDay: 0
  };

  readonly costPerMillionTokens = {
    input: 0,
    output: 0
  };

  private readonly templates: Record<TaskType, string> = {
    COVER_LETTER: `Dear Hiring Team at {company},

I am writing to express my strong enthusiasm for the {role} position. With my background in modern software engineering and hands-on expertise with {skills}, I am confident in my ability to make an immediate, meaningful impact on your engineering initiatives.

Throughout my experience, I have developed scalable, resilient systems and delivered reliable production software. What excites me most about {company} is your commitment to quality and technical excellence. I look forward to bringing my problem-solving mindset and technical discipline to your team.

Thank you for your time and consideration.

Sincerely,
{name}`,

    OUTREACH_EMAIL: `Hi {recruiterName},

I came across the {role} opening at {company} and was impressed by the team's work. With extensive experience in {skills}, I believe my background aligns closely with what you are looking for.

I'd welcome the chance to connect briefly if you have a few minutes this week.

Best regards,
{name}`,

    BRIEFING_SUMMARY: `Daily Briefing for {name}:
• Pipeline run complete: Processed {processedCount} jobs.
• Highest match: {role} at {company}.
• Status: Ready for review.`,

    FAST_CLASSIFICATION: `{"classification": "RELEVANT", "confidence": 0.85, "reason": "Keyword and taxonomy match detected."}`,

    JD_ANALYSIS: `{"match": true, "score": 80, "strengths": ["{skills}"], "gaps": [], "recommendation": "APPLY"}`,

    BUSINESS_REASONING: `Business Analysis for {company}:
Executive Summary: Operational viability confirmed.
Key Drivers: Market demand, low overhead, targeted value proposition.
Recommended Action: Proceed with controlled execution.`,

    FUNCTION_CALLING: `{"tool": "none", "parameters": {}}`,

    GENERAL_CHAT: `Hello! I am your Nexa assistant. All upstream AI quotas are currently resting, but I am operating in high-reliability deterministic mode to ensure continuous service. How can I help you today?`,

    EMBEDDING: ``
  };

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getRemainingQuota(): Promise<Quota> {
    return {
      remainingMinute: 999999,
      remainingDay: 999999,
      isAvailable: true
    };
  }

  async getHealthStatus(): Promise<ProviderHealth> {
    return {
      name: this.name,
      status: 'HEALTHY',
      latencyMs: 0,
      checkedAt: new Date()
    };
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const rawTemplate = this.templates[req.taskType] || 'Standard template output.';
    
    // Fill variables
    const vars: Record<string, string> = {
      name: 'Applicant',
      role: 'Software Engineer',
      company: 'the company',
      skills: 'Full-stack engineering, TypeScript, Cloud architecture',
      recruiterName: 'Hiring Manager',
      processedCount: '0',
      ...(req.variables || {})
    };

    let populated = rawTemplate;
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      populated = populated.replace(regex, value);
    }

    const words = populated.split(/\s+/).filter(Boolean).length;
    const tokenEst = Math.ceil(words * 1.3);

    return {
      content: populated,
      provider: this.name,
      model: this.models[req.taskType] || 'deterministic-template-v1',
      taskType: req.taskType,
      usage: {
        promptTokens: 0,
        completionTokens: tokenEst,
        totalTokens: tokenEst
      },
      cached: false,
      cost: 0,
      latencyMs: 0
    };
  }
}
