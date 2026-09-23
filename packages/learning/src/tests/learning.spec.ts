import { describe, it, expect } from 'vitest';
import { OutcomeTracker, INITIAL_WEIGHTS } from '../outcome.tracker';

describe('OutcomeTracker & Dynamic Weight Adjuster', () => {
  it('persists outcomes and triggers weight adjustment after 10 outcomes', async () => {
    const tracker = new OutcomeTracker();
    expect(tracker.getWeights()).toEqual(INITIAL_WEIGHTS);

    // Record 9 outcomes
    for (let i = 1; i <= 9; i++) {
      await tracker.recordOutcome({
        jobId: `job_${i}`,
        outcome: i % 2 === 0 ? 'INTERVIEW' : 'REJECTION'
      });
    }

    expect(tracker.getOutcomes().length).toBe(9);
    expect(tracker.getWeights()).toEqual(INITIAL_WEIGHTS); // Unchanged before 10

    // Record 10th outcome (triggering weight shift)
    await tracker.recordOutcome({
      jobId: 'job_10',
      outcome: 'INTERVIEW'
    });

    expect(tracker.getOutcomes().length).toBe(10);
    const adjusted = tracker.getWeights();
    expect(adjusted).not.toEqual(INITIAL_WEIGHTS); // Weights shifted!
    expect(adjusted.role).toBe(35); // Role weight boosted to 35 on strong conversion
    expect(adjusted.skills).toBe(25);
  });
});
