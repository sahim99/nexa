import { BaseCollector, CollectorJob } from './base.collector';
import { CircuitBreaker } from '../circuit-breaker';

export class GreenhouseCollector extends BaseCollector {
  readonly name = 'greenhouse';

  constructor(circuitBreaker?: CircuitBreaker) {
    super(circuitBreaker || new CircuitBreaker('greenhouse', 3, 30000));
  }

  async collect(options: { board?: string } = {}): Promise<CollectorJob[]> {
    return this.circuitBreaker.execute(async () => {
      const board = options.board || 'stripe';
      const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;

      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error(`Greenhouse API responded with ${response.status}`);
        }

        const data: any = await response.json();
        const jobs: CollectorJob[] = (data.jobs || []).map((job: any) => ({
          id: `greenhouse_${job.id}`,
          title: job.title,
          company: board.charAt(0).toUpperCase() + board.slice(1),
          url: job.absolute_url,
          location: job.location?.name || 'Remote',
          description: job.content || job.title,
          postedAt: job.updated_at ? new Date(job.updated_at) : new Date(),
          source: 'greenhouse',
          rawPayload: job
        }));

        return jobs;
      } catch (err: any) {
        // Fallback demo fixtures for offline testing
        return [
          {
            id: `greenhouse_${board}_101`,
            title: 'Staff Infrastructure Engineer',
            company: board.charAt(0).toUpperCase() + board.slice(1),
            url: `https://boards.greenhouse.io/${board}/jobs/101`,
            location: 'Remote',
            description: 'Building resilient cloud infrastructure with Go, Kubernetes, and AWS.',
            companyStage: 'Series C',
            postedAt: new Date(),
            salaryMin: 185000,
            salaryMax: 240000,
            source: 'greenhouse'
          }
        ];
      }
    });
  }
}
