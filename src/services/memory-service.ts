/**
 * Unified Memory Service
 *
 * Provides semantic search and memory storage with dual-backend support:
 * - Primary: Lanonasis Memory Service (production-ready, Redis-backed)
 * - Fallback: Local VectorStore (self-hosted, Supabase pgvector)
 *
 * This approach provides resilience and allows graceful degradation if
 * the external memory service is unavailable.
 */

import { MemoryClient } from '@lanonasis/memory-client';
import { VectorStore } from '@/storage/vector-store';
import { getCache } from '@/cache/redis-cache';
import { CacheKeyBuilder } from '@/cache/cache-helpers';
import { Logger } from '@/utils/Logger';

const logger = new Logger('MemoryService');

/**
 * Memory document interface
 */
export interface MemoryDocument {
  id?: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
  minSimilarity?: number;
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  similarity: number;
}

/**
 * Memory service configuration
 */
export interface MemoryServiceConfig {
  // Lanonasis Memory Service config
  memoryServiceUrl?: string;
  memoryServiceApiKey?: string;

  // Behavior config
  usePrimary?: boolean; // Use Lanonasis as primary (default: true)
  fallbackEnabled?: boolean; // Enable fallback to VectorStore (default: true)
  cacheEnabled?: boolean; // Enable Redis caching (default: true)
}

/**
 * Unified Memory Service with dual-backend support
 */
export class UnifiedMemoryService {
  private memoryClient: MemoryClient | null = null;
  private vectorStore: VectorStore;
  private cache = getCache();
  private config: Required<MemoryServiceConfig>;
  private memoryServiceAvailable = false;

  constructor(config: MemoryServiceConfig = {}) {
    this.config = {
      memoryServiceUrl: config.memoryServiceUrl || process.env['LANONASIS_MEMORY_URL'] || '',
      memoryServiceApiKey: config.memoryServiceApiKey || process.env['LANONASIS_API_KEY'] || '',
      usePrimary: config.usePrimary ?? true,
      fallbackEnabled: config.fallbackEnabled ?? true,
      cacheEnabled: config.cacheEnabled ?? true,
    };

    // Initialize VectorStore as fallback
    this.vectorStore = new VectorStore();

    // Initialize Lanonasis Memory Client if configured
    if (this.config.memoryServiceUrl && this.config.memoryServiceApiKey) {
      try {
        this.memoryClient = new MemoryClient({
          baseUrl: this.config.memoryServiceUrl,
          apiKey: this.config.memoryServiceApiKey,
        } as any); // Type mismatch with @lanonasis/memory-client package
        this.memoryServiceAvailable = true;
        logger.info('Lanonasis Memory Service initialized (primary backend)');
      } catch (error) {
        logger.warn('Failed to initialize Lanonasis Memory Service, using fallback only', error);
        this.memoryServiceAvailable = false;
      }
    } else {
      logger.info('Lanonasis Memory Service not configured, using VectorStore only');
    }

    logger.info('Unified Memory Service initialized', {
      primary: this.memoryServiceAvailable ? 'Lanonasis' : 'VectorStore',
      fallback: this.config.fallbackEnabled ? 'enabled' : 'disabled',
      cache: this.config.cacheEnabled ? 'enabled' : 'disabled',
    });
  }

  /**
   * Store a document in memory
   */
  public async store(document: MemoryDocument): Promise<string> {
    const startTime = Date.now();

    try {
      // Try primary backend first (Lanonasis)
      if (this.memoryServiceAvailable && this.config.usePrimary) {
        try {
          const result = await (this.memoryClient as any)!.store({
            content: document.content,
            metadata: document.metadata,
          });

          logger.debug(`Document stored in Lanonasis Memory Service (${Date.now() - startTime}ms)`);

          // Invalidate cache
          if (this.config.cacheEnabled) {
            await this.invalidateSearchCache();
          }

          return result.id || result.memoryId || 'unknown';
        } catch (error) {
          logger.error('Lanonasis Memory Service store failed, trying fallback', error);
          if (!this.config.fallbackEnabled) {
            throw error;
          }
        }
      }

      // Fallback to VectorStore
      const id = await this.vectorStore.store({
        content: document.content,
        ...(document.metadata ? { metadata: document.metadata } : {}),
        generateEmbedding: !document.embedding,
      });

      logger.debug(`Document stored in VectorStore fallback (${Date.now() - startTime}ms)`);
      return id;
    } catch (error) {
      logger.error('Failed to store document in memory', error);
      throw error;
    }
  }

