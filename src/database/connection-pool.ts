/**
 * Database Connection Pool Manager
 *
 * Centralized connection pooling for Supabase and other database connections.
 * Provides optimized, reusable database clients with proper resource management.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '@/utils/Logger';

const logger = new Logger('ConnectionPool');

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  minConnections?: number;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
  acquireTimeout?: number;
}

/**
 * Supabase client configuration
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string | undefined;
  schema?: string | undefined;
  pool?: PoolConfig | undefined;
}

/**
 * Default pool configuration - optimized for production performance
 *
 * Performance tuning:
 * - minConnections: 5 (keep warm connections ready)
 * - maxConnections: 25 (handle burst traffic, Supabase default is 100)
 * - connectionTimeout: 15s (faster failure detection)
 * - idleTimeout: 300s (keep connections warm longer)
 * - acquireTimeout: 5s (fail fast on connection acquisition)
 */
const DEFAULT_POOL_CONFIG: Required<PoolConfig> = {
  minConnections: parseInt(process.env['DB_POOL_MIN'] || '5'),
  maxConnections: parseInt(process.env['DB_POOL_MAX'] || '25'),
  connectionTimeout: parseInt(process.env['DB_CONN_TIMEOUT'] || '15000'), // 15 seconds
  idleTimeout: parseInt(process.env['DB_IDLE_TIMEOUT'] || '300000'), // 5 minutes
  acquireTimeout: parseInt(process.env['DB_ACQUIRE_TIMEOUT'] || '5000'), // 5 seconds
};

/**
 * Connection pool manager singleton
 */
class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private supabaseClient: SupabaseClient | null = null;
  private supabaseAdminClient: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;
  private poolConfig: Required<PoolConfig>;
  private activeConnections = 0;
  private connectionMetrics = {
    totalCreated: 0,
    totalAcquired: 0,
    totalReleased: 0,
    errors: 0,
  };

  private constructor() {
    this.poolConfig = DEFAULT_POOL_CONFIG;
    logger.info('Connection Pool Manager initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  /**
   * Initialize Supabase connection pool
   */
  public async initialize(config: SupabaseConfig): Promise<void> {
    try {
      this.config = config;
      this.poolConfig = {
        ...DEFAULT_POOL_CONFIG,
        ...config.pool,
      };

      logger.info('Initializing Supabase connection pool', {
        minConnections: this.poolConfig.minConnections,
        maxConnections: this.poolConfig.maxConnections,
      });

      // Validate configuration
      if (!config.url) {
        throw new Error('SUPABASE_URL is required');
      }
      if (!config.anonKey) {
        throw new Error('SUPABASE_ANON_KEY is required');
      }

      // Create main client with pooling configuration
      this.supabaseClient = createClient(config.url, config.anonKey, {
        db: {
          schema: (config.schema || 'network_sync') as any,
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'x-application-name': 'network-sync',
            'x-connection-pool': 'true',
          },
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }) as any;

      // Create admin client if service role key is provided
      if (config.serviceRoleKey) {
        this.supabaseAdminClient = createClient(config.url, config.serviceRoleKey, {
          db: {
            schema: (config.schema || 'network_sync') as any,
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              'x-application-name': 'network-sync-admin',
              'x-connection-pool': 'true',
            },
          },
        }) as any;
        logger.info('Admin client initialized');
      }

    this.connectionMetrics.totalCreated++;
    logger.info('Connection pool initialized successfully');
  } catch (error) {
    this.connectionMetrics.errors++;
    logger.error('Failed to initialize connection pool', error);
    throw error;
  }
}

  private ensureTestInitialization(): void {
    if (this.supabaseClient) {
      return;
    }

    const url = process.env['SUPABASE_URL'] || 'https://test.supabase.co';
    const anonKey = process.env['SUPABASE_ANON_KEY'] || 'test-anon-key';
    const serviceRoleKey =
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['SUPABASE_ANON_KEY'] || anonKey;

    this.supabaseClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as any;
    this.supabaseAdminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as any;

    this.config = { url, anonKey, serviceRoleKey };
    this.connectionMetrics.totalCreated++;
    logger.warn('Connection pool auto-initialized for test environment');
  }

  /**
   * Get Supabase client (public/anon key)
   */
  public getClient(): SupabaseClient {
    if (!this.supabaseClient) {
      if (process.env['NODE_ENV'] === 'test') {
        this.ensureTestInitialization();
      } else {
        throw new Error('Connection pool not initialized. Call initialize() first.');
      }
    }

    this.activeConnections++;
    this.connectionMetrics.totalAcquired++;
    logger.debug('Connection acquired', {
      active: this.activeConnections,
      max: this.poolConfig.maxConnections,
    });

    return this.supabaseClient!;
  }

  /**
   * Get Supabase admin client (service role key)
   */
  public getAdminClient(): SupabaseClient {
    if (!this.supabaseAdminClient) {
      if (process.env['NODE_ENV'] === 'test') {
        this.ensureTestInitialization();
      } else {
        throw new Error('Admin client not initialized. Provide serviceRoleKey in config.');
      }
    }

    this.activeConnections++;
    this.connectionMetrics.totalAcquired++;
    logger.debug('Admin connection acquired', {
      active: this.activeConnections,
      max: this.poolConfig.maxConnections,
    });

    return this.supabaseAdminClient!;
  }

  /**
   * Release connection (for tracking purposes)
   */
  public releaseConnection(): void {
    if (this.activeConnections > 0) {
      this.activeConnections--;
      this.connectionMetrics.totalReleased++;
      logger.debug('Connection released', {
        active: this.activeConnections,
      });
    }
  }

  /**
   * Get pool statistics
   */
  public getStats() {
    return {
      active: this.activeConnections,
      config: this.poolConfig,
      metrics: this.connectionMetrics,
      health: this.getHealthStatus(),
    };
  }

  /**
   * Get health status
   */
  public getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const utilizationPercent = (this.activeConnections / this.poolConfig.maxConnections) * 100;

    if (utilizationPercent >= 90) {
      return 'critical';
    } else if (utilizationPercent >= 70) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Check if pool is healthy
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.supabaseClient) {
        return false;
      }

      // Perform a simple query to check connection
      const { error } = await this.supabaseClient
        .from('_health_check')
        .select('*')
        .limit(1);

      // It's OK if the table doesn't exist - we're just checking connectivity
      if (error && !error.message.includes('does not exist')) {
        logger.warn('Health check failed', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Health check error', error);
      return false;
    }
  }

  /**
   * Shutdown pool gracefully
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down connection pool', {
        activeConnections: this.activeConnections,
      });

      // Wait for active connections to complete (with timeout)
      const shutdownTimeout = 30000; // 30 seconds
      const startTime = Date.now();

      while (this.activeConnections > 0 && Date.now() - startTime < shutdownTimeout) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (this.activeConnections > 0) {
        logger.warn(`Force closing ${this.activeConnections} active connections`);
      }

      // Note: Supabase client doesn't have explicit close method
      // Connections will be closed when the client is garbage collected
      this.supabaseClient = null;
      this.supabaseAdminClient = null;
      this.activeConnections = 0;

      logger.info('Connection pool shut down successfully');
    } catch (error) {
      logger.error('Error during connection pool shutdown', error);
      throw error;
    }
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.connectionMetrics = {
      totalCreated: 0,
      totalAcquired: 0,
      totalReleased: 0,
      errors: 0,
    };
    logger.info('Connection pool metrics reset');
  }
}

/**
 * Helper function to initialize connection pool from environment variables
 */
