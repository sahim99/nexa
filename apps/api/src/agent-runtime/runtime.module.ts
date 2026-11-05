import { Module } from '@nestjs/common';
import { LlmGateway } from '@nexa/llm';
import { LLMProvider } from './providers/llm.provider.js';

@Module({
  providers: [
    {
      provide: LlmGateway,
      useFactory: () => new LlmGateway(),
    },
    LLMProvider,
  ],
  exports: [LlmGateway, LLMProvider],
})
export class AgentRuntimeModule {}
