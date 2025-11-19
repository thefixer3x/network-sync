/**
 * AI Request Queue
 *
 * Manages AI request queuing with:
 * - Priority-based processing (high > normal > low)
 * - Rate limiting per provider/model
 * - Concurrency control
 * - Request timeout handling
 * - Queue metrics and monitoring
 */

import { Logger } from '../utils/Logger.js';
import { metricsService } from './metrics.js';
import type { AIRequest, AIResponse } from './ai-request-optimizer.js';

const logger = new Logger('AIRequestQueue');

/**
 * Queued request
 */
interface QueuedRequest {
  request: AIRequest;
  executor: (req: AIRequest) => Promise<AIResponse>;
  resolve: (response: AIResponse) => void;
  reject: (error: Error) => void;
  queuedAt: number;
  timeout?: NodeJS.Timeout;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
  averageProcessingTime: number;
}

/**
 * Rate limiter configuration
 */
interface RateLimiterConfig {
  requestsPerMinute: number;
  burstLimit: number;
}

/**
 * Rate limiter
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.burstLimit;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = config.requestsPerMinute / 60; // Convert to per second
  }

  /**
   * Try to acquire a token
   */
  public tryAcquire(): boolean {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current tokens
   */
  public getTokens(): number {
    this.refillTokens();
    return this.tokens;
  }
}

/**
 * AI Request Queue
 */
class AIRequestQueue {
  private static instance: AIRequestQueue;

  // Separate queues for each priority
  private highPriorityQueue: QueuedRequest[] = [];
  private normalPriorityQueue: QueuedRequest[] = [];
  private lowPriorityQueue: QueuedRequest[] = [];

  // Processing state
  private processing = 0;
  private readonly maxConcurrent: number;

  // Rate limiters per provider
  private rateLimiters = new Map<string, RateLimiter>();

