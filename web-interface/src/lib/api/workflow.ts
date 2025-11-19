/**
 * Workflow API Client
 *
 * Client for interacting with the visual workflow API
 */

import axios from 'axios';
import type {
  VisualWorkflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowExecution,
  WorkflowTemplate,
  ValidationResult,
} from '@/types/workflow';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/visual-workflows`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const workflowApi = {
  /**
   * Get all workflows
   */
  async getAll(): Promise<{ workflows: VisualWorkflow[]; total: number }> {
    const response = await api.get('/');
    return response.data;
  },

  /**
   * Get a specific workflow by ID
   */
  async getById(id: string): Promise<VisualWorkflow> {
    const response = await api.get(`/${id}`);
    return response.data.workflow;
  },

  /**
   * Create a new workflow
   */
  async create(data: CreateWorkflowRequest): Promise<{
    workflow: VisualWorkflow;
    validation: ValidationResult;
  }> {
    const response = await api.post('/', data);
    return response.data;
  },

  /**
   * Update an existing workflow
   */
  async update(id: string, data: UpdateWorkflowRequest): Promise<{
    workflow: VisualWorkflow;
    validation: ValidationResult;
  }> {
    const response = await api.patch(`/${id}`, data);
    return response.data;
  },

  /**
   * Delete a workflow
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/${id}`);
  },

  /**
   * Execute a workflow
   */
  async execute(
    id: string,
    input?: Record<string, any>,
    dryRun?: boolean
  ): Promise<{
    execution: WorkflowExecution;
    logs: any[];
  }> {
    const response = await api.post(`/${id}/execute`, {
      input,
      dryRun,
    });
    return response.data;
  },

  /**
   * Get execution status and logs
   */
  async getExecution(
    workflowId: string,
    executionId: string
  ): Promise<{
    execution: WorkflowExecution;
    logs: any[];
  }> {
    const response = await api.get(`/${workflowId}/executions/${executionId}`);
    return response.data;
  },

  /**
   * Validate a workflow without saving
   */
  async validate(workflow: Partial<VisualWorkflow>): Promise<ValidationResult> {
    const response = await api.post('/validate', workflow);
    return response.data.validation;
  },

  /**
   * Get all workflow templates
   */
  async getTemplates(): Promise<{
    templates: WorkflowTemplate[];
    total: number;
  }> {
    const response = await api.get('/templates/all');
    return response.data;
  },

  /**
   * Save workflow as template
   */
  async saveAsTemplate(
    workflowId: string,
    data: {
      category?: string;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      thumbnail?: string;
    }
  ): Promise<WorkflowTemplate> {
    const response = await api.post(`/${workflowId}/template`, data);
    return response.data.template;
  },
};

// React hooks for workflow API (using SWR)
export function useWorkflows() {
  const { default: useSWR } = require('swr');
  return useSWR('/visual-workflows', () => workflowApi.getAll());
}

export function useWorkflow(id: string | null) {
  const { default: useSWR } = require('swr');
  return useSWR(id ? `/visual-workflows/${id}` : null, () =>
    id ? workflowApi.getById(id) : null
  );
}

export function useTemplates() {
  const { default: useSWR } = require('swr');
  return useSWR('/visual-workflows/templates', () => workflowApi.getTemplates());
}
