import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

type AnySupabaseClient = SupabaseClient<any, any, any>;

const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || process.env.SUPABASE_SCHEMA || 'network_sync';

let cachedClient: AnySupabaseClient | null = null;

export function createServiceSupabaseClient(): AnySupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceRoleKey) {
    // During build time, return a mock client that will fail at runtime
    // This prevents build failures when env vars aren't set
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      throw new Error('Supabase URL/service role key must be configured');
    }
    // Return a placeholder that throws on use - for build time only
    return {
      from: () => { throw new Error('Supabase not configured'); },
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Not configured') }) },
    } as unknown as AnySupabaseClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    db: { schema },
  }) as AnySupabaseClient;
  return cachedClient;
}

export async function extractUserId(
  request: NextRequest,
  supabase: AnySupabaseClient
): Promise<string | null> {
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) return headerUserId;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7);
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      return data.user.id;
    }
  }

  return null;
}

export function getSchema() {
  return schema;
}
