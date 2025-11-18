/**
 * Redis Cache Manager
 *
 * Centralized caching layer using Redis for high-performance data storage
 * and retrieval across the application.
 */

import { createClient, RedisClientType } from 'redis';
import { Logger } from '@/utils/Logger';

const logger = new Logger('RedisCache');

/**
 * Cache configuration
 */
export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number; // seconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = any> {
  value: T;
  cachedAt: number;
  expiresAt: number | null;
  hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<CacheConfig> = {
  host: 'localhost',
  port: 6379,
  password: '',
  db: 0,
  keyPrefix: 'network-sync:',
  defaultTTL: 3600, // 1 hour
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Redis Cache Manager Singleton
 */
class RedisCacheManager {
  private static instance: RedisCacheManager;
  private client: RedisClientType | null = null;
  private config: Required<CacheConfig>;
  private isConnected = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
  };

  private constructor() {
    this.config = DEFAULT_CONFIG;
    logger.info('Redis Cache Manager created');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisCacheManager {
    if (!RedisCacheManager.instance) {
      RedisCacheManager.instance = new RedisCacheManager();
    }
    return RedisCacheManager.instance;
  }

  /**
   * Initialize Redis connection
   */
  public async connect(config?: CacheConfig): Promise<void> {
    try {
      if (this.isConnected) {
        logger.warn('Redis cache already connected');
        return;
      }

      // Merge config with defaults
      this.config = {
        ...DEFAULT_CONFIG,
        ...config,
      };

      logger.info('Connecting to Redis cache', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
      });

      // Create Redis client
      const url = this.config.password
        ? `redis://:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.db}`
        : `redis://${this.config.host}:${this.config.port}/${this.config.db}`;

      this.client = createClient({
        url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.config.maxRetries) {
              logger.error('Max Redis reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * this.config.retryDelay, 10000);
            logger.warn(`Reconnecting to Redis in ${delay}ms (attempt ${retries})`);
            return delay;
          },
        },
      }) as RedisClientType;

      // Setup event handlers
      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.stats.errors++;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client connection closed');
        this.isConnected = false;
      });

      // Connect
      await this.client.connect();

      logger.info('Redis cache connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis cache', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        logger.info('Redis cache disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis cache', error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  public get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Get value from cache
   */
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      if (!this.client || !this.isConnected) {
        logger.warn('Redis cache not connected, skipping get');
        this.stats.misses++;
        return null;
      }

      const fullKey = this.buildKey(key);
      const value = await this.client.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      logger.debug(`Cache hit: ${key}`);

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  public async set<T = any>(
    key: string,
    value: T,
    ttl: number = this.config.defaultTTL
  ): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        logger.warn('Redis cache not connected, skipping set');
        return false;
      }

      const fullKey = this.buildKey(key);
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.client.setEx(fullKey, ttl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }

      this.stats.sets++;
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);

      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        logger.warn('Redis cache not connected, skipping delete');
        return false;
      }

      const fullKey = this.buildKey(key);
      const result = await this.client.del(fullKey);

      this.stats.deletes++;
      logger.debug(`Cache delete: ${key} (deleted: ${result > 0})`);

      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      const fullKey = this.buildKey(key);
      const result = await this.client.exists(fullKey);

      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get multiple values
   */
  public async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.client || !this.isConnected) {
        return keys.map(() => null);
      }

      const fullKeys = keys.map((k) => this.buildKey(k));
      const values = await this.client.mGet(fullKeys);

      return values.map((v, idx) => {
        if (v === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        try {
          return JSON.parse(v) as T;
        } catch (error) {
          logger.error(`Error parsing cache value for key ${keys[idx]}:`, error);
          return null;
        }
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      this.stats.errors++;
      return keys.map(() => null);
    } finally {
      this.updateHitRate();
    }
  }

  /**
   * Set multiple values
   */
  public async mset(entries: Record<string, any>, ttl?: number): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      const pipeline = this.client.multi();

      for (const [key, value] of Object.entries(entries)) {
        const fullKey = this.buildKey(key);
        const serialized = JSON.stringify(value);

        if (ttl && ttl > 0) {
          pipeline.setEx(fullKey, ttl, serialized);
        } else {
          pipeline.set(fullKey, serialized);
        }
        this.stats.sets++;
      }

      await pipeline.exec();

      logger.debug(`Cache mset: ${Object.keys(entries).length} entries`);
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  public async mdel(keys: string[]): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        return 0;
      }

      const fullKeys = keys.map((k) => this.buildKey(k));
      const result = await this.client.del(fullKeys);

      this.stats.deletes += result;
      logger.debug(`Cache mdel: ${result} keys deleted`);

      return result;
    } catch (error) {
      logger.error('Cache mdel error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Clear all keys with prefix
   */
  public async clear(pattern: string = '*'): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        return 0;
      }

      const fullPattern = this.buildKey(pattern);
      const keys = [];

      for await (const key of this.client.scanIterator({ MATCH: fullPattern, COUNT: 100 })) {
        keys.push(key);
      }

      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(keys as any);
      this.stats.deletes += result;

      logger.info(`Cache cleared: ${result} keys deleted with pattern ${pattern}`);
      return result;
    } catch (error) {
      logger.error('Cache clear error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get Time To Live for a key
   */
  public async ttl(key: string): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        return -1;
      }

      const fullKey = this.buildKey(key);
      return await this.client.ttl(fullKey);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Update expiration time for a key
   */
  public async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      const fullKey = this.buildKey(key);
      const result = await this.client.expire(fullKey, ttl);

      logger.debug(`Cache expire: ${key} (TTL: ${ttl}s, success: ${result})`);
      return result === 1;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Increment a value
   */
  public async incr(key: string, amount: number = 1): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        return 0;
      }

      const fullKey = this.buildKey(key);
      const result = await this.client.incrBy(fullKey, amount);

      logger.debug(`Cache incr: ${key} by ${amount} = ${result}`);
      return result;
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Decrement a value
   */
  public async decr(key: string, amount: number = 1): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        return 0;
      }

      const fullKey = this.buildKey(key);
      const result = await this.client.decrBy(fullKey, amount);

      logger.debug(`Cache decr: ${key} by ${amount} = ${result}`);
      return result;
    } catch (error) {
      logger.error(`Cache decr error for key ${key}:`, error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
    logger.info('Cache statistics reset');
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Cache health check failed', error);
      return false;
    }
  }

  /**
   * Get server info
   */
  public async getInfo(): Promise<any> {
    try {
      if (!this.client || !this.isConnected) {
        return null;
      }

      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Error getting Redis info', error);
      return null;
    }
  }
}

/**
 * Initialize Redis cache from environment variables
 */
export async function initializeCache(): Promise<void> {
  const cache = RedisCacheManager.getInstance();

  const config: CacheConfig = {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    ...(process.env['REDIS_PASSWORD'] ? { password: process.env['REDIS_PASSWORD'] } : {}),
    db: parseInt(process.env['REDIS_DB'] || '0'),
    keyPrefix: process.env['REDIS_KEY_PREFIX'] || 'network-sync:',
    defaultTTL: parseInt(process.env['CACHE_DEFAULT_TTL'] || '3600'),
    maxRetries: parseInt(process.env['REDIS_MAX_RETRIES'] || '3'),
    retryDelay: parseInt(process.env['REDIS_RETRY_DELAY'] || '1000'),
  };

  await cache.connect(config);
}

/**
 * Get cache instance
 */
export function getCache(): RedisCacheManager {
  return RedisCacheManager.getInstance();
}

/**
 * Export the cache manager
 */
export default RedisCacheManager;
