/**
 * Workflow Templates
 *
 * Pre-built workflow templates for common automation scenarios
 */

import type { WorkflowTemplate, VisualWorkflow } from '../types/workflow';

// Helper to generate workflow ID
export const generateId = () => `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Template 1: Daily Content Scheduler
 * Automatically posts content at scheduled times with sentiment analysis
 */
export const dailyContentSchedulerTemplate: WorkflowTemplate = {
  id: 'template-daily-content-scheduler',
  name: 'Daily Content Scheduler',
  description: 'Automatically publish content at scheduled times with sentiment analysis and approval workflow',
  category: 'Social Media',
  tags: ['scheduling', 'content', 'automation', 'sentiment'],
  difficulty: 'beginner',
  author: 'Network Sync',
  downloads: 0,
  rating: 4.8,
  thumbnail: '/templates/daily-scheduler.png',
  createdAt: Date.now(),
  workflow: {
    name: 'Daily Content Scheduler',
    description: 'Post content daily at 9 AM with sentiment check',
    version: 1,
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: 'Daily at 9 AM',
          description: 'Triggers every day at 9:00 AM',
          config: {
            type: 'trigger',
            triggerType: 'schedule',
            schedule: '0 9 * * *',
            enabled: true,
          },
        },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 350, y: 200 },
        data: {
          label: 'Analyze Sentiment',
          description: 'Check content sentiment before posting',
          config: {
            type: 'action',
            actionType: 'analyze_sentiment',
            parameters: {
              content: '{{input.content}}',
            },
            timeout: 5000,
          },
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 600, y: 200 },
        data: {
          label: 'Check Sentiment Score',
          description: 'Only post if sentiment is positive',
          config: {
            type: 'condition',
            conditions: [
              {
                variable: 'sentiment.score',
                operator: 'greater_than',
                value: 0.6,
              },
            ],
            logicalOperator: 'AND',
          },
        },
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 850, y: 150 },
        data: {
          label: 'Post Content',
          description: 'Publish to social media',
          config: {
            type: 'action',
            actionType: 'post_content',
            parameters: {
              content: '{{input.content}}',
              platforms: ['twitter', 'linkedin'],
            },
            timeout: 10000,
          },
        },
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 850, y: 250 },
        data: {
          label: 'Send Alert',
          description: 'Notify about negative sentiment',
          config: {
            type: 'action',
            actionType: 'send_email',
            parameters: {
              to: 'admin@example.com',
              subject: 'Negative Sentiment Detected',
              body: 'Content had negative sentiment and was not posted.',
            },
          },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 1100, y: 200 },
        data: {
          label: 'Workflow Complete',
          config: { type: 'end' },
        },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'action-1',
        animated: true,
      },
      {
        id: 'edge-2',
        source: 'action-1',
        target: 'condition-1',
        animated: true,
      },
      {
        id: 'edge-3',
        source: 'condition-1',
        target: 'action-2',
        sourceHandle: 'true',
        label: 'Positive',
        animated: true,
      },
      {
        id: 'edge-4',
        source: 'condition-1',
        target: 'action-3',
        sourceHandle: 'false',
        label: 'Negative',
        animated: true,
      },
      {
        id: 'edge-5',
        source: 'action-2',
        target: 'end-1',
        animated: true,
      },
      {
        id: 'edge-6',
        source: 'action-3',
        target: 'end-1',
        animated: true,
      },
    ],
    variables: [
      {
        id: 'var-1',
        name: 'content',
        type: 'string',
        description: 'Content to post',
        scope: 'global',
      },
    ],
    settings: {
      timeout: 300000,
      maxConcurrency: 5,
      errorHandling: 'stop',
      logging: {
        enabled: true,
        level: 'info',
        retentionDays: 7,
      },
      notifications: {
        onSuccess: true,
        onFailure: true,
        onWarning: false,
      },
    },
    metadata: {
      author: 'system',
      tags: ['scheduling', 'sentiment', 'social-media'],
      isTemplate: true,
      isPublic: true,
      usage: {
        totalExecutions: 0,
        successRate: 100,
      },
    },
  },
};

/**
 * Template 2: Content Moderation Pipeline
 * Automatically moderate and approve/reject content
 */
export const contentModerationTemplate: WorkflowTemplate = {
  id: 'template-content-moderation',
  name: 'Content Moderation Pipeline',
  description: 'Automatically moderate content for inappropriate language, spam, and policy violations',
  category: 'Moderation',
  tags: ['moderation', 'content', 'safety', 'compliance'],
  difficulty: 'intermediate',
  author: 'Network Sync',
  downloads: 0,
  rating: 4.9,
  thumbnail: '/templates/moderation.png',
  createdAt: Date.now(),
  workflow: {
    name: 'Content Moderation Pipeline',
    description: 'Multi-stage content moderation with AI',
    version: 1,
    nodes: [
      {
        id: 'webhook-1',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: 'New Content Webhook',
          description: 'Triggered when new content is submitted',
          config: {
            type: 'trigger',
            triggerType: 'webhook',
            webhookUrl: '/webhooks/content-submitted',
            enabled: true,
          },
        },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 350, y: 200 },
        data: {
          label: 'Moderate Content',
          description: 'Check for inappropriate content',
          config: {
            type: 'action',
            actionType: 'moderate_content',
            parameters: {
              content: '{{input.content}}',
              strictMode: true,
            },
          },
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 600, y: 200 },
        data: {
          label: 'Check Moderation Result',
          description: 'Approve or reject based on score',
          config: {
            type: 'condition',
            conditions: [
              {
                variable: 'moderation.flagged',
                operator: 'equals',
                value: false,
              },
              {
                variable: 'moderation.score',
                operator: 'greater_than',
                value: 0.8,
              },
            ],
            logicalOperator: 'AND',
          },
        },
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 850, y: 150 },
        data: {
          label: 'Approve Content',
          description: 'Mark content as approved',
          config: {
            type: 'action',
            actionType: 'database_query',
            parameters: {
              query: 'UPDATE content SET status = "approved" WHERE id = {{input.contentId}}',
            },
          },
        },
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 850, y: 250 },
        data: {
          label: 'Reject Content',
          description: 'Mark content as rejected and notify',
          config: {
            type: 'action',
            actionType: 'database_query',
            parameters: {
              query: 'UPDATE content SET status = "rejected" WHERE id = {{input.contentId}}',
            },
          },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 1100, y: 200 },
        data: {
          label: 'Workflow Complete',
          config: { type: 'end' },
        },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'webhook-1',
        target: 'action-1',
        animated: true,
      },
      {
        id: 'edge-2',
        source: 'action-1',
        target: 'condition-1',
        animated: true,
      },
      {
        id: 'edge-3',
        source: 'condition-1',
        target: 'action-2',
        sourceHandle: 'true',
        label: 'Clean',
        animated: true,
      },
      {
        id: 'edge-4',
        source: 'condition-1',
        target: 'action-3',
        sourceHandle: 'false',
        label: 'Flagged',
        animated: true,
      },
      {
        id: 'edge-5',
        source: 'action-2',
        target: 'end-1',
        animated: true,
      },
      {
        id: 'edge-6',
        source: 'action-3',
        target: 'end-1',
        animated: true,
      },
    ],
    variables: [],
    settings: {
      timeout: 60000,
      maxConcurrency: 10,
      errorHandling: 'continue',
      logging: {
        enabled: true,
        level: 'info',
        retentionDays: 30,
      },
      notifications: {
        onSuccess: false,
        onFailure: true,
        onWarning: true,
      },
    },
    metadata: {
      author: 'system',
      tags: ['moderation', 'safety', 'compliance'],
      isTemplate: true,
      isPublic: true,
      usage: {
        totalExecutions: 0,
        successRate: 99.5,
      },
    },
  },
};

/**
 * Template 3: API Data Aggregator
 * Fetch data from multiple APIs and combine results
 */
export const apiDataAggregatorTemplate: WorkflowTemplate = {
  id: 'template-api-aggregator',
  name: 'API Data Aggregator',
  description: 'Fetch metrics from multiple social media APIs and generate consolidated report',
  category: 'Analytics',
  tags: ['api', 'analytics', 'reporting', 'metrics'],
  difficulty: 'intermediate',
  author: 'Network Sync',
  downloads: 0,
  rating: 4.7,
  thumbnail: '/templates/api-aggregator.png',
  createdAt: Date.now(),
  workflow: {
    name: 'API Data Aggregator',
    description: 'Aggregate social media metrics from multiple platforms',
    version: 1,
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 300 },
        data: {
          label: 'Hourly Sync',
          description: 'Run every hour',
          config: {
            type: 'trigger',
            triggerType: 'schedule',
            schedule: '0 * * * *',
            enabled: true,
          },
        },
      },
      {
        id: 'api-1',
        type: 'api',
        position: { x: 350, y: 200 },
        data: {
          label: 'Fetch Twitter Metrics',
          description: 'Get Twitter analytics',
          config: {
            type: 'api',
            method: 'GET',
            url: 'https://api.twitter.com/2/users/me/metrics',
            headers: {
              Authorization: 'Bearer {{env.TWITTER_TOKEN}}',
            },
            timeout: 10000,
          },
        },
      },
      {
        id: 'api-2',
        type: 'api',
        position: { x: 350, y: 300 },
        data: {
          label: 'Fetch LinkedIn Metrics',
          description: 'Get LinkedIn analytics',
          config: {
            type: 'api',
            method: 'GET',
            url: 'https://api.linkedin.com/v2/organizationalEntityShareStatistics',
            headers: {
              Authorization: 'Bearer {{env.LINKEDIN_TOKEN}}',
            },
            timeout: 10000,
          },
        },
      },
      {
        id: 'api-3',
        type: 'api',
        position: { x: 350, y: 400 },
        data: {
          label: 'Fetch Instagram Metrics',
          description: 'Get Instagram insights',
          config: {
            type: 'api',
            method: 'GET',
            url: 'https://graph.facebook.com/v18.0/me/insights',
            headers: {
              Authorization: 'Bearer {{env.INSTAGRAM_TOKEN}}',
            },
            timeout: 10000,
          },
        },
      },
      {
        id: 'transform-1',
        type: 'transform',
        position: { x: 600, y: 300 },
        data: {
          label: 'Merge Results',
          description: 'Combine all metrics',
          config: {
            type: 'transform',
            transformType: 'merge',
            expression: `{
  twitter: twitter.data,
  linkedin: linkedin.data,
  instagram: instagram.data,
  timestamp: Date.now()
}`,
          },
        },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 850, y: 300 },
        data: {
          label: 'Save to Database',
          description: 'Store aggregated metrics',
          config: {
            type: 'action',
            actionType: 'database_query',
            parameters: {
              query: 'INSERT INTO metrics_history (data, created_at) VALUES (?, ?)',
              params: ['{{merged}}', '{{timestamp}}'],
            },
          },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 1100, y: 300 },
        data: {
          label: 'Sync Complete',
          config: { type: 'end' },
        },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'api-1',
        animated: true,
      },
      {
        id: 'edge-2',
        source: 'trigger-1',
        target: 'api-2',
        animated: true,
      },
      {
        id: 'edge-3',
        source: 'trigger-1',
        target: 'api-3',
        animated: true,
      },
      {
        id: 'edge-4',
        source: 'api-1',
        target: 'transform-1',
        animated: true,
      },
      {
        id: 'edge-5',
        source: 'api-2',
        target: 'transform-1',
        animated: true,
      },
      {
        id: 'edge-6',
        source: 'api-3',
        target: 'transform-1',
        animated: true,
      },
      {
        id: 'edge-7',
        source: 'transform-1',
        target: 'action-1',
        animated: true,
      },
      {
        id: 'edge-8',
        source: 'action-1',
        target: 'end-1',
        animated: true,
      },
    ],
    variables: [],
    settings: {
      timeout: 120000,
      maxConcurrency: 3,
      errorHandling: 'continue',
      logging: {
        enabled: true,
        level: 'debug',
        retentionDays: 14,
      },
      notifications: {
        onSuccess: false,
        onFailure: true,
        onWarning: false,
      },
    },
    metadata: {
      author: 'system',
      tags: ['api', 'metrics', 'aggregation'],
      isTemplate: true,
      isPublic: true,
      usage: {
        totalExecutions: 0,
        successRate: 97,
      },
    },
  },
};

/**
 * Template 4: Simple Notification Workflow
 * Basic webhook-triggered notification
 */
export const simpleNotificationTemplate: WorkflowTemplate = {
  id: 'template-simple-notification',
  name: 'Simple Notification',
  description: 'Send a notification when a webhook is triggered - perfect for beginners',
  category: 'Notifications',
  tags: ['notification', 'webhook', 'beginner'],
  difficulty: 'beginner',
  author: 'Network Sync',
  downloads: 0,
  rating: 5.0,
  thumbnail: '/templates/notification.png',
  createdAt: Date.now(),
  workflow: {
    name: 'Simple Notification',
    description: 'Send email when webhook is triggered',
    version: 1,
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: 'Webhook Trigger',
          description: 'Receives webhook events',
          config: {
            type: 'trigger',
            triggerType: 'webhook',
            webhookUrl: '/webhooks/notify',
            enabled: true,
          },
        },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 400, y: 200 },
        data: {
          label: 'Send Email',
          description: 'Send notification email',
          config: {
            type: 'action',
            actionType: 'send_email',
            parameters: {
              to: '{{input.email}}',
              subject: '{{input.subject}}',
              body: '{{input.message}}',
            },
          },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 700, y: 200 },
        data: {
          label: 'Done',
          config: { type: 'end' },
        },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'action-1',
        animated: true,
      },
      {
        id: 'edge-2',
        source: 'action-1',
        target: 'end-1',
        animated: true,
      },
    ],
    variables: [],
    settings: {
      timeout: 30000,
      maxConcurrency: 10,
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
    },
    metadata: {
      author: 'system',
      tags: ['notification', 'webhook', 'email'],
      isTemplate: true,
      isPublic: true,
      usage: {
        totalExecutions: 0,
        successRate: 100,
      },
    },
  },
};

/**
 * All available templates
 */
export const workflowTemplates: WorkflowTemplate[] = [
  dailyContentSchedulerTemplate,
  contentModerationTemplate,
  apiDataAggregatorTemplate,
  simpleNotificationTemplate,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter((t) => t.category === category);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): WorkflowTemplate[] {
  return workflowTemplates.filter((t) => t.difficulty === difficulty);
}

/**
 * Create workflow from template
 */
export function createWorkflowFromTemplate(
  template: WorkflowTemplate,
  customName?: string
): Omit<VisualWorkflow, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...template.workflow,
    name: customName || `${template.workflow.name} (Copy)`,
    metadata: {
      ...template.workflow.metadata,
      isTemplate: false,
    },
  };
}
