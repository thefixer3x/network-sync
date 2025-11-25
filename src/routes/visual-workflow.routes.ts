/**
 * Visual Workflow API Routes
 *
 * REST endpoints for visual workflow builder
 */

import { Router, Request, Response } from 'express';
import { Logger } from '@/utils/Logger';
import { visualWorkflowExecutor } from '@/services/visual-workflow-executor';
import {
  VisualWorkflow,
  CreateVisualWorkflowRequest,
  UpdateVisualWorkflowRequest,
  ExecuteWorkflowRequest,
  WorkflowTemplate,
} from '@/types/visual-workflow';

const logger = new Logger('VisualWorkflowRoutes');
const router = Router();

// In-memory storage (replace with database in production)
const workflows: Map<string, VisualWorkflow> = new Map();
const templates: Map<string, WorkflowTemplate> = new Map();

// Simple auth middleware (replace with real auth)
interface AuthRequest extends Request {
  user?: { id: string; name: string };
}

const authenticate = (req: AuthRequest, res: Response, next: Function) => {
  // In production, implement real authentication
  req.user = { id: 'user_123', name: 'Test User' };
  next();
};

// =============================================================================
// WORKFLOW CRUD
// =============================================================================

/**
 * @route   GET /visual-workflows
 * @desc    Get all visual workflows
 * @access  Private
 */
router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const allWorkflows = Array.from(workflows.values());

    res.json({
      workflows: allWorkflows,
      total: allWorkflows.length,
    });
  } catch (error) {
    logger.error('Failed to get workflows', error);
    res.status(500).json({ error: 'Failed to get workflows' });
  }
});

/**
 * @route   GET /visual-workflows/:id
 * @desc    Get a specific visual workflow
 * @access  Private
 */
