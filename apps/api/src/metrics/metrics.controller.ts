import { Controller, Get } from '@nestjs/common';
import { metrics } from '@nexa/observability';

@Controller('metrics')
export class MetricsController {
  @Get()
  getMetrics() {
    const all = metrics.getAll();
    return {
      llmCalls: all.llmCalls || 0,
      cacheHits: all.cacheHits || 0,
      algorithmDecisions: all.algorithmDecisions || 0,
      pipelineRuns: all.pipelineRuns || 0,
      providers: {
        groq: 0,
        openrouter: 0,
        ollama: 0,
        template: 0,
      },
      note: 'Counters are in-process. Per-provider splits are not tracked yet and stay at zero.',
    };
  }
}
