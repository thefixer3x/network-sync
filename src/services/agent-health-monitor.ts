/**
 * Agent Health Monitor
 *
 * Monitors agent health through:
 * - Response time tracking
 * - Error rate monitoring
 * - Success rate tracking
 * - Availability status
 */

import { Logger } from '../utils/Logger.js';
import { metricsService } from './metrics.js';

const logger = new Logger('AgentHealthMonitor');

/**
 * Agent health status
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Agent health metrics
 */
export interface AgentHealthMetrics {
  status: HealthStatus;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  errorRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  lastRequestTime: number | null;
  lastSuccessTime: number | null;
  lastFailureTime: number | null;
  consecutiveFailures: number;
  uptime: number;
}

/**
 * Request metrics
 */
interface RequestMetric {
  success: boolean;
  duration: number;
  timestamp: number;
  error?: string;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  degradedThreshold: number; // Error rate threshold for degraded status
  unhealthyThreshold: number; // Error rate threshold for unhealthy status
  maxResponseTime: number; // Max acceptable response time (ms)
  rollingWindowSize: number; // Number of recent requests to track
  maxConsecutiveFailures: number; // Max consecutive failures before unhealthy
}

/**
 * Agent Health Monitor
 */
export class AgentHealthMonitor {
  private status: HealthStatus = HealthStatus.UNKNOWN;
  private requests: RequestMetric[] = [];
  private consecutiveFailures = 0;
  private lastRequestTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private lastFailureTime: number | null = null;
  private startTime = Date.now();

  private readonly agentName: string;
  private readonly config: HealthCheckConfig;

  constructor(agentName: string, config?: Partial<HealthCheckConfig>) {
    this.agentName = agentName;
    this.config = {
      degradedThreshold: config?.degradedThreshold || 0.1, // 10% error rate
      unhealthyThreshold: config?.unhealthyThreshold || 0.25, // 25% error rate
      maxResponseTime: config?.maxResponseTime || 30000, // 30 seconds
      rollingWindowSize: config?.rollingWindowSize || 100,
      maxConsecutiveFailures: config?.maxConsecutiveFailures || 5,
    };

    logger.info(`Health monitor created for agent: ${agentName}`, this.config);
  }

  /**
   * Record successful request
   */
  public recordSuccess(duration: number): void {
    this.recordRequest({
      success: true,
      duration,
      timestamp: Date.now(),
    });

    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();
    this.updateStatus();

    metricsService.incrementCounter('agent_health_successes', { agent: this.agentName });
  }

  /**
   * Record failed request
   */
  public recordFailure(duration: number, error?: string): void {
    const metric: RequestMetric = {
      success: false,
      duration,
      timestamp: Date.now(),
    };
    if (error) {
      metric.error = error;
    }
    this.recordRequest(metric);

    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    this.updateStatus();

    metricsService.incrementCounter('agent_health_failures', {
      agent: this.agentName,
      error: error || 'unknown',
    });
  }

  /**
   * Record request metric
   */
  private recordRequest(metric: RequestMetric): void {
    this.requests.push(metric);
    this.lastRequestTime = metric.timestamp;

    // Maintain rolling window
    if (this.requests.length > this.config.rollingWindowSize) {
      this.requests.shift();
    }

    // Record metrics
    metricsService.recordHistogram('agent_response_time_ms', metric.duration, {
      agent: this.agentName,
      success: String(metric.success),
    });
  }

  /**
   * Update health status based on metrics
   */
  private updateStatus(): void {
    const errorRate = this.calculateErrorRate();
    const avgResponseTime = this.calculateAverageResponseTime();

    let newStatus: HealthStatus;

    // Check consecutive failures
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      newStatus = HealthStatus.UNHEALTHY;
    }
    // Check error rate
    else if (errorRate >= this.config.unhealthyThreshold) {
      newStatus = HealthStatus.UNHEALTHY;
    } else if (errorRate >= this.config.degradedThreshold) {
      newStatus = HealthStatus.DEGRADED;
    }
    // Check response time
    else if (avgResponseTime > this.config.maxResponseTime) {
      newStatus = HealthStatus.DEGRADED;
    }
    // All good
    else {
      newStatus = HealthStatus.HEALTHY;
    }

    if (newStatus !== this.status) {
      const oldStatus = this.status;
      this.status = newStatus;

      logger.info(`Agent ${this.agentName} health status changed: ${oldStatus} -> ${newStatus}`, {
        errorRate,
        avgResponseTime,
        consecutiveFailures: this.consecutiveFailures,
      });

      metricsService.incrementCounter('agent_health_status_changes', {
        agent: this.agentName,
        from: oldStatus,
        to: newStatus,
      });
    }

    // Update gauge
    metricsService.setGauge('agent_health_status', this.statusToNumber(this.status), {
      agent: this.agentName,
    });

    metricsService.setGauge('agent_error_rate', errorRate, { agent: this.agentName });
    metricsService.setGauge('agent_success_rate', 1 - errorRate, { agent: this.agentName });
  }

  /**
   * Convert status to number for metrics
   */
  private statusToNumber(status: HealthStatus): number {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 0;
      case HealthStatus.DEGRADED:
        return 1;
      case HealthStatus.UNHEALTHY:
        return 2;
      case HealthStatus.UNKNOWN:
        return 3;
    }
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    if (this.requests.length === 0) return 0;

    const failures = this.requests.filter((r) => !r.success).length;
    return failures / this.requests.length;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(): number {
    if (this.requests.length === 0) return 0;

    const total = this.requests.reduce((sum, r) => sum + r.duration, 0);
    return total / this.requests.length;
  }

  /**
   * Calculate percentile response time
   */
  private calculatePercentile(percentile: number): number {
    if (this.requests.length === 0) return 0;

    const sorted = this.requests.map((r) => r.duration).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Get current health status
   */
  public getStatus(): HealthStatus {
    return this.status;
  }

  /**
   * Get comprehensive health metrics
   */
  public getMetrics(): AgentHealthMetrics {
    const totalRequests = this.requests.length;
    const successfulRequests = this.requests.filter((r) => r.success).length;
    const failedRequests = this.requests.filter((r) => !r.success).length;

    return {
      status: this.status,
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      errorRate: this.calculateErrorRate(),
      averageResponseTime: this.calculateAverageResponseTime(),
      p95ResponseTime: this.calculatePercentile(95),
      p99ResponseTime: this.calculatePercentile(99),
      lastRequestTime: this.lastRequestTime,
      lastSuccessTime: this.lastSuccessTime,
      lastFailureTime: this.lastFailureTime,
      consecutiveFailures: this.consecutiveFailures,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Check if agent is healthy
   */
  public isHealthy(): boolean {
    return this.status === HealthStatus.HEALTHY;
  }

  /**
   * Check if agent is available
   */
  public isAvailable(): boolean {
    return this.status !== HealthStatus.UNHEALTHY;
  }

  /**
   * Reset health monitor
   */
  public reset(): void {
    logger.info(`Resetting health monitor for agent: ${this.agentName}`);
    this.status = HealthStatus.UNKNOWN;
    this.requests = [];
    this.consecutiveFailures = 0;
    this.lastRequestTime = null;
    this.lastSuccessTime = null;
    this.lastFailureTime = null;
    this.startTime = Date.now();
  }
}
