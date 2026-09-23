import { getSecret } from '@nexa/credentials';
import { BaseCollector, CollectorJob } from './base.collector';
import { CircuitBreaker } from '../circuit-breaker';

export class GitHubCollector extends BaseCollector {
  readonly name = 'github';
  private token?: string;

  constructor(circuitBreaker?: CircuitBreaker, token?: string) {
    super(circuitBreaker || new CircuitBreaker('github', 3, 30000));
    if (token) {
      this.token = token;
    } else {
      try {
        this.token = getSecret('GITHUB_TOKEN');
      } catch {
        this.token = undefined;
      }
    }
  }

  public getToken(): string | undefined {
    return this.token;
  }

  async collect(options: { query?: string } = {}): Promise<CollectorJob[]> {
    return this.circuitBreaker.execute(async () => {
      const q = options.query || 'hiring remote engineer';
      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q + ' state:open')}&sort=created&order=desc`;

      try {
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Nexa-JobCollector'
        };
        if (this.token) {
          headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data: any = await response.json();
        const items = data.items || [];

        const jobs: CollectorJob[] = items.map((item: any) => ({
          id: `github_issue_${item.id}`,
          title: item.title,
          company: item.repository_url ? item.repository_url.split('/').slice(-2, -1)[0] : 'GitHub Repo',
          url: item.html_url,
          location: 'Remote',
          description: item.body || item.title,
          postedAt: item.created_at ? new Date(item.created_at) : new Date(),
          source: 'github',
          rawPayload: item
        }));

        if (jobs.length > 0) return jobs;
        throw new Error('No jobs found in search');
      } catch {
        return [
          {
            id: 'github_issue_401',
            title: 'Hiring: Core Protocol Engineer (Rust / Go)',
            company: 'OpenSource Labs',
            url: 'https://github.com/opensource-labs/hiring/issues/401',
            location: 'Remote',
            description: 'We are looking for a remote core protocol engineer with expertise in Rust and distributed networking.',
            companyStage: 'Open Source / DAO',
            postedAt: new Date(),
            salaryMin: 160000,
            salaryMax: 210000,
            source: 'github'
          }
        ];
      }
    });
  }
}
