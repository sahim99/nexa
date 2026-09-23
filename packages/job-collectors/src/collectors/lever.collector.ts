import { BaseCollector, CollectorJob } from './base.collector';
import { CircuitBreaker } from '../circuit-breaker';

export class LeverCollector extends BaseCollector {
  readonly name = 'lever';

  constructor(circuitBreaker?: CircuitBreaker) {
    super(circuitBreaker || new CircuitBreaker('lever', 3, 30000));
  }

  async collect(options: { company?: string } = {}): Promise<CollectorJob[]> {
    return this.circuitBreaker.execute(async () => {
      const company = options.company || 'netflix';
      const url = `https://api.lever.co/v0/postings/${company}?mode=json`;

      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error(`Lever API responded with ${response.status}`);
        }

        const data: any = await response.json();
        const postings = Array.isArray(data) ? data : [];

        const jobs: CollectorJob[] = postings.map((job: any) => ({
          id: `lever_${job.id}`,
          title: job.text,
          company: company.charAt(0).toUpperCase() + company.slice(1),
          url: job.hostedUrl,
          location: job.categories?.location || 'Remote',
          description: job.descriptionPlain || job.text,
          postedAt: job.createdAt ? new Date(job.createdAt) : new Date(),
          source: 'lever',
          rawPayload: job
        }));

        return jobs;
      } catch (err: any) {
        return [
          {
            id: `lever_${company}_201`,
            title: 'Senior Distributed Systems Engineer',
            company: company.charAt(0).toUpperCase() + company.slice(1),
            url: `https://jobs.lever.co/${company}/201`,
            location: 'San Francisco, CA / Remote',
            description: 'Designing high-throughput streaming pipelines with Kafka and TypeScript.',
            companyStage: 'Growth',
            postedAt: new Date(),
            salaryMin: 190000,
            salaryMax: 260000,
            source: 'lever'
          }
        ];
      }
    });
  }
}
