/**
 * Agent Supervision Routes
 *
 * Endpoints for monitoring and managing agent supervision
 */

import { Router, Request, Response } from 'express';
import { agentSupervisor } from '../services/agent-supervisor.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('AgentSupervisionRoutes');
const router = Router();

/**
 * GET /agent-supervision/status
 * Get status of all supervised agents
 */
router.get('/status', (_req: Request, res: Response) => {
  try {
    const status = agentSupervisor.getAllAgentsStatus();
    const stats = agentSupervisor.getStatistics();

    res.json({
      statistics: stats,
      agents: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get supervision status', { error });
    res.status(500).json({
      error: 'Failed to retrieve supervision status',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /agent-supervision/agent/:agentName
 * Get detailed metrics for specific agent
 */
router.get('/agent/:agentName', (req: Request, res: Response) => {
  try {
    const agentName = req.params['agentName'];
    if (!agentName) {
      res.status(400).json({
        error: 'Agent name is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const metrics = agentSupervisor.getAgentMetrics(agentName);

    if (!metrics) {
      res.status(404).json({
        error: `Agent ${agentName} not found or not supervised`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      agent: agentName,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get agent metrics', { error });
    res.status(500).json({
      error: 'Failed to retrieve agent metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /agent-supervision/health/:agentName
 * Get health status for specific agent
 */
router.get('/health/:agentName', (req: Request, res: Response) => {
  try {
    const agentName = req.params['agentName'];
    if (!agentName) {
      res.status(400).json({
        error: 'Agent name is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const health = agentSupervisor.getAgentHealth(agentName);

    if (health === null) {
      res.status(404).json({
        error: `Agent ${agentName} not found or not supervised`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      agent: agentName,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get agent health', { error });
    res.status(500).json({
      error: 'Failed to retrieve agent health',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /agent-supervision/reset/:agentName
 * Reset supervision for specific agent
 */
router.post('/reset/:agentName', (req: Request, res: Response) => {
  try {
    const agentName = req.params['agentName'];
    if (!agentName) {
      res.status(400).json({
        error: 'Agent name is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    agentSupervisor.resetAgent(agentName);

    res.json({
      message: `Agent ${agentName} supervision reset successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to reset agent supervision', { error });
    res.status(500).json({
      error: 'Failed to reset agent supervision',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /agent-supervision/circuit/:agentName/:action
 * Manually control circuit breaker state
 */
router.post('/circuit/:agentName/:action', (req: Request, res: Response) => {
  try {
    const agentName = req.params['agentName'];
    const action = req.params['action'];

    if (!agentName) {
      res.status(400).json({
        error: 'Agent name is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (action !== 'open' && action !== 'closed') {
      res.status(400).json({
        error: 'Action must be "open" or "closed"',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    agentSupervisor.forceCircuitState(agentName, action as 'open' | 'closed');

    res.json({
      message: `Circuit breaker for ${agentName} forced ${action.toUpperCase()}`,
      agent: agentName,
      action,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to control circuit breaker', { error });
    res.status(500).json({
      error: 'Failed to control circuit breaker',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /agent-supervision/statistics
 * Get overall supervision statistics
 */
router.get('/statistics', (_req: Request, res: Response) => {
  try {
    const stats = agentSupervisor.getStatistics();

    res.json({
      statistics: stats,
      healthSummary: {
        healthyPercentage:
          stats.totalAgents > 0 ? (stats.healthy / stats.totalAgents) * 100 : 0,
        degradedPercentage:
          stats.totalAgents > 0 ? (stats.degraded / stats.totalAgents) * 100 : 0,
        unhealthyPercentage:
          stats.totalAgents > 0 ? (stats.unhealthy / stats.totalAgents) * 100 : 0,
      },
      circuitBreakerSummary: {
        closedPercentage:
          stats.totalAgents > 0 ? (stats.circuitsClosed / stats.totalAgents) * 100 : 0,
        openPercentage:
          stats.totalAgents > 0 ? (stats.circuitsOpen / stats.totalAgents) * 100 : 0,
        halfOpenPercentage:
          stats.totalAgents > 0 ? (stats.circuitsHalfOpen / stats.totalAgents) * 100 : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get supervision statistics', { error });
    res.status(500).json({
      error: 'Failed to retrieve supervision statistics',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as agentSupervisionRouter };