  // Statistics
  private stats: QueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    averageWaitTime: 0,
    averageProcessingTime: 0,
  };

  private waitTimes: number[] = [];
  private processingTimes: number[] = [];

  // Processing interval
  private processingInterval: NodeJS.Timeout;

  private constructor() {
    this.maxConcurrent = parseInt(process.env['AI_MAX_CONCURRENT'] || '5');

    // Initialize rate limiters
    this.initializeRateLimiters();

    // Start processing loop
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Check every 100ms

    logger.info('AI Request Queue initialized', {
      maxConcurrent: this.maxConcurrent,
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AIRequestQueue {
    if (!AIRequestQueue.instance) {
      AIRequestQueue.instance = new AIRequestQueue();
    }
    return AIRequestQueue.instance;
  }

  /**
   * Initialize rate limiters for each provider
   */
  private initializeRateLimiters(): void {
    // Claude rate limits (conservative defaults)
    this.rateLimiters.set('claude', new RateLimiter({
      requestsPerMinute: parseInt(process.env['CLAUDE_RPM'] || '50'),
      burstLimit: parseInt(process.env['CLAUDE_BURST'] || '10'),
    }));

    // Perplexity rate limits
    this.rateLimiters.set('perplexity', new RateLimiter({
      requestsPerMinute: parseInt(process.env['PERPLEXITY_RPM'] || '60'),
      burstLimit: parseInt(process.env['PERPLEXITY_BURST'] || '15'),
    }));

    // OpenAI rate limits
    this.rateLimiters.set('openai', new RateLimiter({
      requestsPerMinute: parseInt(process.env['OPENAI_RPM'] || '60'),
      burstLimit: parseInt(process.env['OPENAI_BURST'] || '15'),
    }));

    logger.info('Rate limiters initialized for providers', {
      providers: Array.from(this.rateLimiters.keys()),
    });
  }

  /**
   * Enqueue AI request
   */
  public async enqueue(
    request: AIRequest,
    executor: (req: AIRequest) => Promise<AIResponse>,
    timeoutMs: number = 120000 // 2 minutes default
  ): Promise<AIResponse> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        request,
        executor,
        resolve,
        reject,
        queuedAt: Date.now(),
      };

      // Set timeout
      if (timeoutMs > 0) {
        queuedRequest.timeout = setTimeout(() => {
          this.removeFromQueue(queuedRequest);
          reject(new Error('AI request timeout'));
          metricsService.incrementCounter('ai_queue_timeouts', {
            provider: request.provider,
            model: request.model,
          });
        }, timeoutMs);
      }

      // Add to appropriate priority queue
      const priority = request.priority || 'normal';
      switch (priority) {
        case 'high':
          this.highPriorityQueue.push(queuedRequest);
          break;
        case 'low':
          this.lowPriorityQueue.push(queuedRequest);
          break;
        default:
          this.normalPriorityQueue.push(queuedRequest);
      }

      this.stats.pending = this.getTotalPending();

      metricsService.setGauge('ai_queue_pending', this.stats.pending);
      metricsService.incrementCounter('ai_requests_queued', {
        provider: request.provider,
        priority,
      });

      logger.debug('AI request queued', {
        requestId: request.id,
        priority,
        queueSize: this.stats.pending,
      });
    });
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    // Don't process if at max concurrency
    if (this.processing >= this.maxConcurrent) {
      return;
    }

    // Get next request (priority order)
    const queuedRequest = this.getNextRequest();
    if (!queuedRequest) {
      return;
    }

    // Check rate limiter
    const rateLimiter = this.rateLimiters.get(queuedRequest.request.provider);
    if (rateLimiter && !rateLimiter.tryAcquire()) {
      // Rate limit hit, put request back at front
      this.returnToQueue(queuedRequest);
      return;
    }

    // Process request
    await this.processRequest(queuedRequest);
  }

  /**
   * Get next request from queues (priority order)
   */
  private getNextRequest(): QueuedRequest | null {
    if (this.highPriorityQueue.length > 0) {
      return this.highPriorityQueue.shift()!;
    }
    if (this.normalPriorityQueue.length > 0) {
      return this.normalPriorityQueue.shift()!;
    }
    if (this.lowPriorityQueue.length > 0) {
      return this.lowPriorityQueue.shift()!;
    }
    return null;
  }

  /**
   * Return request to front of queue (for rate limiting)
   */
  private returnToQueue(queuedRequest: QueuedRequest): void {
    const priority = queuedRequest.request.priority || 'normal';
    switch (priority) {
      case 'high':
        this.highPriorityQueue.unshift(queuedRequest);
        break;
      case 'low':
        this.lowPriorityQueue.unshift(queuedRequest);
        break;
      default:
        this.normalPriorityQueue.unshift(queuedRequest);
    }
  }

  /**
   * Process individual request
   */
  private async processRequest(queuedRequest: QueuedRequest): Promise<void> {
    this.processing++;
    this.stats.processing = this.processing;
    this.stats.pending = this.getTotalPending();

    metricsService.setGauge('ai_queue_processing', this.processing);
    metricsService.setGauge('ai_queue_pending', this.stats.pending);

    const processingStart = Date.now();
    const waitTime = processingStart - queuedRequest.queuedAt;

    try {
      // Execute request
      const response = await queuedRequest.executor(queuedRequest.request);

      // Clear timeout
      if (queuedRequest.timeout) {
        clearTimeout(queuedRequest.timeout);
      }

      // Record statistics
      const processingTime = Date.now() - processingStart;
      this.recordSuccess(waitTime, processingTime);

      // Resolve promise
      queuedRequest.resolve(response);

      logger.debug('AI request processed', {
        requestId: queuedRequest.request.id,
        waitTime,
        processingTime,
      });
    } catch (error) {
      // Clear timeout
      if (queuedRequest.timeout) {
        clearTimeout(queuedRequest.timeout);
      }

      // Record failure
      this.stats.failed++;
      metricsService.incrementCounter('ai_queue_failures', {
        provider: queuedRequest.request.provider,
        model: queuedRequest.request.model,
      });

      // Reject promise
      queuedRequest.reject(error as Error);

      logger.error('AI request failed', {
        requestId: queuedRequest.request.id,
        error,
      });
    } finally {
      this.processing--;
      this.stats.processing = this.processing;
      metricsService.setGauge('ai_queue_processing', this.processing);
    }
  }

  /**
   * Remove request from queue
   */
  private removeFromQueue(queuedRequest: QueuedRequest): void {
    this.highPriorityQueue = this.highPriorityQueue.filter((r) => r !== queuedRequest);
    this.normalPriorityQueue = this.normalPriorityQueue.filter((r) => r !== queuedRequest);
    this.lowPriorityQueue = this.lowPriorityQueue.filter((r) => r !== queuedRequest);
    this.stats.pending = this.getTotalPending();
  }

  /**
   * Get total pending requests
   */
  private getTotalPending(): number {
    return (
      this.highPriorityQueue.length +
      this.normalPriorityQueue.length +
      this.lowPriorityQueue.length
    );
  }

  /**
   * Record successful processing
   */
  private recordSuccess(waitTime: number, processingTime: number): void {
    this.stats.completed++;

    // Track wait times
    this.waitTimes.push(waitTime);
    if (this.waitTimes.length > 100) {
      this.waitTimes.shift();
    }
    this.stats.averageWaitTime =
      this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length;

    // Track processing times
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    this.stats.averageProcessingTime =
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;

    metricsService.incrementCounter('ai_queue_completed', {});
    metricsService.recordHistogram('ai_queue_wait_time_ms', waitTime);
    metricsService.recordHistogram('ai_queue_processing_time_ms', processingTime);
  }

  /**
   * Get queue statistics
   */
  public getStats(): QueueStats {
    return {
      ...this.stats,
      pending: this.getTotalPending(),
      processing: this.processing,
    };
  }

  /**
   * Get queue depth by priority
   */
  public getQueueDepth(): { high: number; normal: number; low: number; total: number } {
    return {
      high: this.highPriorityQueue.length,
      normal: this.normalPriorityQueue.length,
      low: this.lowPriorityQueue.length,
      total: this.getTotalPending(),
    };
  }

  /**
   * Shutdown queue
   */
  public shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Clear all queues and reject pending requests
    const allRequests = [
      ...this.highPriorityQueue,
      ...this.normalPriorityQueue,
      ...this.lowPriorityQueue,
    ];

    for (const queuedRequest of allRequests) {
      if (queuedRequest.timeout) {
        clearTimeout(queuedRequest.timeout);
      }
      queuedRequest.reject(new Error('Queue shutdown'));
    }

    this.highPriorityQueue = [];
    this.normalPriorityQueue = [];
    this.lowPriorityQueue = [];

    logger.info('AI Request Queue shut down');
  }
}

/**
 * Get AI request queue instance
 */
export function getAIRequestQueue(): AIRequestQueue {
  return AIRequestQueue.getInstance();
}

/**
 * Export singleton instance
 */
export const aiRequestQueue = AIRequestQueue.getInstance();
