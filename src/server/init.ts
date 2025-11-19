/**
 * Server Initialization
 *
 * Initializes all shared services and infrastructure before the server starts:
 * - Database connection pool
 * - Redis connections
 * - Caching layer
 * - Background job queues
 */

import { Logger } from '@/utils/Logger';
import { initializeConnectionPool, getConnectionPool } from '@/database/connection-pool';
import { initializeCache, getCache } from '@/cache/redis-cache';
import { initializeCacheWarming, shutdownCacheWarming } from '@/cache/cache-init';
import { initializeQueueManager, getQueueManager } from '@/queue/bull-queue';
import { aiRequestOptimizer } from '@/services/ai-request-optimizer';
import { aiRequestQueue } from '@/services/ai-request-queue';
import { agentSupervisor } from '@/services/agent-supervisor';
import { workflowManager } from '@/services/workflow-manager';
import { contextManager } from '@/services/context-manager';
import { contentManagementService } from '@/services/content-management';
import { analyticsService } from '@/services/analytics';
import { securityService } from '@/services/security';
import { complianceService } from '@/services/compliance';

const logger = new Logger('ServerInit');

/**
 * Initialize all server infrastructure
 */
export async function initializeServer(): Promise<void> {
  logger.info('Initializing server infrastructure...');

  try {
    // 1. Initialize database connection pool
    await initializeDatabasePool();

    // 2. Initialize Redis cache
    await initializeRedisCache();

    // 3. Initialize cache warming
    await initializeCacheWarming();

    // 4. Initialize job queue manager
    await initializeJobQueue();

    logger.info('Server infrastructure initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize server infrastructure', error);
    throw error;
  }
}

/**
 * Initialize database connection pool
 */
async function initializeDatabasePool(): Promise<void> {
  try {
    logger.info('Initializing database connection pool...');
    await initializeConnectionPool();

    // Perform health check
    const pool = getConnectionPool();
    const isHealthy = await pool.healthCheck();

    if (!isHealthy) {
      throw new Error('Database connection pool health check failed');
    }

    const stats = pool.getStats();
    logger.info('Database connection pool initialized', {
      health: stats.health,
      maxConnections: stats.config.maxConnections,
    });
  } catch (error) {
    logger.error('Failed to initialize database connection pool', error);
    throw error;
  }
}

/**
 * Initialize Redis cache
 */
async function initializeRedisCache(): Promise<void> {
  try {
    logger.info('Initializing Redis cache...');
    await initializeCache();

    // Perform health check
    const cache = getCache();
    const isHealthy = await cache.healthCheck();

    if (!isHealthy) {
      logger.warn('Redis cache health check failed - cache will run in degraded mode');
      // Don't throw - allow server to start without cache
      return;
    }

    const stats = cache.getStats();
    logger.info('Redis cache initialized', {
      connected: cache.connected,
      stats,
    });
  } catch (error) {
    logger.error('Failed to initialize Redis cache', error);
    logger.warn('Server will continue without cache - performance may be degraded');
    // Don't throw - allow server to start without cache
  }
}

/**
 * Initialize job queue manager
 */
async function initializeJobQueue(): Promise<void> {
  try {
    logger.info('Initializing job queue manager...');
    await initializeQueueManager();

    // Perform health check
    const queueManager = getQueueManager();
    const isHealthy = await queueManager.healthCheck();

    if (!isHealthy) {
      logger.warn('Job queue health check failed - queues may not be available');
      return;
    }

    const stats = await queueManager.getAllQueueStats();
    logger.info('Job queue manager initialized', {
      queues: Object.keys(stats).length,
      stats,
    });
  } catch (error) {
    logger.error('Failed to initialize job queue manager', error);
    logger.warn('Server will continue without job queues - background tasks will be disabled');
    // Don't throw - allow server to start without queues
  }
}

/**
 * Graceful shutdown handler
 */
