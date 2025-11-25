# Visual Workflow Builder - Frontend Integration Guide

**Complete guide to using the Visual Workflow Builder frontend**

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Component Architecture](#component-architecture)
4. [Using Templates](#using-templates)
5. [Creating Custom Workflows](#creating-custom-workflows)
6. [Node Types](#node-types)
7. [API Integration](#api-integration)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Visual Workflow Builder is a drag-and-drop interface for creating automation workflows without writing code. It's built with:

- **React Flow** - Canvas and node management
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **SWR** - Data fetching and caching
- **React Hot Toast** - Notifications

### Features

✅ Drag-and-drop workflow creation
✅ 7 node types (Trigger, Action, Condition, Transform, Delay, API, End)
✅ Real-time validation
✅ Execution tracking with logs
✅ Pre-built templates
✅ Visual feedback and animations
✅ Keyboard shortcuts (Delete to remove nodes)

---

## Quick Start

### 1. Access the Workflow Builder

Navigate to `/workflows` in your application:

```typescript
// In your navigation
<Link href="/workflows">Create Workflow</Link>
```

### 2. Start from a Template

Click **"Start from Template"** button to browse pre-built workflows:

- Daily Content Scheduler
- Content Moderation Pipeline
- API Data Aggregator
- Simple Notification

### 3. Create a Workflow from Scratch

1. Drag nodes from the left palette onto the canvas
2. Connect nodes by dragging from output port to input port
3. Click a node to configure its properties
4. Click **Save** to persist the workflow
5. Click **Execute** to run the workflow

---

## Component Architecture

### Main Components

#### 1. WorkflowCanvas (`WorkflowCanvas.tsx`)

Main container for the workflow builder.

```tsx
import { WorkflowCanvas } from '@/components/workflow-builder/WorkflowCanvas';

<WorkflowCanvas
  workflow={currentWorkflow}
  onSave={handleSave}
  onExecute={handleExecute}
  readOnly={false}
/>
```

**Props:**
- `workflow?: VisualWorkflow` - Current workflow to display
- `onSave?: (workflow: Partial<VisualWorkflow>) => void` - Save handler
- `onExecute?: (workflow: VisualWorkflow) => void` - Execute handler
- `readOnly?: boolean` - Disable editing (default: false)

#### 2. TemplateBrowser (`TemplateBrowser.tsx`)

Modal for browsing and selecting workflow templates.

```tsx
import { TemplateBrowser } from '@/components/workflow-builder/TemplateBrowser';

<TemplateBrowser
  onSelectTemplate={handleSelectTemplate}
  onClose={handleClose}
/>
```

**Props:**
- `onSelectTemplate: (template: WorkflowTemplate) => void` - Template selection handler
- `onClose: () => void` - Close handler

#### 3. ExecutionViewer (`ExecutionViewer.tsx`)

Modal for viewing workflow execution status and logs.

```tsx
import { ExecutionViewer } from '@/components/workflow-builder/ExecutionViewer';

<ExecutionViewer
  execution={executionData}
  logs={executionLogs}
  onClose={handleClose}
/>
```

**Props:**
- `execution: WorkflowExecution` - Execution data
- `logs?: ExecutionLog[]` - Execution logs
- `onClose: () => void` - Close handler

### Custom Node Components

Each node type has its own component:

- `TriggerNode.tsx` - Workflow start points
- `ActionNode.tsx` - Operations and tasks
- `ConditionNode.tsx` - Branching logic
- `TransformNode.tsx` - Data transformation
- `DelayNode.tsx` - Time delays
- `ApiNode.tsx` - HTTP API calls
- `EndNode.tsx` - Workflow termination

**Creating a Custom Node:**

```tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const CustomNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config as YourConfig;

  return (
    <div className={`bg-white rounded-lg border-2 ${selected ? 'border-blue-500' : 'border-gray-300'}`}>
      <Handle type="target" position={Position.Left} />

      <div className="px-4 py-3">
        <div className="font-medium">{data.label}</div>
        {/* Your custom UI */}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});
```

### Panel Components

- `NodePalette.tsx` - Draggable node types
- `NodeConfigPanel.tsx` - Dynamic configuration forms
- `WorkflowToolbar.tsx` - Top toolbar with actions

---

## Using Templates

### Available Templates

#### 1. Daily Content Scheduler

Automatically posts content at scheduled times with sentiment analysis.

**Nodes:** Trigger → Analyze Sentiment → Condition → Post/Alert → End

**Use Case:** Social media automation with quality control

#### 2. Content Moderation Pipeline

Moderates content for inappropriate language and policy violations.

**Nodes:** Webhook → Moderate → Condition → Approve/Reject → End

**Use Case:** User-generated content moderation

#### 3. API Data Aggregator

Fetches data from multiple APIs and combines results.

**Nodes:** Schedule → API Calls (parallel) → Transform → Save → End

**Use Case:** Analytics and reporting

#### 4. Simple Notification

Basic webhook-triggered email notification.

**Nodes:** Webhook → Send Email → End

**Use Case:** Event notifications

### Loading a Template

```typescript
import { workflowTemplates, createWorkflowFromTemplate } from '@/lib/workflow-templates';

// Get template by ID
const template = workflowTemplates.find(t => t.id === 'template-daily-content-scheduler');

// Create workflow from template
const workflow = createWorkflowFromTemplate(template, 'My Custom Name');

// Load into canvas
setCurrentWorkflow({
  id: '',
  ...workflow,
  createdAt: Date.now(),
  updatedAt: Date.now(),
} as VisualWorkflow);
```

### Creating Custom Templates

```typescript
export const myCustomTemplate: WorkflowTemplate = {
  id: 'template-my-custom',
  name: 'My Custom Template',
  description: 'Description here',
  category: 'Custom',
  tags: ['custom', 'automation'],
  difficulty: 'beginner',
  author: 'Your Name',
  downloads: 0,
  createdAt: Date.now(),
  workflow: {
    name: 'My Workflow',
    description: 'Workflow description',
    version: 1,
    nodes: [
      // Your nodes here
    ],
    edges: [
      // Your connections here
    ],
    variables: [],
    settings: { /* ... */ },
    metadata: { /* ... */ },
  },
};

// Add to templates array
export const workflowTemplates = [
  // ... existing templates
  myCustomTemplate,
];
```

---

## Creating Custom Workflows

### Step-by-Step Guide

#### 1. Add a Trigger Node

Every workflow must start with a trigger:

```typescript
{
  id: 'trigger-1',
  type: 'trigger',
  position: { x: 100, y: 200 },
  data: {
    label: 'Daily at 9 AM',
    config: {
      type: 'trigger',
      triggerType: 'schedule',
      schedule: '0 9 * * *',
      enabled: true,
    },
  },
}
```

**Trigger Types:**
- `schedule` - Cron-based scheduling (e.g., `0 9 * * *`)
- `webhook` - HTTP webhook endpoint
- `event` - Event-based triggers
- `manual` - Manual execution only

#### 2. Add Action Nodes

Perform operations:

```typescript
{
  id: 'action-1',
  type: 'action',
  position: { x: 350, y: 200 },
  data: {
    label: 'Post to Twitter',
    config: {
      type: 'action',
      actionType: 'post_content',
      parameters: {
        content: '{{input.content}}',
        platform: 'twitter',
      },
      timeout: 10000,
    },
  },
}
```

**Action Types:**
- `post_content` - Post to social media
- `analyze_sentiment` - Sentiment analysis
- `moderate_content` - Content moderation
- `generate_content` - AI content generation
- `fetch_metrics` - Get analytics
- `send_email` - Email notifications
- `http_request` - Generic HTTP call
- `database_query` - Database operations
- `file_operation` - File management

#### 3. Add Conditional Logic

Branch based on conditions:

```typescript
{
  id: 'condition-1',
  type: 'condition',
  position: { x: 600, y: 200 },
  data: {
    label: 'Check Sentiment',
    config: {
      type: 'condition',
      conditions: [
        {
          variable: 'sentiment.score',
          operator: 'greater_than',
          value: 0.7,
        },
      ],
      logicalOperator: 'AND',
    },
  },
}
```

**Operators:**
- `equals`, `not_equals`
- `greater_than`, `less_than`
- `contains`, `regex`
- `is_empty`, `is_not_empty`

**Logical Operators:**
- `AND` - All conditions must be true
- `OR` - At least one condition must be true

#### 4. Transform Data

Modify data between nodes:

```typescript
{
  id: 'transform-1',
  type: 'transform',
  position: { x: 400, y: 200 },
  data: {
    label: 'Format Data',
    config: {
      type: 'transform',
      transformType: 'map',
      expression: 'data.map(item => ({ id: item.id, title: item.title.toUpperCase() }))',
    },
  },
}
```

**Transform Types:**
- `map` - Transform each item
- `filter` - Filter items
- `reduce` - Reduce to single value
- `merge` - Merge multiple inputs

#### 5. Connect Nodes

Create edges between nodes:

```typescript
{
  id: 'edge-1',
  source: 'trigger-1',
  target: 'action-1',
  animated: true,
}
```

For condition nodes with multiple outputs:

```typescript
{
  id: 'edge-true',
  source: 'condition-1',
  target: 'action-success',
  sourceHandle: 'true',
  label: 'Yes',
  animated: true,
}
```

---

## Node Types

### Trigger Nodes (Green)

**Start workflow execution**

| Type | Description | Example |
|------|-------------|---------|
| Schedule | Cron-based timing | `0 9 * * *` (Daily at 9 AM) |
| Webhook | HTTP endpoint | `/webhooks/content-created` |
| Event | Event-driven | `user.registered` |
| Manual | User-initiated | Click "Execute" button |

### Action Nodes (Blue)

**Perform operations**

| Type | Description | Parameters |
|------|-------------|------------|
| post_content | Post to social media | `content`, `platforms[]` |
| analyze_sentiment | AI sentiment analysis | `content` |
| moderate_content | Content safety check | `content`, `strictMode` |
| send_email | Email notification | `to`, `subject`, `body` |

### Condition Nodes (Amber)

**Branch logic**

- Dual outputs: `true` (green handle) and `false` (red handle)
- Multiple conditions with AND/OR logic
- 8 comparison operators

### Transform Nodes (Purple)

**Data manipulation**

- JavaScript expressions
- Input/output schema definition
- Supports map, filter, reduce, merge

### Delay Nodes (Pink)

**Time-based delays**

| Unit | Description |
|------|-------------|
| seconds | Short delays (1-60s) |
| minutes | Medium delays (1-60m) |
| hours | Long delays (1-24h) |
| days | Very long delays (1-7d) |

### API Nodes (Cyan)

**HTTP requests**

- Methods: GET, POST, PUT, PATCH, DELETE
- Headers and body support
- Authentication (Bearer, API Key, OAuth2)
- Timeout configuration

### End Nodes (Red)

**Workflow termination**

- Marks workflow completion
- Required for proper execution tracking

---

## API Integration

### API Client

The workflow API client (`workflow.ts`) provides methods for all operations:

```typescript
import { workflowApi } from '@/lib/api/workflow';

// Get all workflows
const { workflows, total } = await workflowApi.getAll();

// Get specific workflow
const workflow = await workflowApi.getById('workflow-id');

// Create workflow
const { workflow, validation } = await workflowApi.create({
  name: 'My Workflow',
  description: 'Description',
  nodes: [],
  edges: [],
});

// Update workflow
const { workflow, validation } = await workflowApi.update('id', {
  name: 'Updated Name',
});

// Delete workflow
await workflowApi.delete('id');

// Execute workflow
const { execution, logs } = await workflowApi.execute('id', {
  input: { content: 'Hello World' },
});

// Get execution status
const { execution, logs } = await workflowApi.getExecution('workflow-id', 'execution-id');

// Validate workflow
const validation = await workflowApi.validate(workflowData);

// Get templates
const { templates, total } = await workflowApi.getTemplates();
```

### SWR Hooks

For automatic data fetching and caching:

```typescript
import { useWorkflows, useWorkflow, useTemplates } from '@/lib/api/workflow';

// Get all workflows (auto-updates)
const { data, error, isLoading } = useWorkflows();

// Get specific workflow
const { data: workflow } = useWorkflow('workflow-id');

// Get templates
const { data: templates } = useTemplates();
```

### API Endpoints

Backend endpoints (baseURL: `/visual-workflows`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all workflows |
| GET | `/:id` | Get workflow by ID |
| POST | `/` | Create workflow |
| PATCH | `/:id` | Update workflow |
| DELETE | `/:id` | Delete workflow |
| POST | `/:id/execute` | Execute workflow |
| GET | `/:id/executions/:executionId` | Get execution |
| POST | `/validate` | Validate workflow |
| GET | `/templates/all` | Get templates |
| POST | `/:id/template` | Save as template |

---

## Advanced Features

### Workflow Validation

Real-time validation ensures workflows are valid before execution:

```typescript
const validateWorkflow = () => {
  // Check for trigger nodes
  const triggerNodes = nodes.filter(n => n.type === 'trigger');
  if (triggerNodes.length === 0) {
    return { valid: false, message: 'Workflow must have at least one trigger node' };
  }

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  const disconnectedNodes = nodes.filter(
    node => node.type !== 'trigger' && !connectedNodes.has(node.id)
  );

  if (disconnectedNodes.length > 0) {
    return {
      valid: false,
      message: `${disconnectedNodes.length} node(s) not connected`,
    };
  }

  return { valid: true, message: 'Workflow is valid' };
};
```

### Variables and Context

Use variables to pass data between nodes:

```typescript
// Define global variables
variables: [
  {
    id: 'var-1',
    name: 'apiKey',
    type: 'string',
    value: process.env.API_KEY,
    scope: 'global',
  },
]

// Use in node config
config: {
  url: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer {{apiKey}}',
  },
}

// Access input data
config: {
  content: '{{input.message}}',
}

// Access previous node output
config: {
  score: '{{sentiment.score}}',
}
```

### Error Handling

Configure how errors are handled:

```typescript
settings: {
  errorHandling: 'stop', // 'stop' | 'continue' | 'retry'
  timeout: 300000, // 5 minutes
  maxConcurrency: 5,
}
```

**Error Strategies:**
- `stop` - Stop entire workflow on error
- `continue` - Continue to next node
- `retry` - Retry failed node (with retry policy)

### Execution Tracking

Track workflow execution with detailed logs:

```typescript
const { execution, logs } = await workflowApi.execute('id');

// Execution status
execution.status; // 'pending' | 'running' | 'completed' | 'failed'
execution.duration; // Execution time in ms
execution.nodeExecutions; // Per-node execution data

// Logs
logs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`, log.data);
});
```

### Dynamic Imports

Workflow canvas is lazy-loaded to reduce initial bundle size:

```typescript
import { WorkflowCanvas } from '@/components/dynamic-imports';

// Canvas loads only when needed
// Saves ~200KB in initial bundle
```

---

## Troubleshooting

### Common Issues

#### Workflow Won't Execute

**Problem:** Execute button is disabled
**Solution:** Check validation status. Ensure:
- At least one trigger node exists
- All nodes are connected
- No circular dependencies

#### Nodes Not Connecting

**Problem:** Can't create connections between nodes
**Solution:**
- Drag from output port (right side) to input port (left side)
- Trigger nodes only have output ports
- End nodes only have input ports
- Condition nodes have labeled outputs (true/false)

#### Template Not Loading

**Problem:** Template selection doesn't populate canvas
**Solution:**
- Check console for errors
- Verify template structure matches `WorkflowTemplate` type
- Ensure `createWorkflowFromTemplate()` is called correctly

#### Save Fails

**Problem:** Workflow won't save to backend
**Solution:**
- Check network tab for API errors
- Verify backend is running (default: `http://localhost:3001`)
- Check authentication token in localStorage
- Validate workflow structure

#### TypeScript Errors

**Problem:** Type errors in custom nodes
**Solution:**
- Ensure config type matches `NodeConfig` union
- Add new config types to `NodeConfig` union in `types/workflow.ts`
- Use proper type assertions: `data.config as YourConfig`

### Performance Optimization

**Large Workflows:**
- Use workflow templates as starting points
- Break complex workflows into smaller sub-workflows
- Limit concurrent executions with `maxConcurrency`
- Enable aggressive caching in SWR config

**Canvas Performance:**
- Limit visible nodes to ~50 for smooth interactions
- Use `fitView` sparingly
- Disable animations for very large workflows
- Consider virtualization for node palette

### Debugging

Enable debug mode:

```typescript
// In workflow settings
settings: {
  logging: {
    enabled: true,
    level: 'debug', // 'debug' | 'info' | 'warn' | 'error'
    retentionDays: 14,
  },
}
```

Check execution logs:

```typescript
const { execution, logs } = await workflowApi.execute('id');

logs.forEach(log => {
  if (log.level === 'error') {
    console.error('Error:', log.message, log.data);
  }
});

// Check per-node execution
execution.nodeExecutions.forEach(nodeExec => {
  if (nodeExec.status === 'failed') {
    console.error('Node failed:', nodeExec.nodeId, nodeExec.error);
  }
});
```

---

## Best Practices

### 1. Start with Templates

Use pre-built templates as starting points to understand workflow patterns.

### 2. Validate Early and Often

Enable real-time validation to catch issues before execution.

### 3. Use Descriptive Names

Give nodes clear, descriptive labels that explain their purpose.

### 4. Add Descriptions

Use the description field to document complex logic.

### 5. Test Incrementally

Build workflows step-by-step, testing each addition.

### 6. Handle Errors Gracefully

Configure appropriate error handling for each workflow type.

### 7. Monitor Executions

Review execution logs to optimize workflow performance.

### 8. Version Control

Use workflow versions to track changes and enable rollbacks.

### 9. Document Variables

Comment variable usage in node configurations.

### 10. Keep It Simple

Break complex workflows into smaller, manageable pieces.

---

## Resources

- **React Flow Docs:** https://reactflow.dev/
- **Cron Expression Guide:** https://crontab.guru/
- **JavaScript Expression Syntax:** MDN Web Docs
- **Backend API:** See `VISUAL_WORKFLOW_BUILDER.md`
- **Type Definitions:** `src/types/workflow.ts`

---

## Support

For issues or questions:
1. Check this guide and troubleshooting section
2. Review backend documentation
3. Check console for error messages
4. Inspect network requests in DevTools
5. File an issue with reproduction steps

---

**Built with ❤️ for automation enthusiasts**
