/**
 * Health Check Routes
 *
 * Provides health check endpoints for monitoring and orchestration:
 * - GET /health - Comprehensive health check
 * - GET /health/live - Liveness probe
 * - GET /health/ready - Readiness probe
 */

import { Router, Request, Response } from 'express';
import { healthCheckService } from '../services/health-check.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('HealthRoutes');
const router = Router();

/**
 * GET /health
 * Comprehensive health check of all system components
 *
 * Returns:
 * - 200: All systems healthy
 * - 503: One or more systems unhealthy
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = await healthCheckService.checkHealth();

    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check endpoint error', { error });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/live
 * Liveness probe - is the application running?
 *
 * Used by Kubernetes/Docker to determine if the container should be restarted.
 * This should always return 200 unless the application is completely broken.
 *
 * Returns:
 * - 200: Application is alive
 * - 503: Application is not responsive
 */
router.get('/live', async (req: Request, res: Response) => {
  try {
    const liveness = await healthCheckService.checkLiveness();

    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      ...liveness,
    });
  } catch (error) {
    logger.error('Liveness check endpoint error', { error });

    res.status(503).json({
      status: 'dead',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe - is the application ready to serve traffic?
 *
 * Used by load balancers and orchestrators to determine if traffic should be routed
 * to this instance. Checks critical dependencies (Redis, Database).
 *
 * Returns:
 * - 200: Application is ready to serve traffic
 * - 503: Application is not ready (dependencies unavailable)
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const readiness = await healthCheckService.checkReadiness();

    const statusCode = readiness.ready ? 200 : 503;

    res.status(statusCode).json({
      status: readiness.ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      ...readiness,
    });
  } catch (error) {
    logger.error('Readiness check endpoint error', { error });

    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      ready: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/dependencies
 * Detailed dependency health check
 *
 * Provides granular health status for each dependency.
 * Useful for debugging and monitoring dashboards.
 */
router.get('/dependencies', async (req: Request, res: Response) => {
  try {
    const health = await healthCheckService.checkHealth();

    res.status(200).json({
      timestamp: new Date().toISOString(),
      dependencies: health.checks,
      overallStatus: health.status,
    });
  } catch (error) {
    logger.error('Dependencies check endpoint error', { error });

    res.status(503).json({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as healthRouter };
