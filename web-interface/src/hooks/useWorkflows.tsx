'use client';

import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';

export function useWorkflows() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const authHeaders = session?.access_token
    ? { 'Authorization': `Bearer ${session.access_token}` } as Record<string, string>
    : {} as Record<string, string>;

  const { data: workflows, isLoading } = useQuery(
    'workflows',
    async () => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      const response = await fetch('/api/workflows', { headers: authHeaders });
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const data = await response.json();
      return data.workflows;
    },
    {
      enabled: !!session?.access_token,
    }
  );

  const toggleWorkflow = useMutation(
    async (workflowId: string) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      const response = await fetch(`/api/workflows/${workflowId}/toggle`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!response.ok) {
        throw new Error('Failed to toggle workflow');
      }
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workflows');
      },
    }
  );

  const deleteWorkflow = useMutation(
    async (workflowId: string) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workflows');
      },
    }
  );

  return {
    workflows,
    isLoading,
    toggleWorkflow: toggleWorkflow.mutateAsync,
    deleteWorkflow: deleteWorkflow.mutateAsync,
  };
}
