import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ServiceStatus {
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  message?: string;
}

interface DetailedHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    supabase: ServiceStatus;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    node: string;
  };
}

const startTime = Date.now();

async function checkSupabase(): Promise<ServiceStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { status: 'down', message: 'Supabase credentials not configured' };
  }

  try {
    const start = Date.now();
    const supabase = createClient(url, key);
    const { error } = await supabase.from('social_accounts').select('count').limit(1);
    const latency = Date.now() - start;

    if (error) {
      // Table might not exist in public schema, check if connection works
      if (error.code === '42P01') {
        return { status: 'up', latency, message: 'Connected (table in different schema)' };
      }
      return { status: 'down', latency, message: error.message };
    }

    return { status: 'up', latency };
  } catch (error) {
    return { status: 'down', message: error instanceof Error ? error.message : 'Connection failed' };
  }
}

async function checkDatabase(): Promise<ServiceStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return { status: 'unknown', message: 'Service role key not available' };
  }

  try {
    const start = Date.now();
    const supabase = createClient(url, serviceKey, {
      db: { schema: 'network_sync' },
    });

    const { error } = await supabase
      .from('social_accounts')
      .select('id')
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return { status: 'down', latency, message: error.message };
    }

    return { status: 'up', latency };
  } catch (error) {
    return { status: 'down', message: error instanceof Error ? error.message : 'Connection failed' };
  }
}

// GET /api/health/detailed - Comprehensive health check
export async function GET() {
  const [supabaseStatus, databaseStatus] = await Promise.all([
    checkSupabase(),
    checkDatabase(),
  ]);

  // Determine overall status
  const allUp = supabaseStatus.status === 'up' && databaseStatus.status === 'up';
  const allDown = supabaseStatus.status === 'down' && databaseStatus.status === 'down';

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (allUp) {
    overallStatus = 'healthy';
  } else if (allDown) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  const memUsage = process.memoryUsage();

  const health: DetailedHealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services: {
      database: databaseStatus,
      supabase: supabaseStatus,
    },
    system: {
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      node: process.version,
    },
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
