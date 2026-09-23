import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Agent interaction
  interact: async (userInput: string) => {
    const { data } = await apiClient.post('/agent/interact', { userInput });
    return data;
  },

  // Approvals
  resolveApproval: async (id: string, approved: boolean, userId: string = 'user-1') => {
    const { data } = await apiClient.post(`/approvals/${id}/resolve`, { approved, userId });
    return data;
  },
  
  // Pending approvals list (to be implemented on backend)
  getPendingApprovals: async () => {
    // For now we mock it if backend doesn't support it yet
    return [];
  },

  // Active tasks list
  getActiveTasks: async () => {
    // Mock for now until backend supports listing tasks
    return [];
  }
};
