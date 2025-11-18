/**
 * Agent Supervisor
 *
 * Comprehensive agent supervision system that provides:
 * - Health monitoring
 * - Circuit breaker protection
 * - Automatic recovery
 * - Fallback strategies
 * - Performance tracking
 */

import { Logger } from '../utils/Logger.js';
import { metricsService } from './metrics.js';
import { CircuitBreaker, CircuitState } from './circuit-breaker.js';
import { AgentHealthMonitor, HealthStatus } from './agent-health-monitor.js';
import { aiRequestOptimizer } from './ai-request-optimizer.js';
import { aiRequestQueue } from './ai-request-queue.js';

const logger = new Logger('AgentSupervisor');

/**
 * Agent execution context
 */
export interface AgentExecutionContext {
  agentName: string;
  operation: string;
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
  retryable?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  fromCache: boolean;
  fromFallback: boolean;
  attempts: number;
  agentUsed: string;
}

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  enabled: boolean;
  fallbackAgent?: string;
  fallbackStrategy?: 'cache' | 'default' | 'alternate';
  defaultValue?: any;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
}

/**
 * Agent supervision configuration
 */
export interface AgentSupervisionConfig {
  fallback?: FallbackConfig;
  retry?: RetryConfig;
}

/**
 * Supervised agent wrapper
 */
class SupervisedAgent {
  public readonly circuitBreaker: CircuitBreaker;
  public readonly healthMonitor: AgentHealthMonitor;
  public fallbackAgent?: string;

  constructor(
    public readonly name: string,
    config?: AgentSupervisionConfig
  ) {
    this.circuitBreaker = new CircuitBreaker(name, {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    });

    this.healthMonitor = new AgentHealthMonitor(name, {
      degradedThreshold: 0.1,
      unhealthyThreshold: 0.25,
      maxResponseTime: 30000,
    });

    if (config?.fallback?.fallbackAgent) {
      this.fallbackAgent = config.fallback.fallbackAgent;
    }

    logger.info(`Supervised agent created: ${name}`, {
      fallbackAgent: this.fallbackAgent,
    });
  }
}

/**
 * Agent Supervisor
 */
export class AgentSupervisor {
  private static instance: AgentSupervisor;
  private agents = new Map<string, SupervisedAgent>();

  // Default configurations
  private readonly defaultRetryConfig: RetryConfig = {
    enabled: true,
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  };

  private readonly defaultFallbackConfig: FallbackConfig = {
    enabled: true,
    fallbackStrategy: 'cache',
  };

