import { Controller, Get, Post, Body } from '@nestjs/common';
import { AgentService } from './agent.service.js';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  listAgents() {
    return this.agentService.listAgents();
  }

  @Post('interact')
  async interact(@Body('userInput') userInput: string) {
    if (!userInput) {
      return { error: 'userInput is required' };
    }
    
    try {
      const result = await this.agentService.interact(userInput);
      return result;
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
