export type AgentCapability =
  | 'INTERACTION'
  | 'MANAGEMENT'
  | 'JOB_HUNTING'
  | 'JOB_MATCHING'
  | 'APPLICATION'
  | 'OUTREACH'
  | 'EMAIL'
  | 'TELEGRAM'
  | string; // Extensible for future capabilities

export interface Agent {
  id: string;
  name: string;
  version: string;
  capabilities: AgentCapability[];
  tools: string[]; // Tool IDs
  permissions: string[];
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  plan(input: any): Promise<ExecutionPlan>;
  execute(task: AgentTask): Promise<AgentResult>;
  validate(result: any): Promise<boolean>;
}

export type TaskState =
  | 'CREATED'
  | 'PLANNING'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'NEEDS_APPROVAL'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface AgentTask {
  id: string;
  agentId: string;
  payload: any;
  state: TaskState;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export type ToolPermission =
  | 'READ'
  | 'LOW_RISK_WRITE'
  | 'APPROVAL_REQUIRED'
  | 'BLOCKED';

export interface Tool {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  permissionLevel: ToolPermission;
  execute(args: any): Promise<any>;
}

export interface Task {
  id: string;
  description: string;
  state: TaskState;
  plan?: ExecutionPlan;
  budget: {
    maxSteps: number;
    maxLlmCalls: number;
    maxToolCalls: number;
    maxRuntimeMs: number;
    maxCost: number;
  };
}

export interface ExecutionNode {
  id: string;
  name: string;
  agentId?: string;
  toolId?: string;
  dependencies: string[]; // Node IDs that must complete first
  payload: any;
  state: TaskState;
}

export interface ExecutionPlan {
  id: string;
  taskId: string;
  nodes: ExecutionNode[];
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  nodeId: string;
  description: string;
  riskLevel: ToolPermission;
  requestedAt: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface MemoryRecord {
  id: string;
  type: 'USER' | 'CONVERSATION' | 'OPERATIONAL' | 'SEMANTIC' | 'AGENT';
  content: string;
  metadata: Record<string, any>;
  vector?: number[];
  createdAt: Date;
}

export interface ActivityEvent {
  id: string;
  eventType: string; // e.g. agent.started, application.submitted
  timestamp: Date;
  payload: any;
  source: string;
}

export interface LLMRequest {
  provider: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}
