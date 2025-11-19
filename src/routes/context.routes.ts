/**
 * Context Management Routes
 *
 * Endpoints for managing shared context between agents
 */

import { Router, Request, Response } from 'express';
import { contextManager, ContextScope } from '../services/context-manager.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('ContextRoutes');
const router = Router();

/**
 * GET /context
 * List all contexts
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const contexts = contextManager.listContexts();

    res.json({
      contexts,
      count: contexts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to list contexts', { error });
    res.status(500).json({
      error: 'Failed to list contexts',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /context/:contextId
 * Get context details
 */
router.get('/:contextId', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    if (!contextId) {
      res.status(400).json({
        error: 'Context ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const context = contextManager.getContext(contextId);
    const stats = context.getStats();

    res.json({
      contextId,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get context', { error });
    res.status(500).json({
      error: 'Failed to get context',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /context/:contextId/set
 * Set context value
 */
router.post('/:contextId/set', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    const { key, value, scope, scopeId, metadata } = req.body;

    if (!contextId || !key || value === undefined) {
      res.status(400).json({
        error: 'contextId, key, and value are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const contextScope = (scope as ContextScope) || ContextScope.GLOBAL;
    const effectiveScopeId = scopeId || 'default';

    contextManager.set(contextId, key, value, contextScope, effectiveScopeId, metadata);

    res.json({
      message: 'Context value set successfully',
      contextId,
      key,
      scope: contextScope,
      scopeId: effectiveScopeId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to set context value', { error });
    res.status(500).json({
      error: 'Failed to set context value',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /context/:contextId/get/:key
 * Get context value
 */
router.get('/:contextId/get/:key', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    const key = req.params['key'];

    if (!contextId || !key) {
      res.status(400).json({
        error: 'contextId and key are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const entry = contextManager.get(contextId, key);

    if (!entry) {
      res.status(404).json({
        error: `Context entry not found`,
        contextId,
        key,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get context value', { error });
    res.status(500).json({
      error: 'Failed to get context value',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /context/:contextId/scope/:scope
 * Get all entries for a scope
 */
router.get('/:contextId/scope/:scope', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    const scope = req.params['scope'] as ContextScope;
    const scopeId = req.query['scopeId'] as string | undefined;

    if (!contextId || !scope) {
      res.status(400).json({
        error: 'contextId and scope are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Validate scope
    if (!Object.values(ContextScope).includes(scope)) {
      res.status(400).json({
        error: `Invalid scope. Must be one of: ${Object.values(ContextScope).join(', ')}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const entries = contextManager.getByScope(contextId, scope, scopeId);

    res.json({
      contextId,
      scope,
      scopeId,
      entries,
      count: entries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get context by scope', { error });
    res.status(500).json({
      error: 'Failed to get context by scope',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /context/:contextId
 * Delete context
 */
router.delete('/:contextId', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    if (!contextId) {
      res.status(400).json({
        error: 'Context ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const deleted = contextManager.deleteContext(contextId);

    if (!deleted) {
      res.status(404).json({
        error: `Context not found`,
        contextId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      message: 'Context deleted successfully',
      contextId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to delete context', { error });
    res.status(500).json({
      error: 'Failed to delete context',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /context/:contextId/clear
 * Clear context entries
 */
router.post('/:contextId/clear', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    const { scope, scopeId } = req.body;

    if (!contextId) {
      res.status(400).json({
        error: 'Context ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const context = contextManager.getContext(contextId);
    context.clear(scope, scopeId);

    res.json({
      message: 'Context cleared successfully',
      contextId,
      scope,
      scopeId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to clear context', { error });
    res.status(500).json({
      error: 'Failed to clear context',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /context/:contextId/prune
 * Manually trigger context pruning
 */
router.post('/:contextId/prune', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    if (!contextId) {
      res.status(400).json({
        error: 'Context ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const context = contextManager.getContext(contextId);
    const beforeStats = context.getStats();
    context.prune();
    const afterStats = context.getStats();

    res.json({
      message: 'Context pruned successfully',
      contextId,
      before: {
        entries: beforeStats.entryCount,
        tokens: beforeStats.totalTokens,
      },
      after: {
        entries: afterStats.entryCount,
        tokens: afterStats.totalTokens,
      },
      removed: {
        entries: beforeStats.entryCount - afterStats.entryCount,
        tokens: beforeStats.totalTokens - afterStats.totalTokens,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to prune context', { error });
    res.status(500).json({
      error: 'Failed to prune context',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /context/:contextId/snapshot
 * Create context snapshot
 */
router.post('/:contextId/snapshot', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    const { reason, createdBy } = req.body;

    if (!contextId) {
      res.status(400).json({
        error: 'Context ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const snapshot = contextManager.createSnapshot(contextId, reason, createdBy);

    res.status(201).json({
      message: 'Snapshot created successfully',
      snapshot: {
        id: snapshot.id,
        version: snapshot.version,
        entryCount: snapshot.entries.length,
        reason: snapshot.reason,
        createdBy: snapshot.createdBy,
        timestamp: snapshot.timestamp,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create snapshot', { error });
    res.status(500).json({
      error: 'Failed to create snapshot',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /context/:contextId/snapshots
 * List context snapshots
 */
router.get('/:contextId/snapshots', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    if (!contextId) {
      res.status(400).json({
        error: 'Context ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const context = contextManager.getContext(contextId);
    const snapshots = context.listSnapshots();

    res.json({
      contextId,
      snapshots,
      count: snapshots.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to list snapshots', { error });
    res.status(500).json({
      error: 'Failed to list snapshots',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /context/:contextId/snapshots/:version
 * Get specific snapshot
 */
router.get('/:contextId/snapshots/:version', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    const versionStr = req.params['version'];

    if (!contextId || !versionStr) {
      res.status(400).json({
        error: 'contextId and version are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const version = parseInt(versionStr);
    if (isNaN(version)) {
      res.status(400).json({
        error: 'Version must be a number',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const context = contextManager.getContext(contextId);
    const snapshot = context.getSnapshot(version);

    if (!snapshot) {
      res.status(404).json({
        error: `Snapshot version ${version} not found`,
        contextId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      ...snapshot,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get snapshot', { error });
    res.status(500).json({
      error: 'Failed to get snapshot',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /context/:contextId/rollback
 * Rollback context to snapshot
 */
router.post('/:contextId/rollback', (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    const { version, reason } = req.body;

    if (!contextId || version === undefined) {
      res.status(400).json({
        error: 'contextId and version are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    contextManager.rollback(contextId, version, reason);

    res.json({
      message: 'Context rolled back successfully',
      contextId,
      version,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to rollback context', { error });
    res.status(500).json({
      error: 'Failed to rollback context',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /context/:contextId/restore
 * Restore context from cache
 */
router.post('/:contextId/restore', async (req: Request, res: Response) => {
  try {
    const contextId = req.params['contextId'];
    if (!contextId) {
      res.status(400).json({
        error: 'Context ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const restored = await contextManager.restoreContext(contextId);

    if (!restored) {
      res.status(404).json({
        error: `No persisted context found for ${contextId}`,
        contextId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      message: 'Context restored successfully',
      contextId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to restore context', { error });
    res.status(500).json({
      error: 'Failed to restore context',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /context/statistics
 * Get overall context statistics
 */
router.get('/statistics/all', (_req: Request, res: Response) => {
  try {
    const stats = contextManager.getStatistics();

    res.json({
      statistics: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get context statistics', { error });
    res.status(500).json({
      error: 'Failed to get context statistics',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as contextRouter };
