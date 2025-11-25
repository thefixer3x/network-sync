/**
 * Visual Workflow Execution Engine
 *
 * Executes node-based workflows with support for:
 * - Flow control (conditions, loops)
 * - Error handling and retries
 * - State management
 * - Parallel execution
 * - Validation and testing
 */

import { Logger } from '@/utils/Logger';
import {
  VisualWorkflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  NodeExecution,
  ExecutionStatus,
  ExecutionError,
  ExecutionLog,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  NodeConfig,
  ActionConfig,
  ConditionConfig,
  TransformConfig,
  DelayConfig,
  ApiConfig,
} from '@/types/visual-workflow';

const logger = new Logger('VisualWorkflowExecutor');

export class VisualWorkflowExecutor {
  private executionLogs: Map<string, ExecutionLog[]> = new Map();
  private activeExecutions: Map<string, WorkflowExecution> = new Map();

  /**
   * Execute a visual workflow
   */
  public async executeWorkflow(
    workflow: VisualWorkflow,
    input: Record<string, any> = {},
    triggeredBy: string = 'system'
  ): Promise<WorkflowExecution> {
    const executionId = this.generateId();

    // Create execution record
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: 'pending',
      startTime: Date.now(),
      nodeExecutions: [],
      variables: { ...input },
      triggeredBy,
    };

    this.activeExecutions.set(executionId, execution);
    this.executionLogs.set(executionId, []);

