'use client';

import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';

export function useSocialAccounts() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const authHeaders = session?.access_token
    ? { 'Authorization': `Bearer ${session.access_token}` } as Record<string, string>
    : {} as Record<string, string>;

  const { data: accounts, isLoading, refetch } = useQuery(
    'socialAccounts',
    async () => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      const response = await fetch('/api/social/accounts', {
        headers: authHeaders,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      return data.accounts;
    },
    {
      enabled: !!session?.access_token,
    }
  );

  const connectAccount = useMutation(
    async (accountData: any) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      const response = await fetch('/api/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
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
