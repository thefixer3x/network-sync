/**
 * AI Optimization Routes
 *
 * Endpoints for monitoring AI request optimization and queue management
 */

import { Router, Request, Response } from 'express';
import { aiRequestOptimizer } from '../services/ai-request-optimizer.js';
import { aiRequestQueue } from '../services/ai-request-queue.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('AIOptimizationRoutes');
const router = Router();

/**
 * GET /ai-optimization/stats
 * Get optimization statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const optimizerStats = aiRequestOptimizer.getStats();
    const queueStats = aiRequestQueue.getStats();
    const queueDepth = aiRequestQueue.getQueueDepth();

    res.json({
      optimization: optimizerStats,
      queue: {
        ...queueStats,
        depth: queueDepth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get AI optimization stats', { error });
    res.status(500).json({
      error: 'Failed to retrieve optimization statistics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /ai-optimization/performance
 * Get performance metrics
 */
router.get('/performance', (_req: Request, res: Response) => {
  try {
    const optimizerStats = aiRequestOptimizer.getStats();
    const queueStats = aiRequestQueue.getStats();

    // Calculate performance metrics
    const totalRequests = optimizerStats.totalRequests;
    const optimizedRequests =
      optimizerStats.cachedRequests + optimizerStats.deduplicatedRequests;
    const optimizationRate = totalRequests > 0 ? optimizedRequests / totalRequests : 0;

    const successRate =
      queueStats.completed + queueStats.failed > 0
        ? queueStats.completed / (queueStats.completed + queueStats.failed)
        : 1;

    res.json({
      performance: {
        optimizationRate,
        cacheHitRate: optimizerStats.cacheHitRate,
        successRate,
        averageWaitTime: queueStats.averageWaitTime,
        averageProcessingTime: queueStats.averageProcessingTime,
        totalTimesSaved: queueStats.averageWaitTime * optimizedRequests,
      },
      savings: {
        tokensSaved: optimizerStats.tokensSaved,
        costSaved: optimizerStats.costSaved,
        requestsSaved: optimizedRequests,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get performance metrics', { error });
    res.status(500).json({
      error: 'Failed to retrieve performance metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /ai-optimization/queue
 * Get queue status
 */
router.get('/queue', (_req: Request, res: Response) => {
  try {
    const queueStats = aiRequestQueue.getStats();
    const queueDepth = aiRequestQueue.getQueueDepth();

    res.json({
      status: queueStats.pending > 100 ? 'congested' : queueStats.pending > 50 ? 'busy' : 'healthy',
      depth: queueDepth,
      stats: queueStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get queue status', { error });
    res.status(500).json({
      error: 'Failed to retrieve queue status',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /ai-optimization/reset
 * Reset optimization statistics
 */
router.post('/reset', (_req: Request, res: Response) => {
  try {
    aiRequestOptimizer.resetStats();

    res.json({
      message: 'Optimization statistics reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to reset optimization stats', { error });
    res.status(500).json({
      error: 'Failed to reset optimization statistics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /ai-optimization/recommendations
 * Get optimization recommendations
 */
router.get('/recommendations', (_req: Request, res: Response) => {
  try {
    const optimizerStats = aiRequestOptimizer.getStats();
    const queueStats = aiRequestQueue.getStats();
    const queueDepth = aiRequestQueue.getQueueDepth();

    const recommendations: string[] = [];

    // Cache recommendations
    if (optimizerStats.cacheHitRate < 0.3 && optimizerStats.totalRequests > 100) {
      recommendations.push(
        'Low cache hit rate (<30%). Consider increasing cache TTL for AI responses or reviewing request patterns.'
      );
    }

    // Queue recommendations
    if (queueDepth.total > 100) {
      recommendations.push(
        'Queue is congested (>100 pending). Consider increasing AI_MAX_CONCURRENT or reviewing rate limits.'
      );
    }

    if (queueStats.averageWaitTime > 5000) {
      recommendations.push(
        'High average wait time (>5s). Consider increasing concurrency or implementing request prioritization.'
      );
    }

    // Deduplication recommendations
    const deduplicationRate =
      optimizerStats.totalRequests > 0
        ? optimizerStats.deduplicatedRequests / optimizerStats.totalRequests
        : 0;

    if (deduplicationRate > 0.2) {
      recommendations.push(
        `High deduplication rate (${(deduplicationRate * 100).toFixed(1)}%). Consider reviewing application logic to reduce duplicate AI requests.`
      );
    }

    // Success rate recommendations
    const successRate =
      queueStats.completed + queueStats.failed > 0
        ? queueStats.completed / (queueStats.completed + queueStats.failed)
        : 1;

    if (successRate < 0.95) {
      recommendations.push(
        `Low success rate (${(successRate * 100).toFixed(1)}%). Review error logs and consider implementing retry strategies.`
      );
    }

    res.json({
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ['No optimization recommendations at this time. System is performing well.'],
      stats: {
        cacheHitRate: optimizerStats.cacheHitRate,
        deduplicationRate,
        successRate,
        averageWaitTime: queueStats.averageWaitTime,
        queueDepth: queueDepth.total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate recommendations', { error });
    res.status(500).json({
      error: 'Failed to generate recommendations',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as aiOptimizationRouter };
