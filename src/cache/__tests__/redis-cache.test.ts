/**
 * Redis Cache Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import RedisCacheManager, { getCache, initializeCache } from '../redis-cache';

describe('RedisCacheManager', () => {
  beforeAll(async () => {
    // Use test database to avoid conflicts
    process.env['REDIS_DB'] = '15'; // Use database 15 for tests
    process.env['REDIS_HOST'] = 'localhost';
    process.env['REDIS_PORT'] = '6379';
  });

  afterAll(async () => {
    // Cleanup
    const cache = getCache();
    if (cache.connected) {
      await cache.clear();
      await cache.disconnect();
    }
  });

  beforeEach(async () => {
    // Clear cache before each test
    const cache = getCache();
    if (cache.connected) {
      await cache.clear();
      cache.resetStats();
    }
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RedisCacheManager.getInstance();
      const instance2 = RedisCacheManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return the same instance via helper function', () => {
      const instance1 = getCache();
      const instance2 = getCache();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      await expect(initializeCache()).resolves.not.toThrow();

      const cache = getCache();
      expect(cache.connected).toBe(true);
    });

    it('should perform health check', async () => {
      await initializeCache();

      const cache = getCache();
      const isHealthy = await cache.healthCheck();

      expect(isHealthy).toBe(true);
    });
  });

  describe('Basic Operations', () => {
    beforeEach(async () => {
      await initializeCache();
    });

    it('should set and get a value', async () => {
      const cache = getCache();

      await cache.set('test-key', 'test-value', 60);
      const value = await cache.get('test-key');

      expect(value).toBe('test-value');
    });

    it('should set and get complex objects', async () => {
      const cache = getCache();
      const testObject = {
        id: 1,
        name: 'Test',
        data: { nested: true },
      };

      await cache.set('test-object', testObject, 60);
      const value = await cache.get(typeof testObject);

      expect(value).toEqual(testObject);
    });

    it('should return null for non-existent keys', async () => {
      const cache = getCache();

      const value = await cache.get('non-existent-key');

      expect(value).toBeNull();
    });

    it('should delete a value', async () => {
      const cache = getCache();

      await cache.set('test-key', 'test-value', 60);
      const deleted = await cache.delete('test-key');
      const value = await cache.get('test-key');

      expect(deleted).toBe(true);
      expect(value).toBeNull();
    });

    it('should check if key exists', async () => {
      const cache = getCache();

      await cache.set('test-key', 'test-value', 60);

      const exists = await cache.exists('test-key');
      const notExists = await cache.exists('non-existent');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('TTL Operations', () => {
    beforeEach(async () => {
      await initializeCache();
    });

    it('should set TTL correctly', async () => {
      const cache = getCache();

      await cache.set('test-key', 'test-value', 60);
      const ttl = await cache.ttl('test-key');

      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should update expiration time', async () => {
      const cache = getCache();

      await cache.set('test-key', 'test-value', 10);
      const success = await cache.expire('test-key', 120);
      const ttl = await cache.ttl('test-key');

      expect(success).toBe(true);
      expect(ttl).toBeGreaterThan(10);
    });

    it('should expire keys after TTL', async () => {
      const cache = getCache();

      // Set with 1 second TTL
      await cache.set('test-key', 'test-value', 1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const value = await cache.get('test-key');
      expect(value).toBeNull();
    }, 3000);
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await initializeCache();
    });

    it('should get multiple values', async () => {
      const cache = getCache();

      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);
      await cache.set('key3', 'value3', 60);

      const values = await cache.mget(['key1', 'key2', 'key3', 'key4']);

      expect(values).toEqual(['value1', 'value2', 'value3', null]);
    });

    it('should set multiple values', async () => {
      const cache = getCache();

      const success = await cache.mset(
        {
          key1: 'value1',
          key2: 'value2',
          key3: 'value3',
        },
        60
      );

      expect(success).toBe(true);

      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');
      const value3 = await cache.get('key3');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
      expect(value3).toBe('value3');
    });

    it('should delete multiple keys', async () => {
      const cache = getCache();

      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);
      await cache.set('key3', 'value3', 60);

      const deleted = await cache.mdel(['key1', 'key2']);

      expect(deleted).toBe(2);

      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');
      const value3 = await cache.get('key3');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(value3).toBe('value3');
    });
  });

  describe('Increment/Decrement', () => {
    beforeEach(async () => {
      await initializeCache();
    });

    it('should increment a value', async () => {
      const cache = getCache();

      const value1 = await cache.incr('counter');
      const value2 = await cache.incr('counter');
      const value3 = await cache.incr('counter', 5);

      expect(value1).toBe(1);
      expect(value2).toBe(2);
      expect(value3).toBe(7);
    });

    it('should decrement a value', async () => {
      const cache = getCache();

      await cache.set('counter', 10);

      const value1 = await cache.decr('counter');
      const value2 = await cache.decr('counter');
      const value3 = await cache.decr('counter', 5);

      expect(value1).toBe(9);
      expect(value2).toBe(8);
      expect(value3).toBe(3);
    });
  });

  describe('Clear Operations', () => {
    beforeEach(async () => {
      await initializeCache();
    });

    it('should clear all keys', async () => {
      const cache = getCache();

      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);
      await cache.set('key3', 'value3', 60);

      const cleared = await cache.clear();

      expect(cleared).toBeGreaterThanOrEqual(3);

      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');
      const value3 = await cache.get('key3');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(value3).toBeNull();
    });

    it('should clear keys matching pattern', async () => {
      const cache = getCache();

      await cache.set('user:1', 'data1', 60);
      await cache.set('user:2', 'data2', 60);
      await cache.set('post:1', 'data3', 60);

      const cleared = await cache.clear('user:*');

      expect(cleared).toBeGreaterThanOrEqual(2);

      const user1 = await cache.get('user:1');
      const user2 = await cache.get('user:2');
      const post1 = await cache.get('post:1');

      expect(user1).toBeNull();
      expect(user2).toBeNull();
      expect(post1).toBe('data3');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await initializeCache();
      getCache().resetStats();
    });

    it('should track hits and misses', async () => {
      const cache = getCache();

      // Misses
      await cache.get('non-existent-1');
      await cache.get('non-existent-2');

      // Hits
      await cache.set('key1', 'value1', 60);
      await cache.get('key1');
      await cache.get('key1');

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track sets and deletes', async () => {
      const cache = getCache();

      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);
      await cache.delete('key1');

      const stats = cache.getStats();

      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
    });

    it('should reset statistics', async () => {
      const cache = getCache();

      await cache.set('key1', 'value1', 60);
      await cache.get('key1');

      cache.resetStats();

      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
    });
  });
});
