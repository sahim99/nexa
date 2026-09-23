import * as crypto from 'crypto';

export interface DeduplicateResult {
  jobId: string;
  isNew: boolean;
}

export class JobDeduplicator {
  private seenHashes = new Set<string>();

  public static generateJobId(company: string, role: string, url: string): string {
    const raw = `${company.toLowerCase().trim()}|${role.toLowerCase().trim()}|${url.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Evaluates if a job is new. If new, registers it in memory.
   */
  public deduplicate(company: string, role: string, url: string): DeduplicateResult {
    const jobId = JobDeduplicator.generateJobId(company, role, url);

    if (this.seenHashes.has(jobId)) {
      return { jobId, isNew: false };
    }

    this.seenHashes.add(jobId);
    return { jobId, isNew: true };
  }

  public has(jobId: string): boolean {
    return this.seenHashes.has(jobId);
  }

  public clear(): void {
    this.seenHashes.clear();
  }
}
