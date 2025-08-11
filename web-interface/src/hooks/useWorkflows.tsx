'use client';

import { useQuery, useMutation, useQueryClient } from 'react-query';

export function useWorkflows() {
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery(
    'workflows',
    async () => {
      const response = await fetch('/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const data = await response.json();
      return data.workflows;
    }
  );

  const toggleWorkflow = useMutation(
    async (workflowId: string) => {
      const response = await fetch(`/api/workflows/${workflowId}/toggle`, {
        method: 'POST',
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
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
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