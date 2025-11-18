/**
 * Workflow Management Routes
 *
 * Endpoints for managing workflows, versions, templates, and executions
 */

import { Router, Request, Response } from 'express';
import { workflowManager } from '../services/workflow-manager.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('WorkflowManagementRoutes');
const router = Router();

/**
 * POST /workflows/versions
 * Create new workflow version
 */
router.post('/versions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { workflowId, definition, changelog, createdBy } = req.body;

    if (!workflowId || !definition) {
      res.status(400).json({
        error: 'workflowId and definition are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const version = await workflowManager.createWorkflowVersion(
      workflowId,
      definition,
      changelog,
      createdBy
    );

    res.status(201).json({
      message: 'Workflow version created',
      version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create workflow version', { error });
    res.status(500).json({
      error: 'Failed to create workflow version',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /workflows/:workflowId/versions
 * List all versions of a workflow
 */
router.get('/:workflowId/versions', (req: Request, res: Response) => {
  try {
    const workflowId = req.params['workflowId'];
    if (!workflowId) {
      res.status(400).json({
        error: 'workflowId is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const versions = workflowManager.listWorkflowVersions(workflowId);

    res.json({
      workflowId,
      versions,
      count: versions.length,
      activeVersion: versions.find((v) => v.isActive)?.version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to list workflow versions', { error });
    res.status(500).json({
      error: 'Failed to list workflow versions',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /workflows/:workflowId/versions/:version
 * Get specific workflow version
 */
router.get('/:workflowId/versions/:version', (req: Request, res: Response) => {
  try {
    const workflowId = req.params['workflowId'];
    const versionStr = req.params['version'];

    if (!workflowId) {
      res.status(400).json({
        error: 'workflowId is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const version = versionStr === 'active' ? undefined : parseInt(versionStr || '');
    const workflowVersion = workflowManager.getWorkflowVersion(workflowId, version);

    if (!workflowVersion) {
      res.status(404).json({
        error: `Workflow version not found`,
        workflowId,
        version,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      ...workflowVersion,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get workflow version', { error });
    res.status(500).json({
      error: 'Failed to get workflow version',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /workflows/:workflowId/rollback
 * Rollback workflow to previous version
 */
router.post('/:workflowId/rollback', async (req: Request, res: Response) => {
  try {
    const workflowId = req.params['workflowId'];
    const { targetVersion, reason } = req.body;

    if (!workflowId || !targetVersion) {
      res.status(400).json({
        error: 'workflowId and targetVersion are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const version = await workflowManager.rollbackWorkflow(workflowId, targetVersion, reason);

    res.json({
      message: 'Workflow rolled back successfully',
      workflowId,
      activeVersion: version.version,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to rollback workflow', { error });
    res.status(500).json({
      error: 'Failed to rollback workflow',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /workflows/:workflowId/execute
 * Execute workflow
 */
router.post('/:workflowId/execute', async (req: Request, res: Response) => {
  try {
    const workflowId = req.params['workflowId'];
    const { inputs, version } = req.body;

    if (!workflowId) {
      res.status(400).json({
        error: 'workflowId is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const context = await workflowManager.executeWorkflow(workflowId, inputs || {}, version);

    res.json({
      message: 'Workflow execution started',
      executionId: context.executionId,
      workflowId: context.workflowId,
      version: context.version,
      status: context.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to execute workflow', { error });
    res.status(500).json({
      error: 'Failed to execute workflow',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /workflows/executions/:executionId
 * Get workflow execution status
 */
router.get('/executions/:executionId', (req: Request, res: Response) => {
  try {
    const executionId = req.params['executionId'];
    if (!executionId) {
      res.status(400).json({
        error: 'executionId is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const context = workflowManager.getExecutionStatus(executionId);

    if (!context) {
      res.status(404).json({
        error: `Execution not found`,
        executionId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      executionId: context.executionId,
      workflowId: context.workflowId,
      version: context.version,
      status: context.status,
      currentStep: context.currentStep,
      duration: context.endTime
        ? context.endTime - context.startTime
        : Date.now() - context.startTime,
      error: context.error?.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get execution status', { error });
    res.status(500).json({
      error: 'Failed to get execution status',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /workflows/executions/:executionId/cancel
 * Cancel workflow execution
 */
router.post('/executions/:executionId/cancel', async (req: Request, res: Response) => {
  try {
    const executionId = req.params['executionId'];
    if (!executionId) {
      res.status(400).json({
        error: 'executionId is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await workflowManager.cancelExecution(executionId);

    res.json({
      message: 'Workflow execution cancelled',
      executionId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to cancel execution', { error });
    res.status(500).json({
      error: 'Failed to cancel execution',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /workflows/templates
 * Register workflow template
 */
router.post('/templates', (req: Request, res: Response) => {
  try {
    const template = req.body;

    if (!template.id || !template.name || !template.definition) {
      res.status(400).json({
        error: 'id, name, and definition are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    workflowManager.registerTemplate(template);

    res.status(201).json({
      message: 'Template registered successfully',
      templateId: template.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to register template', { error });
    res.status(500).json({
      error: 'Failed to register template',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /workflows/templates
 * List workflow templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const category = req.query['category'] as string | undefined;
    const templates = workflowManager.listTemplates(category);

    res.json({
      templates,
      count: templates.length,
      category,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to list templates', { error });
    res.status(500).json({
      error: 'Failed to list templates',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /workflows/templates/:templateId
 * Get workflow template
 */
router.get('/templates/:templateId', (req: Request, res: Response) => {
  try {
    const templateId = req.params['templateId'];
    if (!templateId) {
      res.status(400).json({
        error: 'templateId is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const template = workflowManager.getTemplate(templateId);

    if (!template) {
      res.status(404).json({
        error: `Template not found`,
        templateId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      ...template,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get template', { error });
    res.status(500).json({
      error: 'Failed to get template',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /workflows/templates/:templateId/create
 * Create workflow from template
 */
router.post('/templates/:templateId/create', async (req: Request, res: Response) => {
  try {
    const templateId = req.params['templateId'];
    const { parameters, workflowId } = req.body;

    if (!templateId) {
      res.status(400).json({
        error: 'templateId is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const version = await workflowManager.createFromTemplate(
      templateId,
      parameters || {},
      workflowId
    );

    res.status(201).json({
      message: 'Workflow created from template',
      workflowId: version.workflowId,
      version: version.version,
      templateId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create from template', { error });
    res.status(500).json({
      error: 'Failed to create from template',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /workflows/statistics
 * Get workflow statistics
 */
router.get('/statistics', (_req: Request, res: Response) => {
  try {
    const stats = workflowManager.getStatistics();

    res.json({
      statistics: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get workflow statistics', { error });
    res.status(500).json({
      error: 'Failed to get workflow statistics',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as workflowManagementRouter };
