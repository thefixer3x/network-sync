import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

type AnySupabaseClient = SupabaseClient<any, any, any>;

const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || process.env.SUPABASE_SCHEMA || 'network_sync';

export function createServiceSupabaseClient(): AnySupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL/service role key must be configured');
  }

  return createClient<any, any, any>(url, serviceRoleKey, {
    db: { schema },
  });
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
