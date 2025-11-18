/**
 * Cache Initialization Service
 *
 * Sets up cache warming for frequently accessed data
 */

import { getCacheManager, CACHE_TTL } from './cache-manager.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('CacheInit');

/**
 * Initialize cache warming
 */
export async function initializeCacheWarming(): Promise<void> {
  const cacheManager = getCacheManager();

  logger.info('Initializing cache warming...');

  // Configure cache warming
  cacheManager.startCacheWarming({
    enabled: process.env['CACHE_WARMING_ENABLED'] !== 'false',
    interval: parseInt(process.env['CACHE_WARMING_INTERVAL'] || '300000'), // 5 minutes

    keys: [
      // AI Pricing Data (static)
      {
        key: 'ai-pricing',
        ttl: CACHE_TTL.AI_PRICING,
        fetcher: async () => {
          logger.debug('Warming cache: AI pricing');
          const { AI_PRICING } = await import('../services/ai-cost-tracker.js');
          return AI_PRICING;
        },
      },

      // System Configuration (semi-static)
      {
        key: 'system-config',
        ttl: CACHE_TTL.CONFIG,
        fetcher: async () => {
          logger.debug('Warming cache: System config');
          return {
            maxWorkflows: parseInt(process.env['MAX_WORKFLOWS'] || '100'),
            maxContentPerWorkflow: parseInt(process.env['MAX_CONTENT_PER_WORKFLOW'] || '1000'),
            aiProviders: ['claude', 'perplexity', 'openai'],
            platforms: ['twitter', 'linkedin', 'facebook', 'instagram'],
          };
        },
      },

      // Default Templates (static)
      {
        key: 'templates:default',
        ttl: CACHE_TTL.TEMPLATES,
        fetcher: async () => {
          logger.debug('Warming cache: Default templates');
          return {
            contentTemplates: [
              {
                id: 'short-form',
                name: 'Short Form Content',
                maxLength: 280,
                platforms: ['twitter'],
              },
              {
                id: 'long-form',
                name: 'Long Form Content',
                maxLength: 3000,
                platforms: ['linkedin', 'facebook'],
              },
              {
                id: 'visual',
                name: 'Visual Content',
                maxLength: 500,
                platforms: ['instagram'],
              },
            ],
          };
        },
      },

      // Metrics Metadata (semi-static)
      {
        key: 'metrics:metadata',
        ttl: CACHE_TTL.CONFIG,
        fetcher: async () => {
          logger.debug('Warming cache: Metrics metadata');
          return {
            availableMetrics: [
              'followers',
              'engagement_rate',
              'posts',
              'likes',
              'comments',
              'shares',
              'reach',
              'impressions',
            ],
            platforms: ['twitter', 'linkedin', 'facebook', 'instagram'],
            aggregations: ['sum', 'avg', 'min', 'max', 'count'],
          };
        },
      },
    ],
  });

  logger.info('Cache warming initialized');
}

/**
 * Shutdown cache warming
 */
export function shutdownCacheWarming(): void {
  const cacheManager = getCacheManager();
  cacheManager.stopCacheWarming();
  logger.info('Cache warming shutdown complete');
}

/**
 * Get cache statistics
 */
export async function getCacheStatistics() {
  const cacheManager = getCacheManager();
  return cacheManager.getStatistics();
}

/**
 * Get cache invalidation history
 */
export function getCacheInvalidationHistory(limit?: number) {
  const cacheManager = getCacheManager();
  return cacheManager.getInvalidationHistory(limit);
}
