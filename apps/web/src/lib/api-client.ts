const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_PREFIX = '/v1';
const TOKEN_KEY = 'nexa_access_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export interface JobItem {
  id: string;
  title: string;
  normalizedTitle?: string;
  company: string;
  location: string;
  url: string;
  description: string;
  skills: string[];
  companyStage?: string;
  score?: number;
  decision?: 'APPLY' | 'REVIEW' | 'SKIP' | 'APPLIED';
  reason?: string;
  postedAt?: string;
}

export interface ApprovalItem {
  id: string;
  nodeId: string;
  description: string;
  riskLevel: string;
  status: 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  node?: {
    id: string;
    name: string;
    agentId?: string;
    payload?: any;
    state?: string;
  };
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  agentName: string;
  action: string;
  permission: string;
  riskLevel: string;
  status: 'ALLOWED' | 'BLOCKED';
  payload?: any;
}

export interface MetricsData {
  llmCalls: number;
  cacheHits: number;
  algorithmDecisions: number;
  pipelineRuns: number;
  [key: string]: number;
}

export interface LlmStatsData {
  totalCalls: number;
  cacheHits: number;
  cacheHitRatePercent: number;
  algorithmSavedCalls: number;
  algorithmPercentage: number;
  totalCostUsd: number;
  providers: {
    groq: number;
    openrouter: number;
    ollama: number;
    template: number;
  };
}

export interface AgentCard {
  id: string;
  name: string;
  lane: 'DISCOVERY' | 'ENRICHMENT' | 'DECISION' | 'APPLICATION' | 'OUTREACH' | 'COMPLETED';
  status: 'IDLE' | 'RUNNING' | 'WAITING' | 'COMPLETED';
  type: 'ALGORITHM' | 'LLM' | 'HYBRID';
  lastActivity: string;
  tasksCompleted: number;
}

export interface UserProfileData {
  fullName: string;
  email: string;
  targetRoles: string[];
  skills: string[];
  preferredStages: string[];
  locations: string[];
  minSalary: number;
  bio?: string;
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  async login(username: string, password: string): Promise<{ access_token: string }> {
    const result = await request<{ access_token: string; message: string }>(`${API_PREFIX}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (!result.access_token) {
      throw new Error('Login response did not include an access token');
    }
    setAccessToken(result.access_token);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await request(`${API_PREFIX}/auth/logout`, { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  async me(): Promise<{ userId: string; username: string }> {
    return request(`${API_PREFIX}/auth/me`);
  },

  async interact(userInput: string): Promise<any> {
    return request(`${API_PREFIX}/agent/interact`, {
      method: 'POST',
      body: JSON.stringify({ userInput })
    });
  },

  // Jobs
  async getJobs(decision?: string): Promise<JobItem[]> {
    const query = decision ? `?decision=${encodeURIComponent(decision)}` : '';
    return request<JobItem[]>(`${API_PREFIX}/jobs${query}`);
  },

  async collectJobs(): Promise<{ collectedCount: number; storedCount?: number; persistence?: string }> {
    return request(`${API_PREFIX}/jobs/collect`, { method: 'POST' });
  },

  // Approvals
  async getApprovals(status?: string): Promise<ApprovalItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<ApprovalItem[]>(`${API_PREFIX}/approvals${query}`);
  },

  async approveRequest(id: string, userId: string = 'dashboard_user'): Promise<any> {
    return request(`${API_PREFIX}/approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  },

  async rejectRequest(id: string, reason?: string, userId: string = 'dashboard_user'): Promise<any> {
    return request(`${API_PREFIX}/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ userId, reason })
    });
  },

  // Audit Logs
  async getAuditLogs(userId?: string): Promise<AuditLogItem[]> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request<AuditLogItem[]>(`${API_PREFIX}/audit${query}`);
  },

  // Metrics & LLM Stats
  async getMetrics(): Promise<MetricsData> {
    return request<MetricsData>(`${API_PREFIX}/metrics`);
  },

  async getLlmStats(): Promise<LlmStatsData> {
    const m = await this.getMetrics();
    const totalCalls = (m.llmCalls || 0) + (m.cacheHits || 0);
    const cacheHitRate = totalCalls > 0 ? Math.round((m.cacheHits / totalCalls) * 100) : 0;
    const totalOps = (m.algorithmDecisions || 0) + (m.llmCalls || 0);
    const algoPct = totalOps > 0 ? Math.round(((m.algorithmDecisions || 0) / totalOps) * 100) : 0;

    return {
      totalCalls: m.llmCalls || 0,
      cacheHits: m.cacheHits || 0,
      cacheHitRatePercent: cacheHitRate,
      algorithmSavedCalls: m.algorithmDecisions || 0,
      algorithmPercentage: algoPct,
      totalCostUsd: 0.0,
      providers: {
        groq: 0,
        openrouter: 0,
        ollama: 0,
        template: 0
      }
    };
  },

  // Registered agents from the API. Empty until login succeeds.
  async getAgentBoard(): Promise<AgentCard[]> {
    return request<AgentCard[]>(`${API_PREFIX}/agent`);
  },

  async getUserProfile(): Promise<UserProfileData | null> {
    const result = await request<{ profile: UserProfileData | null }>(`${API_PREFIX}/profile`);
    return result.profile;
  },

  async saveUserProfile(profile: UserProfileData): Promise<{ success: boolean; persistence?: string }> {
    const result = await request<{ profile: UserProfileData; persistence: string }>(`${API_PREFIX}/profile`, {
      method: 'POST',
      body: JSON.stringify(profile)
    });
    return { success: true, persistence: result.persistence };
  }
};