  private constructor() {
    logger.info('Agent Supervisor initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AgentSupervisor {
    if (!AgentSupervisor.instance) {
      AgentSupervisor.instance = new AgentSupervisor();
    }
    return AgentSupervisor.instance;
  }

  /**
   * Register agent for supervision
   */
  public registerAgent(name: string, config?: AgentSupervisionConfig): void {
    if (this.agents.has(name)) {
      logger.warn(`Agent ${name} already registered, skipping`);
      return;
    }

    const supervisedAgent = new SupervisedAgent(name, config);
    this.agents.set(name, supervisedAgent);

    logger.info(`Agent registered for supervision: ${name}`);
    metricsService.incrementCounter('agents_supervised', { agent: name });
  }

  /**
   * Execute agent operation with supervision
   */
  public async execute<T>(
    context: AgentExecutionContext,
    executor: () => Promise<T>,
    config?: AgentSupervisionConfig
  ): Promise<AgentExecutionResult<T>> {
    const startTime = Date.now();
    const { agentName, operation } = context;

    // Get or create supervised agent
    if (!this.agents.has(agentName)) {
      this.registerAgent(agentName, config);
    }

    const agent = this.agents.get(agentName)!;
    const retryConfig = { ...this.defaultRetryConfig, ...config?.retry };
    const fallbackConfig = { ...this.defaultFallbackConfig, ...config?.fallback };

    let attempts = 0;
    let lastError: Error | undefined;

    // Try with retry
    while (attempts < retryConfig.maxAttempts) {
      attempts++;

      try {
        // Execute with circuit breaker protection
        const result = await agent.circuitBreaker.execute(async () => {
          const execStart = Date.now();

          try {
            const data = await executor();
            const duration = Date.now() - execStart;

            // Record success
            agent.healthMonitor.recordSuccess(duration);

            metricsService.recordHistogram('agent_execution_duration_ms', duration, {
              agent: agentName,
              operation,
              success: 'true',
            });

            return data;
          } catch (error) {
            const duration = Date.now() - execStart;

            // Record failure
            agent.healthMonitor.recordFailure(
              duration,
              error instanceof Error ? error.message : 'unknown'
            );

            metricsService.recordHistogram('agent_execution_duration_ms', duration, {
              agent: agentName,
              operation,
              success: 'false',
            });

            throw error;
          }
        });

        // Success!
        return {
          success: true,
          data: result,
          duration: Date.now() - startTime,
          fromCache: false,
          fromFallback: false,
          attempts,
          agentUsed: agentName,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.warn(`Agent ${agentName} execution failed (attempt ${attempts}/${retryConfig.maxAttempts})`, {
          operation,
          error: lastError.message,
        });

        metricsService.incrementCounter('agent_execution_errors', {
          agent: agentName,
          operation,
          attempt: String(attempts),
        });

        // Check if should retry
        if (
          retryConfig.enabled &&
          attempts < retryConfig.maxAttempts &&
          context.retryable !== false
        ) {
          const backoff = retryConfig.backoffMs * Math.pow(retryConfig.backoffMultiplier, attempts - 1);
          logger.debug(`Retrying in ${backoff}ms...`);
          await this.sleep(backoff);
          continue;
        }

        break;
      }
    }

    // All attempts failed, try fallback
    if (fallbackConfig.enabled) {
      const fallbackResult = await this.tryFallback(
        agentName,
        operation,
        fallbackConfig,
        lastError!
      );

      if (fallbackResult) {
        return {
          success: true,
          data: fallbackResult.data as T,
          duration: Date.now() - startTime,
          fromCache: fallbackResult.fromCache,
          fromFallback: true,
          attempts,
          agentUsed: fallbackResult.agentUsed,
        };
      }
    }

    // Complete failure
    metricsService.incrementCounter('agent_execution_complete_failures', {
      agent: agentName,
      operation,
    });

    const result: AgentExecutionResult<T> = {
      success: false,
      duration: Date.now() - startTime,
      fromCache: false,
      fromFallback: false,
      attempts,
      agentUsed: agentName,
    };
    if (lastError) {
      result.error = lastError;
    }
    return result;
  }

  /**
   * Try fallback strategies
   */
  private async tryFallback(
    agentName: string,
    operation: string,
    config: FallbackConfig,
    error: Error
  ): Promise<{ data: any; fromCache: boolean; agentUsed: string } | null> {
    logger.info(`Attempting fallback for agent ${agentName}`, {
      strategy: config.fallbackStrategy,
      fallbackAgent: config.fallbackAgent,
    });

    metricsService.incrementCounter('agent_fallback_attempts', {
      agent: agentName,
      strategy: config.fallbackStrategy || 'none',
    });

    // Try cache fallback
    if (config.fallbackStrategy === 'cache') {
      // Could check cache manager for cached response
      // For now, skip
      logger.debug('Cache fallback not yet implemented');
    }

    // Try default value fallback
    if (config.fallbackStrategy === 'default' && config.defaultValue !== undefined) {
      logger.info(`Using default value fallback for ${agentName}`);
      metricsService.incrementCounter('agent_fallback_successes', {
        agent: agentName,
        strategy: 'default',
      });

      return {
        data: config.defaultValue,
        fromCache: false,
        agentUsed: agentName,
      };
    }

    // Try alternate agent fallback
    if (config.fallbackStrategy === 'alternate' && config.fallbackAgent) {
      const fallbackAgent = this.agents.get(config.fallbackAgent);
      if (fallbackAgent && fallbackAgent.healthMonitor.isAvailable()) {
        logger.info(`Using alternate agent fallback: ${config.fallbackAgent}`);

        try {
          // Would execute fallback agent here
          // For now, just log
          logger.warn('Alternate agent fallback execution not yet implemented');
        } catch (fallbackError) {
          logger.error('Fallback agent also failed', { fallbackError });
        }
      }
    }

    return null;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get agent health status
   */
  public getAgentHealth(agentName: string): HealthStatus | null {
    const agent = this.agents.get(agentName);
    return agent ? agent.healthMonitor.getStatus() : null;
  }

  /**
   * Get agent metrics
   */
  public getAgentMetrics(agentName: string) {
    const agent = this.agents.get(agentName);
    if (!agent) return null;

    return {
      health: agent.healthMonitor.getMetrics(),
      circuitBreaker: agent.circuitBreaker.getStats(),
    };
  }

  /**
   * Get all agents status
   */
  public getAllAgentsStatus() {
    const status: Record<string, any> = {};

    for (const [name, agent] of this.agents.entries()) {
      status[name] = {
        health: agent.healthMonitor.getStatus(),
        circuitBreaker: agent.circuitBreaker.getState(),
        isAvailable: agent.healthMonitor.isAvailable(),
      };
    }

    return status;
  }

  /**
   * Reset agent supervision
   */
  public resetAgent(agentName: string): void {
    const agent = this.agents.get(agentName);
    if (agent) {
      agent.healthMonitor.reset();
      agent.circuitBreaker.reset();
      logger.info(`Agent ${agentName} supervision reset`);
    }
  }

  /**
   * Force circuit breaker state
   */
  public forceCircuitState(agentName: string, state: 'open' | 'closed'): void {
    const agent = this.agents.get(agentName);
    if (agent) {
      if (state === 'open') {
        agent.circuitBreaker.forceOpen();
      } else {
        agent.circuitBreaker.forceClose();
      }
      logger.warn(`Agent ${agentName} circuit breaker forced ${state.toUpperCase()}`);
    }
  }

  /**
   * Get supervision statistics
   */
  public getStatistics() {
    const stats = {
      totalAgents: this.agents.size,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      circuitsClosed: 0,
      circuitsOpen: 0,
      circuitsHalfOpen: 0,
    };

    for (const agent of this.agents.values()) {
      // Health stats
      const healthStatus = agent.healthMonitor.getStatus();
      if (healthStatus === HealthStatus.HEALTHY) stats.healthy++;
      else if (healthStatus === HealthStatus.DEGRADED) stats.degraded++;
      else if (healthStatus === HealthStatus.UNHEALTHY) stats.unhealthy++;

      // Circuit breaker stats
      const cbState = agent.circuitBreaker.getState();
      if (cbState === CircuitState.CLOSED) stats.circuitsClosed++;
      else if (cbState === CircuitState.OPEN) stats.circuitsOpen++;
      else if (cbState === CircuitState.HALF_OPEN) stats.circuitsHalfOpen++;
    }

    return stats;
  }

  /**
   * Shutdown supervisor
   */
  public shutdown(): void {
    logger.info('Shutting down Agent Supervisor');

    for (const agent of this.agents.values()) {
      agent.circuitBreaker.destroy();
    }

    this.agents.clear();
  }
}

/**
 * Get agent supervisor instance
 */
export function getAgentSupervisor(): AgentSupervisor {
  return AgentSupervisor.getInstance();
}

/**
 * Export singleton instance
 */
export const agentSupervisor = AgentSupervisor.getInstance();
