'use client';

import useSWR from 'swr';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  const data = await response.json();
  return data.accounts;
};

export function useSocialAccounts() {
  const { data: accounts, error, isLoading, mutate } = useSWR(
    '/api/social/accounts',
    fetcher
  );

  const connectAccount = async (accountData: any) => {
    const response = await fetch('/api/social/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData),
    });
    if (!response.ok) {
      throw new Error('Failed to connect account');
    }
    const result = await response.json();
    mutate(); // Revalidate after connecting
    return result;
  };

  return {
    accounts,
    isLoading,
    error,
    refetch: mutate,
    connectAccount,
  };
}