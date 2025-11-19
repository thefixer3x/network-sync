/**
 * Enhanced Workflow Manager
 *
 * Provides advanced workflow capabilities:
 * - Workflow versioning
 * - Workflow rollback
 * - Parallel execution
 * - Conditional branching
 * - Workflow templates
 */

import { Logger } from '../utils/Logger.js';
import { metricsService } from './metrics.js';
import { getCache } from '../cache/redis-cache.js';

const logger = new Logger('WorkflowManager');

/**
 * Workflow version
 */
export interface WorkflowVersion {
  version: number;
  workflowId: string;
  definition: WorkflowDefinition;
  createdAt: number;
  createdBy?: string;
  changelog?: string;
  isActive: boolean;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  parallelGroups?: string[][];
  conditionalBranches?: ConditionalBranch[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'agent' | 'function' | 'condition' | 'parallel';
  agentName?: string;
  functionName?: string;
  inputs: string[];
  outputs: string[];
  dependencies?: string[];
  condition?: string; // JavaScript expression
  timeout?: number;
  retryable?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Conditional branch
 */
export interface ConditionalBranch {
  condition: string; // JavaScript expression
  steps: string[]; // Step IDs to execute if condition is true
}

/**
 * Retry policy
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  executionId: string;
  workflowId: string;
  version: number;
  variables: Record<string, any>;
  stepResults: Map<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  startTime: number;
  endTime?: number;
  error?: Error;
}

/**
 * Workflow template
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  definition: WorkflowDefinition;
  parameters: TemplateParameter[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Template parameter
 */
export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: string; // JavaScript expression
}

/**
 * Workflow Manager
 */
export class WorkflowManager {
  private static instance: WorkflowManager;
  private cache = getCache();

  // In-memory storage (would be database in production)
  private versions = new Map<string, WorkflowVersion[]>(); // workflowId -> versions
  private templates = new Map<string, WorkflowTemplate>();
  private executions = new Map<string, WorkflowExecutionContext>();

