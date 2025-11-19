/**
 * AI Cost Tracking Service
 *
 * Tracks and monitors AI API costs across all providers:
 * - Claude (Anthropic)
 * - Perplexity
 * - OpenAI (embeddings)
 *
 * Features:
 * - Per-request cost calculation
 * - Budget management
 * - Cost alerts
 * - Usage analytics
 * - Cost optimization recommendations
 */

import { Logger } from '../utils/Logger.js';
import { getCache } from '../cache/redis-cache.js';
import { metricsService } from './metrics.js';

const logger = new Logger('AIConstTracker');

/**
 * Pricing per 1M tokens (as of 2025-01)
 * Update these when pricing changes
 */
export const AI_PRICING = {
  claude: {
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 }, // $3/$15 per MTok
    'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 }, // $0.25/$1.25 per MTok
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 }, // $15/$75 per MTok
  },
  perplexity: {
    'sonar-pro': { input: 3.0, output: 15.0 }, // $3/$15 per MTok
    'sonar': { input: 1.0, output: 1.0 }, // $1/$1 per MTok
  },
  openai: {
    'text-embedding-3-small': { input: 0.02, output: 0 }, // $0.02 per MTok
    'text-embedding-3-large': { input: 0.13, output: 0 }, // $0.13 per MTok
  },
};

export interface AIUsageRecord {
  requestId: string;
  timestamp: Date;
  provider: 'claude' | 'perplexity' | 'openai';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number; // in USD
  userId?: string;
  workflowId?: string;
  metadata?: Record<string, unknown>;
}

export interface CostBudget {
  id: string;
  name: string;
  limitUSD: number;
  periodType: 'hourly' | 'daily' | 'weekly' | 'monthly';
  scope: 'global' | 'user' | 'workflow';
  scopeId?: string; // userId or workflowId
  alertThresholds: number[]; // e.g., [0.5, 0.75, 0.9] for 50%, 75%, 90%
  enabled: boolean;
}

export interface CostAlert {
  budgetId: string;
  threshold: number; // 0-1 (percentage)
  currentSpend: number;
  limitUSD: number;
  timestamp: Date;
}

export class AICostTracker {
  private cache = getCache();
  private readonly COST_TTL = 86400; // 24 hours
  private budgets: Map<string, CostBudget> = new Map();

  constructor() {
    logger.info('AI Cost Tracker initialized');
    this.loadBudgets();
  }

  /**
   * Track AI API usage and calculate cost
   */
  async trackUsage(usage: AIUsageRecord): Promise<number> {
    try {
      const cost = this.calculateCost(
        usage.provider,
        usage.model,
        usage.inputTokens,
        usage.outputTokens
      );

      const record: AIUsageRecord = {
        ...usage,
        cost,
        timestamp: new Date(),
      };

      // Store in cache for fast retrieval
      const cacheKey = `ai-cost:${usage.requestId}`;
      await this.cache.set(cacheKey, record, this.COST_TTL);

      // Update aggregated metrics
      await this.updateAggregates(record);

      // Record in Prometheus metrics
      metricsService.recordAiRequest(
        usage.provider,
        usage.model,
        'success',
        0, // duration tracked separately
        usage.inputTokens,
        usage.outputTokens,
        cost
      );

      // Check budgets and trigger alerts if needed
      await this.checkBudgets(record);

      logger.debug(`Tracked AI usage: ${usage.provider}/${usage.model} - $${cost.toFixed(4)}`);

      return cost;
    } catch (error) {
      logger.error('Failed to track AI usage', { error, usage });
      throw error;
    }
  }

  /**
   * Calculate cost for AI API usage
   */
  private calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const providerPricing = AI_PRICING[provider as keyof typeof AI_PRICING];
    const pricing = providerPricing?.[model as keyof typeof providerPricing] as
      | { input: number; output: number }
      | undefined;

