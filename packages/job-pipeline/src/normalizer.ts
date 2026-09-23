import { SkillExtractor, TitleNormalizer } from '@nexa/algorithms';
import { CollectorJob } from '@nexa/job-collectors';

export interface NormalizedJob {
  id: string;
  title: string;
  normalizedTitle: string;
  company: string;
  url: string;
  location: string;
  description: string;
  skills: string[];
  companyStage: string;
  postedAt: Date;
  salaryMin?: number;
  salaryMax?: number;
  source: string;
  normalizedAt: Date;
}

export class JobNormalizer {
  private skillExtractor: SkillExtractor;

  constructor() {
    this.skillExtractor = new SkillExtractor();
  }

  /**
   * Normalizes a raw CollectorJob using pure algorithms:
   * - Skill taxonomy extraction (<1ms, zero LLM)
   * - Canonical title normalization (<1ms, zero LLM)
   */
  public normalize(job: CollectorJob): NormalizedJob {
    const textToScan = `${job.title} ${job.description || ''}`;
    const extractedSkills = this.skillExtractor.extract(textToScan);
    const normalizedTitle = TitleNormalizer.normalize(job.title);

    return {
      id: job.id,
      title: job.title,
      normalizedTitle,
      company: job.company,
      url: job.url,
      location: job.location || 'Remote',
      description: job.description || job.title,
      skills: extractedSkills,
      companyStage: job.companyStage || 'Unspecified',
      postedAt: job.postedAt || new Date(),
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      source: job.source,
      normalizedAt: new Date()
    };
  }
}

export const Normalizer = JobNormalizer;
export type Normalizer = JobNormalizer;
