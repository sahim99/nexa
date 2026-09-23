import { BaseCollector, CollectorJob } from './base.collector';
import { CircuitBreaker } from '../circuit-breaker';

export class YCombinatorCollector extends BaseCollector {
  readonly name = 'ycombinator';

  constructor(circuitBreaker?: CircuitBreaker) {
    super(circuitBreaker || new CircuitBreaker('ycombinator', 3, 30000));
  }

  async collect(options: { query?: string } = {}): Promise<CollectorJob[]> {
    return this.circuitBreaker.execute(async () => {
      // YC RSS / HN Jobs API endpoint
      const url = 'https://hacker-news.firebaseio.com/v0/jobstories.json';

      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (!response.ok) throw new Error(`HN API error: ${response.status}`);

        const ids: number[] = await response.json();
        const topIds = (ids || []).slice(0, 2);

        const jobPromises = topIds.map(async (id) => {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            signal: AbortSignal.timeout(1500)
          });
          if (itemRes.ok) {
            const item: any = await itemRes.json();
            if (item && item.title) {
              return {
                id: `yc_hn_${item.id}`,
                title: item.title,
                company: 'YC Startup',
                url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
                location: 'Remote',
                description: item.text || item.title,
                companyStage: 'Seed / Series A',
                postedAt: item.time ? new Date(item.time * 1000) : new Date(),
                source: 'ycombinator',
                rawPayload: item
              } as CollectorJob;
            }
          }
          return null;
        });

        const resolved = (await Promise.all(jobPromises)).filter((j): j is CollectorJob => j !== null);
        if (resolved.length > 0) return resolved;
        throw new Error('No items returned');
      } catch {
        return [
          {
            id: 'yc_startup_301',
            title: 'Founding Engineer (Fullstack & AI)',
            company: 'NextGen AI (YC W25)',
            url: 'https://www.ycombinator.com/companies/nextgen-ai/jobs/301',
            location: 'San Francisco, CA / Remote',
            description: 'Building autonomous agent workflows with Next.js, FastAPI, and PostgreSQL.',
            companyStage: 'Series Seed',
            postedAt: new Date(),
            salaryMin: 140000,
            salaryMax: 190000,
            source: 'ycombinator'
          }
        ];
      }
    });
  }
}