export async function shutdownServer(): Promise<void> {
  logger.info('Shutting down server infrastructure...');

  try {
    // 1. Shutdown AI request queue (first to complete pending requests)
    try {
      aiRequestQueue.shutdown();
    } catch (error) {
      logger.error('Error shutting down AI request queue', error);
    }

    // 2. Shutdown AI request optimizer
    try {
      aiRequestOptimizer.shutdown();
    } catch (error) {
      logger.error('Error shutting down AI request optimizer', error);
    }

    // 3. Shutdown agent supervisor
    try {
      agentSupervisor.shutdown();
    } catch (error) {
      logger.error('Error shutting down agent supervisor', error);
    }

    // 4. Shutdown workflow manager
    try {
      workflowManager.shutdown();
    } catch (error) {
      logger.error('Error shutting down workflow manager', error);
    }

    // 5. Shutdown context manager
    try {
      await contextManager.shutdown();
    } catch (error) {
      logger.error('Error shutting down context manager', error);
    }

    // 6. Shutdown content management service
    try {
      contentManagementService.shutdown();
    } catch (error) {
      logger.error('Error shutting down content management service', error);
    }

    // 7. Shutdown analytics service
    try {
      analyticsService.shutdown();
    } catch (error) {
      logger.error('Error shutting down analytics service', error);
    }

    // 8. Shutdown security service
    try {
      securityService.shutdown();
    } catch (error) {
      logger.error('Error shutting down security service', error);
    }

    // 9. Shutdown compliance service
    try {
      complianceService.shutdown();
    } catch (error) {
      logger.error('Error shutting down compliance service', error);
    }

    // 10. Shutdown job queue manager
    try {
      const queueManager = getQueueManager();
      await queueManager.shutdown();
    } catch (error) {
      logger.error('Error shutting down job queue manager', error);
    }

    // 11. Stop cache warming
    try {
      shutdownCacheWarming();
    } catch (error) {
      logger.error('Error stopping cache warming', error);
    }

    // 12. Disconnect Redis cache
    try {
      const cache = getCache();
      if (cache.connected) {
        await cache.disconnect();
      }
    } catch (error) {
      logger.error('Error disconnecting Redis cache', error);
    }

    // 13. Shutdown database connection pool
    const pool = getConnectionPool();
    await pool.shutdown();

    logger.info('Server infrastructure shut down successfully');
  } catch (error) {
    logger.error('Error during server shutdown', error);
    throw error;
  }
}

/**
 * Setup process signal handlers for graceful shutdown
 */
export function setupGracefulShutdown(): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);

      try {
        await shutdownServer();
        process.exit(0);
      } catch (error) {
        logger.error('Graceful shutdown failed', error);
        process.exit(1);
      }
    });
  });

  logger.info('Graceful shutdown handlers registered');
}

/**
 * Health check endpoint handler
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    cache: boolean;
    queue: boolean;
    timestamp: string;
  };
}> {
  const checks = {
    database: false,
    cache: false,
    queue: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check database
    const pool = getConnectionPool();
    checks.database = await pool.healthCheck();

    // Check cache (optional, won't fail health check)
    try {
      const cache = getCache();
      checks.cache = await cache.healthCheck();
    } catch (error) {
      logger.warn('Cache health check failed', error);
    }

    // Check queue manager (optional, won't fail health check)
    try {
      const queueManager = getQueueManager();
      checks.queue = await queueManager.healthCheck();
    } catch (error) {
      logger.warn('Queue health check failed', error);
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (checks.database && checks.cache && checks.queue) {
      status = 'healthy';
    } else if (checks.database) {
      status = 'degraded'; // Database ok but optional services down
    } else {
      status = 'unhealthy'; // Database down
    }

    return { status, checks };
  } catch (error) {
    logger.error('Health check failed', error);
    return {
      status: 'unhealthy',
      checks,
    };
  }
}

/**
 * Get server metrics
 */
export async function getServerMetrics() {
  try {
    const pool = getConnectionPool();
    const poolStats = pool.getStats();

    // Get cache stats if available
    let cacheStats = null;
    try {
      const cache = getCache();
      if (cache.connected) {
        cacheStats = cache.getStats();
      }
    } catch (error) {
      logger.debug('Cache stats unavailable', error);
    }

    // Get queue stats if available
    let queueStats = null;
    try {
      const queueManager = getQueueManager();
      queueStats = await queueManager.getAllQueueStats();
    } catch (error) {
      logger.debug('Queue stats unavailable', error);
    }

    return {
      database: {
        pool: poolStats,
      },
      cache: cacheStats,
      queues: queueStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get server metrics', error);
    return null;
  }
}
