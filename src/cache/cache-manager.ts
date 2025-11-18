/**
 * Advanced Cache Manager
 *
 * Provides cache warming, invalidation patterns, TTL optimization,
 * and monitoring for the Redis cache layer.
 */

import { getCache } from './redis-cache.js';
import { metricsService } from '../services/metrics.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('CacheManager');

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  // Static data - rarely changes
  STATIC: 86400, // 24 hours
  PRICING: 86400, // 24 hours
  TEMPLATES: 43200, // 12 hours

  // Dynamic data - changes frequently
  WORKFLOWS: 900, // 15 minutes
  CONTENT: 300, // 5 minutes
  CONFIG: 600, // 10 minutes

  // User-specific data
  USER_ANALYTICS: 300, // 5 minutes
  USER_METRICS: 180, // 3 minutes
  USER_SESSION: 3600, // 1 hour

  // Real-time data
  TRENDING: 60, // 1 minute
  REAL_TIME: 30, // 30 seconds
  LIVE_METRICS: 10, // 10 seconds

  // AI-related
  AI_COSTS: 300, // 5 minutes
  AI_PRICING: 86400, // 24 hours
  AI_CACHE: 1800, // 30 minutes
} as const;

/**
 * Cache key patterns for invalidation
 */
export const CACHE_PATTERNS = {
  WORKFLOW: (id?: string) => (id ? `workflow:${id}:*` : 'workflow:*'),
  CONTENT: (id?: string) => (id ? `content:${id}:*` : 'content:*'),
  USER: (id: string) => `user:${id}:*`,
  ANALYTICS: (type?: string) => (type ? `analytics:${type}:*` : 'analytics:*'),
  AI_COST: (scope?: string) => (scope ? `ai-cost:${scope}:*` : 'ai-cost:*'),
  METRICS: (type?: string) => (type ? `metrics:${type}:*` : 'metrics:*'),
} as const;

/**
 * Cache warming configuration
 */
export interface WarmingConfig {
  enabled: boolean;
  interval: number; // milliseconds
  keys: {
    key: string;
    fetcher: () => Promise<any>;
    ttl: number;
  }[];
}

/**
 * Cache invalidation event
 */
export interface InvalidationEvent {
  pattern: string;
  reason: string;
  timestamp: number;
  affectedKeys?: number;
}

/**
 * Advanced Cache Manager
 */
class CacheManager {
  private static instance: CacheManager;
  private cache = getCache();
  private warmingInterval: NodeJS.Timeout | null = null;
  private warmingConfig: WarmingConfig | null = null;
  private invalidationHistory: InvalidationEvent[] = [];
  private readonly MAX_HISTORY = 100;

