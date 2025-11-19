/**
 * Content Management Service
 *
 * Comprehensive content management with:
 * - Content versioning and history
 * - Content templates and variations
 * - Multi-stage approval workflows
 * - Content analytics and performance tracking
 * - Media management
 * - A/B testing support
 */

import { Logger } from '../utils/Logger.js';
import { metricsService } from './metrics.js';
import { getCache } from '../cache/redis-cache.js';
import crypto from 'crypto';

const logger = new Logger('ContentManagement');

/**
 * Content status
 */
export enum ContentStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

/**
 * Approval status
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes_requested',
}

/**
 * Media type
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif',
  DOCUMENT = 'document',
}

/**
 * Content version
 */
export interface ContentVersion {
  version: number;
  contentId: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: number;
  createdBy?: string;
  changelog?: string;
  isActive: boolean;
}

/**
 * Content template
 */
export interface ContentTemplate {
  id: string;
  name: string;
  description?: string;
  template: string; // Template with {{placeholders}}
  platform?: string;
  category?: string;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
    defaultValue?: any;
    description?: string;
  }>;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Content variation (for A/B testing)
 */
export interface ContentVariation {
  id: string;
  contentId: string;
  name: string;
  content: string;
  weight: number; // 0-100 percentage
  performance?: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number; // Click-through rate
    conversionRate: number;
  };
  isActive: boolean;
  createdAt: number;
}

/**
 * Approval request
 */
export interface ApprovalRequest {
  id: string;
  contentId: string;
  requestedBy: string;
  status: ApprovalStatus;
  approvers: Array<{
    userId: string;
    status: ApprovalStatus;
    comment?: string;
    timestamp?: number;
  }>;
  requiredApprovals: number;
  currentApprovals: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Media attachment
 */
export interface MediaAttachment {
  id: string;
  type: MediaType;
  url: string;
  filename: string;
  mimeType: string;
  size: number; // bytes
  width?: number;
  height?: number;
  duration?: number; // seconds for video
  altText?: string;
  metadata?: Record<string, any>;
  uploadedAt: number;
  uploadedBy?: string;
}

/**
 * Content with full details
 */
export interface ManagedContent {
  id: string;
  workflowId?: string;
  platform: string;
  content: string;
  status: ContentStatus;
  scheduledFor?: number;
  publishedAt?: number;
  versions: ContentVersion[];
  currentVersion: number;
  variations: ContentVariation[];
  approvalRequest?: ApprovalRequest;
  media: MediaAttachment[];
  analytics?: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    clicks: number;
    engagement: number; // Engagement rate %
  };
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

/**
 * Content statistics
 */
export interface ContentStatistics {
  totalContent: number;
  byStatus: Record<ContentStatus, number>;
  byPlatform: Record<string, number>;
  totalVersions: number;
  totalTemplates: number;
  totalVariations: number;
  pendingApprovals: number;
  scheduledCount: number;
  publishedCount: number;
  avgEngagement: number;
}

/**
 * Content Management Service
 */
export class ContentManagementService {
  private static instance: ContentManagementService;

  private contents = new Map<string, ManagedContent>();
  private templates = new Map<string, ContentTemplate>();

