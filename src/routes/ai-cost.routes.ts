/**
 * AI Cost Monitoring Routes
 *
 * Endpoints for tracking and monitoring AI API costs
 */

import { Router, Request, Response } from 'express';
import { aiCostTracker } from '../services/ai-cost-tracker.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('AICostRoutes');
const router = Router();

/**
 * GET /ai-cost/current
 * Get current AI costs for different periods
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const [hourly, daily, monthly] = await Promise.all([
      aiCostTracker.getCost('hour'),
      aiCostTracker.getCost('day'),
      aiCostTracker.getCost('month'),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      costs: {
        hourly: {
          amount: hourly,
          formatted: `$${hourly.toFixed(4)}`,
        },
        daily: {
          amount: daily,
          formatted: `$${daily.toFixed(2)}`,
        },
        monthly: {
          amount: monthly,
          formatted: `$${monthly.toFixed(2)}`,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get current costs', { error });
    res.status(500).json({
      error: 'Failed to retrieve cost data',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /ai-cost/user/:userId
 * Get AI costs for a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const cost = await aiCostTracker.getCost('day', userId);

    res.json({
      userId,
      period: 'daily',
      cost: {
        amount: cost,
        formatted: `$${cost.toFixed(4)}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get user costs', { error });
    res.status(500).json({
      error: 'Failed to retrieve user cost data',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /ai-cost/workflow/:workflowId
 * Get AI costs for a specific workflow
 */
router.get('/workflow/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const cost = await aiCostTracker.getCost('day', undefined, workflowId);

    res.json({
      workflowId,
      period: 'daily',
      cost: {
        amount: cost,
        formatted: `$${cost.toFixed(4)}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get workflow costs', { error });
    res.status(500).json({
      error: 'Failed to retrieve workflow cost data',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /ai-cost/analytics
 * Get cost analytics and insights
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const period = (req.query['period'] as 'day' | 'week' | 'month') || 'day';
    const analytics = await aiCostTracker.getAnalytics(period);
    const recommendations = aiCostTracker.getOptimizationRecommendations(analytics);

    res.json({
      period,
      analytics: {
        totalCost: {
          amount: analytics.totalCost,
          formatted: `$${analytics.totalCost.toFixed(2)}`,
        },
        byProvider: analytics.byProvider,
        byModel: analytics.byModel,
        topUsers: analytics.topUsers,
        topWorkflows: analytics.topWorkflows,
      },
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get analytics', { error });
    res.status(500).json({
      error: 'Failed to retrieve analytics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /ai-cost/budget
 * Create a cost budget
 */
router.post('/budget', async (req: Request, res: Response): Promise<void> => {
  try {
    const budget = req.body;

    // Validate budget
    if (!budget.id || !budget.name || !budget.limitUSD || !budget.periodType) {
      res.status(400).json({
        error: 'Missing required fields: id, name, limitUSD, periodType',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await aiCostTracker.createBudget({
      ...budget,
      alertThresholds: budget.alertThresholds || [0.5, 0.75, 0.9],
      enabled: budget.enabled !== false,
    });

    res.status(201).json({
      message: 'Budget created successfully',
      budget,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create budget', { error });
    res.status(500).json({
      error: 'Failed to create budget',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /ai-cost/pricing
 * Get current AI pricing information
 */
router.get('/pricing', (req: Request, res: Response) => {
  const { AI_PRICING } = require('../services/ai-cost-tracker.js');

  res.json({
    pricing: AI_PRICING,
    currency: 'USD',
    unit: 'per 1M tokens',
    lastUpdated: '2025-01-01',
    note: 'Prices are subject to change. Check provider websites for latest pricing.',
    timestamp: new Date().toISOString(),
  });
});

export { router as aiCostRouter };
