'use client';

export function useAuth() {
  return {
    user: { email: 'dev@example.com' },
    session: null,
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    resetPassword: async () => ({ error: null }),
  };
}
