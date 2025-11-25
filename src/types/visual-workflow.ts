/**
 * Visual Workflow Builder - Type Definitions
 *
 * Comprehensive type system for node-based workflow builder
 */

// =============================================================================
// NODE TYPES
// =============================================================================

export type NodeType =
  | 'trigger'        // Workflow start points
  | 'action'         // Perform operations
  | 'condition'      // Branching logic
  | 'transform'      // Data transformation
  | 'delay'          // Time-based delays
  | 'loop'           // Iteration
  | 'api'            // External API calls
  | 'webhook'        // Webhook triggers
  | 'notification'   // Send notifications
  | 'end';           // Workflow termination

export type TriggerType =
  | 'schedule'       // Cron-based triggers
  | 'webhook'        // HTTP webhooks
  | 'event'          // System events
  | 'manual';        // Manual execution

export type ActionType =
  | 'post_content'   // Post to social media
  | 'analyze_sentiment' // Sentiment analysis
  | 'moderate_content'  // Content moderation
  | 'generate_content'  // AI content generation
  | 'fetch_metrics'     // Get analytics
  | 'send_email'        // Email notification
  | 'http_request'      // Generic HTTP request
  | 'database_query'    // Database operation
  | 'file_operation';   // File read/write

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'regex'
  | 'is_empty'
  | 'is_not_empty';

// =============================================================================
// WORKFLOW SCHEMA
// =============================================================================

export interface VisualWorkflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  settings: WorkflowSettings;
  metadata: WorkflowMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
  style?: NodeStyle;
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  description?: string;
  config: NodeConfig;
  outputs?: OutputPort[];
  inputs?: InputPort[];
}

// Node-specific configurations
export type NodeConfig =
  | TriggerConfig
  | ActionConfig
  | ConditionConfig
  | TransformConfig
  | DelayConfig
  | LoopConfig
  | ApiConfig
  | WebhookConfig
  | NotificationConfig;

export interface TriggerConfig {
  type: 'trigger';
  triggerType: TriggerType;
  schedule?: string;          // Cron expression
  webhookUrl?: string;
  eventType?: string;
  enabled: boolean;
}

export interface ActionConfig {
  type: 'action';
  actionType: ActionType;
  parameters: Record<string, any>;
  retryPolicy?: RetryPolicy;
  timeout?: number;           // milliseconds
}

export interface ConditionConfig {
  type: 'condition';
  conditions: Condition[];
  logicalOperator: 'AND' | 'OR';
  defaultBranch?: string;     // Node ID for else branch
}

export interface Condition {
  variable: string;
  operator: ConditionOperator;
  value: any;
  caseSensitive?: boolean;
}

export interface TransformConfig {
  type: 'transform';
  transformType: 'map' | 'filter' | 'reduce' | 'merge';
  expression: string;         // JavaScript expression
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface DelayConfig {
  type: 'delay';
  duration: number;           // milliseconds
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

export interface LoopConfig {
  type: 'loop';
  loopType: 'for_each' | 'while' | 'until';
  collection?: string;        // Variable name
  condition?: Condition;
  maxIterations?: number;
}

export interface ApiConfig {
  type: 'api';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  authentication?: ApiAuthentication;
  timeout?: number;
}

export interface ApiAuthentication {
  type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'api_key';
  credentials?: Record<string, string>;
}

export interface WebhookConfig {
  type: 'webhook';
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
}

export interface NotificationConfig {
  type: 'notification';
  channel: 'email' | 'slack' | 'discord' | 'webhook';
  recipients: string[];
  template: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;       // milliseconds
  maxDelay?: number;
}

// =============================================================================
// EDGES (CONNECTIONS)
// =============================================================================

export interface WorkflowEdge {
  id: string;
  source: string;             // Source node ID
  target: string;             // Target node ID
  sourceHandle?: string;      // Output port ID
  targetHandle?: string;      // Input port ID
  label?: string;
  condition?: EdgeCondition;
  animated?: boolean;
  style?: EdgeStyle;
}

export interface EdgeCondition {
  type: 'success' | 'error' | 'conditional';
  expression?: string;        // For conditional edges
}

// =============================================================================
// PORTS (INPUT/OUTPUT)
// =============================================================================

export interface OutputPort {
  id: string;
  label: string;
  type: PortDataType;
  description?: string;
}

export interface InputPort {
  id: string;
  label: string;
  type: PortDataType;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export type PortDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'any'
  | 'file'
  | 'date';

// =============================================================================
// VARIABLES
// =============================================================================

export interface WorkflowVariable {
  id: string;
  name: string;
  type: PortDataType;
  value?: any;
  description?: string;
  scope: 'global' | 'node';
  nodeId?: string;            // For node-scoped variables
}

// =============================================================================
// SETTINGS & METADATA
// =============================================================================

export interface WorkflowSettings {
  timeout: number;            // Maximum execution time (ms)
  maxConcurrency: number;     // Max parallel nodes
  errorHandling: 'stop' | 'continue' | 'retry';
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    retentionDays: number;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    onWarning: boolean;
  };
}

export interface WorkflowMetadata {
  author: string;
  tags: string[];
  category?: string;
  isTemplate: boolean;
  isPublic: boolean;
  usage: {
    totalExecutions: number;
    lastExecutionTime?: number;
    averageExecutionTime?: number;
    successRate?: number;
  };
}

// =============================================================================
// EXECUTION STATE
// =============================================================================

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  nodeExecutions: NodeExecution[];
  variables: Record<string, any>;
  error?: ExecutionError;
  triggeredBy: string;        // User ID or 'system'
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface NodeExecution {
  nodeId: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  input?: any;
  output?: any;
  error?: ExecutionError;
  retryCount?: number;
  logs?: ExecutionLog[];
}

export interface ExecutionError {
  code: string;
  message: string;
  stack?: string;
  nodeId?: string;
  timestamp: number;
  recoverable: boolean;
}

export interface ExecutionLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// =============================================================================
// TEMPLATES
// =============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  workflow: Omit<VisualWorkflow, 'id' | 'createdAt' | 'updatedAt'>;
  thumbnail?: string;
  author: string;
  downloads: number;
  rating?: number;
  createdAt: number;
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  type: 'missing_connection' | 'invalid_config' | 'circular_dependency' | 'invalid_expression' | 'type_mismatch';
  message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  nodeId?: string;
  edgeId?: string;
  type: 'unreachable_node' | 'unused_variable' | 'performance' | 'best_practice';
  message: string;
  suggestion?: string;
}

// =============================================================================
// STYLING
// =============================================================================

export interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  opacity?: number;
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

// =============================================================================
// API REQUESTS/RESPONSES
// =============================================================================

export interface CreateVisualWorkflowRequest {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
  settings?: Partial<WorkflowSettings>;
}

export interface UpdateVisualWorkflowRequest extends Partial<CreateVisualWorkflowRequest> {
  version?: number;
}

export interface ExecuteWorkflowRequest {
  workflowId: string;
  input?: Record<string, any>;
  dryRun?: boolean;
}

export interface ExecuteWorkflowResponse {
  executionId: string;
  status: ExecutionStatus;
  output?: any;
  logs?: ExecutionLog[];
}