router.get('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Workflow ID required' });
      return;
    }

    const workflow = workflows.get(id);

    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    res.json({ workflow });
  } catch (error) {
    logger.error('Failed to get workflow', error);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

/**
 * @route   POST /visual-workflows
 * @desc    Create a new visual workflow
 * @access  Private
 */
router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const data: CreateVisualWorkflowRequest = req.body;

    // Validate required fields
    if (!data.name || !data.nodes || !data.edges) {
      res.status(400).json({ error: 'Missing required fields: name, nodes, edges' });
      return;
    }

    const now = Date.now();
    const workflow: VisualWorkflow = {
      id: generateId(),
      name: data.name,
      version: 1,
      nodes: data.nodes,
      edges: data.edges,
      variables: data.variables || [],
      settings: {
        timeout: 300000, // 5 minutes
        maxConcurrency: 5,
        errorHandling: 'stop',
        logging: {
          enabled: true,
          level: 'info',
          retentionDays: 7,
        },
        notifications: {
          onSuccess: false,
          onFailure: true,
          onWarning: false,
        },
        ...data.settings,
      },
      metadata: {
        author: req.user?.id || 'unknown',
        tags: [],
        isTemplate: false,
        isPublic: false,
        usage: {
          totalExecutions: 0,
          successRate: 0,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    // Conditionally add optional properties
    if (data.description) {
      workflow.description = data.description;
    }

    // Validate workflow structure
    const validation = visualWorkflowExecutor.validateWorkflow(workflow);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Workflow validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return;
    }

    workflows.set(workflow.id, workflow);

    logger.info(`Visual workflow created: ${workflow.id} by user ${req.user?.id}`);

    res.status(201).json({
      message: 'Visual workflow created successfully',
      workflow,
      validation,
    });
  } catch (error) {
    logger.error('Failed to create workflow', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * @route   PATCH /visual-workflows/:id
 * @desc    Update a visual workflow
 * @access  Private
 */
router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Workflow ID required' });
      return;
    }

    const workflow = workflows.get(id);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    const updates: UpdateVisualWorkflowRequest = req.body;

    const updatedWorkflow: VisualWorkflow = {
      ...workflow,
      name: updates.name || workflow.name,
      nodes: updates.nodes || workflow.nodes,
      edges: updates.edges || workflow.edges,
      variables: updates.variables || workflow.variables,
      settings: updates.settings ? { ...workflow.settings, ...updates.settings } : workflow.settings,
      version: workflow.version + 1,
      updatedAt: Date.now(),
    };

    // Conditionally add optional properties
    if (updates.description !== undefined) {
      if (updates.description) {
        updatedWorkflow.description = updates.description;
      } else {
        delete updatedWorkflow.description;
      }
    }

    // Validate updated workflow
    const validation = visualWorkflowExecutor.validateWorkflow(updatedWorkflow);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Workflow validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return;
    }

    workflows.set(id, updatedWorkflow);

    logger.info(`Visual workflow updated: ${id} by user ${req.user?.id}`);

    res.json({
      message: 'Visual workflow updated successfully',
      workflow: updatedWorkflow,
      validation,
    });
  } catch (error) {
    logger.error('Failed to update workflow', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * @route   DELETE /visual-workflows/:id
 * @desc    Delete a visual workflow
 * @access  Private
 */
router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Workflow ID required' });
      return;
    }

    const workflow = workflows.get(id);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    workflows.delete(id);

    logger.info(`Visual workflow deleted: ${id} by user ${req.user?.id}`);

    res.json({ message: 'Visual workflow deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete workflow', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// =============================================================================
// WORKFLOW EXECUTION
// =============================================================================

/**
 * @route   POST /visual-workflows/:id/execute
 * @desc    Execute a visual workflow
 * @access  Private
 */
router.post('/:id/execute', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Workflow ID required' });
      return;
    }

    const workflow = workflows.get(id);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    const { input, dryRun } = req.body as ExecuteWorkflowRequest;

    logger.info(`Executing visual workflow: ${id} by user ${req.user?.id}`);

    // Execute workflow asynchronously
    const execution = await visualWorkflowExecutor.executeWorkflow(
      workflow,
      input || {},
      req.user?.id || 'unknown'
    );

    // Update workflow usage stats
    workflow.metadata.usage.totalExecutions += 1;
    if (execution.status === 'completed') {
      const successRate = workflow.metadata.usage.successRate || 0;
      const totalExecutions = workflow.metadata.usage.totalExecutions;
      workflow.metadata.usage.successRate =
        ((successRate * (totalExecutions - 1)) + 100) / totalExecutions;
    }
    workflow.metadata.usage.lastExecutionTime = execution.startTime;
    if (execution.duration) {
      const avgTime = workflow.metadata.usage.averageExecutionTime || 0;
      const totalExecutions = workflow.metadata.usage.totalExecutions;
      workflow.metadata.usage.averageExecutionTime =
        ((avgTime * (totalExecutions - 1)) + execution.duration) / totalExecutions;
    }

    res.json({
      message: 'Workflow execution completed',
      execution: {
        id: execution.id,
        status: execution.status,
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.duration,
        nodeExecutions: execution.nodeExecutions.map(ne => ({
          nodeId: ne.nodeId,
          status: ne.status,
          duration: ne.duration,
          error: ne.error,
        })),
      },
      logs: visualWorkflowExecutor.getExecutionLogs(execution.id),
    });
  } catch (error) {
    logger.error('Failed to execute workflow', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

/**
 * @route   GET /visual-workflows/:id/executions/:executionId
 * @desc    Get execution status and logs
 * @access  Private
 */
router.get('/:id/executions/:executionId', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const executionId = req.params['executionId'];
    if (!executionId) {
      res.status(400).json({ error: 'Execution ID required' });
      return;
    }

    const execution = visualWorkflowExecutor.getExecution(executionId);
    if (!execution) {
      res.status(404).json({ error: 'Execution not found' });
      return;
    }

    const logs = visualWorkflowExecutor.getExecutionLogs(executionId);

    res.json({ execution, logs });
  } catch (error) {
    logger.error('Failed to get execution', error);
    res.status(500).json({ error: 'Failed to get execution' });
  }
});

// =============================================================================
// WORKFLOW VALIDATION
// =============================================================================

/**
 * @route   POST /visual-workflows/validate
 * @desc    Validate a workflow without saving
 * @access  Private
 */
router.post('/validate', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const workflow: VisualWorkflow = req.body;

    if (!workflow.nodes || !workflow.edges) {
      res.status(400).json({ error: 'Missing required fields: nodes, edges' });
      return;
    }

    const validation = visualWorkflowExecutor.validateWorkflow(workflow);

    res.json({ validation });
  } catch (error) {
    logger.error('Failed to validate workflow', error);
    res.status(500).json({ error: 'Failed to validate workflow' });
  }
});

// =============================================================================
// WORKFLOW TEMPLATES
// =============================================================================

/**
 * @route   GET /visual-workflows/templates
 * @desc    Get all workflow templates
 * @access  Public
 */
router.get('/templates/all', (req: Request, res: Response): void => {
  try {
    const allTemplates = Array.from(templates.values());

    res.json({
      templates: allTemplates,
      total: allTemplates.length,
    });
  } catch (error) {
    logger.error('Failed to get templates', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * @route   POST /visual-workflows/:id/template
 * @desc    Save workflow as template
 * @access  Private
 */
router.post('/:id/template', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Workflow ID required' });
      return;
    }

    const workflow = workflows.get(id);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    const { category, difficulty, thumbnail } = req.body;

    const template: WorkflowTemplate = {
      id: generateId(),
      name: workflow.name,
      description: workflow.description || '',
      category: category || 'General',
      tags: workflow.metadata.tags,
      difficulty: difficulty || 'intermediate',
      workflow: {
        name: workflow.name,
        version: workflow.version,
        nodes: workflow.nodes,
        edges: workflow.edges,
        variables: workflow.variables,
        settings: workflow.settings,
        metadata: workflow.metadata,
      },
      author: req.user?.name || 'Unknown',
      downloads: 0,
      createdAt: Date.now(),
    };

    // Conditionally add optional properties to nested workflow
    if (workflow.description) {
      template.workflow.description = workflow.description;
    }
    if (thumbnail) {
      template.thumbnail = thumbnail;
    }

    templates.set(template.id, template);

    logger.info(`Template created from workflow: ${id}`);

    res.status(201).json({
      message: 'Template created successfully',
      template,
    });
  } catch (error) {
    logger.error('Failed to create template', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const visualWorkflowRouter = router;
