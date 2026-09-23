import { describe, it, expect } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker';
import { GreenhouseCollector } from '../collectors/greenhouse.collector';
import { LeverCollector } from '../collectors/lever.collector';
import { YCombinatorCollector } from '../collectors/ycombinator.collector';
import { GitHubCollector } from '../collectors/github.collector';
import { NaukriCollector } from '../collectors/naukri.collector';

describe('Job Collectors & Circuit Breaker', () => {
  it('opens circuit after 3 consecutive failures, throwing CircuitOpenError on 4th attempt', async () => {
    const cb = new CircuitBreaker('test-collector', 3, 5000);
    let attempts = 0;

    const failingAction = async () => {
      attempts++;
      throw new Error('Simulated network timeout');
    };

    // First 3 calls fail normally
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failingAction)).rejects.toThrow('Simulated network timeout');
    }

    expect(attempts).toBe(3);
    expect(cb.getState()).toBe('OPEN');

    // 4th call must throw CircuitOpenError WITHOUT executing action
    await expect(cb.execute(failingAction)).rejects.toThrow(CircuitOpenError);
    expect(attempts).toBe(3); // Action was not called!
  });

  it('Greenhouse collector retrieves valid job listings', async () => {
    const collector = new GreenhouseCollector();
    const jobs = await collector.collect({ board: 'stripe' });

    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0].title).toBeDefined();
    expect(jobs[0].source).toBe('greenhouse');
  });

  it('Lever collector retrieves valid job listings', async () => {
    const collector = new LeverCollector();
    const jobs = await collector.collect({ company: 'netflix' });

    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0].url).toContain('lever.co');
    expect(jobs[0].source).toBe('lever');
  });

  it('YCombinator collector retrieves startup listings', async () => {
    const collector = new YCombinatorCollector();
    const jobs = await collector.collect();

    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0].source).toBe('ycombinator');
  });

  it('GitHub collector utilizes GITHUB_TOKEN and retrieves issues', async () => {
    const collector = new GitHubCollector(undefined, 'mock_gh_token_abc');
    expect(collector.getToken()).toBe('mock_gh_token_abc');

    const jobs = await collector.collect({ query: 'hiring engineer' });
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0].source).toBe('github');
  });

  it('Naukri collector retrieves Indian tech opportunities', async () => {
    const collector = new NaukriCollector();
    const jobs = await collector.collect({ location: 'Bangalore' });

    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0].location).toContain('Bangalore');
    expect(jobs[0].source).toBe('naukri');
  });
});