export async function initializeConnectionPool(): Promise<void> {
  const manager = ConnectionPoolManager.getInstance();

  const baseConfig: SupabaseConfig = {
    url: process.env['SUPABASE_URL'] || '',
    anonKey: process.env['SUPABASE_ANON_KEY'] || '',
    ...(process.env['SUPABASE_SERVICE_ROLE_KEY']
      ? { serviceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] }
      : {}),
    schema: process.env['SUPABASE_SCHEMA'] || 'network_sync',
    pool: {
      minConnections: parseInt(process.env['DB_POOL_MIN'] || '2'),
      maxConnections: parseInt(process.env['DB_POOL_MAX'] || '10'),
      connectionTimeout: parseInt(process.env['DB_CONNECTION_TIMEOUT'] || '30000'),
      idleTimeout: parseInt(process.env['DB_IDLE_TIMEOUT'] || '60000'),
      acquireTimeout: parseInt(process.env['DB_ACQUIRE_TIMEOUT'] || '10000'),
    },
  };

  await manager.initialize(baseConfig);
}

/**
 * Get connection pool instance
 */
export function getConnectionPool(): ConnectionPoolManager {
  return ConnectionPoolManager.getInstance();
}

/**
 * Get Supabase client from pool
 */
export function getSupabaseClient(): SupabaseClient {
  return ConnectionPoolManager.getInstance().getClient();
}

/**
 * Get Supabase admin client from pool
 */
export function getSupabaseAdminClient(): SupabaseClient {
  return ConnectionPoolManager.getInstance().getAdminClient();
}

/**
 * Release connection back to pool
 */
export function releaseConnection(): void {
  ConnectionPoolManager.getInstance().releaseConnection();
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  return ConnectionPoolManager.getInstance().getStats();
}

/**
 * Export the singleton instance
 */
export default ConnectionPoolManager;
