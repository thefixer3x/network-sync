/**
 * Prometheus Metrics Service
 *
 * Collects and exposes metrics in Prometheus format:
 * - Application metrics (HTTP requests, errors, latency)
 * - Business metrics (content generated, posts published, engagement)
 * - System metrics (memory, CPU, connections)
 * - AI agent metrics (tokens used, response time, costs)
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('Metrics');

/**
 * Metrics Service
 */
export class MetricsService {
  // HTTP Metrics
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestSize: Summary;
  public readonly httpResponseSize: Summary;
  public readonly httpErrorsTotal: Counter;

  // Business Metrics
  public readonly contentGeneratedTotal: Counter;
  public readonly postsPublishedTotal: Counter;
  public readonly postEngagement: Gauge;
  public readonly accountsConnected: Gauge;
  public readonly workflowsActive: Gauge;

  // AI Agent Metrics
  public readonly aiRequestsTotal: Counter;
  public readonly aiRequestDuration: Histogram;
  public readonly aiTokensUsed: Counter;
  public readonly aiCostTotal: Counter;
  public readonly aiErrorsTotal: Counter;

  // System Metrics
  public readonly dbConnectionsActive: Gauge;
  public readonly dbQueryDuration: Histogram;
  public readonly cacheHitRate: Gauge;
  public readonly queueJobsActive: Gauge;
  public readonly queueJobsCompleted: Counter;
  public readonly queueJobsFailed: Counter;

