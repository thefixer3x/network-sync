/**
 * Metrics Routes
 *
 * Exposes Prometheus metrics endpoint
 */

import { Router, Request, Response } from 'express';
import { metricsService } from '../services/metrics.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('MetricsRoutes');
const router = Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint in text format
 *
 * This endpoint is scraped by Prometheus to collect metrics.
 * Returns metrics in Prometheus exposition format.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to export metrics', { error });

    res.status(500).send('# Failed to export metrics\n');
  }
});

/**
 * GET /metrics/json
 * Metrics in JSON format for debugging
 */
router.get('/json', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetricsJSON();

    res.json({
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (error) {
    logger.error('Failed to export metrics as JSON', { error });

    res.status(500).json({
      error: 'Failed to export metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as metricsRouter };
