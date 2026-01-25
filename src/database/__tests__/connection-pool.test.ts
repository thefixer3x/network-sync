/**
 * Connection Pool Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import ConnectionPoolManager, {
  getConnectionPool,
  getSupabaseClient,
  getSupabaseAdminClient,
  releaseConnection,
  getPoolStats,
  initializeConnectionPool,
} from '../connection-pool';

describe('ConnectionPoolManager', () => {
  beforeAll(async () => {
    // Ensure environment variables are set
    process.env['SUPABASE_URL'] = process.env['SUPABASE_URL'] || 'https://test.supabase.co';
    process.env['SUPABASE_ANON_KEY'] = process.env['SUPABASE_ANON_KEY'] || 'test-anon-key';
    process.env['SUPABASE_SERVICE_ROLE_KEY'] =
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || 'test-service-role-key';
  });

  beforeEach(() => {
    // Reset metrics before each test
    const pool = getConnectionPool();
    pool.resetMetrics();
  });

  afterEach(async () => {
    // Ensure pool is torn down between tests to avoid leaked handles
    const pool = getConnectionPool();
    // Reset active counter to avoid long waits in shutdown during tests
    (pool as any).activeConnections = 0;
    await pool.shutdown();
    pool.resetMetrics();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ConnectionPoolManager.getInstance();
      const instance2 = ConnectionPoolManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return the same instance via helper function', () => {
      const instance1 = getConnectionPool();
      const instance2 = getConnectionPool();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize with environment variables', async () => {
      await expect(initializeConnectionPool()).resolves.not.toThrow();
    });

    it('should initialize with custom config', async () => {
      const pool = getConnectionPool();

      await expect(
        pool.initialize({
          url: 'https://test.supabase.co',
          anonKey: 'test-key',
          schema: 'public',
          pool: {
            minConnections: 5,
            maxConnections: 20,
          },
        })
      ).resolves.not.toThrow();
    });

    it('should throw error if URL is missing', async () => {
      const pool = getConnectionPool();

      await expect(
        pool.initialize({
          url: '',
          anonKey: 'test-key',
        })
      ).rejects.toThrow('SUPABASE_URL is required');
    });

    it('should throw error if anon key is missing', async () => {
      const pool = getConnectionPool();

      await expect(
        pool.initialize({
          url: 'https://test.supabase.co',
          anonKey: '',
        })
      ).rejects.toThrow('SUPABASE_ANON_KEY is required');
    });
  });

  describe('Client Access', () => {
    beforeEach(async () => {
      await initializeConnectionPool();
    });

    it('should get client successfully', () => {
      const client = getSupabaseClient();
      expect(client).toBeDefined();
    });

    it('should get admin client successfully', () => {
      const client = getSupabaseAdminClient();
      expect(client).toBeDefined();
    });

    it('should throw error if getting client before initialization', () => {
      const pool = ConnectionPoolManager.getInstance();
      const uninitializedPool = Object.create(pool);
      uninitializedPool.supabaseClient = null;

      expect(() => uninitializedPool.getClient()).toThrow(
        'Connection pool not initialized'
      );
    });

    it('should throw error if getting admin client without service role key', () => {
      const pool = ConnectionPoolManager.getInstance();
      const uninitializedPool = Object.create(pool);
      uninitializedPool.supabaseAdminClient = null;

      expect(() => uninitializedPool.getAdminClient()).toThrow(
        'Admin client not initialized'
      );
    });
  });

  describe('Connection Tracking', () => {
    beforeEach(async () => {
      await initializeConnectionPool();
    });

    it('should track active connections', () => {
      const initialStats = getPoolStats();
      const initialActive = initialStats.active;

      getSupabaseClient();
      const statsAfter = getPoolStats();

      expect(statsAfter.active).toBe(initialActive + 1);
    });

    it('should track connection acquisition', () => {
      const initialStats = getPoolStats();
      const initialAcquired = initialStats.metrics.totalAcquired;

      getSupabaseClient();
      const statsAfter = getPoolStats();

      expect(statsAfter.metrics.totalAcquired).toBe(initialAcquired + 1);
    });

    it('should track connection release', () => {
      const initialStats = getPoolStats();
      const initialReleased = initialStats.metrics.totalReleased;

      getSupabaseClient();
      releaseConnection();

      const statsAfter = getPoolStats();

      expect(statsAfter.metrics.totalReleased).toBe(initialReleased + 1);
    });

    it('should decrease active connections on release', () => {
      const initialStats = getPoolStats();
      const initialActive = initialStats.active;

      getSupabaseClient();
      releaseConnection();

      const statsAfter = getPoolStats();

      expect(statsAfter.active).toBe(initialActive);
    });
  });

  describe('Pool Statistics', () => {
    beforeEach(async () => {
      await initializeConnectionPool();
    });

    it('should return pool statistics', () => {
      const stats = getPoolStats();

      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('config');
      expect(stats).toHaveProperty('metrics');
      expect(stats).toHaveProperty('health');
    });

    it('should include connection metrics', () => {
      const stats = getPoolStats();

      expect(stats.metrics).toHaveProperty('totalCreated');
      expect(stats.metrics).toHaveProperty('totalAcquired');
      expect(stats.metrics).toHaveProperty('totalReleased');
      expect(stats.metrics).toHaveProperty('errors');
    });

    it('should include pool configuration', () => {
      const stats = getPoolStats();

      expect(stats.config).toHaveProperty('minConnections');
      expect(stats.config).toHaveProperty('maxConnections');
      expect(stats.config).toHaveProperty('connectionTimeout');
      expect(stats.config).toHaveProperty('idleTimeout');
      expect(stats.config).toHaveProperty('acquireTimeout');
    });
  });

  describe('Health Status', () => {
    beforeEach(async () => {
      await initializeConnectionPool();
    });

    it('should return healthy status when utilization is low', () => {
      const pool = getConnectionPool();
      const status = pool.getHealthStatus();

      expect(status).toBe('healthy');
    });

    it('should return warning status at 70% utilization', async () => {
      const pool = getConnectionPool();

      // Initialize with small max connections for testing
      await pool.initialize({
        url: 'https://test.supabase.co',
        anonKey: 'test-key',
        pool: {
          maxConnections: 10,
        },
      });

      // Acquire 7 connections (70%)
      for (let i = 0; i < 7; i++) {
        pool.getClient();
      }

      const status = pool.getHealthStatus();
      expect(status).toBe('warning');
    });

    it('should return critical status at 90% utilization', async () => {
      const pool = getConnectionPool();

      // Initialize with small max connections for testing
      await pool.initialize({
        url: 'https://test.supabase.co',
        anonKey: 'test-key',
        pool: {
          maxConnections: 10,
        },
      });

      // Acquire 9 connections (90%)
      for (let i = 0; i < 9; i++) {
        pool.getClient();
      }

      const status = pool.getHealthStatus();
      expect(status).toBe('critical');
    });
  });

  describe('Metrics Reset', () => {
    beforeEach(async () => {
      await initializeConnectionPool();
    });

    it('should reset metrics', () => {
      getSupabaseClient();
      getSupabaseClient();

      const pool = getConnectionPool();
      pool.resetMetrics();

      const stats = getPoolStats();

      expect(stats.metrics.totalCreated).toBe(0);
      expect(stats.metrics.totalAcquired).toBe(0);
      expect(stats.metrics.totalReleased).toBe(0);
      expect(stats.metrics.errors).toBe(0);
    });
  });

  describe('Graceful Shutdown', () => {
    beforeEach(async () => {
      await initializeConnectionPool();
    });

    it('should shutdown gracefully', async () => {
      const pool = getConnectionPool();
      await expect(pool.shutdown()).resolves.not.toThrow();
    });

    it('should wait for active connections to complete', async () => {
      const pool = getConnectionPool();

      // Acquire some connections
      pool.getClient();
      pool.getClient();

      const shutdownPromise = pool.shutdown();

      // Release connections
      releaseConnection();
      releaseConnection();

      await expect(shutdownPromise).resolves.not.toThrow();
    });
  });
});
