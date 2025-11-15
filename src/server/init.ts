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

const logger = new Logger('ServerInit');

/**
 * Initialize all server infrastructure
 */
export async function initializeServer(): Promise<void> {
  logger.info('Initializing server infrastructure...');

  try {
    // 1. Initialize database connection pool
    await initializeDatabasePool();

    // 2. Additional initialization steps will go here
    // - Redis connection
    // - Cache layer
    // - Job queues

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
 * Graceful shutdown handler
 */
export async function shutdownServer(): Promise<void> {
  logger.info('Shutting down server infrastructure...');

  try {
    // 1. Shutdown database connection pool
    const pool = getConnectionPool();
    await pool.shutdown();

    // 2. Additional shutdown steps will go here
    // - Redis disconnection
    // - Cache cleanup
    // - Job queue shutdown

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
    timestamp: string;
  };
}> {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
  };

  try {
    const pool = getConnectionPool();
    checks.database = await pool.healthCheck();

    const status = checks.database ? 'healthy' : 'unhealthy';

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
export function getServerMetrics() {
  try {
    const pool = getConnectionPool();
    const poolStats = pool.getStats();

    return {
      database: {
        pool: poolStats,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get server metrics', error);
    return null;
  }
}
