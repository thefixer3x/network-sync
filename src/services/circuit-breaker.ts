/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by stopping requests to failing agents
 * and allowing them time to recover.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Agent is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if agent has recovered
 */

import { Logger } from '../utils/Logger.js';
import { metricsService } from './metrics.js';

const logger = new Logger('CircuitBreaker');

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes in HALF_OPEN before closing
  timeout: number; // Time in ms before attempting to close from OPEN
  rollingWindowSize: number; // Number of recent requests to track
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalCalls: number;
  lastFailureTime: number | null;
  lastStateChange: number;
}

/**
 * Request result
 */
interface RequestResult {
  success: boolean;
  timestamp: number;
}

/**
 * Circuit Breaker
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalCalls = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange = Date.now();
  private recentRequests: RequestResult[] = [];

  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  // Timer for half-open state
  private halfOpenTimer: NodeJS.Timeout | null = null;

  constructor(name: string, config?: Partial<CircuitBreakerConfig>) {
    this.name = name;
    this.config = {
      failureThreshold: config?.failureThreshold || 5,
      successThreshold: config?.successThreshold || 2,
      timeout: config?.timeout || 60000, // 1 minute default
      rollingWindowSize: config?.rollingWindowSize || 100,
    };

    logger.info(`Circuit breaker created for ${name}`, this.config);
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      const timeSinceLastFailure = this.lastFailureTime ? now - this.lastFailureTime : 0;

      // Check if timeout has passed
      if (timeSinceLastFailure >= this.config.timeout) {
        logger.info(`Circuit breaker ${this.name}: Attempting recovery (HALF_OPEN)`);
        this.setState(CircuitState.HALF_OPEN);
      } else {
        metricsService.incrementCounter('circuit_breaker_rejections', { name: this.name });
        throw new Error(
          `Circuit breaker ${this.name} is OPEN. ` +
            `Retry in ${Math.ceil((this.config.timeout - timeSinceLastFailure) / 1000)}s`
        );
      }
    }

    this.totalCalls++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.recordResult(true);
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        logger.info(`Circuit breaker ${this.name}: Recovery successful, closing circuit`);
        this.setState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }

    metricsService.incrementCounter('circuit_breaker_successes', { name: this.name });
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.recordResult(false);
    this.failureCount++;
    this.lastFailureTime = Date.now();

    metricsService.incrementCounter('circuit_breaker_failures', { name: this.name });

    if (this.state === CircuitState.HALF_OPEN) {
      logger.warn(`Circuit breaker ${this.name}: Recovery failed, opening circuit`);
      this.setState(CircuitState.OPEN);
      this.successCount = 0;
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      logger.warn(
        `Circuit breaker ${this.name}: Failure threshold reached (${this.failureCount}/${this.config.failureThreshold}), opening circuit`
      );
      this.setState(CircuitState.OPEN);
    }
  }

  /**
   * Record request result in rolling window
   */
  private recordResult(success: boolean): void {
    this.recentRequests.push({
      success,
      timestamp: Date.now(),
    });

    // Maintain rolling window size
    if (this.recentRequests.length > this.config.rollingWindowSize) {
      this.recentRequests.shift();
    }
  }

  /**
   * Set circuit breaker state
   */
  private setState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (oldState !== newState) {
      logger.info(`Circuit breaker ${this.name}: ${oldState} -> ${newState}`);
      metricsService.incrementCounter('circuit_breaker_state_changes', {
        name: this.name,
        from: oldState,
        to: newState,
      });

      // Update gauge
      metricsService.setGauge('circuit_breaker_state', this.stateToNumber(newState), {
        name: this.name,
      });
    }
  }

  /**
   * Convert state to number for metrics
   */
  private stateToNumber(state: CircuitState): number {
    switch (state) {
      case CircuitState.CLOSED:
        return 0;
      case CircuitState.HALF_OPEN:
        return 1;
      case CircuitState.OPEN:
        return 2;
    }
  }

  /**
   * Get current state
   */
  public getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
    };
  }

  /**
   * Get error rate from recent requests
   */
  public getErrorRate(): number {
    if (this.recentRequests.length === 0) return 0;

    const failures = this.recentRequests.filter((r) => !r.success).length;
    return failures / this.recentRequests.length;
  }

  /**
   * Force open circuit (for testing or manual intervention)
   */
  public forceOpen(): void {
    logger.warn(`Circuit breaker ${this.name}: Forced OPEN`);
    this.setState(CircuitState.OPEN);
    this.lastFailureTime = Date.now();
  }

  /**
   * Force close circuit (for testing or manual intervention)
   */
  public forceClose(): void {
    logger.warn(`Circuit breaker ${this.name}: Forced CLOSED`);
    this.setState(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Reset circuit breaker
   */
  public reset(): void {
    logger.info(`Circuit breaker ${this.name}: Reset`);
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
    this.recentRequests = [];

    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = null;
    }
  }

  /**
   * Clean up
   */
  public destroy(): void {
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = null;
    }
  }
}