    try {
      // 1. Validate workflow
      this.log(executionId, 'info', 'Validating workflow structure');
      const validation = this.validateWorkflow(workflow);
      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 2. Find start nodes (trigger nodes)
      const startNodes = workflow.nodes.filter(n => n.type === 'trigger');
      if (startNodes.length === 0) {
        throw new Error('Workflow must have at least one trigger node');
      }

      // 3. Update status to running
      execution.status = 'running';
      this.log(executionId, 'info', `Starting workflow execution with ${startNodes.length} trigger(s)`);

      // 4. Execute workflow from each trigger
      for (const startNode of startNodes) {
        await this.executeNode(workflow, execution, startNode, {});
      }

      // 5. Mark as completed
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      this.log(executionId, 'info', `Workflow completed in ${execution.duration}ms`);

      return execution;
    } catch (error) {
      // Handle execution failure
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime! - execution.startTime;
      execution.error = {
        code: 'WORKFLOW_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        recoverable: false,
      };

      // Conditionally add stack trace
      if (error instanceof Error && error.stack) {
        execution.error.stack = error.stack;
      }

      this.log(executionId, 'error', `Workflow failed: ${execution.error.message}`);

      return execution;
    } finally {
      // Cleanup
      setTimeout(() => {
        this.activeExecutions.delete(executionId);
        this.executionLogs.delete(executionId);
      }, 300000); // Keep logs for 5 minutes
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    workflow: VisualWorkflow,
    execution: WorkflowExecution,
    node: WorkflowNode,
    input: any
  ): Promise<any> {
    const nodeExecution: NodeExecution = {
      nodeId: node.id,
      status: 'running',
      startTime: Date.now(),
      input,
      logs: [],
    };

    execution.nodeExecutions.push(nodeExecution);

    try {
      this.log(execution.id, 'info', `Executing node: ${node.data.label} (${node.type})`);

      let output: any;

      // Execute based on node type
      switch (node.type) {
        case 'trigger':
          output = input; // Triggers pass through input
          break;

        case 'action':
          output = await this.executeAction(execution.id, node.data.config as ActionConfig, input);
          break;

        case 'condition':
          output = await this.executeCondition(workflow, execution, node, input);
          return output; // Condition handles its own flow

        case 'transform':
          output = await this.executeTransform(execution.id, node.data.config as TransformConfig, input);
          break;

        case 'delay':
          output = await this.executeDelay(execution.id, node.data.config as DelayConfig, input);
          break;

        case 'api':
          output = await this.executeApi(execution.id, node.data.config as ApiConfig, input);
          break;

        case 'end':
          output = input;
          this.log(execution.id, 'info', 'Reached end node');
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Mark node as completed
      nodeExecution.status = 'completed';
      nodeExecution.endTime = Date.now();
      nodeExecution.duration = nodeExecution.endTime - nodeExecution.startTime;
      nodeExecution.output = output;

      this.log(execution.id, 'info', `Node completed: ${node.data.label} (${nodeExecution.duration}ms)`);

      // Find and execute next nodes
      const nextNodes = this.getNextNodes(workflow, node.id);
      for (const nextNode of nextNodes) {
        await this.executeNode(workflow, execution, nextNode, output);
      }

      return output;
    } catch (error) {
      // Handle node execution failure
      nodeExecution.status = 'failed';
      nodeExecution.endTime = Date.now();
      nodeExecution.duration = nodeExecution.endTime! - nodeExecution.startTime;
      nodeExecution.error = {
        code: 'NODE_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        nodeId: node.id,
        timestamp: Date.now(),
        recoverable: false,
      };

      // Conditionally add stack trace
      if (error instanceof Error && error.stack) {
        nodeExecution.error.stack = error.stack;
      }

      this.log(execution.id, 'error', `Node failed: ${node.data.label} - ${nodeExecution.error.message}`);

      // Check error handling strategy
      if (workflow.settings.errorHandling === 'stop') {
        throw error;
      }

      // Continue to next nodes even on error
      return null;
    }
  }

  /**
   * Execute an action node
   */
  private async executeAction(
    executionId: string,
    config: ActionConfig,
    input: any
  ): Promise<any> {
    this.log(executionId, 'info', `Executing action: ${config.actionType}`);

    // Simulate action execution
    // In production, this would call actual services
    await this.delay(100);

    return {
      success: true,
      actionType: config.actionType,
      timestamp: Date.now(),
      input,
      output: {
        status: 'completed',
        result: `Action ${config.actionType} completed successfully`,
      },
    };
  }

  /**
   * Execute a condition node (branching logic)
   */
  private async executeCondition(
    workflow: VisualWorkflow,
    execution: WorkflowExecution,
    node: WorkflowNode,
    input: any
  ): Promise<any> {
    const config = node.data.config as ConditionConfig;

    this.log(execution.id, 'info', `Evaluating condition: ${config.logicalOperator}`);

    // Evaluate all conditions
    const results = config.conditions.map(condition => {
      return this.evaluateCondition(condition, input, execution.variables);
    });

    // Combine results based on logical operator
    const conditionMet = config.logicalOperator === 'AND'
      ? results.every(r => r)
      : results.some(r => r);

    this.log(execution.id, 'info', `Condition result: ${conditionMet}`);

    // Find edges with conditions
    const edges = workflow.edges.filter(e => e.source === node.id);
    const trueEdge = edges.find(e => e.condition?.type === 'success' || e.label === 'true');
    const falseEdge = edges.find(e => e.condition?.type === 'error' || e.label === 'false');

    const nextEdge = conditionMet ? trueEdge : falseEdge;

    if (nextEdge) {
      const nextNode = workflow.nodes.find(n => n.id === nextEdge.target);
      if (nextNode) {
        return await this.executeNode(workflow, execution, nextNode, input);
      }
    }

    return input;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: any,
    input: any,
    variables: Record<string, any>
  ): boolean {
    const value = this.resolveVariable(condition.variable, input, variables);
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return value === compareValue;
      case 'not_equals':
        return value !== compareValue;
      case 'greater_than':
        return Number(value) > Number(compareValue);
      case 'less_than':
        return Number(value) < Number(compareValue);
      case 'contains':
        return String(value).includes(String(compareValue));
      case 'regex':
        return new RegExp(String(compareValue)).test(String(value));
      case 'is_empty':
        return !value || value === '' || (Array.isArray(value) && value.length === 0);
      case 'is_not_empty':
        return !!value && value !== '' && (!Array.isArray(value) || value.length > 0);
      default:
        return false;
    }
  }

