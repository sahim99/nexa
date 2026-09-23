import { describe, it, expect } from 'vitest';
import { ExecutorQueue, QueuedTask } from '../background/executor-queue';
import { ExecutorRunner } from '../background/executor-runner';
import { AgentRegistry } from '../registry/agent.registry';
import { BaseAgent } from '../agent.base';
import { AgentResult, AgentTask } from '@nexa/shared';

class TestAgent extends BaseAgent {
  id = 'test-agent';
  name = 'TestAgent';
  version = '1.0.0';
  capabilities = ['MANAGEMENT'];
  tools = [];
  permissions = [];
  inputSchema = {};
  outputSchema = {};

  public executionLog: string[] = [];

  async execute(task: AgentTask): Promise<AgentResult> {
    this.executionLog.push(task.payload.label);
    return { taskId: task.id, success: true, data: { done: true } };
  }
}

describe('Background Executor Queue & Runner', () => {
  it('enforces FIFO execution order for concurrent tasks without race conditions', async () => {
    const queue = new ExecutorQueue();
    const registry = new AgentRegistry();
    const agent = new TestAgent();
    registry.register(agent);

    const runner = new ExecutorRunner(queue, registry);

    const task1: QueuedTask = {
      id: 'task_001',
      userId: 'user_A',
      agentId: 'test-agent',
      payload: { label: 'First Task' },
      enqueuedAt: new Date(Date.now() - 2000),
      status: 'QUEUED'
    };

    const task2: QueuedTask = {
      id: 'task_002',
      userId: 'user_A',
      agentId: 'test-agent',
      payload: { label: 'Second Task' },
      enqueuedAt: new Date(Date.now() - 1000),
      status: 'QUEUED'
    };

    // Enqueue both tasks concurrently
    await Promise.all([queue.enqueue(task1), queue.enqueue(task2)]);

    expect(await queue.size('user_A')).toBe(2);

    // Process tasks in sequence
    const result1 = await runner.processNext('user_A');
    expect(result1.task?.id).toBe('task_001');
    expect(result1.task?.status).toBe('COMPLETED');

    const result2 = await runner.processNext('user_A');
    expect(result2.task?.id).toBe('task_002');
    expect(result2.task?.status).toBe('COMPLETED');

    expect(agent.executionLog).toEqual(['First Task', 'Second Task']);
    expect(await queue.size('user_A')).toBe(0);
  });

  it('survives simulated runner restart while preserving queued state', async () => {
    const queue = new ExecutorQueue();
    const registry = new AgentRegistry();
    const agent = new TestAgent();
    registry.register(agent);

    await queue.enqueue({
      id: 'task_restart',
      userId: 'user_B',
      agentId: 'test-agent',
      payload: { label: 'Survives Restart' },
      enqueuedAt: new Date(),
      status: 'QUEUED'
    });

    // Simulate server crash / restart by instantiating a completely new runner instance
    const newRunner = new ExecutorRunner(queue, registry);

    const outcome = await newRunner.processNext('user_B');
    expect(outcome.task?.id).toBe('task_restart');
    expect(outcome.task?.status).toBe('COMPLETED');
  });
});
