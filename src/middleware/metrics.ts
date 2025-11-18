/**
 * Metrics Middleware
 *
 * Automatically records HTTP request metrics for Prometheus
 */

import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metrics.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('MetricsMiddleware');

/**
 * Metrics middleware - records HTTP request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Get request size
  const requestSize = req.headers['content-length']
    ? parseInt(req.headers['content-length'], 10)
    : undefined;

  // Capture response size
  const originalSend = res.send;
  let responseSize: number | undefined;

  res.send = function (body: unknown): Response {
    if (body && typeof body === 'string') {
      responseSize = Buffer.byteLength(body);
    } else if (body && Buffer.isBuffer(body)) {
      responseSize = body.length;
    }

    return originalSend.call(this, body);
  };

  // Record metrics when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const method = req.method;
    const route = getRoutePattern(req);
    const statusCode = res.statusCode;

    try {
      metricsService.recordHttpRequest(
        method,
        route,
        statusCode,
        duration,
        requestSize,
        responseSize
      );
    } catch (error) {
      logger.error('Failed to record HTTP metrics', { error });
    }
  });

  next();
}

/**
 * Get route pattern from request
 * Replaces dynamic segments with placeholders
 */
function getRoutePattern(req: Request): string {
  // If route is defined (by Express router)
  if (req.route && req.route.path) {
    const baseUrl = req.baseUrl || '';
    return baseUrl + req.route.path;
  }

  // Fallback: use actual path but normalize IDs
  let path = req.path;

  // Replace UUIDs with :id
  path = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );

  // Replace numeric IDs with :id
  path = path.replace(/\/\d+/g, '/:id');

  return path;
}
