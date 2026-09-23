import { LlmGateway } from '@nexa/llm';
import { UntrustedWrapper } from '@nexa/security';

export interface EmailComposerInput {
  candidateName: string;
  candidateRole: string;
  candidateSkills: string[];
  companyName: string;
  recruiterName?: string;
  jobTitle?: string;
  contextNote?: string;
}

export interface ComposedEmail {
  subject: string;
  body: string;
  provider: string;
  model: string;
  cached: boolean;
}

export class EmailComposer {
  constructor(private readonly gateway: LlmGateway = new LlmGateway()) {}

  /**
   * Composes a cold outreach or follow-up email via LlmGateway (OUTREACH_EMAIL).
   * Primary: Groq (gemma2-9b-it) -> OpenRouter (mistral-7b-instruct:free) -> template fallback.
   * Guarantees variables { name, role, company } are populated.
   */
  async composeOutreach(input: EmailComposerInput): Promise<ComposedEmail> {
    const role = input.jobTitle || input.candidateRole || 'Software Engineer';
    const company = input.companyName;
    const recruiter = input.recruiterName || 'Hiring Team';
    const skillsStr = input.candidateSkills.length > 0 
      ? input.candidateSkills.join(', ') 
      : 'Full-stack development, cloud architecture';

    let safeContext = '';
    if (input.contextNote) {
      safeContext = UntrustedWrapper.wrapUntrusted(input.contextNote, 'context_note');
    }

    const prompt = `Compose a concise, professional cold outreach email to a recruiter:
Candidate: ${input.candidateName}
Target Role: ${role}
Company: ${company}
Recruiter: ${recruiter}
Core Skills: ${skillsStr}
${safeContext ? `Additional Context:\n${safeContext}` : ''}

Generate a clear subject line and a polite 2-paragraph outreach message.`;

    const response = await this.gateway.complete({
      taskType: 'OUTREACH_EMAIL',
      prompt,
      variables: {
        name: input.candidateName,
        role,
        company,
        recruiterName: recruiter,
        skills: skillsStr
      }
    });

    const lines = response.content.split('\n').filter(l => l.trim().length > 0);
    let subject = `Interest in ${role} position at ${company}`;
    let body = response.content;

    // If first line starts with Subject:, extract it
    if (lines[0] && lines[0].toLowerCase().startsWith('subject:')) {
      subject = lines[0].replace(/^subject:\s*/i, '').trim();
      body = lines.slice(1).join('\n').trim();
    }

    return {
      subject,
      body,
      provider: response.provider,
      model: response.model,
      cached: !!response.cached
    };
  }
}
