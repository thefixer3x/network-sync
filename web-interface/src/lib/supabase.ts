/**
 * Supabase Client Helper for API Routes
 *
 * Provides lazy initialization to avoid build-time errors when env vars aren't available
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 * Uses lazy initialization to prevent build-time errors
 */
export function getSupabaseClient(): SupabaseClient {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Get environment variables (try multiple sources)
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validate configuration
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables in Vercel.'
    );
  }

  // Create and cache the client
  supabaseInstance = createClient(supabaseUrl, supabaseKey);

  return supabaseInstance;
}

/**
 * Reset the Supabase client instance (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}
