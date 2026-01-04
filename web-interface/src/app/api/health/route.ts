import { NextResponse } from 'next/server';

// Health check response type
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services?: {
    database: ServiceStatus;
    redis?: ServiceStatus;
    external?: {
      [key: string]: ServiceStatus;
    };
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  message?: string;
}

const startTime = Date.now();

// GET /api/health - Basic health check
export async function GET() {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  return NextResponse.json(health, { status: 200 });
}
