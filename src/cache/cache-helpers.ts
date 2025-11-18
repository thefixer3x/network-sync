/**
 * Cache Helper Utilities
 *
 * Common caching patterns and helpers for easier cache integration
 */

import { getCache } from './redis-cache';
import { Logger } from '@/utils/Logger';

const logger = new Logger('CacheHelpers');

/**
 * Cache-aside pattern: Get from cache, or fetch and cache
 */
export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cache = getCache();

  try {
    // Try to get from cache first
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      logger.debug(`Cache-aside hit: ${key}`);
      return cached;
    }

    // Cache miss - fetch data
    logger.debug(`Cache-aside miss: ${key}, fetching...`);
    const data = await fetchFn();

    // Store in cache
    await cache.set(key, data, ttl);

    return data;
  } catch (error) {
    logger.error(`Cache-aside error for key ${key}:`, error);
    // Fallback to direct fetch on error
    return await fetchFn();
  }
}

/**
 * Cache with refresh pattern: Return cached value immediately, refresh in background
 */
export async function cacheWithRefresh<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number,
  refreshThreshold: number = 0.8
): Promise<T> {
  const cache = getCache();

  try {
    const cached = await cache.get<T>(key);

    if (cached !== null) {
      // Check if we should refresh in background
      const currentTTL = await cache.ttl(key);
      const shouldRefresh = ttl && currentTTL > 0 && currentTTL < ttl * refreshThreshold;

      if (shouldRefresh) {
        // Refresh in background (don't await)
        logger.debug(`Background refresh triggered for ${key}`);
        fetchFn()
          .then((data) => cache.set(key, data, ttl))
          .catch((err) => logger.error(`Background refresh failed for ${key}:`, err));
      }

      return cached;
    }

    // Cache miss - fetch and cache
    const data = await fetchFn();
    await cache.set(key, data, ttl);
    return data;
  } catch (error) {
    logger.error(`Cache-with-refresh error for key ${key}:`, error);
    return await fetchFn();
  }
}

/**
 * Write-through pattern: Write to cache and storage simultaneously
 */
export async function writeThrough<T>(
  key: string,
  value: T,
  writeFn: (value: T) => Promise<void>,
  ttl?: number
): Promise<void> {
  const cache = getCache();

  try {
    // Write to both cache and storage
    await Promise.all([
      cache.set(key, value, ttl),
      writeFn(value),
    ]);

    logger.debug(`Write-through completed for ${key}`);
  } catch (error) {
    logger.error(`Write-through error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Write-behind pattern: Write to cache immediately, queue storage write
 */
export async function writeBehind<T>(
  key: string,
  value: T,
  writeFn: (value: T) => Promise<void>,
  ttl?: number
): Promise<void> {
  const cache = getCache();

  try {
    // Write to cache immediately
    await cache.set(key, value, ttl);

    // Queue storage write (don't await)
    writeFn(value).catch((err) =>
      logger.error(`Write-behind storage write failed for ${key}:`, err)
    );

    logger.debug(`Write-behind cache write completed for ${key}`);
  } catch (error) {
    logger.error(`Write-behind error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Invalidate cache pattern: Delete from cache and optionally storage
 */
export async function invalidateCache(
  key: string | string[],
  deleteFn?: () => Promise<void>
): Promise<void> {
  const cache = getCache();

  try {
    // Delete from cache
    if (Array.isArray(key)) {
      await cache.mdel(key);
    } else {
      await cache.delete(key);
    }

    // Optionally delete from storage
    if (deleteFn) {
      await deleteFn();
    }

    logger.debug(`Cache invalidated for ${Array.isArray(key) ? key.join(', ') : key}`);
  } catch (error) {
    logger.error(`Cache invalidation error:`, error);
    throw error;
  }
}

/**
 * Batch cache pattern: Get multiple items from cache or fetch missing ones
 */
export async function cacheBatch<T>(
  keys: string[],
  fetchFn: (missingKeys: string[]) => Promise<Record<string, T>>,
  ttl?: number
): Promise<Record<string, T>> {
  const cache = getCache();

  try {
    // Get all from cache
    const cached = await cache.mget<T>(keys);

    // Find missing keys
    const missingKeys: string[] = [];
    const result: Record<string, T> = {};

    keys.forEach((key, idx) => {
      if (cached[idx] !== null) {
        result[key] = cached[idx]!;
      } else {
        missingKeys.push(key);
      }
    });

    // Fetch missing data
    if (missingKeys.length > 0) {
      logger.debug(`Cache batch: ${missingKeys.length}/${keys.length} misses`);
      const fetched = await fetchFn(missingKeys);

      // Cache fetched data
      await cache.mset(fetched, ttl);

      // Add to result
      Object.assign(result, fetched);
    }

    return result;
  } catch (error) {
    logger.error('Cache batch error:', error);
    // Fallback to fetching all
    return await fetchFn(keys);
  }
}

/**
 * Cache key builder with consistent formatting
 */
export class CacheKeyBuilder {
  private parts: string[] = [];

  constructor(private namespace: string) {
    this.parts.push(namespace);
  }

  /**
   * Add a part to the key
   */
  public add(part: string | number): this {
    this.parts.push(String(part));
    return this;
  }

  /**
   * Build the final key
   */
  public build(): string {
    return this.parts.join(':');
  }

  /**
   * Static helper to create a key
   */
  public static create(namespace: string, ...parts: (string | number)[]): string {
    return [namespace, ...parts.map(String)].join(':');
  }
}

/**
 * Memoization with cache
 */
export function memoize<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
    namespace?: string;
  } = {}
): T {
  const cache = getCache();
  const namespace = options.namespace || fn.name || 'memoized';

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // Generate cache key
    const key = options.keyGenerator
      ? options.keyGenerator(...args)
      : CacheKeyBuilder.create(namespace, JSON.stringify(args));

    // Try cache first
    const cached = await cache.get(key);
    if (cached !== null) {
      return cached as ReturnType<T>;
    }

    // Execute function
    const result = await fn(...args);

    // Cache result
    await cache.set(key, result, options.ttl);

    return result;
  }) as T;
}

