/**
 * Analytics Routes
 *
 * Endpoints for analytics tracking, aggregation, and reporting
 */

import { Router, Request, Response } from 'express';
import {
  analyticsService,
  EventType,
  MetricType,
  TimeGranularity,
} from '../services/analytics.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('AnalyticsRoutes');
const router = Router();

/**
 * POST /analytics/events
 * Track an analytics event
 */
router.post('/events', (req: Request, res: Response) => {
  try {
    const { type, userId, sessionId, properties, dimensions, metadata } = req.body;

    if (!type) {
      res.status(400).json({
        error: 'Event type is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const event = analyticsService.trackEvent({
      type,
      userId,
      sessionId,
      properties: properties || {},
      dimensions: dimensions || {},
      metadata,
    });

    res.status(201).json({
      message: 'Event tracked successfully',
      event: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to track event', { error });
    res.status(500).json({
      error: 'Failed to track event',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /analytics/metrics
 * Record a metric data point
 */
router.post('/metrics', (req: Request, res: Response) => {
  try {
    const { name, type, value, dimensions, metadata } = req.body;

    if (!name || type === undefined || value === undefined) {
      res.status(400).json({
        error: 'name, type, and value are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const metric = analyticsService.recordMetric({
      name,
      type,
      value,
      dimensions: dimensions || {},
      metadata,
    });

    res.status(201).json({
      message: 'Metric recorded successfully',
      metric: {
        name: metric.name,
        type: metric.type,
        value: metric.value,
        timestamp: metric.timestamp,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to record metric', { error });
    res.status(500).json({
      error: 'Failed to record metric',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /analytics/timeseries
 * Get time series data for a metric
 */
router.get('/timeseries', (req: Request, res: Response) => {
  try {
    const metric = req.query['metric'] as string;
    const granularity = (req.query['granularity'] as TimeGranularity) || TimeGranularity.HOUR;
    const startTime = parseInt(req.query['startTime'] as string);
    const endTime = parseInt(req.query['endTime'] as string);
    const dimensionsStr = req.query['dimensions'] as string | undefined;

    if (!metric || !startTime || !endTime) {
      res.status(400).json({
        error: 'metric, startTime, and endTime are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let dimensions: Record<string, string> | undefined;
    if (dimensionsStr) {
      try {
        dimensions = JSON.parse(dimensionsStr);
      } catch (e) {
        res.status(400).json({
          error: 'Invalid dimensions format (must be JSON)',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    const timeSeries = analyticsService.getTimeSeries(
      metric,
      granularity,
      startTime,
      endTime,
      dimensions
    );

    res.json({
      ...timeSeries,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get time series', { error });
    res.status(500).json({
      error: 'Failed to get time series',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /analytics/aggregation
 * Get aggregated metrics
 */
router.get('/aggregation', (req: Request, res: Response) => {
  try {
    const metric = req.query['metric'] as string;
    const startTime = parseInt(req.query['startTime'] as string);
    const endTime = parseInt(req.query['endTime'] as string);
    const dimensionsStr = req.query['dimensions'] as string | undefined;

    if (!metric || !startTime || !endTime) {
      res.status(400).json({
        error: 'metric, startTime, and endTime are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let dimensions: Record<string, string> | undefined;
    if (dimensionsStr) {
      try {
        dimensions = JSON.parse(dimensionsStr);
      } catch (e) {
        res.status(400).json({
          error: 'Invalid dimensions format (must be JSON)',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    const aggregation = analyticsService.getAggregation(
      metric,
      startTime,
      endTime,
      dimensions
    );

    res.json({
      ...aggregation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get aggregation', { error });
    res.status(500).json({
      error: 'Failed to get aggregation',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /analytics/dashboard
 * Get dashboard metrics
 */
router.get('/dashboard', (_req: Request, res: Response) => {
  try {
    const metrics = analyticsService.getDashboardMetrics();

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get dashboard metrics', { error });
    res.status(500).json({
      error: 'Failed to get dashboard metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /analytics/funnel
 * Analyze conversion funnel
 */
router.post('/funnel', (req: Request, res: Response) => {
  try {
    const { name, steps, startTime, endTime } = req.body;

    if (!name || !steps || !Array.isArray(steps) || !startTime || !endTime) {
      res.status(400).json({
        error: 'name, steps (array), startTime, and endTime are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const funnel = analyticsService.getFunnel(name, steps, startTime, endTime);

    res.json({
      ...funnel,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to analyze funnel', { error });
    res.status(500).json({
      error: 'Failed to analyze funnel',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /analytics/users/:userId
 * Get user analytics
 */
router.get('/users/:userId', (req: Request, res: Response) => {
  try {
    const userId = req.params['userId'];

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userAnalytics = analyticsService.getUserAnalytics(userId);

    if (!userAnalytics) {
      res.status(404).json({
        error: `No analytics found for user`,
        userId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      ...userAnalytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get user analytics', { error });
    res.status(500).json({
      error: 'Failed to get user analytics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /analytics/statistics
 * Get analytics statistics
 */
router.get('/statistics', (_req: Request, res: Response) => {
  try {
    const stats = analyticsService.getStatistics();

    res.json({
      statistics: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get statistics', { error });
    res.status(500).json({
      error: 'Failed to get statistics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /analytics/data
 * Clear old analytics data
 */
router.delete('/data', (req: Request, res: Response) => {
  try {
    const olderThan = parseInt(req.query['olderThan'] as string) || 7 * 24 * 60 * 60 * 1000; // 7 days default

    analyticsService.clearOldData(olderThan);

    res.json({
      message: 'Old analytics data cleared',
      olderThan,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to clear data', { error });
    res.status(500).json({
      error: 'Failed to clear data',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as analyticsRouter };
