/**
 * Request Tracing Middleware
 *
 * Provides distributed tracing capabilities:
 * - Unique request ID generation (X-Request-ID)
 * - Request/response logging
 * - Performance metrics
 * - Error tracking
 * - Correlation across microservices
 */

import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type to include tracing data
declare module 'express' {
  interface Request {
    requestId?: string;
    startTime?: number;
    traceContext?: TraceContext;
  }
}

export interface TraceContext {
  requestId: string;
  parentId?: string;
  userId?: string;
  sessionId?: string;
  endpoint: string;
  method: string;
  startTime: number;
  userAgent?: string;
  ip?: string;
}

export interface RequestMetrics {
  requestId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userId?: string;
  error?: string;
}

// In-memory trace storage (can be replaced with Redis or external service)
const traces = new Map<string, TraceContext>();
const metrics: RequestMetrics[] = [];
const MAX_METRICS_SIZE = 10000; // Keep last 10k requests

/**
 * Generates a unique request ID
 */
function generateRequestId(): string {
  return randomUUID();
}

/**
 * Gets client IP from request
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Request Tracing Middleware
 *
 * Adds request ID and tracing context to all requests
 */
export function requestTracingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Generate or extract request ID
  const requestId =
    (req.headers['x-request-id'] as string) || generateRequestId();

  const parentId = req.headers['x-parent-request-id'] as string | undefined;

  // Store request ID in request object
  req.requestId = requestId;
  req.startTime = Date.now();

  // Create trace context
  const traceContext: TraceContext = {
    requestId,
    parentId,
    endpoint: req.path,
    method: req.method,
    startTime: req.startTime,
    userAgent: req.headers['user-agent'],
    ip: getClientIp(req),
    // Can be populated from JWT token after auth middleware
    userId: undefined,
    sessionId: req.headers['x-session-id'] as string | undefined,
  };

  req.traceContext = traceContext;
  traces.set(requestId, traceContext);

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Log request start
  console.log(
    `[${requestId}] --> ${req.method} ${req.path}`,
    {
      ip: traceContext.ip,
      userAgent: traceContext.userAgent?.substring(0, 50),
      parentId,
    },
  );

  // Capture response
  const originalSend = res.send;
  res.send = function (body: any): Response {
    res.send = originalSend; // Restore original send

    const duration = Date.now() - (req.startTime || Date.now());

    // Log request completion
    console.log(
      `[${requestId}] <-- ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`,
    );

    // Store metrics
    const metric: RequestMetrics = {
      requestId,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date(),
      userId: req.traceContext?.userId,
    };

    metrics.push(metric);

    // Keep metrics size bounded
    if (metrics.length > MAX_METRICS_SIZE) {
      metrics.shift();
    }

    // Clean up trace after response (optional - keep for debugging)
    // traces.delete(requestId);

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Error Tracing Middleware
 *
 * Captures errors with trace context
 */
export function errorTracingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = req.requestId || 'unknown';
  const duration = Date.now() - (req.startTime || Date.now());

  // Log error with trace context
  console.error(
    `[${requestId}] ❌ ERROR ${req.method} ${req.path} (${duration}ms)`,
    {
      error: error.message,
      stack: error.stack,
      traceContext: req.traceContext,
    },
  );

  // Store error metrics
  const metric: RequestMetrics = {
    requestId,
    endpoint: req.path,
    method: req.method,
    statusCode: res.statusCode || 500,
    duration,
    timestamp: new Date(),
    userId: req.traceContext?.userId,
    error: error.message,
  };

  metrics.push(metric);

  // Keep metrics size bounded
  if (metrics.length > MAX_METRICS_SIZE) {
    metrics.shift();
  }

  // Send error response
  res.status(res.statusCode || 500).json({
    error: 'Internal Server Error',
    message: process.env['NODE_ENV'] === 'production'
      ? 'An error occurred'
      : error.message,
    requestId,
  });
}

/**
 * Gets trace context for a request ID
 */
export function getTraceContext(requestId: string): TraceContext | undefined {
  return traces.get(requestId);
}

/**
 * Gets all active traces
 */
export function getAllTraces(): TraceContext[] {
  return Array.from(traces.values());
}

/**
 * Gets request metrics
 */
export function getMetrics(limit?: number): RequestMetrics[] {
  return limit ? metrics.slice(-limit) : [...metrics];
}

/**
 * Gets metrics summary statistics
 */
export function getMetricsSummary(): {
  totalRequests: number;
  averageDuration: number;
  errorRate: number;
  requestsByEndpoint: Record<string, number>;
  requestsByMethod: Record<string, number>;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
} {
  if (metrics.length === 0) {
    return {
      totalRequests: 0,
      averageDuration: 0,
      errorRate: 0,
      requestsByEndpoint: {},
      requestsByMethod: {},
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
    };
  }

  const totalRequests = metrics.length;
  const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
  const averageDuration = totalDuration / totalRequests;

  const errorCount = metrics.filter(m => m.error || m.statusCode >= 400).length;
  const errorRate = errorCount / totalRequests;

  const requestsByEndpoint: Record<string, number> = {};
  const requestsByMethod: Record<string, number> = {};

  for (const metric of metrics) {
    requestsByEndpoint[metric.endpoint] = (requestsByEndpoint[metric.endpoint] || 0) + 1;
    requestsByMethod[metric.method] = (requestsByMethod[metric.method] || 0) + 1;
  }

  // Calculate percentiles
  const sortedDurations = metrics.map(m => m.duration).sort((a, b) => a - b);
  const p50Index = Math.floor(sortedDurations.length * 0.5);
  const p95Index = Math.floor(sortedDurations.length * 0.95);
  const p99Index = Math.floor(sortedDurations.length * 0.99);

  return {
    totalRequests,
    averageDuration: Math.round(averageDuration),
    errorRate: Math.round(errorRate * 100) / 100,
    requestsByEndpoint,
    requestsByMethod,
    p50Duration: sortedDurations[p50Index] || 0,
    p95Duration: sortedDurations[p95Index] || 0,
    p99Duration: sortedDurations[p99Index] || 0,
  };
}

/**
 * Clears all traces and metrics (useful for testing)
 */
export function clearTracing(): void {
  traces.clear();
  metrics.length = 0;
}

/**
 * Creates a child trace context (for internal service calls)
 */
export function createChildTrace(parentRequestId: string, serviceName: string): TraceContext {
  const childRequestId = generateRequestId();
  const parentTrace = traces.get(parentRequestId);

  const childTrace: TraceContext = {
    requestId: childRequestId,
    parentId: parentRequestId,
    endpoint: serviceName,
    method: 'INTERNAL',
    startTime: Date.now(),
    userId: parentTrace?.userId,
    sessionId: parentTrace?.sessionId,
  };

  traces.set(childRequestId, childTrace);

  return childTrace;
}

/**
 * Completes a child trace
 */
export function completeChildTrace(requestId: string, statusCode: number): void {
  const trace = traces.get(requestId);
  if (!trace) return;

  const duration = Date.now() - trace.startTime;

  const metric: RequestMetrics = {
    requestId,
    endpoint: trace.endpoint,
    method: trace.method,
    statusCode,
    duration,
    timestamp: new Date(),
    userId: trace.userId,
  };

  metrics.push(metric);

  if (metrics.length > MAX_METRICS_SIZE) {
    metrics.shift();
  }

  console.log(
    `[${requestId}] <-- INTERNAL ${trace.endpoint} ${statusCode} (${duration}ms)`,
  );
}