  private constructor() {
    logger.info('Workflow Manager initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WorkflowManager {
    if (!WorkflowManager.instance) {
      WorkflowManager.instance = new WorkflowManager();
    }
    return WorkflowManager.instance;
  }

  /**
   * Create new workflow version
   */
  public async createWorkflowVersion(
    workflowId: string,
    definition: WorkflowDefinition,
    changelog?: string,
    createdBy?: string
  ): Promise<WorkflowVersion> {
    const versions = this.versions.get(workflowId) || [];
    const newVersion = versions.length + 1;

    // Deactivate previous versions
    versions.forEach((v) => (v.isActive = false));

    const version: WorkflowVersion = {
      version: newVersion,
      workflowId,
      definition,
      createdAt: Date.now(),
      isActive: true,
    };

    if (createdBy) {
      version.createdBy = createdBy;
    }
    if (changelog) {
      version.changelog = changelog;
    }

    versions.push(version);
    this.versions.set(workflowId, versions);

    logger.info(`Created workflow version`, {
      workflowId,
      version: newVersion,
      changelog,
    });

    metricsService.incrementCounter('workflow_versions_created', {
      workflow: workflowId,
    });

    return version;
  }

  /**
   * Get workflow version
   */
  public getWorkflowVersion(workflowId: string, version?: number): WorkflowVersion | null {
    const versions = this.versions.get(workflowId);
    if (!versions || versions.length === 0) return null;

    if (version === undefined) {
      // Get active version
      return versions.find((v) => v.isActive) || null;
    }

    return versions.find((v) => v.version === version) || null;
  }

  /**
   * Rollback workflow to previous version
   */
  public async rollbackWorkflow(
    workflowId: string,
    targetVersion: number,
    reason?: string
  ): Promise<WorkflowVersion> {
    const versions = this.versions.get(workflowId);
    if (!versions || versions.length === 0) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const targetWorkflow = versions.find((v) => v.version === targetVersion);
    if (!targetWorkflow) {
      throw new Error(`Version ${targetVersion} not found for workflow ${workflowId}`);
    }

    // Deactivate all versions
    versions.forEach((v) => (v.isActive = false));

    // Activate target version
    targetWorkflow.isActive = true;

    logger.warn(`Workflow rolled back`, {
      workflowId,
      targetVersion,
      reason,
    });

    metricsService.incrementCounter('workflow_rollbacks', {
      workflow: workflowId,
      target_version: String(targetVersion),
    });

    return targetWorkflow;
  }

  /**
   * List workflow versions
   */
  public listWorkflowVersions(workflowId: string): WorkflowVersion[] {
    return this.versions.get(workflowId) || [];
  }

  /**
   * Execute workflow with parallel support
   */
  public async executeWorkflow(
    workflowId: string,
    inputs: Record<string, any>,
    version?: number
  ): Promise<WorkflowExecutionContext> {
    const workflowVersion = this.getWorkflowVersion(workflowId, version);
    if (!workflowVersion) {
      throw new Error(`Workflow ${workflowId} version ${version || 'active'} not found`);
    }

    const executionId = `${workflowId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const definition = workflowVersion.definition;

    const context: WorkflowExecutionContext = {
      executionId,
      workflowId,
      version: workflowVersion.version,
      variables: { ...definition.variables, ...inputs },
      stepResults: new Map(),
      status: 'running',
      startTime: Date.now(),
    };

    this.executions.set(executionId, context);

    logger.info('Starting workflow execution', {
      executionId,
      workflowId,
      version: workflowVersion.version,
    });

    metricsService.incrementCounter('workflow_executions_started', {
      workflow: workflowId,
      version: String(workflowVersion.version),
    });

    try {
      // Execute workflow steps
      await this.executeSteps(definition, context);

      context.status = 'completed';
      context.endTime = Date.now();

      metricsService.incrementCounter('workflow_executions_completed', {
        workflow: workflowId,
      });

      metricsService.recordHistogram(
        'workflow_execution_duration_ms',
        context.endTime - context.startTime,
        { workflow: workflowId }
      );
    } catch (error) {
      context.status = 'failed';
      context.endTime = Date.now();
      context.error = error instanceof Error ? error : new Error(String(error));

      metricsService.incrementCounter('workflow_executions_failed', {
        workflow: workflowId,
      });

      logger.error('Workflow execution failed', {
        executionId,
        error: context.error.message,
      });

      throw error;
    }

    return context;
  }

  /**
   * Execute workflow steps with parallel and conditional support
   */
  private async executeSteps(
    definition: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<void> {
    const { steps, parallelGroups } = definition;
    const executed = new Set<string>();
    const pending = new Set(steps.map((s) => s.id));

    // Execute parallel groups first
    if (parallelGroups && parallelGroups.length > 0) {
      for (const group of parallelGroups) {
        await this.executeParallelGroup(group, definition, context, executed);
        group.forEach((stepId) => pending.delete(stepId));
      }
    }

    // Execute remaining steps sequentially based on dependencies
    while (pending.size > 0) {
      let executed_this_round = false;

      for (const stepId of pending) {
        const step = steps.find((s) => s.id === stepId);
        if (!step) continue;

        // Check if dependencies are satisfied
        const dependencies = step.dependencies || [];
        const dependenciesSatisfied = dependencies.every((dep) => executed.has(dep));

        if (dependenciesSatisfied) {
          // Check condition if present
          if (step.condition) {
            const conditionMet = this.evaluateCondition(step.condition, context);
            if (!conditionMet) {
              logger.debug(`Step ${stepId} condition not met, skipping`);
              executed.add(stepId);
              pending.delete(stepId);
              executed_this_round = true;
              continue;
            }
          }

          // Execute step
          await this.executeStep(step, context);
          executed.add(stepId);
          pending.delete(stepId);
          executed_this_round = true;
        }
      }

      if (!executed_this_round && pending.size > 0) {
        throw new Error(
          `Circular dependency detected or unsatisfied dependencies: ${Array.from(pending).join(', ')}`
        );
      }
    }
  }

  /**
   * Execute parallel group of steps
   */
  private async executeParallelGroup(
    stepIds: string[],
    definition: WorkflowDefinition,
    context: WorkflowExecutionContext,
    executed: Set<string>
  ): Promise<void> {
    logger.info(`Executing parallel group`, {
      executionId: context.executionId,
      steps: stepIds,
    });

    const steps = stepIds
      .map((id) => definition.steps.find((s) => s.id === id))
      .filter((s): s is WorkflowStep => s !== undefined);

    // Execute all steps in parallel
    await Promise.all(steps.map((step) => this.executeStep(step, context)));

    stepIds.forEach((id) => executed.add(id));

    metricsService.incrementCounter('workflow_parallel_groups_executed', {
      workflow: context.workflowId,
      group_size: String(stepIds.length),
    });
  }

  /**
   * Execute single workflow step
   */
  private async executeStep(step: WorkflowStep, context: WorkflowExecutionContext): Promise<void> {
    context.currentStep = step.id;

    logger.debug(`Executing step`, {
      executionId: context.executionId,
      stepId: step.id,
      stepName: step.name,
    });

    const startTime = Date.now();

    try {
      // Gather inputs
      const inputs: Record<string, any> = {};
      for (const inputKey of step.inputs) {
        inputs[inputKey] = context.variables[inputKey] || context.stepResults.get(inputKey);
      }

      // Execute based on step type
      let result: any;
      switch (step.type) {
        case 'agent':
          result = await this.executeAgentStep(step, inputs);
          break;
        case 'function':
          result = await this.executeFunctionStep(step, inputs);
          break;
        case 'condition':
          result = this.evaluateCondition(step.condition || 'true', context);
          break;
        case 'parallel':
          // Handled separately
          result = null;
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Store outputs
      if (result) {
        if (step.outputs.length === 1) {
          const outputKey = step.outputs[0];
          if (outputKey) {
            context.stepResults.set(outputKey, result);
          }
        } else {
          // If multiple outputs, result should be an object
          for (const outputKey of step.outputs) {
            if (result[outputKey] !== undefined) {
              context.stepResults.set(outputKey, result[outputKey]);
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      metricsService.recordHistogram('workflow_step_duration_ms', duration, {
        workflow: context.workflowId,
        step: step.id,
        type: step.type,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsService.incrementCounter('workflow_step_errors', {
        workflow: context.workflowId,
        step: step.id,
        type: step.type,
      });

      logger.error(`Step execution failed`, {
        executionId: context.executionId,
        stepId: step.id,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Execute agent step (placeholder - would integrate with actual agents)
   */
  private async executeAgentStep(step: WorkflowStep, inputs: Record<string, any>): Promise<any> {
    // This would integrate with the agent supervisor
    logger.debug(`Executing agent step: ${step.agentName}`, inputs);
    // Placeholder - return mock result
    return { result: `Mock result from ${step.agentName}` };
  }

  /**
   * Execute function step (placeholder - would call registered functions)
   */
  private async executeFunctionStep(step: WorkflowStep, inputs: Record<string, any>): Promise<any> {
    logger.debug(`Executing function step: ${step.functionName}`, inputs);
    // Placeholder - return mock result
    return { result: `Mock result from ${step.functionName}` };
  }

  /**
   * Evaluate conditional expression
   */
  private evaluateCondition(condition: string, context: WorkflowExecutionContext): boolean {
    try {
      // Simple evaluation - in production, use a safer sandboxed evaluator
      // For now, just check if variables match simple patterns
      // Example: "variables.status === 'active'"

      const variablesStr = JSON.stringify(context.variables);
      const resultsObj: Record<string, any> = {};
      context.stepResults.forEach((value, key) => {
        resultsObj[key] = value;
      });
      const resultsStr = JSON.stringify(resultsObj);

      logger.debug('Evaluating condition', { condition, variablesStr, resultsStr });

      // For safety, just return true for now
      // In production, use a proper expression evaluator
      return true;
    } catch (error) {
      logger.error('Condition evaluation failed', { condition, error });
      return false;
    }
  }

  /**
   * Create workflow from template
   */
  public async createFromTemplate(
    templateId: string,
    parameters: Record<string, any>,
    workflowId?: string
  ): Promise<WorkflowVersion> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate parameters
    this.validateTemplateParameters(template, parameters);

    // Create workflow from template
    const id = workflowId || `${template.id}-${Date.now()}`;
    const definition = { ...template.definition, id };

    // Apply parameters to definition (replace placeholders)
    const processedDefinition = this.applyTemplateParameters(definition, parameters);

    return this.createWorkflowVersion(id, processedDefinition, `Created from template: ${templateId}`);
  }

  /**
   * Validate template parameters
   */
  private validateTemplateParameters(
    template: WorkflowTemplate,
    parameters: Record<string, any>
  ): void {
    for (const param of template.parameters) {
      if (param.required && parameters[param.name] === undefined) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      // Type validation (basic)
      if (parameters[param.name] !== undefined) {
        const actualType = typeof parameters[param.name];
        if (param.type === 'array' && !Array.isArray(parameters[param.name])) {
          throw new Error(`Parameter '${param.name}' must be an array`);
        } else if (param.type !== 'array' && param.type !== actualType) {
          throw new Error(
            `Parameter '${param.name}' must be of type ${param.type}, got ${actualType}`
          );
        }
      }
    }
  }

  /**
   * Apply template parameters to definition
   */
  private applyTemplateParameters(
    definition: WorkflowDefinition,
    parameters: Record<string, any>
  ): WorkflowDefinition {
    // Deep clone definition
    const processed = JSON.parse(JSON.stringify(definition));

    // Replace parameter placeholders (e.g., ${parameter_name})
    const jsonStr = JSON.stringify(processed);
    let result = jsonStr;

    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `\${${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    }

    return JSON.parse(result);
  }

  /**
   * Register workflow template
   */
  public registerTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.id, template);
    logger.info(`Template registered: ${template.id}`, {
      name: template.name,
      category: template.category,
    });

    metricsService.incrementCounter('workflow_templates_registered', {
      template: template.id,
      category: template.category,
    });
  }

