'use client';

import useSWR from 'swr';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  const data = await response.json();
  return data.workflows;
};

export function useWorkflows() {
  const { data: workflows, error, isLoading, mutate } = useSWR(
    '/api/workflows',
    fetcher
  );

  const toggleWorkflow = async (workflowId: string) => {
    const response = await fetch(`/api/workflows/${workflowId}/toggle`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to toggle workflow');
    }
    const result = await response.json();
    mutate(); // Revalidate after toggling
    return result;
  };

  const deleteWorkflow = async (workflowId: string) => {
    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete workflow');
    }
    const result = await response.json();
    mutate(); // Revalidate after deleting
    return result;
  };

  return {
    workflows,
    isLoading,
    error,
    toggleWorkflow,
    deleteWorkflow,
  };
}