  private constructor() {
    logger.info('Cache Manager initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Start cache warming
   */
  public startCacheWarming(config: WarmingConfig): void {
    if (!config.enabled) {
      logger.info('Cache warming disabled');
      return;
    }

    this.warmingConfig = config;

    // Initial warming
    this.warmCache().catch((error) => {
      logger.error('Initial cache warming failed', error);
    });

    // Periodic warming
    this.warmingInterval = setInterval(() => {
      this.warmCache().catch((error) => {
        logger.error('Periodic cache warming failed', error);
      });
    }, config.interval);

    logger.info('Cache warming started', {
      interval: config.interval,
      keys: config.keys.length,
    });
  }

  /**
   * Stop cache warming
   */
  public stopCacheWarming(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
      logger.info('Cache warming stopped');
    }
  }

  /**
   * Warm cache with configured keys
   */
  private async warmCache(): Promise<void> {
    if (!this.warmingConfig) {
      return;
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(
      this.warmingConfig.keys.map(async ({ key, fetcher, ttl }) => {
        try {
          // Check if key exists
          const exists = await this.cache.exists(key);
          if (exists) {
            logger.debug(`Cache key already exists, skipping: ${key}`);
            return;
          }

          // Fetch and cache data
          const data = await fetcher();
          await this.cache.set(key, data, ttl);

          metricsService.incrementCounter('cache_warming_success', { key });
          logger.debug(`Cache warmed: ${key}`);
        } catch (error) {
          metricsService.incrementCounter('cache_warming_error', { key });
          logger.error(`Failed to warm cache key: ${key}`, error);
          throw error;
        }
      })
    );

    const duration = Date.now() - startTime;
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    metricsService.recordHistogram('cache_warming_duration_ms', duration);

    logger.info('Cache warming completed', {
      duration: `${duration}ms`,
      successful,
      failed,
      total: results.length,
    });
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidate(pattern: string, reason: string = 'manual'): Promise<number> {
    try {
      const startTime = Date.now();
      const affectedKeys = await this.cache.clear(pattern);
      const duration = Date.now() - startTime;

      // Record invalidation event
      const event: InvalidationEvent = {
        pattern,
        reason,
        timestamp: Date.now(),
        affectedKeys,
      };

      this.invalidationHistory.unshift(event);
      if (this.invalidationHistory.length > this.MAX_HISTORY) {
        this.invalidationHistory = this.invalidationHistory.slice(0, this.MAX_HISTORY);
      }

      // Record metrics
      metricsService.incrementCounter('cache_invalidations', { pattern, reason });
      metricsService.recordHistogram('cache_invalidation_duration_ms', duration);
      metricsService.incrementCounter('cache_keys_invalidated', { pattern }, affectedKeys);

      logger.info('Cache invalidated', {
        pattern,
        reason,
        affectedKeys,
        duration: `${duration}ms`,
      });

      return affectedKeys;
    } catch (error) {
      logger.error('Cache invalidation failed', { pattern, reason, error });
      metricsService.incrementCounter('cache_invalidation_errors', { pattern });
      throw error;
    }
  }

  /**
   * Invalidate workflow-related caches
   */
  public async invalidateWorkflow(workflowId?: string, reason: string = 'update'): Promise<number> {
    return this.invalidate(CACHE_PATTERNS.WORKFLOW(workflowId), reason);
  }

  /**
   * Invalidate content-related caches
   */
  public async invalidateContent(contentId?: string, reason: string = 'update'): Promise<number> {
    return this.invalidate(CACHE_PATTERNS.CONTENT(contentId), reason);
  }

  /**
   * Invalidate user-related caches
   */
  public async invalidateUser(userId: string, reason: string = 'update'): Promise<number> {
    return this.invalidate(CACHE_PATTERNS.USER(userId), reason);
  }

  /**
   * Invalidate analytics caches
   */
  public async invalidateAnalytics(type?: string, reason: string = 'update'): Promise<number> {
    return this.invalidate(CACHE_PATTERNS.ANALYTICS(type), reason);
  }

  /**
   * Invalidate AI cost caches
   */
  public async invalidateAICost(scope?: string, reason: string = 'update'): Promise<number> {
    return this.invalidate(CACHE_PATTERNS.AI_COST(scope), reason);
  }

  /**
   * Get or set cache with TTL
   */
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.CONTENT
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.cache.get<T>(key);
      if (cached !== null) {
        metricsService.incrementCounter('cache_hits', { key: this.getCacheKeyType(key) });
        return cached;
      }

      // Fetch data
      metricsService.incrementCounter('cache_misses', { key: this.getCacheKeyType(key) });
      const data = await fetcher();

      // Store in cache
      await this.cache.set(key, data, ttl);

      return data;
    } catch (error) {
      logger.error('getOrSet error', { key, error });
      metricsService.incrementCounter('cache_errors', { key: this.getCacheKeyType(key) });
      throw error;
    }
  }

  /**
   * Cache with refresh strategy (stale-while-revalidate)
   */
  public async getWithRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.CONTENT,
    staleTime: number = ttl * 0.8 // Refresh at 80% of TTL
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.cache.get<T>(key);

      if (cached !== null) {
        metricsService.incrementCounter('cache_hits', { key: this.getCacheKeyType(key) });

        // Check if we should refresh in background
        const remainingTTL = await this.cache.ttl(key);
        if (remainingTTL > 0 && remainingTTL < staleTime) {
          // Refresh in background
          logger.debug(`Refreshing stale cache in background: ${key}`);
          this.refreshCacheInBackground(key, fetcher, ttl).catch((error) => {
            logger.error('Background cache refresh failed', { key, error });
          });
        }

        return cached;
      }

      // Fetch and cache data
      metricsService.incrementCounter('cache_misses', { key: this.getCacheKeyType(key) });
      const data = await fetcher();
      await this.cache.set(key, data, ttl);

      return data;
    } catch (error) {
      logger.error('getWithRefresh error', { key, error });
      metricsService.incrementCounter('cache_errors', { key: this.getCacheKeyType(key) });
      throw error;
    }
  }

  /**
   * Refresh cache in background
   */
  private async refreshCacheInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    try {
      const data = await fetcher();
      await this.cache.set(key, data, ttl);
      metricsService.incrementCounter('cache_background_refresh', { key: this.getCacheKeyType(key) });
      logger.debug(`Background cache refresh completed: ${key}`);
    } catch (error) {
      metricsService.incrementCounter('cache_background_refresh_errors', {
        key: this.getCacheKeyType(key),
      });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  public async getStatistics(): Promise<{
    redis: any;
    manager: {
      invalidationHistory: InvalidationEvent[];
      warmingEnabled: boolean;
      warmingInterval: number | null;
    };
  }> {
    const redisStats = this.cache.getStats();
    const redisInfo = await this.cache.getInfo();

    return {
      redis: {
        stats: redisStats,
        info: redisInfo,
      },
      manager: {
        invalidationHistory: this.invalidationHistory.slice(0, 10), // Last 10 events
        warmingEnabled: this.warmingConfig?.enabled || false,
        warmingInterval: this.warmingConfig?.interval || null,
      },
    };
  }

  /**
   * Get invalidation history
   */
  public getInvalidationHistory(limit: number = 50): InvalidationEvent[] {
    return this.invalidationHistory.slice(0, limit);
  }

  /**
   * Extract cache key type for metrics
   */
  private getCacheKeyType(key: string): string {
    const parts = key.split(':');
    return parts.length > 0 && parts[0] ? parts[0] : 'unknown';
  }

  /**
   * Record cache operation metrics
   */
  public recordCacheMetrics(): void {
    const stats = this.cache.getStats();

    metricsService.setGauge('cache_hits_total', stats.hits);
    metricsService.setGauge('cache_misses_total', stats.misses);
    metricsService.setGauge('cache_hit_rate', stats.hitRate);
    metricsService.setGauge('cache_errors_total', stats.errors);
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    return this.cache.healthCheck();
  }
}

/**
 * Get cache manager instance
 */
export function getCacheManager(): CacheManager {
  return CacheManager.getInstance();
}

/**
 * Export the cache manager
 */
export default CacheManager;