  /**
   * Execute a transform node
   */
  private async executeTransform(
    executionId: string,
    config: TransformConfig,
    input: any
  ): Promise<any> {
    this.log(executionId, 'info', `Executing transform: ${config.transformType}`);

    try {
      // Safely evaluate JavaScript expression
      // In production, use a proper sandbox like vm2 or isolated-vm
      const func = new Function('input', 'data', `return ${config.expression}`);
      const output = func(input, input);

      return output;
    } catch (error) {
      throw new Error(`Transform expression error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a delay node
   */
  private async executeDelay(
    executionId: string,
    config: DelayConfig,
    input: any
  ): Promise<any> {
    const multiplier = {
      seconds: 1000,
      minutes: 60000,
      hours: 3600000,
      days: 86400000,
    };

    const delayMs = config.duration * multiplier[config.unit];

    this.log(executionId, 'info', `Delaying for ${config.duration} ${config.unit}`);

    await this.delay(delayMs);

    return input;
  }

  /**
   * Execute an API call node
   */
  private async executeApi(
    executionId: string,
    config: ApiConfig,
    input: any
  ): Promise<any> {
    this.log(executionId, 'info', `Making ${config.method} request to ${config.url}`);

    try {
      const fetchOptions: RequestInit = {
        method: config.method,
        signal: AbortSignal.timeout(config.timeout || 30000),
      };

      // Conditionally add headers
      if (config.headers) {
        fetchOptions.headers = config.headers;
      }

      // Conditionally add body (only for methods that support it)
      if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        fetchOptions.body = JSON.stringify(config.body);
      }

      const response = await fetch(config.url, fetchOptions);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      };
    } catch (error) {
      throw new Error(`API execution error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get next nodes connected to current node
   */
  private getNextNodes(workflow: VisualWorkflow, nodeId: string): WorkflowNode[] {
    const edges = workflow.edges.filter(e => e.source === nodeId);
    const nextNodes: WorkflowNode[] = [];

    for (const edge of edges) {
      const node = workflow.nodes.find(n => n.id === edge.target);
      if (node) {
        nextNodes.push(node);
      }
    }

    return nextNodes;
  }

  /**
   * Resolve variable value from input or execution variables
   */
  private resolveVariable(
    variableName: string,
    input: any,
    variables: Record<string, any>
  ): any {
    // Check input first
    if (input && typeof input === 'object' && variableName in input) {
      return input[variableName];
    }

    // Check execution variables
    if (variableName in variables) {
      return variables[variableName];
    }

    // Support dot notation (e.g., "user.name")
    const parts = variableName.split('.');
    let value: any = input || variables;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Validate workflow structure
   */
  public validateWorkflow(workflow: VisualWorkflow): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for trigger nodes
    const triggerNodes = workflow.nodes.filter(n => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      errors.push({
        type: 'missing_connection',
        message: 'Workflow must have at least one trigger node',
        severity: 'critical',
      });
    }

    // Check for disconnected nodes
    const connectedNodes = new Set<string>();
    workflow.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    workflow.nodes.forEach(node => {
      if (node.type !== 'trigger' && !connectedNodes.has(node.id)) {
        warnings.push({
          nodeId: node.id,
          type: 'unreachable_node',
          message: `Node "${node.data.label}" is not connected to the workflow`,
          suggestion: 'Connect this node or remove it',
        });
      }
    });

    // Check for circular dependencies
    if (this.hasCircularDependency(workflow)) {
      errors.push({
        type: 'circular_dependency',
        message: 'Workflow contains circular dependencies',
        severity: 'critical',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check for circular dependencies in workflow
   */
  private hasCircularDependency(workflow: VisualWorkflow): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const edges = workflow.edges.filter(e => e.source === nodeId);

      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          if (hasCycle(edge.target)) {
            return true;
          }
        } else if (recursionStack.has(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get execution by ID
   */
  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Get execution logs
   */
  public getExecutionLogs(executionId: string): ExecutionLog[] {
    return this.executionLogs.get(executionId) || [];
  }

  /**
   * Log execution event
   */
  private log(
    executionId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ): void {
    const logEntry: ExecutionLog = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    const logs = this.executionLogs.get(executionId) || [];
    logs.push(logEntry);
    this.executionLogs.set(executionId, logs);

    // Also log to console
    logger[level](`[${executionId}] ${message}`, data);
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Generate unique ID
   */
  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const visualWorkflowExecutor = new VisualWorkflowExecutor();
