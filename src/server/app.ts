/**
 * Express Application Setup
 *
 * Main Express application with middleware and routes
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Logger } from '../utils/Logger.js';
import { healthRouter } from '../routes/health.routes.js';
import { metricsRouter } from '../routes/metrics.routes.js';
import { aiCostRouter } from '../routes/ai-cost.routes.js';
import { cacheRouter } from '../routes/cache.routes.js';
import { aiOptimizationRouter } from '../routes/ai-optimization.routes.js';
import { agentSupervisionRouter } from '../routes/agent-supervision.routes.js';
import { workflowManagementRouter } from '../routes/workflow-management.routes.js';
import { contextRouter } from '../routes/context.routes.js';
import { contentManagementRouter } from '../routes/content-management.routes.js';
import { analyticsRouter } from '../routes/analytics.routes.js';
import { securityRouter } from '../routes/security.routes.js';
import { requestTracingMiddleware } from '../middleware/request-tracing.js';
import { metricsMiddleware } from '../middleware/metrics.js';

const logger = new Logger('ExpressApp');

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Security middleware
  app.disable('x-powered-by');

  // CORS configuration
  app.use(cors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') || '*',
    credentials: true,
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request tracing middleware (adds request IDs and performance tracking)
  app.use(requestTracingMiddleware);

  // Metrics middleware (records HTTP metrics for Prometheus)
  app.use(metricsMiddleware);

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        requestId: req.headers['x-request-id'],
      });
    });

    next();
  });

  // Health check routes (no authentication required)
  app.use('/health', healthRouter);

  // Prometheus metrics endpoint (no authentication required)
  app.use('/metrics', metricsRouter);

  // AI cost monitoring endpoints
  app.use('/ai-cost', aiCostRouter);

  // Cache management endpoints
  app.use('/cache', cacheRouter);

  // AI optimization endpoints
  app.use('/ai-optimization', aiOptimizationRouter);

  // Agent supervision endpoints
  app.use('/agent-supervision', agentSupervisionRouter);

  // Workflow management endpoints
  app.use('/workflows', workflowManagementRouter);

  // Context management endpoints
  app.use('/context', contextRouter);

  // Content management endpoints
  app.use('/content-management', contentManagementRouter);

  // Analytics endpoints
  app.use('/analytics', analyticsRouter);

  // Security endpoints
  app.use('/security', securityRouter);

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Social Media Orchestrator API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        liveness: '/health/live',
        readiness: '/health/ready',
        dependencies: '/health/dependencies',
        metrics: '/metrics',
        metricsJson: '/metrics/json',
        aiCost: '/ai-cost',
        aiCostCurrent: '/ai-cost/current',
        aiCostAnalytics: '/ai-cost/analytics',
        aiCostPricing: '/ai-cost/pricing',
        cache: '/cache',
        cacheStats: '/cache/stats',
        cacheHealth: '/cache/health',
        cacheInvalidations: '/cache/invalidations',
        aiOptimization: '/ai-optimization',
        aiOptimizationStats: '/ai-optimization/stats',
        aiOptimizationPerformance: '/ai-optimization/performance',
        aiOptimizationQueue: '/ai-optimization/queue',
        aiOptimizationRecommendations: '/ai-optimization/recommendations',
        agentSupervision: '/agent-supervision',
        agentSupervisionStatus: '/agent-supervision/status',
        agentSupervisionStatistics: '/agent-supervision/statistics',
        workflows: '/workflows',
        workflowVersions: '/workflows/versions',
        workflowExecute: '/workflows/:workflowId/execute',
        workflowExecutions: '/workflows/executions/:executionId',
        workflowTemplates: '/workflows/templates',
        workflowStatistics: '/workflows/statistics',
        context: '/context',
        contextSet: '/context/:contextId/set',
        contextGet: '/context/:contextId/get/:key',
        contextScope: '/context/:contextId/scope/:scope',
        contextSnapshot: '/context/:contextId/snapshot',
        contextSnapshots: '/context/:contextId/snapshots',
        contextRollback: '/context/:contextId/rollback',
        contextStatistics: '/context/statistics/all',
        contentManagement: '/content-management',
        contentCreate: '/content-management/content',
        contentVersions: '/content-management/content/:contentId/versions',
        contentTemplates: '/content-management/templates',
        contentVariations: '/content-management/content/:contentId/variations',
        contentApproval: '/content-management/content/:contentId/approval',
        contentAnalytics: '/content-management/content/:contentId/analytics',
        contentStatistics: '/content-management/statistics',
        analytics: '/analytics',
        analyticsEvents: '/analytics/events',
        analyticsMetrics: '/analytics/metrics',
        analyticsTimeSeries: '/analytics/timeseries',
        analyticsAggregation: '/analytics/aggregation',
        analyticsDashboard: '/analytics/dashboard',
        analyticsFunnel: '/analytics/funnel',
        analyticsUsers: '/analytics/users/:userId',
        analyticsStatistics: '/analytics/statistics',
        security: '/security',
        securityLogin: '/security/auth/login',
        securityLogout: '/security/auth/logout',
        securityRefresh: '/security/auth/refresh',
        securitySessions: '/security/auth/sessions',
        securityApiKeys: '/security/api-keys',
        securityEvents: '/security/events',
        securityStatistics: '/security/statistics',
        securityIpBlock: '/security/ip/block',
        securityIpWhitelist: '/security/ip/whitelist',
      },
    });
  });

  // API routes would go here
  // app.use('/api/workflows', workflowRouter);
  // app.use('/api/content', contentRouter);
  // etc.

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env['NODE_ENV'] === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
    });
  });

  return app;
}
