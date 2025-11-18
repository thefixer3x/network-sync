/**
 * Response Caching Middleware
 *
 * Automatically caches GET responses with support for:
 * - ETags and conditional requests
 * - Cache-Control headers
 * - Vary header support
 * - Selective caching based on route patterns
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getCache } from '../cache/redis-cache.js';
import { CACHE_TTL } from '../cache/cache-manager.js';
import { metricsService } from '../services/metrics.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('CacheMiddleware');
const cache = getCache();

/**
 * Cache middleware options
 */
export interface CacheMiddlewareOptions {
  ttl?: number;
  cacheControl?: string;
  varyBy?: string[];
  enabled?: boolean;
  skipIfAuthenticated?: boolean;
  skipPatterns?: RegExp[];
}

/**
 * Cached response interface
 */
interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  etag: string;
  timestamp: number;
}

/**
 * Create caching middleware
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = CACHE_TTL.CONTENT,
    cacheControl = 'public, max-age=300',
    varyBy = [],
    enabled = true,
    skipIfAuthenticated = false,
    skipPatterns = [],
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if disabled
    if (!enabled) {
      return next();
    }

    // Skip if authenticated (optional)
    if (skipIfAuthenticated && req.headers.authorization) {
      return next();
    }

    // Skip if matches skip patterns
    if (skipPatterns.some((pattern) => pattern.test(req.path))) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = generateCacheKey(req, varyBy);

      // Check if-none-match header (ETag)
      const ifNoneMatch = req.headers['if-none-match'];

      // Try to get cached response
      const cached = await cache.get<CachedResponse>(cacheKey);

      if (cached) {
        // Check ETag match
        if (ifNoneMatch && ifNoneMatch === cached.etag) {
          metricsService.incrementCounter('http_cache_304', {
            path: req.route?.path || req.path,
          });
          res.status(304).end();
          return;
        }

        // Return cached response
        metricsService.incrementCounter('http_cache_hits', {
          path: req.route?.path || req.path,
        });

        res.set(cached.headers);
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Age', String(Math.floor((Date.now() - cached.timestamp) / 1000)));
        res.status(cached.status).json(cached.body);
        return;
      }

      // Cache miss - intercept response
      metricsService.incrementCounter('http_cache_misses', {
        path: req.route?.path || req.path,
      });

      // Store original methods
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      const originalEnd = res.end.bind(res);

      let responseCached = false;

      // Intercept res.json()
      res.json = function (body: any): Response {
        if (!responseCached && res.statusCode >= 200 && res.statusCode < 300) {
          cacheResponse(cacheKey, res, body, ttl, cacheControl).catch((error) => {
            logger.error('Failed to cache response', { cacheKey, error });
          });
          responseCached = true;
        }
        return originalJson(body);
      };

      // Intercept res.send()
      res.send = function (body: any): Response {
        if (!responseCached && res.statusCode >= 200 && res.statusCode < 300) {
          cacheResponse(cacheKey, res, body, ttl, cacheControl).catch((error) => {
            logger.error('Failed to cache response', { cacheKey, error });
          });
          responseCached = true;
        }
        return originalSend(body);
      };

      // Set cache headers
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', cacheControl);

      next();
    } catch (error) {
      logger.error('Cache middleware error', error);
      metricsService.incrementCounter('http_cache_errors', {
        path: req.route?.path || req.path,
      });
      next();
    }
  };
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, varyBy: string[] = []): string {
  const parts: string[] = [
    'http-cache',
    req.path,
    req.query ? JSON.stringify(req.query) : '',
  ];

  // Add vary headers
  for (const header of varyBy) {
    const value = req.headers[header.toLowerCase()];
    if (value) {
      parts.push(`${header}:${value}`);
    }
  }

  // Create hash for long keys
  const keyString = parts.join('|');
  if (keyString.length > 200) {
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    return `http-cache:${hash}`;
  }

  return keyString.replace(/[^\w:-]/g, '_');
}

/**
 * Cache response
 */
async function cacheResponse(
  cacheKey: string,
  res: Response,
  body: any,
  ttl: number,
  cacheControl: string
): Promise<void> {
  try {
    // Generate ETag
    const etag = generateETag(body);

    // Build cached response
    const cachedResponse: CachedResponse = {
      status: res.statusCode,
      headers: {
        'Content-Type': res.get('Content-Type') || 'application/json',
        'Cache-Control': cacheControl,
        ETag: etag,
      },
      body,
      etag,
      timestamp: Date.now(),
    };

    // Store in cache
    await cache.set(cacheKey, cachedResponse, ttl);

    // Set ETag header
    res.set('ETag', etag);

    logger.debug('Response cached', { cacheKey, ttl });
  } catch (error) {
    logger.error('Error caching response', { cacheKey, error });
    throw error;
  }
}

/**
 * Generate ETag from response body
 */
function generateETag(body: any): string {
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

/**
 * Predefined cache middleware for different scenarios
 */

/**
 * Cache static data (24 hours)
 */
export const cacheStatic = cacheMiddleware({
  ttl: CACHE_TTL.STATIC,
  cacheControl: 'public, max-age=86400',
  enabled: true,
});

/**
 * Cache dynamic content (5 minutes)
 */
export const cacheDynamic = cacheMiddleware({
  ttl: CACHE_TTL.CONTENT,
  cacheControl: 'public, max-age=300',
  enabled: true,
});

/**
 * Cache analytics (3 minutes)
 */
export const cacheAnalytics = cacheMiddleware({
  ttl: CACHE_TTL.USER_ANALYTICS,
  cacheControl: 'public, max-age=180',
  enabled: true,
});

/**
 * Cache with user variation
 */
export const cachePerUser = cacheMiddleware({
  ttl: CACHE_TTL.USER_METRICS,
  cacheControl: 'private, max-age=180',
  varyBy: ['authorization', 'x-user-id'],
  enabled: true,
});

/**
 * Cache real-time data (30 seconds)
 */
export const cacheRealTime = cacheMiddleware({
  ttl: CACHE_TTL.REAL_TIME,
  cacheControl: 'public, max-age=30',
  enabled: true,
});

/**
 * No cache middleware
 */
export const noCache = (_req: Request, res: Response, next: NextFunction): void => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};
