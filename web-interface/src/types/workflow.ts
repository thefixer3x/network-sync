/**
 * Visual Workflow Types - Frontend
 *
 * Type definitions for the visual workflow builder
 */

// Node types
export type NodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'transform'
  | 'delay'
  | 'loop'
  | 'api'
  | 'webhook'
  | 'notification'
  | 'end';

export type TriggerType = 'schedule' | 'webhook' | 'event' | 'manual';

export type ActionType =
  | 'post_content'
  | 'analyze_sentiment'
  | 'moderate_content'
  | 'generate_content'
  | 'fetch_metrics'
  | 'send_email'
  | 'http_request'
  | 'database_query'
  | 'file_operation';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'regex'
  | 'is_empty'
  | 'is_not_empty';

// Workflow schema
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

// Node configurations
export type NodeConfig =
  | TriggerConfig
  | ActionConfig
  | ConditionConfig
  | TransformConfig
  | DelayConfig
  | LoopConfig
  | ApiConfig
  | WebhookConfig
  | NotificationConfig
  | EndConfig;

export interface TriggerConfig {
  type: 'trigger';
  triggerType: TriggerType;
  schedule?: string;
  webhookUrl?: string;
  eventType?: string;
  enabled: boolean;
}

export interface ActionConfig {
  type: 'action';
  actionType: ActionType;
  parameters: Record<string, any>;
  retryPolicy?: RetryPolicy;
  timeout?: number;
}

export interface ConditionConfig {
  type: 'condition';
  conditions: Condition[];
  logicalOperator: 'AND' | 'OR';
  defaultBranch?: string;
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
  expression: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface DelayConfig {
  type: 'delay';
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

export interface LoopConfig {
  type: 'loop';
  loopType: 'for_each' | 'while' | 'until';
  collection?: string;
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

export interface EndConfig {
  type: 'end';
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay?: number;
}

// Edges
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: EdgeCondition;
  animated?: boolean;
  style?: EdgeStyle;
}

export interface EdgeCondition {
  type: 'success' | 'error' | 'conditional';
  expression?: string;
}

// Ports
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

// Variables
export interface WorkflowVariable {
  id: string;
  name: string;
  type: PortDataType;
  value?: any;
  description?: string;
  scope: 'global' | 'node';
  nodeId?: string;
}

// Settings
export interface WorkflowSettings {
  timeout: number;
  maxConcurrency: number;
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

// Execution
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
  triggeredBy: string;
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

// Styling
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

// Templates
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

// Validation
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

// API requests/responses
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
  settings?: Partial<WorkflowSettings>;
}

export interface UpdateWorkflowRequest extends Partial<CreateWorkflowRequest> {
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
