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
import { initializeQueueManager, getQueueManager } from '@/queue/bull-queue';

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

    // 3. Initialize job queue manager
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
    // 1. Shutdown job queue manager (first to complete pending jobs)
    try {
      const queueManager = getQueueManager();
      await queueManager.shutdown();
    } catch (error) {
      logger.error('Error shutting down job queue manager', error);
    }

    // 2. Disconnect Redis cache
    try {
      const cache = getCache();
      if (cache.connected) {
        await cache.disconnect();
      }
    } catch (error) {
      logger.error('Error disconnecting Redis cache', error);
    }

    // 3. Shutdown database connection pool
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