/**
 * Rate limiting using cache
 */
export async function rateLimit(
  identifier: string,
  max: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const cache = getCache();
  const key = CacheKeyBuilder.create('rate-limit', identifier);

  try {
    const current = await cache.incr(key);

    // Set expiration on first request
    if (current === 1) {
      await cache.expire(key, windowSeconds);
    }

    const allowed = current <= max;
    const remaining = Math.max(0, max - current);
    const ttl = await cache.ttl(key);
    const resetAt = new Date(Date.now() + ttl * 1000);

    return {
      allowed,
      remaining,
      resetAt,
    };
  } catch (error) {
    logger.error(`Rate limit error for ${identifier}:`, error);
    // Fail open on error
    return {
      allowed: true,
      remaining: max,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }
}

/**
 * Distributed lock using cache
 */
export async function acquireLock(
  resource: string,
  ttl: number = 30
): Promise<string | null> {
  const cache = getCache();
  const lockKey = CacheKeyBuilder.create('lock', resource);
  const lockValue = `${Date.now()}-${Math.random()}`;

  try {
    // Try to set lock (NX = only if not exists)
    const acquired = await cache.set(lockKey, lockValue, ttl);

    if (acquired) {
      logger.debug(`Lock acquired for ${resource}`);
      return lockValue;
    }

    return null;
  } catch (error) {
    logger.error(`Lock acquisition error for ${resource}:`, error);
    return null;
  }
}

/**
 * Release distributed lock
 */
export async function releaseLock(resource: string, lockValue: string): Promise<boolean> {
  const cache = getCache();
  const lockKey = CacheKeyBuilder.create('lock', resource);

  try {
    // Only release if we own the lock
    const current = await cache.get<string>(lockKey);

    if (current === lockValue) {
      await cache.delete(lockKey);
      logger.debug(`Lock released for ${resource}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(`Lock release error for ${resource}:`, error);
    return false;
  }
}

/**
 * Execute with lock
 */
export async function withLock<T>(
  resource: string,
  fn: () => Promise<T>,
  ttl: number = 30,
  maxWaitMs: number = 5000
): Promise<T> {
  const startTime = Date.now();
  let lockValue: string | null = null;

  // Try to acquire lock with retries
  while (Date.now() - startTime < maxWaitMs) {
    lockValue = await acquireLock(resource, ttl);
    if (lockValue) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!lockValue) {
    throw new Error(`Failed to acquire lock for ${resource} within ${maxWaitMs}ms`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(resource, lockValue);
  }
}

/**
 * Session storage using cache
 */
export class SessionCache {
  private static readonly SESSION_PREFIX = 'session';
  private static readonly DEFAULT_TTL = 3600; // 1 hour

  /**
   * Get session data
   */
  public static async get<T = any>(sessionId: string): Promise<T | null> {
    const cache = getCache();
    const key = CacheKeyBuilder.create(this.SESSION_PREFIX, sessionId);
    return await cache.get<T>(key);
  }

  /**
   * Set session data
   */
  public static async set<T = any>(
    sessionId: string,
    data: T,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    const cache = getCache();
    const key = CacheKeyBuilder.create(this.SESSION_PREFIX, sessionId);
    await cache.set(key, data, ttl);
  }

  /**
   * Update session data
   */
  public static async update<T = any>(
    sessionId: string,
    updateFn: (data: T | null) => T,
    ttl?: number
  ): Promise<void> {
    const current = await this.get<T>(sessionId);
    const updated = updateFn(current);
    await this.set(sessionId, updated, ttl);
  }

  /**
   * Delete session
   */
  public static async delete(sessionId: string): Promise<void> {
    const cache = getCache();
    const key = CacheKeyBuilder.create(this.SESSION_PREFIX, sessionId);
    await cache.delete(key);
  }

  /**
   * Refresh session TTL
   */
  public static async refresh(sessionId: string, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const cache = getCache();
    const key = CacheKeyBuilder.create(this.SESSION_PREFIX, sessionId);
    await cache.expire(key, ttl);
  }
}
