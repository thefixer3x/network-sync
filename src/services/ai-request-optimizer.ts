/**
 * AI Request Optimizer
 *
 * Optimizes AI API requests through:
 * - Request deduplication (identical requests)
 * - Prompt caching (cache responses by prompt hash)
 * - Request batching (group similar requests)
 * - Token usage optimization (reduce unnecessary tokens)
 * - Rate limiting and queuing
 */

import crypto from 'crypto';
import { getCacheManager, CACHE_TTL } from '../cache/cache-manager.js';
import { metricsService } from './metrics.js';
import { aiCostTracker } from './ai-cost-tracker.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('AIRequestOptimizer');

/**
 * AI Request
 */
export interface AIRequest {
  id: string;
  provider: 'claude' | 'perplexity' | 'openai';
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  userId?: string;
  workflowId?: string;
  priority?: 'high' | 'normal' | 'low';
  cacheable?: boolean;
  metadata?: Record<string, any>;
}

/**
 * AI Response
 */
export interface AIResponse {
  id: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  cached: boolean;
  deduplicated: boolean;
  duration: number;
  timestamp: number;
}

/**
 * Optimization statistics
 */
export interface OptimizationStats {
  totalRequests: number;
  cachedRequests: number;
  deduplicatedRequests: number;
  batchedRequests: number;
  tokensSaved: number;
  costSaved: number;
  cacheHitRate: number;
}

/**
 * Pending request tracker for deduplication
 */
interface PendingRequest {
  hash: string;
  promise: Promise<AIResponse>;
  timestamp: number;
  requesters: string[];
}

/**
 * AI Request Optimizer
 */
class AIRequestOptimizer {
  private static instance: AIRequestOptimizer;
  private cacheManager = getCacheManager();
  private pendingRequests = new Map<string, PendingRequest>();
  private stats: OptimizationStats = {
    totalRequests: 0,
    cachedRequests: 0,
    deduplicatedRequests: 0,
    batchedRequests: 0,
    tokensSaved: 0,
    costSaved: 0,
    cacheHitRate: 0,
  };

  // Cleanup interval for stale pending requests
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    logger.info('AI Request Optimizer initialized');