  constructor() {
    // Enable default metrics (CPU, memory, event loop lag, etc.)
    collectDefaultMetrics({
      prefix: 'social_orchestrator_',
      register,
    });

    // HTTP Request Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register],
    });

    this.httpRequestSize = new Summary({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'route'],
      registers: [register],
    });

    this.httpResponseSize = new Summary({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpErrorsTotal = new Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'status_code', 'error_type'],
      registers: [register],
    });

    // Business Metrics
    this.contentGeneratedTotal = new Counter({
      name: 'content_generated_total',
      help: 'Total number of content pieces generated',
      labelNames: ['platform', 'type', 'workflow_id'],
      registers: [register],
    });

    this.postsPublishedTotal = new Counter({
      name: 'posts_published_total',
      help: 'Total number of posts published',
      labelNames: ['platform', 'status', 'workflow_id'],
      registers: [register],
    });

    this.postEngagement = new Gauge({
      name: 'post_engagement_total',
      help: 'Total engagement (likes + comments + shares)',
      labelNames: ['platform', 'post_id'],
      registers: [register],
    });

    this.accountsConnected = new Gauge({
      name: 'social_accounts_connected',
      help: 'Number of connected social media accounts',
      labelNames: ['platform', 'status'],
      registers: [register],
    });

    this.workflowsActive = new Gauge({
      name: 'workflows_active',
      help: 'Number of active workflows',
      labelNames: ['type', 'status'],
      registers: [register],
    });

    // AI Agent Metrics
    this.aiRequestsTotal = new Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI agent requests',
      labelNames: ['agent', 'model', 'status'],
      registers: [register],
    });

    this.aiRequestDuration = new Histogram({
      name: 'ai_request_duration_seconds',
      help: 'AI agent request duration in seconds',
      labelNames: ['agent', 'model'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
      registers: [register],
    });

    this.aiTokensUsed = new Counter({
      name: 'ai_tokens_used_total',
      help: 'Total number of AI tokens used',
      labelNames: ['agent', 'model', 'type'],
      registers: [register],
    });

    this.aiCostTotal = new Counter({
      name: 'ai_cost_usd_total',
      help: 'Total AI API costs in USD',
      labelNames: ['agent', 'model'],
      registers: [register],
    });

    this.aiErrorsTotal = new Counter({
      name: 'ai_errors_total',
      help: 'Total number of AI agent errors',
      labelNames: ['agent', 'model', 'error_type'],
      registers: [register],
    });

    // System Metrics
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [register],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [register],
    });

    this.cacheHitRate = new Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate (0-1)',
      registers: [register],
    });

    this.queueJobsActive = new Gauge({
      name: 'queue_jobs_active',
      help: 'Number of active queue jobs',
      labelNames: ['queue'],
      registers: [register],
    });

    this.queueJobsCompleted = new Counter({
      name: 'queue_jobs_completed_total',
      help: 'Total number of completed queue jobs',
      labelNames: ['queue', 'status'],
      registers: [register],
    });

    this.queueJobsFailed = new Counter({
      name: 'queue_jobs_failed_total',
      help: 'Total number of failed queue jobs',
      labelNames: ['queue', 'error_type'],
      registers: [register],
    });

    logger.info('Prometheus metrics service initialized');
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration / 1000);

    if (requestSize !== undefined) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }

    if (responseSize !== undefined) {
      this.httpResponseSize.observe({ method, route, status_code: statusCode }, responseSize);
    }

    // Record errors (4xx, 5xx)
    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      this.httpErrorsTotal.inc({ method, route, status_code: statusCode, error_type: errorType });
    }
  }

  /**
   * Record content generation
   */
  recordContentGenerated(platform: string, type: string, workflowId?: string): void {
    this.contentGeneratedTotal.inc({
      platform,
      type,
      workflow_id: workflowId || 'manual',
    });
  }

  /**
   * Record post published
   */
  recordPostPublished(platform: string, status: string, workflowId?: string): void {
    this.postsPublishedTotal.inc({
      platform,
      status,
      workflow_id: workflowId || 'manual',
    });
  }

  /**
   * Update post engagement
   */
  updatePostEngagement(platform: string, postId: string, engagement: number): void {
    this.postEngagement.set({ platform, post_id: postId }, engagement);
  }

  /**
   * Record AI request
   */
  recordAiRequest(
    agent: string,
    model: string,
    status: 'success' | 'error',
    duration: number,
    inputTokens?: number,
    outputTokens?: number,
    cost?: number
  ): void {
    this.aiRequestsTotal.inc({ agent, model, status });
    this.aiRequestDuration.observe({ agent, model }, duration / 1000);

    if (inputTokens !== undefined) {
      this.aiTokensUsed.inc({ agent, model, type: 'input' }, inputTokens);
    }

    if (outputTokens !== undefined) {
      this.aiTokensUsed.inc({ agent, model, type: 'output' }, outputTokens);
    }

    if (cost !== undefined) {
      this.aiCostTotal.inc({ agent, model }, cost);
    }

    if (status === 'error') {
      this.aiErrorsTotal.inc({ agent, model, error_type: 'unknown' });
    }
  }

  /**
   * Update database connection count
   */
  updateDbConnections(count: number): void {
    this.dbConnectionsActive.set(count);
  }

  /**
   * Record database query
   */
  recordDbQuery(operation: string, table: string, duration: number): void {
    this.dbQueryDuration.observe({ operation, table }, duration / 1000);
  }

  /**
   * Update cache hit rate
   */
  updateCacheHitRate(rate: number): void {
    this.cacheHitRate.set(rate);
  }

  /**
   * Update queue job counts
   */
  updateQueueJobs(queue: string, active: number): void {
    this.queueJobsActive.set({ queue }, active);
  }

  /**
   * Record queue job completion
   */
  recordQueueJobCompleted(queue: string, status: 'success' | 'failed'): void {
    this.queueJobsCompleted.inc({ queue, status });
  }

  /**
   * Record queue job failure
   */
  recordQueueJobFailed(queue: string, errorType: string): void {
    this.queueJobsFailed.inc({ queue, error_type: errorType });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJSON(): Promise<unknown> {
    return register.getMetricsAsJSON();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    register.resetMetrics();
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    register.clear();
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
export { register as metricsRegister };