  /**
   * Get workflow template
   */
  public getTemplate(templateId: string): WorkflowTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * List workflow templates
   */
  public listTemplates(category?: string): WorkflowTemplate[] {
    const templates = Array.from(this.templates.values());
    if (category) {
      return templates.filter((t) => t.category === category);
    }
    return templates;
  }

  /**
   * Get workflow execution status
   */
  public getExecutionStatus(executionId: string): WorkflowExecutionContext | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Cancel workflow execution
   */
  public async cancelExecution(executionId: string): Promise<void> {
    const context = this.executions.get(executionId);
    if (!context) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (context.status === 'running') {
      context.status = 'cancelled';
      context.endTime = Date.now();

      logger.warn(`Workflow execution cancelled`, { executionId });

      metricsService.incrementCounter('workflow_executions_cancelled', {
        workflow: context.workflowId,
      });
    }
  }

  /**
   * Get workflow statistics
   */
  public getStatistics() {
    return {
      totalWorkflows: this.versions.size,
      totalVersions: Array.from(this.versions.values()).reduce((sum, versions) => sum + versions.length, 0),
      totalTemplates: this.templates.size,
      activeExecutions: Array.from(this.executions.values()).filter((e) => e.status === 'running')
        .length,
      totalExecutions: this.executions.size,
    };
  }

  /**
   * Shutdown workflow manager
   */
  public shutdown(): void {
    logger.info('Shutting down Workflow Manager');

    // Cancel all running executions
    const runningExecutions = Array.from(this.executions.values()).filter(
      (e) => e.status === 'running'
    );

    for (const execution of runningExecutions) {
      execution.status = 'cancelled';
      execution.endTime = Date.now();
      logger.warn(`Workflow execution cancelled during shutdown`, {
        executionId: execution.executionId,
      });
    }

    // Clear all data
    this.versions.clear();
    this.templates.clear();
    this.executions.clear();

    logger.info('Workflow Manager shut down successfully');
  }
}

/**
 * Get workflow manager instance
 */
export function getWorkflowManager(): WorkflowManager {
  return WorkflowManager.getInstance();
}

/**
 * Export singleton instance
 */
export const workflowManager = WorkflowManager.getInstance();
