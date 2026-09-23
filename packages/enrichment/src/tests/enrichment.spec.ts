import { describe, it, expect } from 'vitest';
import { EmailFinder } from '../email-finder';

describe('EmailFinder & Enrichment Engine', () => {
  const finder = new EmailFinder();

  it('discovers valid contact email with confidence > 0 for known company domain', async () => {
    const result = await finder.findEmail('Google');

    expect(result).not.toBeNull();
    expect(result?.confidence).toBeGreaterThan(0);
    expect(result?.email).toBe('jobs@google.com');
    expect(result?.strategy).toBe('VERIFIED_MX');
  });

  it('extracts embedded contact email from posting URL if available', async () => {
    const result = await finder.findEmail('StartupCo', 'https://startupco.com/jobs/apply?contact=recruiting@startupco.com');

    expect(result).not.toBeNull();
    expect(result?.email).toBe('recruiting@startupco.com');
    expect(result?.strategy).toBe('JOB_PAGE');
  });
});
