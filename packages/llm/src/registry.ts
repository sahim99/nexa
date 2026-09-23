import { LlmProvider, ProviderHealth, ProviderName } from './providers/base.provider';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private readonly providers = new Map<ProviderName, LlmProvider>();

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register(name: ProviderName, provider: LlmProvider): void {
    this.providers.set(name, provider);
  }

  public get(name: ProviderName): LlmProvider | undefined {
    return this.providers.get(name);
  }

  public has(name: ProviderName): boolean {
    return this.providers.has(name);
  }

  public listAll(): LlmProvider[] {
    return Array.from(this.providers.values());
  }

  public listNames(): ProviderName[] {
    return Array.from(this.providers.keys());
  }

  public unregister(name: ProviderName): boolean {
    return this.providers.delete(name);
  }

  public clear(): void {
    this.providers.clear();
  }

  public async health(): Promise<Record<ProviderName, ProviderHealth>> {
    const results: Partial<Record<ProviderName, ProviderHealth>> = {};
    for (const [name, provider] of this.providers.entries()) {
      try {
        results[name] = await provider.getHealthStatus();
      } catch (err: any) {
        results[name] = {
          name,
          status: 'DOWN',
          latencyMs: 0,
          message: err.message,
          checkedAt: new Date()
        };
      }
    }
    return results as Record<ProviderName, ProviderHealth>;
  }
}
