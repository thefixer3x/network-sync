'use client';

import { useQuery, useMutation, useQueryClient } from 'react-query';

export function useSocialAccounts() {
  const queryClient = useQueryClient();

  const { data: accounts, isLoading, refetch } = useQuery(
    'socialAccounts',
    async () => {
      const response = await fetch('/api/social/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      return data.accounts;
    }
  );

  const connectAccount = useMutation(
    async (accountData: any) => {
      const response = await fetch('/api/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      });
      if (!response.ok) {
        throw new Error('Failed to connect account');
      }
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('socialAccounts');
      },
    }
  );

  return {
    accounts,
    isLoading,
    refetch,
    connectAccount,
  };
}