# Visual Workflow Builder

## Overview

The **Visual Workflow Builder** is a powerful no-code/low-code system that enables users to create complex automation workflows using a drag-and-drop interface. Similar to tools like n8n, Zapier, or Node-RED, it provides a visual canvas for building workflows with nodes and connections.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Node Types](#node-types)
4. [API Reference](#api-reference)
5. [Frontend Integration](#frontend-integration)
6. [Workflow Examples](#workflow-examples)
7. [Best Practices](#best-practices)

---

## Features

### Core Capabilities

✅ **Visual Canvas** - Drag-and-drop interface for workflow design
✅ **10+ Node Types** - Triggers, actions, conditions, transforms, and more
✅ **Flow Control** - Conditional branching, loops, delays
✅ **Data Transformation** - Map, filter, reduce operations
✅ **Error Handling** - Retry logic, error branches, timeout handling
✅ **Validation** - Real-time workflow validation
✅ **Execution Engine** - Asynchronous node execution with state management
✅ **Templates** - Pre-built workflow templates
✅ **Testing** - Dry-run mode for testing workflows
✅ **Monitoring** - Execution logs and metrics

### Use Cases

- **Content Automation**: Schedule and post content across platforms
- **Engagement Workflows**: Auto-respond to comments, DMs
- **Data Processing**: Fetch, transform, and analyze data
- **Notification Systems**: Alert on specific conditions
- **Integration**: Connect multiple services and APIs
- **Moderation**: Auto-moderate content based on rules

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌────────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  React Flow    │  │   Node      │  │  Configuration  │  │
│  │    Canvas      │  │  Library    │  │     Panels      │  │
│  └────────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Node.js)                        │
│  ┌────────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Workflow     │  │  Execution  │  │   Validation    │  │
│  │     API        │  │   Engine    │  │     Engine      │  │
│  └────────────────┘  └─────────────┘  └─────────────────┘  │
│                                                               │
│  ┌────────────────┐  ┌─────────────┐                        │
│  │   Template     │  │   Storage   │                        │
│  │   Manager      │  │  (Database) │                        │
│  └────────────────┘  └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User creates workflow** on visual canvas
2. **Frontend validates** structure in real-time
3. **API receives** workflow definition
4. **Validation engine** checks for errors
5. **Storage** persists workflow
6. **Execution engine** processes nodes when triggered
7. **Logs and metrics** tracked for monitoring

---

## Node Types

### 1. Trigger Nodes

**Purpose**: Start points for workflows

**Types:**
- `schedule` - Cron-based triggers
- `webhook` - HTTP webhooks
- `event` - System events
- `manual` - Manual execution

**Example:**
```typescript
{
  type: 'trigger',
  config: {
    type: 'trigger',
    triggerType: 'schedule',
    schedule: '0 9 * * *', // Daily at 9 AM
    enabled: true
  }
}
```

### 2. Action Nodes

**Purpose**: Perform operations

**Types:**
- `post_content` - Post to social media
- `analyze_sentiment` - Sentiment analysis
- `moderate_content` - Content moderation
- `generate_content` - AI content generation
- `fetch_metrics` - Get analytics
- `send_email` - Email notification
- `http_request` - Generic HTTP request

**Example:**
```typescript
{
  type: 'action',
  config: {
    type: 'action',
    actionType: 'post_content',
    parameters: {
      platform: 'twitter',
      content: '{{content}}',
      scheduleTime: '{{time}}'
    },
    retryPolicy: {
      maxAttempts: 3,
      backoffType: 'exponential',
      initialDelay: 1000
    },
    timeout: 30000
  }
}
```

### 3. Condition Nodes

**Purpose**: Branching logic

**Operators:**
- `equals`, `not_equals`
- `greater_than`, `less_than`
- `contains`, `regex`
- `is_empty`, `is_not_empty`

**Example:**
```typescript
{
  type: 'condition',
  config: {
    type: 'condition',
    conditions: [
      {
        variable: 'sentiment.score',
        operator: 'greater_than',
        value: 0.7
      }
    ],
    logicalOperator: 'AND'
  }
}
```

### 4. Transform Nodes

**Purpose**: Data transformation

**Types:**
- `map` - Transform each item
- `filter` - Filter items
- `reduce` - Aggregate data
- `merge` - Combine data

**Example:**
```typescript
{
  type: 'transform',
  config: {
    type: 'transform',
    transformType: 'map',
    expression: 'data.posts.map(p => ({ title: p.title, score: p.engagement * 10 }))'
  }
}
```

### 5. Delay Nodes

**Purpose**: Time-based delays

**Example:**
```typescript
{
  type: 'delay',
  config: {
    type: 'delay',
    duration: 30,
    unit: 'minutes'
  }
}
```

### 6. Loop Nodes

**Purpose**: Iteration

**Types:**
- `for_each` - Iterate over collection
- `while` - Loop while condition is true
- `until` - Loop until condition is true

**Example:**
```typescript
{
  type: 'loop',
  config: {
    type: 'loop',
    loopType: 'for_each',
    collection: 'posts',
    maxIterations: 100
  }
}
```

### 7. API Nodes

**Purpose**: External API calls

**Example:**
```typescript
{
  type: 'api',
  config: {
    type: 'api',
    method: 'POST',
    url: 'https://api.example.com/analyze',
    headers: {
      'Authorization': 'Bearer {{token}}',
      'Content-Type': 'application/json'
    },
    body: {
      text: '{{content}}'
    },
    timeout: 5000
  }
}
```

### 8. Webhook Nodes

**Purpose**: Send webhooks

**Example:**
```typescript
{
  type: 'webhook',
  config: {
    type: 'webhook',
    url: 'https://hooks.slack.com/services/...',
    method: 'POST',
    body: {
      text: 'Workflow completed: {{workflow.name}}'
    }
  }
}
```

### 9. Notification Nodes

**Purpose**: Send notifications

**Channels:**
- `email`
- `slack`
- `discord`
- `webhook`

**Example:**
```typescript
{
  type: 'notification',
  config: {
    type: 'notification',
    channel: 'email',
    recipients: ['admin@example.com'],
    template: 'Workflow {{workflow.name}} completed successfully',
    priority: 'high'
  }
}
```

### 10. End Nodes

**Purpose**: Workflow termination

**Example:**
```typescript
{
  type: 'end',
  data: {
    label: 'Success',
    description: 'Workflow completed successfully'
  }
}
```

---

## API Reference

### Base URL

```
/visual-workflows
```

### Endpoints

#### 1. Get All Workflows

```http
GET /visual-workflows
Authorization: Bearer <token>
```

**Response:**
```json
{
  "workflows": [
    {
      "id": "wf_123",
      "name": "Daily Content Scheduler",
      "version": 1,
      "nodes": [...],
      "edges": [...],
      "createdAt": 1642501234000
    }
  ],
  "total": 5
}
```

#### 2. Get Workflow by ID

```http
GET /visual-workflows/:id
Authorization: Bearer <token>
```

#### 3. Create Workflow

```http
POST /visual-workflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Content Automation",
  "description": "Automatically post content at optimal times",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Daily Trigger",
        "config": {
          "type": "trigger",
          "triggerType": "schedule",
          "schedule": "0 9 * * *",
          "enabled": true
        }
      }
    },
    {
      "id": "node_2",
      "type": "action",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "Post Content",
        "config": {
          "type": "action",
          "actionType": "post_content",
          "parameters": {
            "platform": "twitter",
            "content": "Good morning! #automation"
          }
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Visual workflow created successfully",
  "workflow": { ... },
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": []
  }
}
```

#### 4. Update Workflow

```http
PATCH /visual-workflows/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Workflow Name",
  "nodes": [...],
  "edges": [...]
}
```

#### 5. Delete Workflow

```http
DELETE /visual-workflows/:id
Authorization: Bearer <token>
```

#### 6. Execute Workflow

```http
POST /visual-workflows/:id/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "input": {
    "content": "Test content",
    "platform": "twitter"
  },
  "dryRun": false
}
```

**Response:**
```json
{
  "message": "Workflow execution completed",
  "execution": {
    "id": "exec_456",
    "status": "completed",
    "startTime": 1642501234000,
    "endTime": 1642501236000,
    "duration": 2000,
    "nodeExecutions": [
      {
        "nodeId": "node_1",
        "status": "completed",
        "duration": 50
      },
      {
        "nodeId": "node_2",
        "status": "completed",
        "duration": 1950
      }
    ]
  },
  "logs": [
    {
      "timestamp": 1642501234000,
      "level": "info",
      "message": "Executing node: Daily Trigger (trigger)"
    },
    {
      "timestamp": 1642501234050,
      "level": "info",
      "message": "Executing node: Post Content (action)"
    },
    {
      "timestamp": 1642501236000,
      "level": "info",
      "message": "Workflow completed in 2000ms"
    }
  ]
}
```

#### 7. Validate Workflow

```http
POST /visual-workflows/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "nodes": [...],
  "edges": [...]
}
```

**Response:**
```json
{
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": [
      {
        "nodeId": "node_3",
        "type": "unreachable_node",
        "message": "Node is not connected to the workflow"
      }
    ]
  }
}
```

#### 8. Get Templates

```http
GET /visual-workflows/templates/all
```

**Response:**
```json
{
  "templates": [
    {
      "id": "template_1",
      "name": "Social Media Scheduler",
      "category": "Content Automation",
      "difficulty": "beginner",
      "downloads": 150,
      "rating": 4.5
    }
  ],
  "total": 10
}
```

#### 9. Save as Template

```http
POST /visual-workflows/:id/template
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "Content Automation",
  "difficulty": "intermediate",
  "thumbnail": "https://example.com/thumbnail.png"
}
```

---

## Frontend Integration

### Using React Flow

**Install dependencies:**

```bash
npm install reactflow zustand
```

**Basic setup:**

```tsx
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useState, useCallback } from 'react';

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div style={{ height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
```

### Custom Node Components

```tsx
import { Handle, Position } from 'reactflow';

export function TriggerNode({ data }) {
  return (
    <div className="trigger-node">
      <div className="node-header">
        <span className="node-icon">⏰</span>
        <span className="node-title">{data.label}</span>
      </div>
      <div className="node-body">
        <p>{data.description}</p>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function ActionNode({ data }) {
  return (
    <div className="action-node">
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <span className="node-icon">⚡</span>
        <span className="node-title">{data.label}</span>
      </div>
      <div className="node-body">
        <p>{data.description}</p>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function ConditionNode({ data }) {
  return (
    <div className="condition-node">
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <span className="node-icon">❓</span>
        <span className="node-title">{data.label}</span>
      </div>
      <div className="node-body">
        <p>{data.description}</p>
      </div>
      <Handle type="source" position={Position.Right} id="true" />
      <Handle type="source" position={Position.Bottom} id="false" />
    </div>
  );
}

// Register custom nodes
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
};

// Use in ReactFlow
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  ...
/>
```

---

## Workflow Examples

### Example 1: Content Scheduler

```json
{
  "name": "Daily Content Scheduler",
  "description": "Post content every day at 9 AM",
  "nodes": [
    {
      "id": "trigger_1",
      "type": "trigger",
      "data": {
        "label": "Daily at 9 AM",
        "config": {
          "type": "trigger",
          "triggerType": "schedule",
          "schedule": "0 9 * * *",
          "enabled": true
        }
      }
    },
    {
      "id": "action_1",
      "type": "action",
      "data": {
        "label": "Post to Twitter",
        "config": {
          "type": "action",
          "actionType": "post_content",
          "parameters": {
            "platform": "twitter",
            "content": "Good morning everyone! #automation"
          }
        }
      }
    },
    {
      "id": "end_1",
      "type": "end",
      "data": {
        "label": "Success"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "trigger_1", "target": "action_1" },
    { "id": "e2", "source": "action_1", "target": "end_1" }
  ]
}
```

### Example 2: Content Moderation

```json
{
  "name": "Auto Moderation",
  "description": "Moderate comments based on sentiment",
  "nodes": [
    {
      "id": "trigger_1",
      "type": "trigger",
      "data": {
        "label": "New Comment Event",
        "config": {
          "type": "trigger",
          "triggerType": "event",
          "eventType": "comment.created"
        }
      }
    },
    {
      "id": "action_1",
      "type": "action",
      "data": {
        "label": "Analyze Sentiment",
        "config": {
          "type": "action",
          "actionType": "analyze_sentiment",
          "parameters": {
            "text": "{{comment.text}}"
          }
        }
      }
    },
    {
      "id": "condition_1",
      "type": "condition",
      "data": {
        "label": "Check Sentiment",
        "config": {
          "type": "condition",
          "conditions": [{
            "variable": "sentiment.score",
            "operator": "less_than",
            "value": 0.3
          }],
          "logicalOperator": "AND"
        }
      }
    },
    {
      "id": "action_2",
      "type": "action",
      "data": {
        "label": "Flag Comment",
        "config": {
          "type": "action",
          "actionType": "moderate_content",
          "parameters": {
            "action": "flag",
            "reason": "negative_sentiment"
          }
        }
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "trigger_1", "target": "action_1" },
    { "id": "e2", "source": "action_1", "target": "condition_1" },
    { "id": "e3", "source": "condition_1", "target": "action_2", "label": "true" }
  ]
}
```

---

## Best Practices

### 1. Workflow Design

✅ **Keep workflows focused** - One workflow per task
✅ **Use descriptive labels** - Clear node names
✅ **Add descriptions** - Document complex logic
✅ **Handle errors** - Add error branches
✅ **Test before deploying** - Use dry-run mode

### 2. Performance

✅ **Limit workflow size** - Max 50 nodes
✅ **Use parallel execution** - When possible
✅ **Set timeouts** - Prevent hanging workflows
✅ **Monitor execution time** - Optimize slow nodes

### 3. Error Handling

✅ **Add retry logic** - For flaky operations
✅ **Use error branches** - Graceful degradation
✅ **Log extensively** - For debugging
✅ **Set up alerts** - For critical failures

### 4. Security

✅ **Validate inputs** - Never trust user data
✅ **Use environment variables** - For secrets
✅ **Limit API access** - Proper authentication
✅ **Audit workflow changes** - Track modifications

---

## Troubleshooting

### Common Issues

**Q: Workflow validation fails with "circular dependency"**
A: Check for loops in your workflow. Ensure no node connects back to itself or creates a cycle.

**Q: Node execution times out**
A: Increase the timeout setting in the node configuration or workflow settings.

**Q: Workflow doesn't start**
A: Ensure trigger node is properly configured and enabled.

**Q: Condition node doesn't branch correctly**
A: Verify variable names match exactly (case-sensitive) and operator is correct.

---

## Future Enhancements

- [ ] Subworkflows (call workflows from workflows)
- [ ] Parallel execution groups
- [ ] Real-time collaboration
- [ ] Workflow versioning and rollback
- [ ] Visual debugging with breakpoints
- [ ] Custom node SDK for extensions
- [ ] Workflow marketplace
- [ ] AI-powered workflow suggestions

---

**Last Updated**: 2025-01-19
**Version**: 1.0
**Maintainer**: Development Team