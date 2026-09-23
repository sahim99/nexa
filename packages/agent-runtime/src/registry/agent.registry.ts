import { Agent, AgentCapability } from '@nexa/shared';

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  /**
   * Register a new agent.
   */
  register(agent: Agent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with ID ${agent.id} is already registered.`);
    }
    this.agents.set(agent.id, agent);
  }

  /**
   * Unregister an agent by ID.
   */
  unregister(id: string): void {
    this.agents.delete(id);
  }

  /**
   * Get an agent by ID.
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Find all agents that have all of the requested capabilities.
   */
  findAgentsByCapabilities(requiredCapabilities: AgentCapability[]): Agent[] {
    const matchedAgents: Agent[] = [];
    
    for (const agent of this.agents.values()) {
      const hasAllCapabilities = requiredCapabilities.every((cap) => 
        agent.capabilities.includes(cap)
      );
      
      if (hasAllCapabilities) {
        matchedAgents.push(agent);
      }
    }
    
    return matchedAgents;
  }

  /**
   * Find the best agent for a single capability.
   */
  findAgentByCapability(capability: AgentCapability): Agent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.capabilities.includes(capability)) {
        return agent;
      }
    }
    return undefined;
  }

  /**
   * Get all registered agents.
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Health check all registered agents (mock implementation for now).
   */
  async checkHealth(): Promise<Record<string, 'HEALTHY' | 'UNHEALTHY'>> {
    const healthStatus: Record<string, 'HEALTHY' | 'UNHEALTHY'> = {};
    for (const agent of this.agents.values()) {
      // In a real system, this might ping the agent's worker process
      healthStatus[agent.id] = 'HEALTHY';
    }
    return healthStatus;
  }
}
