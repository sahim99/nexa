import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'nexa_access_token';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const api = {
  interact: async (userInput: string) => {
    const { data } = await apiClient.post('/agent/interact', { userInput });
    return data;
  },

  resolveApproval: async (id: string, approved: boolean, userId: string = 'user-1') => {
    const { data } = await apiClient.post(`/approvals/${id}/resolve`, { approved, userId });
    return data;
  },

  getPendingApprovals: async () => {
    const { data } = await apiClient.get('/approvals', { params: { status: 'PENDING' } });
    return data;
  },

  // No task-list endpoint exists yet.
  getActiveTasks: async () => {
    return [];
  }
};
