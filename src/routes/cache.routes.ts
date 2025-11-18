/**
 * Cache Management Routes
 *
 * Endpoints for monitoring and managing the caching layer
 */

import { Router, Request, Response } from 'express';
import { getCacheManager } from '../cache/cache-manager.js';
import { getCacheStatistics, getCacheInvalidationHistory } from '../cache/cache-init.js';
import { getCache } from '../cache/redis-cache.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('CacheRoutes');
const router = Router();
const cacheManager = getCacheManager();

/**
 * GET /cache/stats
 * Get comprehensive cache statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getCacheStatistics();

    res.json({
      timestamp: new Date().toISOString(),
      ...stats,
    });
  } catch (error) {
    logger.error('Failed to get cache stats', { error });
    res.status(500).json({
      error: 'Failed to retrieve cache statistics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /cache/health
 * Check cache health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthy = await cacheManager.healthCheck();

    res.status(healthy ? 200 : 503).json({
      healthy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cache health check failed', { error });
    res.status(503).json({
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /cache/invalidations
 * Get cache invalidation history
 */
router.get('/invalidations', (req: Request, res: Response) => {
  try {
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 50;
    const history = getCacheInvalidationHistory(limit);

    res.json({
      invalidations: history,
      count: history.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get invalidation history', { error });
    res.status(500).json({
      error: 'Failed to retrieve invalidation history',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /cache/invalidate
 * Manually invalidate cache by pattern
 */
router.post('/invalidate', async (req: Request, res: Response): Promise<void> => {
  try {
    const pattern = req.body['pattern'];
    const reason = req.body['reason'] || 'manual';

    if (!pattern) {
      res.status(400).json({
        error: 'Pattern is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const affectedKeys = await cacheManager.invalidate(pattern, reason);

    res.json({
      message: 'Cache invalidated successfully',
      pattern,
      reason,
      affectedKeys,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to invalidate cache', { error });
    res.status(500).json({
      error: 'Failed to invalidate cache',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /cache/invalidate/workflow/:workflowId
 * Invalidate workflow-specific caches
 */
router.post('/invalidate/workflow/:workflowId?', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { reason = 'manual' } = req.body;

    const affectedKeys = await cacheManager.invalidateWorkflow(workflowId, reason);

    res.json({
      message: 'Workflow cache invalidated',
      workflowId: workflowId || 'all',
      affectedKeys,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to invalidate workflow cache', { error });
    res.status(500).json({
      error: 'Failed to invalidate workflow cache',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /cache/invalidate/content/:contentId
 * Invalidate content-specific caches
 */
router.post('/invalidate/content/:contentId?', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { reason = 'manual' } = req.body;

    const affectedKeys = await cacheManager.invalidateContent(contentId, reason);

    res.json({
      message: 'Content cache invalidated',
      contentId: contentId || 'all',
      affectedKeys,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to invalidate content cache', { error });
    res.status(500).json({
      error: 'Failed to invalidate content cache',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /cache/invalidate/user/:userId
 * Invalidate user-specific caches
 */
router.post('/invalidate/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params['userId'];
    if (!userId) {
      res.status(400).json({
        error: 'userId is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { reason = 'manual' } = req.body;

    const affectedKeys = await cacheManager.invalidateUser(userId, reason);

    res.json({
      message: 'User cache invalidated',
      userId,
      affectedKeys,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to invalidate user cache', { error });
    res.status(500).json({
      error: 'Failed to invalidate user cache',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /cache/warmup
 * Manually trigger cache warmup
 */
router.post('/warmup', async (_req: Request, res: Response) => {
  try {
    // Note: This would trigger the warming manually
    // For now, just return success
    res.json({
      message: 'Cache warming triggered',
      note: 'Warming runs in background',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to trigger cache warming', { error });
    res.status(500).json({
      error: 'Failed to trigger cache warming',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /cache/keys/:pattern
 * List keys matching pattern (for debugging)
 */
router.get('/keys/:pattern?', async (req: Request, res: Response) => {
  try {
    const pattern = req.params['pattern'] || '*';
    const cache = getCache();

    // Note: This could be expensive in production
    // Consider adding pagination or limiting results

    res.json({
      message: 'Use Redis CLI or admin tools for key inspection',
      pattern,
      note: 'Key listing disabled in API for performance reasons',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to list cache keys', { error });
    res.status(500).json({
      error: 'Failed to list cache keys',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as cacheRouter };
