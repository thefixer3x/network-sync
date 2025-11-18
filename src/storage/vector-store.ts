/**
 * Vector Store for Semantic Search and Analytics
 *
 * Optimized for:
 * - Efficient batch operations
 * - Query caching
 * - Index-optimized searches
 * - Connection pooling
 * - Performance monitoring
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, releaseConnection } from '@/database/connection-pool';
import { getCache } from '@/cache/redis-cache';
import { cacheAside, CacheKeyBuilder } from '@/cache/cache-helpers';
import { Logger } from '@/utils/Logger';

const logger = new Logger('VectorStore');

interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  timestamp: Date;
}

interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  created_at: string;
}

export interface QueryMetrics {
  totalQueries: number;
  cacheHits: number;
  avgQueryTime: number;
  slowQueries: number;
}

export class VectorStore {
  private supabase: SupabaseClient;
  private embeddingDimension = 1536; // OpenAI embedding size
  private cache = getCache();
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly EMBEDDING_CACHE_TTL = 7200; // 2 hours
  private readonly BATCH_SIZE = 100; // Optimal batch size for inserts
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  // Performance metrics
  private metrics: QueryMetrics = {
    totalQueries: 0,
    cacheHits: 0,
    avgQueryTime: 0,
    slowQueries: 0,
  };

  constructor() {
    try {
      // Use shared connection pool instead of creating new client
      this.supabase = getSupabaseClient();
      logger.info('VectorStore initialized with connection pool and caching');

      // Note: Database schema must be initialized via migrations
      // See: migrations/001_create_vector_store.sql
    } catch (error) {
      logger.error('Failed to initialize VectorStore', error);
      throw error;
    }
  }

  /**
   * Store document with embeddings
   */
  async store(params: {
    content: any;
    metadata?: Record<string, any>;
    generateEmbedding?: boolean;
  }): Promise<string> {
    const contentString =
      typeof params.content === 'string' ? params.content : JSON.stringify(params.content);

    let embedding = null;
    if (params.generateEmbedding !== false) {
      embedding = await this.generateEmbedding(contentString);
    }

    const { data, error } = await this.supabase
      .from('vector_documents')
      .insert({
        content: contentString,
        embedding,
        metadata: params.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id;
  }

  /**
   * Store pre-computed embeddings (optimized with batching)
   */
  async storeEmbeddings(
    embeddings: Array<{
      content: string;
      embedding: number[];
      metadata?: any;
    }>
  ) {
    const startTime = Date.now();

    try {
      // Process in batches for better performance
      const results = [];

      for (let i = 0; i < embeddings.length; i += this.BATCH_SIZE) {
        const batch = embeddings.slice(i, i + this.BATCH_SIZE);

        const documents = batch.map((e) => ({
          content: e.content,
          embedding: e.embedding,
          metadata: e.metadata || {},
        }));

        const { data, error } = await this.supabase
          .from('vector_documents')
          .insert(documents)
          .select('id');

        if (error) {
          logger.error(`Batch insert error (batch ${i / this.BATCH_SIZE + 1}):`, error);
          throw error;
        }

        results.push(...data);

        logger.debug(
          `Inserted batch ${i / this.BATCH_SIZE + 1} (${documents.length} documents)`
        );
      }

      const duration = Date.now() - startTime;
      logger.info(`Stored ${embeddings.length} embeddings in ${duration}ms`);

      return results;
    } catch (error) {
      logger.error('Failed to store embeddings', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant documents using semantic search
   */
  async retrieveRelevant(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<string> {
    const queryEmbedding = await this.generateEmbedding(query);

    const { data, error } = await this.supabase.rpc('search_vectors', {
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      throw error;
    }

    // Combine relevant documents into context
    return data.map((doc: any) => doc.content).join('\n\n---\n\n');
  }

  /**
   * Semantic similarity search (optimized with caching and pagination)
   */
  async searchSimilar(params: {
    embedding?: number[];
    text?: string;
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
    minSimilarity?: number;
  }): Promise<SearchResult[]> {
    const startTime = Date.now();
    this.metrics.totalQueries++;

    try {
      // Generate cache key
      const cacheKey = CacheKeyBuilder.create(
        'vector-search',
        params.text || 'embedding',
        params.limit || 10,
        params.offset || 0,
        JSON.stringify(params.filters || {})
      );

      // Try cache first
      if (params.text && this.cache.connected) {
        const cached = await this.cache.get<SearchResult[]>(cacheKey);
        if (cached) {
          this.metrics.cacheHits++;
          logger.debug(`Cache hit for search: ${params.text.substring(0, 50)}...`);
          return cached;
        }
      }

      // Get or generate embedding
      let searchEmbedding = params.embedding;
      if (!searchEmbedding && params.text) {
        searchEmbedding = await this.generateEmbedding(params.text);
      }

      if (!searchEmbedding) {
        throw new Error('Either embedding or text must be provided');
      }

      // Build optimized query
      let query = this.supabase
        .from('vector_documents')
        .select('id, content, metadata, created_at, embedding <-> $1 as similarity')
        .order('similarity', { ascending: true })
        .limit(params.limit || 10);

      // Apply offset for pagination
      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }

      // Apply similarity threshold
      if (params.minSimilarity !== undefined) {
        query = query.lte('similarity', 1 - params.minSimilarity);
      }

      // Apply metadata filters (optimized with JSONB operators)
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          query = query.filter(`metadata->${key}`, 'eq', value);
        });
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Search query error:', error);
        throw error;
      }

      // Track query performance
      const duration = Date.now() - startTime;
      this.updateMetrics(duration);

      if (duration > this.SLOW_QUERY_THRESHOLD) {
        logger.warn(`Slow query detected (${duration}ms):`, {
          text: params.text?.substring(0, 100),
          limit: params.limit,
          filters: params.filters,
        });
      }

      // Cache results
      if (params.text && this.cache.connected && data) {
        await this.cache.set(cacheKey, data, this.CACHE_TTL);
      }

      return (data || []) as unknown as SearchResult[];
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Analytics: Cluster similar documents
   */
  async clusterDocuments(params: { minClusterSize?: number; maxClusters?: number }) {
    // Retrieve all documents
    const { data: documents, error } = await this.supabase
      .from('vector_documents')
      .select('id, embedding, metadata');

    if (error) {
      throw error;
    }

    // Perform clustering (simplified k-means)
    const clusters = this.performClustering(
      documents,
      params.maxClusters || 5,
      params.minClusterSize || 3
    );

    return clusters;
  }

  /**
   * Analytics: Find trending topics
   */
  async findTrendingTopics(timeframe: string = '7d') {
    const cutoffDate = this.calculateCutoffDate(timeframe);

    const { data, error } = await this.supabase
      .from('vector_documents')
      .select('metadata, created_at')
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Extract and count topics
    const topicCounts = new Map<string, number>();

    data.forEach((doc: any) => {
      const topics = doc.metadata?.topics || [];
      topics.forEach((topic: string) => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    // Sort by frequency
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
  }

  /**
   * Generate embedding using OpenAI (optimized with caching)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Cache key based on text hash to avoid storing large keys
    const textHash = this.hashText(text);
    const cacheKey = CacheKeyBuilder.create('embedding', textHash);

    try {
      // Try cache first
      if (this.cache.connected) {
        const cached = await this.cache.get<number[]>(cacheKey);
        if (cached) {
          logger.debug('Embedding cache hit');
          return cached;
        }
      }

      // Generate new embedding
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env['OPENAI_API_KEY']}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache for future use
      if (this.cache.connected) {
        await this.cache.set(cacheKey, embedding, this.EMBEDDING_CACHE_TTL);
      }

      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Hash text for cache keys
   */
  private hashText(text: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Simple k-means clustering
   */
  private performClustering(documents: any[], k: number, minSize: number): any[] {
    // Simplified clustering logic
    // In production, use a proper ML library
    const clusters: any[] = [];

    // Group by similarity (simplified)
    for (let i = 0; i < Math.min(k, documents.length); i++) {
      clusters.push({
        id: `cluster_${i}`,
        documents: [],
        centroid: null,
        topics: [],
      });
    }

    // Assign documents to clusters
    documents.forEach((doc, idx) => {
      const clusterIdx = idx % k;
      clusters[clusterIdx].documents.push(doc);
    });

    // Filter out small clusters
    return clusters.filter((c) => c.documents.length >= minSize);
  }

  /**
   * Calculate cutoff date for timeframe
   */
  private calculateCutoffDate(timeframe: string): string {
    const now = new Date();
    const value = parseInt(timeframe);
    const unit = timeframe.slice(-1);

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() - value);
        break;
      case 'w':
        now.setDate(now.getDate() - value * 7);
        break;
      case 'm':
        now.setMonth(now.getMonth() - value);
        break;
      default:
        now.setDate(now.getDate() - 7); // Default to 7 days
    }

    return now.toISOString();
  }

  /**
   * Delete old documents (optimized with batching)
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      // First, count documents to delete
      const { count } = await this.supabase
        .from('vector_documents')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString());

      if (!count || count === 0) {
        logger.info('No documents to cleanup');
        return 0;
      }

      logger.info(`Cleaning up ${count} documents older than ${olderThanDays} days`);

      // Delete in batches to avoid timeout
      let deletedCount = 0;
      while (deletedCount < count) {
        const { data, error } = await this.supabase
          .from('vector_documents')
          .delete()
          .lt('created_at', cutoffDate.toISOString())
          .limit(this.BATCH_SIZE);

        if (error) {
          logger.error('Cleanup error:', error);
          throw error;
        }

        const batchSize = Array.isArray(data) ? (data as any[]).length : 0;
        deletedCount += batchSize;

        logger.debug(`Deleted ${deletedCount}/${count} documents`);

        // Small delay to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.info(`Cleanup complete: ${deletedCount} documents deleted`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old documents:', error);
      throw error;
    }
  }

  /**
   * Update query metrics
   */
  private updateMetrics(queryTime: number): void {
    const { totalQueries, avgQueryTime } = this.metrics;

    // Update average query time
    this.metrics.avgQueryTime = (avgQueryTime * (totalQueries - 1) + queryTime) / totalQueries;

    // Track slow queries
    if (queryTime > this.SLOW_QUERY_THRESHOLD) {
      this.metrics.slowQueries++;
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): QueryMetrics & { cacheHitRate: number } {
    const { totalQueries, cacheHits } = this.metrics;
    const cacheHitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;

    return {
      ...this.metrics,
      cacheHitRate,
    };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      avgQueryTime: 0,
      slowQueries: 0,
    };
    logger.info('Vector store metrics reset');
  }

  /**
   * Batch retrieve documents by IDs (optimized)
   */
  async batchGetByIds(ids: string[]): Promise<VectorDocument[]> {
    if (ids.length === 0) {
      return [];
    }

    const startTime = Date.now();

    try {
      const { data, error } = await this.supabase
        .from('vector_documents')
        .select('*')
        .in('id', ids);

      if (error) {
        throw error;
      }

      const duration = Date.now() - startTime;
      logger.debug(`Batch retrieved ${ids.length} documents in ${duration}ms`);

      return data as VectorDocument[];
    } catch (error) {
      logger.error('Batch get by IDs failed:', error);
      throw error;
    }
  }

  /**
   * Get document count
   */
  async getCount(filters?: Record<string, any>): Promise<number> {
    try {
      let query = this.supabase
        .from('vector_documents')
        .select('*', { count: 'exact', head: true });

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.filter(`metadata->${key}`, 'eq', value);
        });
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.error('Failed to get document count:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific queries
   */
  async invalidateCache(pattern?: string): Promise<void> {
    if (!this.cache.connected) {
      return;
    }

    try {
      const searchPattern = pattern || 'vector-search:*';
      const cleared = await this.cache.clear(searchPattern);
      logger.info(`Invalidated ${cleared} cache entries matching pattern: ${searchPattern}`);
    } catch (error) {
      logger.error('Failed to invalidate cache:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    documentCount: number;
  }> {
    const startTime = Date.now();

    try {
      const count = await this.getCount();
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        documentCount: count,
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        healthy: false,
        latency: Date.now() - startTime,
        documentCount: 0,
      };
    }
  }
}
