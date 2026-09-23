export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;

  constructor(
    private readonly failureThreshold: number = 3,
    private readonly resetTimeoutMs: number = 30000
  ) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is OPEN. Fast failing.');
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.failureThreshold) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        // Half-open, try again
        this.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private onSuccess() {
    this.failures = 0;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}