  /**
   * Batch store documents
   */
  public async storeBatch(documents: MemoryDocument[]): Promise<string[]> {
    const startTime = Date.now();

    try {
      // Try primary backend first
      if (this.memoryServiceAvailable && this.config.usePrimary) {
        try {
          const results = await Promise.all(
            documents.map((doc) =>
              (this.memoryClient as any)!.store({
                content: doc.content,
                metadata: doc.metadata,
              })
            )
          );

          logger.info(
            `Batch stored ${documents.length} documents in Lanonasis Memory Service (${Date.now() - startTime}ms)`
          );

          // Invalidate cache
          if (this.config.cacheEnabled) {
            await this.invalidateSearchCache();
          }

          return results.map((r: any) => r.id || r.memoryId || 'unknown');
        } catch (error) {
          logger.error('Lanonasis Memory Service batch store failed, trying fallback', error);
          if (!this.config.fallbackEnabled) {
            throw error;
          }
        }
      }

      // Fallback to VectorStore
      const embeddings = documents.map((doc) => ({
        content: doc.content,
        embedding: doc.embedding || [],
        metadata: doc.metadata,
      }));

      const results = await this.vectorStore.storeEmbeddings(embeddings);
      logger.info(
        `Batch stored ${documents.length} documents in VectorStore fallback (${Date.now() - startTime}ms)`
      );

      return results.map((r) => r.id);
    } catch (error) {
      logger.error('Failed to batch store documents', error);
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  public async search(options: SearchOptions): Promise<SearchResult[]> {
    const startTime = Date.now();
    const cacheKey = this.config.cacheEnabled
      ? CacheKeyBuilder.create(
          'unified-memory-search',
          options.query,
          options.limit || 5,
          JSON.stringify(options.filters || {})
        )
      : null;

    try {
      // Try cache first
      if (cacheKey && this.cache.connected) {
        const cached = await this.cache.get<SearchResult[]>(cacheKey);
        if (cached) {
          logger.debug('Memory search cache hit');
          return cached;
        }
      }

      // Try primary backend (Lanonasis)
      if (this.memoryServiceAvailable && this.config.usePrimary) {
        try {
          const results = await (this.memoryClient as any)!.search({
            query: options.query,
            limit: options.limit || 5,
            filters: options.filters,
          });

          const searchResults: SearchResult[] = results.map((r: any) => ({
            id: r.id || r.memoryId,
            content: r.content || r.text,
            metadata: r.metadata,
            similarity: r.similarity || r.score || 0,
          }));

          logger.debug(
            `Memory search completed via Lanonasis (${searchResults.length} results, ${Date.now() - startTime}ms)`
          );

          // Cache results
          if (cacheKey && this.cache.connected) {
            await this.cache.set(cacheKey, searchResults, 3600);
          }

          return searchResults;
        } catch (error) {
          logger.error('Lanonasis Memory Service search failed, trying fallback', error);
          if (!this.config.fallbackEnabled) {
            throw error;
          }
        }
      }

      // Fallback to VectorStore
      const results = await this.vectorStore.searchSimilar({
        text: options.query,
        limit: options.limit || 5,
        ...(options.filters ? { filters: options.filters } : {}),
        ...(options.minSimilarity !== undefined ? { minSimilarity: options.minSimilarity } : {}),
      });

      const searchResults: SearchResult[] = results.map((r) => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata,
        similarity: 1 - r.similarity, // VectorStore returns distance, convert to similarity
      }));

      logger.debug(
        `Memory search completed via VectorStore fallback (${searchResults.length} results, ${Date.now() - startTime}ms)`
      );

      // Cache results
      if (cacheKey && this.cache.connected) {
        await this.cache.set(cacheKey, searchResults, 3600);
      }

      return searchResults;
    } catch (error) {
      logger.error('Memory search failed', error);
      throw error;
    }
  }

  /**
   * Invalidate search cache
   */
  private async invalidateSearchCache(): Promise<void> {
    if (!this.config.cacheEnabled || !this.cache.connected) {
      return;
    }

    try {
      await this.cache.clear('unified-memory-search:*');
      logger.debug('Memory search cache invalidated');
    } catch (error) {
      logger.error('Failed to invalidate memory search cache', error);
    }
  }

  /**
   * Get service health status
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    primary: { available: boolean; backend: string };
    fallback: { available: boolean; backend: string };
  }> {
    let primaryHealthy = false;
    let fallbackHealthy = false;

    // Check primary backend
    if (this.memoryServiceAvailable && this.memoryClient) {
      try {
        // Attempt a lightweight health check
        await (this.memoryClient as any).search({ query: 'health', limit: 1 });
        primaryHealthy = true;
      } catch (error) {
        logger.debug('Primary backend (Lanonasis) health check failed', error);
      }
    }

    // Check fallback backend
    try {
      const health = await this.vectorStore.healthCheck();
      fallbackHealthy = health.healthy;
    } catch (error) {
      logger.debug('Fallback backend (VectorStore) health check failed', error);
    }

    return {
      healthy: primaryHealthy || fallbackHealthy,
      primary: {
        available: primaryHealthy,
        backend: 'Lanonasis Memory Service',
      },
      fallback: {
        available: fallbackHealthy,
        backend: 'VectorStore (pgvector)',
      },
    };
  }

  /**
   * Get metrics from both backends
   */
  public getMetrics() {
    return {
      primary: {
        enabled: this.memoryServiceAvailable && this.config.usePrimary,
        backend: 'Lanonasis Memory Service',
      },
      fallback: {
        enabled: this.config.fallbackEnabled,
        backend: 'VectorStore',
        metrics: this.vectorStore.getMetrics(),
      },
      cache: {
        enabled: this.config.cacheEnabled,
        stats: this.cache.connected ? this.cache.getStats() : null,
      },
    };
  }
}

/**
 * Create singleton instance
 */
let memoryServiceInstance: UnifiedMemoryService | null = null;

/**
 * Initialize unified memory service
 */
export function initializeMemoryService(config?: MemoryServiceConfig): UnifiedMemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new UnifiedMemoryService(config);
  }
  return memoryServiceInstance;
}

/**
 * Get memory service instance
 */
export function getMemoryService(): UnifiedMemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new UnifiedMemoryService();
  }
  return memoryServiceInstance;
}
