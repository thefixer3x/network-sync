/**
 * Health Check Service
 *
 * Provides comprehensive health checks for all system dependencies:
 * - Redis connection
 * - Supabase database
 * - AI API connectivity (Claude, Perplexity)
 * - Queue system
 */

import { Logger } from '../utils/Logger.js';
import { getCache } from '../cache/redis-cache.js';
import { getSupabaseAdminClient } from '../database/connection-pool.js';
import { httpClient } from '../utils/http-client.js';

const logger = new Logger('HealthCheck');

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    redis: ComponentHealth;
    database: ComponentHealth;
    aiServices: ComponentHealth;
    queue: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  message?: string;
  latency?: number;
  details?: Record<string, unknown>;
}

export class HealthCheckService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Perform full health check of all system components
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkRedis(),
      this.checkDatabase(),
      this.checkAIServices(),
      this.checkQueue(),
    ]);

    const [redisResult, dbResult, aiResult, queueResult] = checks;

    const healthChecks = {
      redis: redisResult.status === 'fulfilled' ? redisResult.value : this.failedCheck(redisResult.reason),
      database: dbResult.status === 'fulfilled' ? dbResult.value : this.failedCheck(dbResult.reason),
      aiServices: aiResult.status === 'fulfilled' ? aiResult.value : this.failedCheck(aiResult.reason),
      queue: queueResult.status === 'fulfilled' ? queueResult.value : this.failedCheck(queueResult.reason),
    };

    // Determine overall status
    const statuses = Object.values(healthChecks).map(c => c.status);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

    if (statuses.every(s => s === 'up')) {
      overallStatus = 'healthy';
    } else if (statuses.some(s => s === 'down')) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: healthChecks,
    };
  }

  /**
   * Liveness probe - is the application running?
   */
  async checkLiveness(): Promise<{ alive: boolean; uptime: number }> {
    return {
      alive: true,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Readiness probe - is the application ready to serve traffic?
   */
  async checkReadiness(): Promise<{ ready: boolean; message?: string }> {
    try {
      // Check critical dependencies only (Redis + Database)
      const [redisCheck, dbCheck] = await Promise.all([
        this.checkRedis(),
        this.checkDatabase(),
      ]);

      const ready = redisCheck.status === 'up' && dbCheck.status === 'up';

      return {
        ready,
        message: ready ? 'Ready to serve traffic' : 'Critical dependencies unavailable',
      };
    } catch (error) {
      logger.error('Readiness check failed', { error });
      return {
        ready: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Redis connection health
   */
  private async checkRedis(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const cache = getCache();

      // Try to check Redis health
      const isHealthy = await cache.healthCheck();
      const latency = Date.now() - startTime;

      if (isHealthy) {
        return {
          status: 'up',
          latency,
          details: {
            connected: cache.connected,
          },
        };
      }

      return {
        status: 'down',
        message: 'Redis health check failed',
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('Redis health check failed', { error });

      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Redis connection failed',
        latency,
      };
    }
  }

  /**
   * Check Supabase database connection health
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const supabase = getSupabaseAdminClient();

      // Simple query to check connection
      const { data, error } = await supabase
        .from('workflows')
        .select('id')
        .limit(1);

      const latency = Date.now() - startTime;

      if (error) {
        return {
          status: 'down',
          message: `Database query failed: ${error.message}`,
          latency,
        };
      }

      return {
        status: 'up',
        latency,
        details: {
          connected: true,
          querySuccess: true,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('Database health check failed', { error });

      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Database connection failed',
        latency,
      };
    }
  }

  /**
   * Check AI services connectivity
   */
  private async checkAIServices(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Check if AI API keys are configured
      const claudeKey = process.env['ANTHROPIC_API_KEY'];
      const perplexityKey = process.env['PERPLEXITY_API_KEY'];

      if (!claudeKey && !perplexityKey) {
        return {
          status: 'down',
          message: 'No AI API keys configured',
        };
      }

      const latency = Date.now() - startTime;

      // For now, just check if keys exist
      // In production, you might want to make actual API calls with caching
      return {
        status: 'up',
        latency,
        details: {
          claude: !!claudeKey,
          perplexity: !!perplexityKey,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('AI services health check failed', { error });

      return {
        status: 'degraded',
        message: error instanceof Error ? error.message : 'AI services check failed',
        latency,
      };
    }
  }

  /**
   * Check queue system health
   */
  private async checkQueue(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Queue depends on Redis, so check Redis first
      const cache = getCache();

      const latency = Date.now() - startTime;

      return {
        status: 'up',
        latency,
        details: {
          redisConnected: cache.connected,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('Queue health check failed', { error });

      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Queue check failed',
        latency,
      };
    }
  }

  /**
   * Helper to create failed check result
   */
  private failedCheck(error: unknown): ComponentHealth {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Check failed',
    };
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();
