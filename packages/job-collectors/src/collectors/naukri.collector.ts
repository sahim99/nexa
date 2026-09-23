import { BaseCollector, CollectorJob } from './base.collector';
import { CircuitBreaker } from '../circuit-breaker';

export class NaukriCollector extends BaseCollector {
  readonly name = 'naukri';

  constructor(circuitBreaker?: CircuitBreaker) {
    super(circuitBreaker || new CircuitBreaker('naukri', 3, 30000));
  }

  async collect(options: { keywords?: string; location?: string } = {}): Promise<CollectorJob[]> {
    return this.circuitBreaker.execute(async () => {
      const keywords = options.keywords || 'software engineer';
      const location = options.location || 'Bangalore';

      // Naukri public aggregator / RSS mock adapter
      return [
        {
          id: 'naukri_in_501',
          title: 'Lead Full Stack Engineer (React & Node.js)',
          company: 'Fintech India Unicorn',
          url: 'https://www.naukri.com/job-listings-501',
          location: `${location} / Hybrid`,
          description: 'Looking for 5+ years experience in React, TypeScript, Node.js, and high scale microservices.',
          companyStage: 'Series D',
          postedAt: new Date(),
          salaryMin: 3500000, // 35 LPA INR
          salaryMax: 5000000,
          source: 'naukri'
        },
        {
          id: 'naukri_in_502',
          title: 'Senior DevOps & Kubernetes Engineer',
          company: 'CloudTech Solutions India',
          url: 'https://www.naukri.com/job-listings-502',
          location: 'Hyderabad / Remote',
          description: 'Hands on experience managing multi-region Kubernetes clusters on AWS with Terraform and CI/CD pipelines.',
          companyStage: 'Growth',
          postedAt: new Date(),
          salaryMin: 3000000,
          salaryMax: 4500000,
          source: 'naukri'
        }
      ];
    });
  }
}