    if (!pricing) {
      logger.warn(`No pricing found for ${provider}/${model}, using default`);
      return 0.001; // Default $0.001 per request
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Update aggregated cost metrics
   */
  private async updateAggregates(record: AIUsageRecord): Promise<void> {
    const now = new Date();
    const hourKey = `ai-cost:hour:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`;
    const dayKey = `ai-cost:day:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
    const monthKey = `ai-cost:month:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;

    // Increment costs
    await Promise.all([
      this.incrementCost(hourKey, record.cost, 3600), // 1 hour TTL
      this.incrementCost(dayKey, record.cost, 86400), // 24 hours TTL
      this.incrementCost(monthKey, record.cost, 2592000), // 30 days TTL
    ]);

    // User-specific tracking
    if (record.userId) {
      const userDayKey = `ai-cost:user:${record.userId}:day:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
      await this.incrementCost(userDayKey, record.cost, 86400);
    }

    // Workflow-specific tracking
    if (record.workflowId) {
      const workflowDayKey = `ai-cost:workflow:${record.workflowId}:day:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
      await this.incrementCost(workflowDayKey, record.cost, 86400);
    }
  }

  /**
   * Increment cost in cache
   */
  private async incrementCost(key: string, amount: number, ttl: number): Promise<void> {
    try {
      const current = (await this.cache.get<number>(key)) || 0;
      await this.cache.set(key, current + amount, ttl);
    } catch (error) {
      logger.error(`Failed to increment cost for ${key}`, { error });
    }
  }

  /**
   * Get cost for a specific period
   */
  async getCost(
    period: 'hour' | 'day' | 'month',
    userId?: string,
    workflowId?: string
  ): Promise<number> {
    const now = new Date();
    let key: string;

    if (userId) {
      key = `ai-cost:user:${userId}:day:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
    } else if (workflowId) {
      key = `ai-cost:workflow:${workflowId}:day:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
    } else {
      switch (period) {
        case 'hour':
          key = `ai-cost:hour:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`;
          break;
        case 'day':
          key = `ai-cost:day:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
          break;
        case 'month':
          key = `ai-cost:month:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
          break;
      }
    }

    return (await this.cache.get<number>(key)) || 0;
  }

  /**
   * Create a cost budget
   */
  async createBudget(budget: CostBudget): Promise<void> {
    this.budgets.set(budget.id, budget);
    await this.cache.set(`budget:${budget.id}`, budget, 2592000); // 30 days TTL
    logger.info(`Created budget: ${budget.name} ($${budget.limitUSD}/${budget.periodType})`);
  }

  /**
   * Load budgets from cache
   */
  private async loadBudgets(): Promise<void> {
    // In production, load from database
    // For now, using cache
    logger.debug('Loading budgets from cache');
  }

  /**
   * Check budgets and trigger alerts
   */
  private async checkBudgets(record: AIUsageRecord): Promise<void> {
    for (const budget of this.budgets.values()) {
      if (!budget.enabled) continue;

      // Check if budget applies to this record
      if (budget.scope === 'user' && budget.scopeId !== record.userId) continue;
      if (budget.scope === 'workflow' && budget.scopeId !== record.workflowId) continue;

      // Map budget periodType to getCost period
      const periodMap: Record<string, 'hour' | 'day' | 'month'> = {
        hourly: 'hour',
        daily: 'day',
        weekly: 'day', // Use daily aggregation for weekly
        monthly: 'month',
      };
      const period = periodMap[budget.periodType] || 'day';

      // Get current spend for the budget period
      const currentSpend = await this.getCost(
        period,
        budget.scope === 'user' ? budget.scopeId : undefined,
        budget.scope === 'workflow' ? budget.scopeId : undefined
      );

      const percentUsed = currentSpend / budget.limitUSD;

      // Check alert thresholds
      for (const threshold of budget.alertThresholds) {
        if (percentUsed >= threshold) {
          await this.triggerAlert({
            budgetId: budget.id,
            threshold,
            currentSpend,
            limitUSD: budget.limitUSD,
            timestamp: new Date(),
          });
        }
      }

      // Check if over budget
      if (currentSpend >= budget.limitUSD) {
        logger.warn(`Budget exceeded: ${budget.name}`, {
          limit: budget.limitUSD,
          spent: currentSpend,
          scope: budget.scope,
        });
      }
    }
  }

  /**
   * Trigger cost alert
   */
  private async triggerAlert(alert: CostAlert): Promise<void> {
    logger.warn(`Cost alert triggered`, {
      budgetId: alert.budgetId,
      threshold: `${(alert.threshold * 100).toFixed(0)}%`,
      spent: `$${alert.currentSpend.toFixed(2)}`,
      limit: `$${alert.limitUSD.toFixed(2)}`,
    });

    // Store alert
    const alertKey = `alert:${alert.budgetId}:${alert.threshold}:${alert.timestamp.getTime()}`;
    await this.cache.set(alertKey, alert, 604800); // 7 days TTL

    // In production, send notifications (email, Slack, etc.)
  }

  /**
   * Get cost analytics
   */
  async getAnalytics(period: 'day' | 'week' | 'month'): Promise<{
    totalCost: number;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    topUsers: Array<{ userId: string; cost: number }>;
    topWorkflows: Array<{ workflowId: string; cost: number }>;
  }> {
    // Simplified analytics - in production, query from database
    const totalCost = await this.getCost(period === 'week' ? 'day' : period);

    return {
      totalCost,
      byProvider: {},
      byModel: {},
      topUsers: [],
      topWorkflows: [],
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(analytics: Awaited<ReturnType<typeof this.getAnalytics>>): string[] {
    const recommendations: string[] = [];

    if (analytics.totalCost > 100) {
      recommendations.push('Consider using Claude 3.5 Haiku instead of Sonnet for simple tasks (5x cost reduction)');
    }

    if (analytics.totalCost > 500) {
      recommendations.push('Implement prompt caching to reduce input token costs by up to 90%');
      recommendations.push('Batch similar requests together to reduce API calls');
    }

    recommendations.push('Monitor and optimize prompt lengths to reduce token usage');

    return recommendations;
  }
}

// Export singleton instance
export const aiCostTracker = new AICostTracker();
