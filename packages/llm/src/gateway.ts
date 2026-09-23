import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';
import { PromptCache } from './cache/prompt.cache';
import {
  LlmProvider,
  LlmRequest,
  LlmResponse,
  ProviderName,
  TaskType
} from './providers/base.provider';
import { GroqProvider } from './providers/groq.provider';
import { HuggingFaceProvider } from './providers/huggingface.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { TemplateProvider } from './providers/template.provider';
import { QuotaManager } from './quota.manager';
import { ProviderRegistry } from './registry';

export interface TaskRouteConfig {
  primary: ProviderName | string;
  model?: string;
  maxTokens?: number;
  fallback?: ProviderName | string;
  fallbackModel?: string;
  lastResort?: ProviderName | string;
}

export type ProviderMapConfig = Record<TaskType, TaskRouteConfig>;

export class LlmGateway {
  private config: Partial<ProviderMapConfig> = {};
  private configPath: string;

  constructor(
    private readonly registry: ProviderRegistry = ProviderRegistry.getInstance(),
    private readonly cache: PromptCache = new PromptCache(),
    private readonly quotaManager: QuotaManager = new QuotaManager(),
    customConfigPath?: string
  ) {
    const possiblePaths = [
      customConfigPath,
      path.resolve(__dirname, './config/provider-map.yaml'),
      path.resolve(__dirname, '../src/config/provider-map.yaml'),
      path.resolve(process.cwd(), 'packages/llm/src/config/provider-map.yaml'),
      path.resolve(process.cwd(), 'packages/llm/dist/config/provider-map.yaml'),
    ].filter(Boolean) as string[];

    this.configPath = possiblePaths.find((p) => fs.existsSync(p)) || path.resolve(__dirname, './config/provider-map.yaml');

    this.registerDefaultProviders();
    this.loadConfig();
  }

  private registerDefaultProviders(): void {
    if (!this.registry.has('template')) {
      this.registry.register('template', new TemplateProvider());
    }
    if (!this.registry.has('groq')) {
      this.registry.register('groq', new GroqProvider(this.quotaManager));
    }
    if (!this.registry.has('openrouter')) {
      this.registry.register('openrouter', new OpenRouterProvider(this.quotaManager));
    }
    if (!this.registry.has('ollama')) {
      this.registry.register('ollama', new OllamaProvider());
    }
    if (!this.registry.has('huggingface')) {
      this.registry.register('huggingface', new HuggingFaceProvider(this.quotaManager));
    }
  }

  public loadConfig(filePath?: string): void {
    const targetPath = filePath || this.configPath;
    try {
      if (fs.existsSync(targetPath)) {
        const fileContent = fs.readFileSync(targetPath, 'utf8');
        this.config = parse(fileContent) as ProviderMapConfig;
      }
    } catch (err: any) {
      console.warn(`[LlmGateway] Could not load yaml config from ${targetPath}, using defaults: ${err.message}`);
    }
  }

  public getConfig(): Partial<ProviderMapConfig> {
    return { ...this.config };
  }

  public getRegistry(): ProviderRegistry {
    return this.registry;
  }

  public getCache(): PromptCache {
    return this.cache;
  }

  public getQuotaManager(): QuotaManager {
    return this.quotaManager;
  }

  /**
   * Resolves the cascade of providers to attempt for a given task.
   */
  public route(taskType: TaskType): { provider: ProviderName; model?: string }[] {
    const cfg = this.config[taskType];
    const cascade: { provider: ProviderName; model?: string }[] = [];

    if (cfg?.primary && this.isValidProvider(cfg.primary)) {
      cascade.push({ provider: cfg.primary as ProviderName, model: cfg.model });
    }

    if (cfg?.fallback && this.isValidProvider(cfg.fallback)) {
      cascade.push({ provider: cfg.fallback as ProviderName, model: cfg.fallbackModel });
    }

    if (cfg?.lastResort && this.isValidProvider(cfg.lastResort)) {
      cascade.push({ provider: cfg.lastResort as ProviderName });
    }

    // Always ensure template fallback is the absolute final safety net
    if (!cascade.some((c) => c.provider === 'template')) {
      cascade.push({ provider: 'template' });
    }

    return cascade;
  }

  private isValidProvider(name: string): boolean {
    return ['ollama', 'groq', 'openrouter', 'huggingface', 'template'].includes(name);
  }

  /**
   * Main completion router:
   * 1. Cache Gate: Check prompt cache
   * 2. Quota & Availability Cascade: Try providers in order
   * 3. Template Fallback: Deterministic guarantee
   */
  async complete(req: LlmRequest): Promise<LlmResponse> {
    const promptText = req.prompt || req.messages?.map((m) => m.content).join(' ') || '';
    const targetModel = req.model || this.config[req.taskType]?.model || 'default';

    // Gate 1: Cache Gate (Skip cache for interactive chat unless specified)
    if (promptText && req.taskType !== 'GENERAL_CHAT') {
      const cached = await this.cache.get(req.taskType, promptText, targetModel);
      if (cached) {
        return cached;
      }
    }

    // Gate 2: Provider Cascade
    const cascade = this.route(req.taskType);
    let lastError: Error | null = null;

    for (const step of cascade) {
      const provider = this.registry.get(step.provider);
      if (!provider) {
        continue;
      }

      // Check if provider is available
      try {
        const available = await provider.isAvailable();
        if (!available) {
          continue;
        }

        const modelToUse = req.model || step.model || provider.models[req.taskType];
        const res = await provider.complete({
          ...req,
          model: modelToUse
        });

        // Write to cache if not general chat
        if (promptText && req.taskType !== 'GENERAL_CHAT') {
          await this.cache.set(req.taskType, promptText, res, undefined, targetModel);
        }

        return res;
      } catch (err: any) {
        lastError = err;
        console.warn(`[LlmGateway] Provider ${step.provider} failed for ${req.taskType}: ${err.message}. Trying next in cascade...`);
      }
    }

    // Gate 3: Final Template Fallback
    const templateProvider = this.registry.get('template') || new TemplateProvider();
    const templateRes = await templateProvider.complete(req);
    if (promptText && req.taskType !== 'GENERAL_CHAT') {
      await this.cache.set(req.taskType, promptText, templateRes, undefined, targetModel);
    }
    return templateRes;
  }

  /**
   * Vector Embedding delegation
   */
  async embed(text: string): Promise<number[]> {
    const hf = this.registry.get('huggingface');
    if (hf?.embed && (await hf.isAvailable())) {
      try {
        return await hf.embed(text);
      } catch (err: any) {
        console.warn(`[LlmGateway] HuggingFace embed failed: ${err.message}`);
      }
    }

    const ollama = this.registry.get('ollama');
    if (ollama?.embed && (await ollama.isAvailable())) {
      try {
        return await ollama.embed(text);
      } catch (err: any) {
        console.warn(`[LlmGateway] Ollama embed failed: ${err.message}`);
      }
    }

    throw new Error('[LlmGateway] No available embedding provider (ensure ONNX local or HF API key)');
  }
}