  private constructor() {
    logger.info('Content Management Service initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ContentManagementService {
    if (!ContentManagementService.instance) {
      ContentManagementService.instance = new ContentManagementService();
    }
    return ContentManagementService.instance;
  }

  /**
   * Create content
   */
  public async createContent(data: {
    workflowId?: string;
    platform: string;
    content: string;
    status?: ContentStatus;
    scheduledFor?: number;
    createdBy?: string;
    metadata?: Record<string, any>;
  }): Promise<ManagedContent> {
    const id = this.generateId();
    const now = Date.now();

    const content: ManagedContent = {
      id,
      platform: data.platform,
      content: data.content,
      status: data.status || ContentStatus.DRAFT,
      versions: [],
      currentVersion: 0,
      variations: [],
      media: [],
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    if (data.workflowId) content.workflowId = data.workflowId;
    if (data.scheduledFor) content.scheduledFor = data.scheduledFor;
    if (data.createdBy) content.createdBy = data.createdBy;

    // Create initial version
    this.createVersion(content, 'Initial version', data.createdBy);

    this.contents.set(id, content);

    metricsService.incrementCounter('content_created', {
      platform: data.platform,
      status: content.status,
    });

    logger.info(`Created content: ${id}`, { platform: data.platform });

    return content;
  }

  /**
   * Update content
   */
  public async updateContent(
    id: string,
    updates: Partial<ManagedContent>,
    changelog?: string,
    updatedBy?: string
  ): Promise<ManagedContent> {
    const content = this.contents.get(id);
    if (!content) {
      throw new Error(`Content ${id} not found`);
    }

    const previousContent = content.content;

    // Update fields
    Object.assign(content, updates);
    content.updatedAt = Date.now();

    // Create new version if content changed
    if (updates.content && updates.content !== previousContent) {
      this.createVersion(content, changelog || 'Content updated', updatedBy);
    }

    metricsService.incrementCounter('content_updated', {
      platform: content.platform,
      status: content.status,
    });

    logger.info(`Updated content: ${id}`);

    return content;
  }

  /**
   * Create content version
   */
  private createVersion(
    content: ManagedContent,
    changelog?: string,
    createdBy?: string
  ): ContentVersion {
    const version: ContentVersion = {
      version: content.currentVersion + 1,
      contentId: content.id,
      content: content.content,
      metadata: { ...content.metadata },
      createdAt: Date.now(),
      isActive: true,
    };

    if (changelog) {
      version.changelog = changelog;
    }
    if (createdBy) {
      version.createdBy = createdBy;
    }

    // Deactivate previous versions
    content.versions.forEach((v) => (v.isActive = false));

    content.versions.push(version);
    content.currentVersion = version.version;

    metricsService.incrementCounter('content_versions_created', {
      content: content.id,
    });

    return version;
  }

  /**
   * Get content version history
   */
  public getVersionHistory(contentId: string): ContentVersion[] {
    const content = this.contents.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    return content.versions;
  }

  /**
   * Rollback to version
   */
  public async rollbackToVersion(
    contentId: string,
    version: number,
    reason?: string
  ): Promise<ManagedContent> {
    const content = this.contents.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const targetVersion = content.versions.find((v) => v.version === version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found`);
    }

    // Restore content from version
    content.content = targetVersion.content;
    content.metadata = { ...targetVersion.metadata };
    content.updatedAt = Date.now();

    // Create new version for rollback
    this.createVersion(
      content,
      `Rolled back to version ${version}${reason ? `: ${reason}` : ''}`,
      undefined
    );

    metricsService.incrementCounter('content_rollbacks', {
      content: contentId,
      version: String(version),
    });

    logger.warn(`Rolled back content ${contentId} to version ${version}`, { reason });

    return content;
  }

  /**
   * Create content template
   */
  public createTemplate(data: {
    name: string;
    description?: string;
    template: string;
    platform?: string;
    category?: string;
    variables: ContentTemplate['variables'];
    metadata?: Record<string, any>;
  }): ContentTemplate {
    const id = this.generateId();
    const now = Date.now();

    const template: ContentTemplate = {
      id,
      name: data.name,
      template: data.template,
      variables: data.variables,
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    if (data.description) template.description = data.description;
    if (data.platform) template.platform = data.platform;
    if (data.category) template.category = data.category;

    this.templates.set(id, template);

    metricsService.incrementCounter('content_templates_created', {
      platform: data.platform || 'all',
      category: data.category || 'general',
    });

    logger.info(`Created template: ${id}`, { name: data.name });

    return template;
  }

  /**
   * Create content from template
   */
  public async createFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    options: {
      platform?: string;
      workflowId?: string;
      createdBy?: string;
    } = {}
  ): Promise<ManagedContent> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate variables
    this.validateTemplateVariables(template, variables);

    // Apply variables to template
    let content = template.template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, String(value));
    }

    // Create content
    const createData: {
      platform: string;
      content: string;
      workflowId?: string;
      createdBy?: string;
      metadata: Record<string, any>;
    } = {
      platform: options.platform || template.platform || 'generic',
      content,
      metadata: {
        templateId,
        templateName: template.name,
        variables,
      },
    };

    if (options.workflowId) createData.workflowId = options.workflowId;
    if (options.createdBy) createData.createdBy = options.createdBy;

    const managedContent = await this.createContent(createData);

    metricsService.incrementCounter('content_from_template', {
      template: templateId,
    });

    return managedContent;
  }

  /**
   * Validate template variables
   */
  private validateTemplateVariables(
    template: ContentTemplate,
    variables: Record<string, any>
  ): void {
    for (const varDef of template.variables) {
      if (varDef.required && variables[varDef.name] === undefined) {
        throw new Error(`Required variable '${varDef.name}' is missing`);
      }

      const value = variables[varDef.name];
      if (value !== undefined) {
        // Type validation
        const actualType = typeof value;
        if (varDef.type === 'date') {
          if (!(value instanceof Date) && typeof value !== 'number') {
            throw new Error(
              `Variable '${varDef.name}' must be a Date or timestamp`
            );
          }
        } else if (actualType !== varDef.type) {
          throw new Error(
            `Variable '${varDef.name}' must be of type ${varDef.type}`
          );
        }
      }
    }
  }

  /**
   * Create content variation (A/B testing)
   */
  public createVariation(
    contentId: string,
    data: {
      name: string;
      content: string;
      weight: number;
    }
  ): ContentVariation {
    const content = this.contents.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const variation: ContentVariation = {
      id: this.generateId(),
      contentId,
      name: data.name,
      content: data.content,
      weight: data.weight,
      performance: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        conversionRate: 0,
      },
      isActive: true,
      createdAt: Date.now(),
    };

    content.variations.push(variation);

    metricsService.incrementCounter('content_variations_created', {
      content: contentId,
    });

    logger.info(`Created variation for content ${contentId}`, {
      variation: variation.id,
    });

    return variation;
  }

  /**
   * Update variation performance
   */
  public updateVariationPerformance(
    contentId: string,
    variationId: string,
    metrics: Partial<ContentVariation['performance']>
  ): void {
    const content = this.contents.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const variation = content.variations.find((v) => v.id === variationId);
    if (!variation || !variation.performance) {
      throw new Error(`Variation ${variationId} not found`);
    }

    Object.assign(variation.performance, metrics);

    // Calculate derived metrics
    if (variation.performance.impressions > 0) {
      variation.performance.ctr =
        (variation.performance.clicks / variation.performance.impressions) * 100;
    }

    if (variation.performance.clicks > 0) {
      variation.performance.conversionRate =
        (variation.performance.conversions / variation.performance.clicks) * 100;
    }

    metricsService.recordHistogram('content_variation_ctr', variation.performance.ctr, {
      content: contentId,
      variation: variationId,
    });
  }

  /**
   * Get best performing variation
   */
  public getBestVariation(contentId: string): ContentVariation | null {
    const content = this.contents.get(contentId);
    if (!content || content.variations.length === 0) {
      return null;
    }

    return content.variations.reduce((best, current) => {
      const bestScore =
        (best.performance?.ctr || 0) * 0.5 +
        (best.performance?.conversionRate || 0) * 0.5;
      const currentScore =
        (current.performance?.ctr || 0) * 0.5 +
        (current.performance?.conversionRate || 0) * 0.5;

      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Create approval request
   */
  public async createApprovalRequest(
    contentId: string,
    data: {
      requestedBy: string;
      approvers: string[];
      requiredApprovals: number;
      notes?: string;
    }
  ): Promise<ApprovalRequest> {
    const content = this.contents.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const request: ApprovalRequest = {
      id: this.generateId(),
      contentId,
      requestedBy: data.requestedBy,
      status: ApprovalStatus.PENDING,
      approvers: data.approvers.map((userId) => ({
        userId,
        status: ApprovalStatus.PENDING,
      })),
      requiredApprovals: data.requiredApprovals,
      currentApprovals: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (data.notes) request.notes = data.notes;

    content.approvalRequest = request;
    content.status = ContentStatus.IN_REVIEW;

    metricsService.incrementCounter('approval_requests_created', {
      content: contentId,
    });

    logger.info(`Created approval request for content ${contentId}`, {
      requestId: request.id,
    });

    return request;
  }

  /**
   * Process approval
   */
  public async processApproval(
    contentId: string,
    userId: string,
    decision: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED | ApprovalStatus.CHANGES_REQUESTED,
    comment?: string
  ): Promise<ApprovalRequest> {
    const content = this.contents.get(contentId);
    if (!content || !content.approvalRequest) {
      throw new Error(`Approval request not found for content ${contentId}`);
    }

    const request = content.approvalRequest;
    const approver = request.approvers.find((a) => a.userId === userId);

    if (!approver) {
      throw new Error(`User ${userId} is not an approver`);
    }

    if (approver.status !== ApprovalStatus.PENDING) {
      throw new Error(`User ${userId} has already processed this request`);
    }

    // Update approver status
    approver.status = decision;
    if (comment) approver.comment = comment;
    approver.timestamp = Date.now();
    request.updatedAt = Date.now();

    // Count approvals
    if (decision === ApprovalStatus.APPROVED) {
      request.currentApprovals++;
    }

    // Determine overall status
    const rejections = request.approvers.filter(
      (a) => a.status === ApprovalStatus.REJECTED
    ).length;
    const changesRequested = request.approvers.filter(
      (a) => a.status === ApprovalStatus.CHANGES_REQUESTED
    ).length;

    if (rejections > 0) {
      request.status = ApprovalStatus.REJECTED;
      content.status = ContentStatus.DRAFT;
    } else if (changesRequested > 0) {
      request.status = ApprovalStatus.CHANGES_REQUESTED;
      content.status = ContentStatus.DRAFT;
    } else if (request.currentApprovals >= request.requiredApprovals) {
      request.status = ApprovalStatus.APPROVED;
      content.status = ContentStatus.APPROVED;
    }

    metricsService.incrementCounter('approvals_processed', {
      content: contentId,
      decision,
    });

    logger.info(`Processed approval for content ${contentId}`, {
      userId,
      decision,
      status: request.status,
    });

    return request;
  }

  /**
   * Add media attachment
   */
  public addMedia(
    contentId: string,
    media: Omit<MediaAttachment, 'id' | 'uploadedAt'>
  ): MediaAttachment {
    const content = this.contents.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const attachment: MediaAttachment = {
      ...media,
      id: this.generateId(),
      uploadedAt: Date.now(),
    };

    content.media.push(attachment);

    metricsService.incrementCounter('media_attachments_added', {
      content: contentId,
      type: media.type,
    });

    logger.info(`Added media to content ${contentId}`, { media: attachment.id });

    return attachment;
  }

  /**
   * Update content analytics
   */
  public updateAnalytics(
    contentId: string,
    analytics: Partial<ManagedContent['analytics']>
  ): void {
    const content = this.contents.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    if (!content.analytics) {
      content.analytics = {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0,
        clicks: 0,
        engagement: 0,
      };
    }

    Object.assign(content.analytics, analytics);

    // Calculate engagement rate
    if (content.analytics.views > 0) {
      const totalEngagements =
        content.analytics.likes +
        content.analytics.shares +
        content.analytics.comments;
      content.analytics.engagement =
        (totalEngagements / content.analytics.views) * 100;
    }

    metricsService.recordHistogram('content_engagement', content.analytics.engagement, {
      content: contentId,
      platform: content.platform,
    });
  }

  /**
   * Get content
   */
  public getContent(id: string): ManagedContent | null {
    return this.contents.get(id) || null;
  }

  /**
   * List content
   */
  public listContent(filters?: {
    status?: ContentStatus;
    platform?: string;
    workflowId?: string;
  }): ManagedContent[] {
    let contents = Array.from(this.contents.values());

    if (filters) {
      if (filters.status) {
        contents = contents.filter((c) => c.status === filters.status);
      }
      if (filters.platform) {
        contents = contents.filter((c) => c.platform === filters.platform);
      }
      if (filters.workflowId) {
        contents = contents.filter((c) => c.workflowId === filters.workflowId);
      }
    }

    return contents;
  }

  /**
   * Get template
   */
  public getTemplate(id: string): ContentTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * List templates
   */
  public listTemplates(filters?: {
    platform?: string;
    category?: string;
  }): ContentTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filters) {
      if (filters.platform) {
        templates = templates.filter((t) => t.platform === filters.platform);
      }
      if (filters.category) {
        templates = templates.filter((t) => t.category === filters.category);
      }
    }

    return templates;
  }

  /**
   * Get statistics
   */
  public getStatistics(): ContentStatistics {
    const contents = Array.from(this.contents.values());

    const byStatus: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};

    for (const content of contents) {
      byStatus[content.status] = (byStatus[content.status] || 0) + 1;
      byPlatform[content.platform] = (byPlatform[content.platform] || 0) + 1;
    }

    const totalVersions = contents.reduce((sum, c) => sum + c.versions.length, 0);
    const totalVariations = contents.reduce((sum, c) => sum + c.variations.length, 0);
    const pendingApprovals = contents.filter(
      (c) => c.approvalRequest?.status === ApprovalStatus.PENDING
    ).length;
    const scheduledCount = contents.filter((c) => c.status === ContentStatus.SCHEDULED).length;
    const publishedCount = contents.filter((c) => c.status === ContentStatus.PUBLISHED).length;

    const engagements = contents
      .filter((c) => c.analytics)
      .map((c) => c.analytics!.engagement);
    const avgEngagement =
      engagements.length > 0
        ? engagements.reduce((sum, e) => sum + e, 0) / engagements.length
        : 0;

    return {
      totalContent: contents.length,
      byStatus: byStatus as Record<ContentStatus, number>,
      byPlatform,
      totalVersions,
      totalTemplates: this.templates.size,
      totalVariations,
      pendingApprovals,
      scheduledCount,
      publishedCount,
      avgEngagement,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Shutdown service
   */
  public shutdown(): void {
    logger.info('Shutting down Content Management Service');
    this.contents.clear();
    this.templates.clear();
    logger.info('Content Management Service shut down successfully');
  }
}

/**
 * Get content management service instance
 */
export function getContentManagementService(): ContentManagementService {
  return ContentManagementService.getInstance();
}

/**
 * Export singleton instance
 */
export const contentManagementService = ContentManagementService.getInstance();
