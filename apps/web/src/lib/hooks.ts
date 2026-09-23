import useSWR from 'swr';
import {
  apiClient,
  JobItem,
  ApprovalItem,
  AuditLogItem,
  MetricsData,
  LlmStatsData,
  AgentCard,
  UserProfileData
} from './api-client';

export function useJobs(decision?: string) {
  const { data, error, isLoading, mutate } = useSWR<JobItem[]>(
    ['/api/jobs', decision],
    () => apiClient.getJobs(decision),
    { refreshInterval: 10000, fallbackData: [] }
  );

  return {
    jobs: data || [],
    isLoading,
    isError: !!error,
    mutate
  };
}

export function useApprovals(status?: string) {
  const { data, error, isLoading, mutate } = useSWR<ApprovalItem[]>(
    ['/api/approvals', status],
    () => apiClient.getApprovals(status),
    { refreshInterval: 5000, fallbackData: [] }
  );

  return {
    approvals: data || [],
    isLoading,
    isError: !!error,
    mutate
  };
}

export function useAuditLog(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<AuditLogItem[]>(
    ['/api/audit', userId],
    () => apiClient.getAuditLogs(userId),
    { refreshInterval: 10000, fallbackData: [] }
  );

  return {
    auditLogs: data || [],
    isLoading,
    isError: !!error,
    mutate
  };
}

export function useMetrics() {
  const { data, error, isLoading, mutate } = useSWR<MetricsData>(
    '/api/metrics',
    () => apiClient.getMetrics(),
    { refreshInterval: 5000 }
  );

  return {
    metrics: data || { llmCalls: 0, cacheHits: 0, algorithmDecisions: 0, pipelineRuns: 0 },
    isLoading,
    isError: !!error,
    mutate
  };
}

export function useLlmStats() {
  const { data, error, isLoading, mutate } = useSWR<LlmStatsData>(
    '/api/llm-stats',
    () => apiClient.getLlmStats(),
    { refreshInterval: 5000 }
  );

  return {
    stats: data || {
      totalCalls: 0,
      cacheHits: 0,
      cacheHitRatePercent: 0,
      algorithmSavedCalls: 0,
      algorithmPercentage: 70,
      totalCostUsd: 0.0,
      providers: { groq: 0, openrouter: 0, ollama: 0, template: 0 }
    },
    isLoading,
    isError: !!error,
    mutate
  };
}

export function useAgentBoard() {
  const { data, error, isLoading, mutate } = useSWR<AgentCard[]>(
    '/api/agent-board',
    () => apiClient.getAgentBoard(),
    { refreshInterval: 10000 }
  );

  return {
    agents: data || [],
    isLoading,
    isError: !!error,
    mutate
  };
}

export function useUserProfile() {
  const { data, error, isLoading, mutate } = useSWR<UserProfileData>(
    '/api/user-profile',
    () => apiClient.getUserProfile()
  );

  return {
    profile: data,
    isLoading,
    isError: !!error,
    mutate
  };
}
