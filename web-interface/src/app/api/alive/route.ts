import { NextResponse } from 'next/server';

// Kubernetes Liveness Probe
// Returns 200 if the application process is alive
// This is a simple check - if it responds, the process is alive

export async function GET() {
  return NextResponse.json(
    {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
    },
    { status: 200 }
  );
}
