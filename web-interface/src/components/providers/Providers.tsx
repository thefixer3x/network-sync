'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkflowProvider } from '@/contexts/WorkflowContext';
import { SWRConfig } from 'swr';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }}
    >
      <AuthProvider>
        <WorkflowProvider>
          {children}
        </WorkflowProvider>
      </AuthProvider>
    </SWRConfig>
  );
}