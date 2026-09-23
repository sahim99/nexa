import { LlmGateway } from '@nexa/llm';
import { UntrustedWrapper } from '@nexa/security';
import { MetricsCollector } from '@nexa/observability';

export interface TailoredSummaryRequest {
  profile: {
    fullName?: string;
    skills?: string[];
    bio?: string;
    experienceYears?: number;
  };
  job: {
    title: string;
    company: string;
    skills?: string[];
    description?: string;
  };
  rawJobDescription?: string;
}

export class ResumeService {
  constructor(
    private readonly gateway: LlmGateway = new LlmGateway(),
    private readonly metrics: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Generates a tailored executive summary / cover letter tailored to a job and profile.
   * Routes through LlmGateway.route('COVER_LETTER').
   * Deterministically falls back to TemplateProvider if providers are exhausted.
   * Guaranteed never to throw.
   */
  async generateTailoredSummary(req: TailoredSummaryRequest): Promise<string> {
    try {
      const skillsStr = (req.profile.skills && req.profile.skills.length > 0)
        ? req.profile.skills.join(', ')
        : (req.job.skills?.join(', ') || 'Software Engineering');

      const rawDescription = req.rawJobDescription || req.job.description || '';
      const safeJobDescription = rawDescription 
        ? UntrustedWrapper.wrapUntrusted(rawDescription, 'job_description') 
        : '';

      const prompt = `Candidate Profile:
Name: ${req.profile.fullName || 'Candidate'}
Experience: ${req.profile.experienceYears || '5+'} years
Skills: ${skillsStr}
Background: ${req.profile.bio || 'Experienced software professional'}

Target Job:
Role: ${req.job.title}
Company: ${req.job.company}
${safeJobDescription ? `Job Description:\n${safeJobDescription}` : ''}

Task: Write a concise, professional 3-paragraph tailored summary expressing interest in this role and highlighting relevant skills.`;

      const response = await this.gateway.complete({
        taskType: 'COVER_LETTER',
        prompt,
        variables: {
          name: req.profile.fullName || 'Applicant',
          role: req.job.title,
          company: req.job.company,
          skills: skillsStr
        }
      });

      if (response && response.content && response.content.trim().length > 0) {
        return response.content.trim();
      }

      return this.getFallbackTemplate(req);
    } catch (err: any) {
      // Deterministic fallback guarantee: never throw
      return this.getFallbackTemplate(req);
    }
  }

  private getFallbackTemplate(req: TailoredSummaryRequest): string {
    const name = req.profile.fullName || 'Applicant';
    const role = req.job.title || 'Software Engineer';
    const company = req.job.company || 'Hiring Team';
    const skills = req.profile.skills?.join(', ') || 'Software Engineering, System Design';

    return `Dear Hiring Team at ${company},\n\nI am writing to express my strong interest in the ${role} position. With my background in modern software engineering and hands-on expertise with ${skills}, I am confident in my ability to make an immediate impact on your team.\n\nThroughout my career, I have focused on delivering scalable, reliable systems and high-quality software. What excites me most about ${company} is your commitment to engineering excellence and innovation.\n\nThank you for your time and consideration.\n\nSincerely,\n${name}`;
  }
}