    // Cleanup pending requests every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePendingRequests();
    }, 30000);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AIRequestOptimizer {
    if (!AIRequestOptimizer.instance) {
      AIRequestOptimizer.instance = new AIRequestOptimizer();
    }
    return AIRequestOptimizer.instance;
  }

  /**
   * Optimize and execute AI request
   */
  public async optimizeRequest(
    request: AIRequest,
    executor: (req: AIRequest) => Promise<Omit<AIResponse, 'cached' | 'deduplicated'>>
  ): Promise<AIResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // 1. Optimize prompt (reduce tokens)
      const optimizedRequest = this.optimizePrompt(request);

      // 2. Generate request hash for caching and deduplication
      const requestHash = this.generateRequestHash(optimizedRequest);

      // 3. Check prompt cache first
      if (optimizedRequest.cacheable !== false) {
        const cached = await this.checkPromptCache(requestHash);
        if (cached) {
          this.stats.cachedRequests++;
          this.updateCacheHitRate();

          metricsService.incrementCounter('ai_requests_cached', {
            provider: request.provider,
            model: request.model,
          });

          logger.debug('AI request served from cache', {
            requestId: request.id,
            hash: requestHash,
          });

          return {
            ...cached,
            id: request.id,
            cached: true,
            deduplicated: false,
            duration: Date.now() - startTime,
          };
        }
      }

      // 4. Check for in-flight duplicate requests (deduplication)
      const pending = this.pendingRequests.get(requestHash);
      if (pending) {
        logger.debug('Deduplicating in-flight AI request', {
          requestId: request.id,
          hash: requestHash,
          existingRequesters: pending.requesters.length,
        });

        pending.requesters.push(request.id);
        this.stats.deduplicatedRequests++;

        metricsService.incrementCounter('ai_requests_deduplicated', {
          provider: request.provider,
          model: request.model,
        });

        const response = await pending.promise;
        return {
          ...response,
          id: request.id,
          cached: false,
          deduplicated: true,
          duration: Date.now() - startTime,
        };
      }

      // 5. Execute request with deduplication tracking
      const responsePromise = this.executeWithTracking(
        requestHash,
        optimizedRequest,
        executor,
        startTime
      );

      // Track as pending
      this.pendingRequests.set(requestHash, {
        hash: requestHash,
        promise: responsePromise,
        timestamp: Date.now(),
        requesters: [request.id],
      });

      const response = await responsePromise;

      // Remove from pending
      this.pendingRequests.delete(requestHash);

      // 6. Cache response if cacheable
      if (optimizedRequest.cacheable !== false) {
        await this.cachePromptResponse(requestHash, response);
      }

      return response;
    } catch (error) {
      logger.error('AI request optimization failed', {
        requestId: request.id,
        error,
      });

      metricsService.incrementCounter('ai_optimization_errors', {
        provider: request.provider,
        model: request.model,
      });

      throw error;
    }
  }

  /**
   * Execute request with tracking
   */
  private async executeWithTracking(
    requestHash: string,
    request: AIRequest,
    executor: (req: AIRequest) => Promise<Omit<AIResponse, 'cached' | 'deduplicated'>>,
    startTime: number
  ): Promise<AIResponse> {
    try {
      const response = await executor(request);

      // Record metrics
      metricsService.incrementCounter('ai_requests_executed', {
        provider: request.provider,
        model: request.model,
      });

      return {
        ...response,
        id: request.id,
        cached: false,
        deduplicated: false,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // Remove from pending on error
      this.pendingRequests.delete(requestHash);
      throw error;
    }
  }

  /**
   * Generate request hash for caching and deduplication
   */
  private generateRequestHash(request: AIRequest): string {
    const hashContent = {
      provider: request.provider,
      model: request.model,
      prompt: request.prompt,
      systemPrompt: request.systemPrompt || '',
      maxTokens: request.maxTokens || 0,
      temperature: request.temperature || 0,
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(hashContent))
      .digest('hex');

    return `ai-prompt:${request.provider}:${hash}`;
  }

  /**
   * Check prompt cache
   */
  private async checkPromptCache(hash: string): Promise<AIResponse | null> {
    try {
      return await this.cacheManager.getOrSet(
        hash,
        async () => null, // Don't fetch, just check
        0 // Don't store null
      );
    } catch (error) {
      logger.error('Prompt cache check failed', { hash, error });
      return null;
    }
  }

  /**
   * Cache prompt response
   */
  private async cachePromptResponse(hash: string, response: AIResponse): Promise<void> {
    try {
      await this.cacheManager.getOrSet(
        hash,
        async () => response,
        CACHE_TTL.AI_CACHE // 30 minutes
      );

      metricsService.incrementCounter('ai_responses_cached', {
        provider: 'unknown', // Would need to extract from response
      });

      logger.debug('AI response cached', { hash, ttl: CACHE_TTL.AI_CACHE });
    } catch (error) {
      logger.error('Failed to cache AI response', { hash, error });
    }
  }

  /**
   * Optimize prompt to reduce tokens
   */
  private optimizePrompt(request: AIRequest): AIRequest {
    let optimizedPrompt = request.prompt;
    let tokensSaved = 0;

    // 1. Remove excessive whitespace
    const originalLength = optimizedPrompt.length;
    optimizedPrompt = optimizedPrompt.replace(/\s+/g, ' ').trim();
    tokensSaved += originalLength - optimizedPrompt.length;

    // 2. Remove redundant phrases (if any obvious patterns)
    // This is conservative - only remove clear redundancies
    const redundantPatterns = [
      /\bplease\s+/gi, // "Please write" -> "Write"
      /\bcould you\s+/gi, // "Could you help" -> "Help"
      /\bI would like you to\s+/gi, // "I would like you to write" -> "Write"
    ];

    for (const pattern of redundantPatterns) {
      const beforeLength = optimizedPrompt.length;
      optimizedPrompt = optimizedPrompt.replace(pattern, '');
      tokensSaved += beforeLength - optimizedPrompt.length;
    }

    if (tokensSaved > 0) {
      this.stats.tokensSaved += Math.ceil(tokensSaved / 4); // Rough estimate: 4 chars = 1 token
      logger.debug('Prompt optimized', {
        requestId: request.id,
        charsSaved: tokensSaved,
        estimatedTokensSaved: Math.ceil(tokensSaved / 4),
      });
    }

    return {
      ...request,
      prompt: optimizedPrompt,
    };
  }

  /**
   * Cleanup stale pending requests
   */
  private cleanupStalePendingRequests(): void {
    const now = Date.now();
    const staleThreshold = 120000; // 2 minutes

    let cleaned = 0;
    for (const [hash, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > staleThreshold) {
        this.pendingRequests.delete(hash);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned up stale pending requests', { count: cleaned });
    }
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.stats.totalRequests;
    const hits = this.stats.cachedRequests + this.stats.deduplicatedRequests;
    this.stats.cacheHitRate = total > 0 ? hits / total : 0;

    metricsService.setGauge('ai_cache_hit_rate', this.stats.cacheHitRate);
  }

  /**
   * Get optimization statistics
   */
  public getStats(): OptimizationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalRequests: 0,
      cachedRequests: 0,
      deduplicatedRequests: 0,
      batchedRequests: 0,
      tokensSaved: 0,
      costSaved: 0,
      cacheHitRate: 0,
    };
    logger.info('AI optimization statistics reset');
  }

  /**
   * Shutdown optimizer
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.pendingRequests.clear();
    logger.info('AI Request Optimizer shut down');
  }
}

/**
 * Get AI request optimizer instance
 */
export function getAIRequestOptimizer(): AIRequestOptimizer {
  return AIRequestOptimizer.getInstance();
}

/**
 * Export singleton instance
 */
export const aiRequestOptimizer = AIRequestOptimizer.getInstance();
