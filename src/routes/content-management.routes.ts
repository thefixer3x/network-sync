/**
 * Content Management Routes
 *
 * Endpoints for managing content with versioning, templates,
 * approval workflows, variations, and analytics
 */

import { Router, Request, Response } from 'express';
import {
  contentManagementService,
  ContentStatus,
  ApprovalStatus,
  MediaType,
} from '../services/content-management.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('ContentManagementRoutes');
const router = Router();

/**
 * POST /content-management/content
 * Create new content
 */
router.post('/content', async (req: Request, res: Response) => {
  try {
    const { workflowId, platform, content, status, scheduledFor, createdBy, metadata } = req.body;

    if (!platform || !content) {
      res.status(400).json({
        error: 'platform and content are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const managedContent = await contentManagementService.createContent({
      workflowId,
      platform,
      content,
      status,
      scheduledFor,
      createdBy,
      metadata,
    });

    res.status(201).json({
      message: 'Content created successfully',
      content: managedContent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create content', { error });
    res.status(500).json({
      error: 'Failed to create content',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /content-management/content
 * List content with optional filters
 */
router.get('/content', (req: Request, res: Response) => {
  try {
    const status = req.query['status'] as ContentStatus | undefined;
    const platform = req.query['platform'] as string | undefined;
    const workflowId = req.query['workflowId'] as string | undefined;

    const filters: {
      status?: ContentStatus;
      platform?: string;
      workflowId?: string;
    } = {};
    if (status) filters.status = status;
    if (platform) filters.platform = platform;
    if (workflowId) filters.workflowId = workflowId;

    const contents = contentManagementService.listContent(filters);

    res.json({
      contents,
      count: contents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to list content', { error });
    res.status(500).json({
      error: 'Failed to list content',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /content-management/content/:contentId
 * Get specific content
 */
router.get('/content/:contentId', (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    if (!contentId) {
      res.status(400).json({
        error: 'Content ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const content = contentManagementService.getContent(contentId);

    if (!content) {
      res.status(404).json({
        error: `Content not found`,
        contentId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      ...content,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get content', { error });
    res.status(500).json({
      error: 'Failed to get content',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /content-management/content/:contentId
 * Update content
 */
router.put('/content/:contentId', async (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    const { content, status, scheduledFor, metadata, changelog, updatedBy } = req.body;

    if (!contentId) {
      res.status(400).json({
        error: 'Content ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const updated = await contentManagementService.updateContent(
      contentId,
      { content, status, scheduledFor, metadata },
      changelog,
      updatedBy
    );

    res.json({
      message: 'Content updated successfully',
      content: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update content', { error });
    res.status(500).json({
      error: 'Failed to update content',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /content-management/content/:contentId/versions
 * Get content version history
 */
router.get('/content/:contentId/versions', (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    if (!contentId) {
      res.status(400).json({
        error: 'Content ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const versions = contentManagementService.getVersionHistory(contentId);

    res.json({
      contentId,
      versions,
      count: versions.length,
      currentVersion: versions.find((v) => v.isActive)?.version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get version history', { error });
    res.status(500).json({
      error: 'Failed to get version history',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /content-management/content/:contentId/rollback
 * Rollback content to previous version
 */
router.post('/content/:contentId/rollback', async (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    const { version, reason } = req.body;

    if (!contentId || version === undefined) {
      res.status(400).json({
        error: 'contentId and version are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const content = await contentManagementService.rollbackToVersion(contentId, version, reason);

    res.json({
      message: 'Content rolled back successfully',
      content,
      version,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to rollback content', { error });
    res.status(500).json({
      error: 'Failed to rollback content',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /content-management/templates
 * Create content template
 */
router.post('/templates', (req: Request, res: Response) => {
  try {
    const { name, description, template, platform, category, variables, metadata } = req.body;

    if (!name || !template || !variables) {
      res.status(400).json({
        error: 'name, template, and variables are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const contentTemplate = contentManagementService.createTemplate({
      name,
      description,
      template,
      platform,
      category,
      variables,
      metadata,
    });

    res.status(201).json({
      message: 'Template created successfully',
      template: contentTemplate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create template', { error });
    res.status(500).json({
      error: 'Failed to create template',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /content-management/templates
 * List content templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const platform = req.query['platform'] as string | undefined;
    const category = req.query['category'] as string | undefined;

    const filters: {
      platform?: string;
      category?: string;
    } = {};
    if (platform) filters.platform = platform;
    if (category) filters.category = category;

    const templates = contentManagementService.listTemplates(filters);

    res.json({
      templates,
      count: templates.length,
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
 * GET /content-management/templates/:templateId
 * Get specific template
 */
router.get('/templates/:templateId', (req: Request, res: Response) => {
  try {
    const templateId = req.params['templateId'];
    if (!templateId) {
      res.status(400).json({
        error: 'Template ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const template = contentManagementService.getTemplate(templateId);

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
 * POST /content-management/templates/:templateId/create
 * Create content from template
 */
router.post('/templates/:templateId/create', async (req: Request, res: Response) => {
  try {
    const templateId = req.params['templateId'];
    const { variables, platform, workflowId, createdBy } = req.body;

    if (!templateId || !variables) {
      res.status(400).json({
        error: 'templateId and variables are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const content = await contentManagementService.createFromTemplate(templateId, variables, {
      platform,
      workflowId,
      createdBy,
    });

    res.status(201).json({
      message: 'Content created from template',
      content,
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
 * POST /content-management/content/:contentId/variations
 * Create content variation (A/B testing)
 */
router.post('/content/:contentId/variations', (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    const { name, content, weight } = req.body;

    if (!contentId || !name || !content) {
      res.status(400).json({
        error: 'contentId, name, and content are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const variation = contentManagementService.createVariation(contentId, {
      name,
      content,
      weight: weight || 50,
    });

    res.status(201).json({
      message: 'Content variation created',
      variation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create variation', { error });
    res.status(500).json({
      error: 'Failed to create variation',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /content-management/content/:contentId/variations/:variationId/performance
 * Update variation performance metrics
 */
router.put('/content/:contentId/variations/:variationId/performance', (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    const variationId = req.params['variationId'];
    const metrics = req.body;

    if (!contentId || !variationId) {
      res.status(400).json({
        error: 'contentId and variationId are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    contentManagementService.updateVariationPerformance(contentId, variationId, metrics);

    res.json({
      message: 'Variation performance updated',
      contentId,
      variationId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update variation performance', { error });
    res.status(500).json({
      error: 'Failed to update variation performance',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /content-management/content/:contentId/best-variation
 * Get best performing variation
 */
router.get('/content/:contentId/best-variation', (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    if (!contentId) {
      res.status(400).json({
        error: 'Content ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const bestVariation = contentManagementService.getBestVariation(contentId);

    if (!bestVariation) {
      res.status(404).json({
        error: `No variations found for content`,
        contentId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      contentId,
      bestVariation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get best variation', { error });
    res.status(500).json({
      error: 'Failed to get best variation',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /content-management/content/:contentId/approval
 * Create approval request
 */
router.post('/content/:contentId/approval', async (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    const { requestedBy, approvers, requiredApprovals, notes } = req.body;

    if (!contentId || !requestedBy || !approvers || !requiredApprovals) {
      res.status(400).json({
        error: 'contentId, requestedBy, approvers, and requiredApprovals are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const request = await contentManagementService.createApprovalRequest(contentId, {
      requestedBy,
      approvers,
      requiredApprovals,
      notes,
    });

    res.status(201).json({
      message: 'Approval request created',
      request,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create approval request', { error });
    res.status(500).json({
      error: 'Failed to create approval request',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /content-management/content/:contentId/approval/process
 * Process approval (approve/reject/request changes)
 */
router.post('/content/:contentId/approval/process', async (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    const { userId, decision, comment } = req.body;

    if (!contentId || !userId || !decision) {
      res.status(400).json({
        error: 'contentId, userId, and decision are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (
      decision !== ApprovalStatus.APPROVED &&
      decision !== ApprovalStatus.REJECTED &&
      decision !== ApprovalStatus.CHANGES_REQUESTED
    ) {
      res.status(400).json({
        error: 'decision must be approved, rejected, or changes_requested',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const request = await contentManagementService.processApproval(
      contentId,
      userId,
      decision,
      comment
    );

    res.json({
      message: 'Approval processed',
      request,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to process approval', { error });
    res.status(500).json({
      error: 'Failed to process approval',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /content-management/content/:contentId/media
 * Add media attachment
 */
router.post('/content/:contentId/media', (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    const media = req.body;

    if (!contentId || !media.type || !media.url || !media.filename) {
      res.status(400).json({
        error: 'contentId, type, url, and filename are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const attachment = contentManagementService.addMedia(contentId, media);

    res.status(201).json({
      message: 'Media attachment added',
      media: attachment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to add media', { error });
    res.status(500).json({
      error: 'Failed to add media',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /content-management/content/:contentId/analytics
 * Update content analytics
 */
router.put('/content/:contentId/analytics', (req: Request, res: Response) => {
  try {
    const contentId = req.params['contentId'];
    const analytics = req.body;

    if (!contentId) {
      res.status(400).json({
        error: 'Content ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    contentManagementService.updateAnalytics(contentId, analytics);

    res.json({
      message: 'Analytics updated',
      contentId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update analytics', { error });
    res.status(500).json({
      error: 'Failed to update analytics',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /content-management/statistics
 * Get content statistics
 */
router.get('/statistics', (req: Request, res: Response) => {
  try {
    const stats = contentManagementService.getStatistics();

    res.json({
      statistics: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get statistics', { error });
    res.status(500).json({
      error: 'Failed to get statistics',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as contentManagementRouter };
