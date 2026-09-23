export class RetryPolicy {
  constructor(
    private readonly maxRetries: number = 3,
    private readonly initialDelayMs: number = 1000,
    private readonly backoffFactor: number = 2
  ) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let currentDelay = this.initialDelayMs;

    while (attempt < this.maxRetries) {
      try {
        return await action();
      } catch (error) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw error;
        }
        console.warn(`[RetryPolicy] Action failed, retrying in ${currentDelay}ms (Attempt ${attempt}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= this.backoffFactor;
      }
    }
    
    throw new Error('Unreachable');
  }
}
