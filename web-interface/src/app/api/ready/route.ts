import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Kubernetes Readiness Probe
// Returns 200 if the application is ready to receive traffic
// Returns 503 if the application is not ready

async function checkDatabaseConnection(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return false;
  }

  try {
    const supabase = createClient(url, key);
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
}

export async function GET() {
  const isReady = await checkDatabaseConnection();

  if (isReady) {
    return NextResponse.json(
      { status: 'ready', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { status: 'not_ready', timestamp: new Date().toISOString(), message: 'Database connection unavailable' },
    { status: 503 }
  );
}
