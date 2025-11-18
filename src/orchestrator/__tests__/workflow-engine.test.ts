/**
 * Tests for Workflow Engine
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WorkflowEngine, type WorkflowRequest, type WorkflowResult } from '../workflow-engine.js';

// Mock the agents and storage
jest.mock('../../agents/perplexity-agent.js');
jest.mock('../../agents/claude-agent.js');
jest.mock('../../storage/vector-store.js');
jest.mock('../../examples/memory-integration.js');

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new WorkflowEngine();
  });

  describe('constructor', () => {
    it('should create workflow engine instance', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(WorkflowEngine);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute social_campaign workflow successfully', async () => {
      const request: WorkflowRequest = {
        id: 'test-workflow-1',
        type: 'social_campaign',
        topic: 'AI automation trends',
        platforms: ['twitter', 'linkedin'],
        parameters: {},
        brand_voice: 'professional',
        target_audience: 'tech professionals',
        goals: ['increase engagement', 'build authority'],
      };

      // Mock agent methods
      const mockPerplexityResearch = jest.fn().mockResolvedValue({
        summary: 'AI automation is trending',
        fullContent: 'Detailed research content...',
        citations: [],
        images: [],
        metadata: {},
      });

      const mockClaudeGenerate = jest.fn().mockResolvedValue({
        content: 'Generated content',
        metadata: {},
      });

      // Access private agents through type casting
      (engine as any).perplexityAgent.research = mockPerplexityResearch;
      (engine as any).claudeAgent.generateContent = mockClaudeGenerate;

      // Mock memory storage
      (engine as any).memoryStorage.store = jest.fn().mockResolvedValue('memory-id-123');

      const result = await engine.executeWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.workflow_id).toBe('test-workflow-1');
      expect(result.completed_phases).toContain('research');
      expect(result.failed_phases).toHaveLength(0);
      expect(result.execution_time).toBeGreaterThan(0);
    }, 60000); // Extended timeout for workflow execution

    it('should handle workflow errors gracefully', async () => {
      const request: WorkflowRequest = {
        id: 'test-workflow-error',
        type: 'social_campaign',
        topic: 'Test error handling',
        platforms: ['twitter'],
        parameters: {},
      };

      // Mock agent to throw error
      (engine as any).perplexityAgent.research = jest.fn().mockRejectedValue(
        new Error('API error'),
      );

      const result = await engine.executeWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
      expect(result.failed_phases.length).toBeGreaterThan(0);
    }, 60000);

    it('should execute content_creation workflow', async () => {
      const request: WorkflowRequest = {
        id: 'test-content-1',
        type: 'content_creation',
        topic: 'Product launch announcement',
        platforms: ['linkedin'],
        parameters: {
          product: 'New AI Tool',
          features: ['automation', 'analytics'],
        },
      };

      // Mock successful execution
      (engine as any).perplexityAgent.research = jest.fn().mockResolvedValue({});
      (engine as any).claudeAgent.generateContent = jest.fn().mockResolvedValue({
        content: 'Product launch post',
      });
      (engine as any).memoryStorage.store = jest.fn().mockResolvedValue('id');

      const result = await engine.executeWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.workflow_id).toBe('test-content-1');
    }, 60000);

    it('should execute research_analysis workflow', async () => {
      const request: WorkflowRequest = {
        id: 'test-research-1',
        type: 'research_analysis',
        topic: 'Market trends in AI',
        platforms: [],
        parameters: {
          depth: 'comprehensive',
          sources: ['academic', 'industry'],
        },
      };

      // Mock successful execution
      (engine as any).perplexityAgent.research = jest.fn().mockResolvedValue({
        summary: 'Market analysis',
      });
      (engine as any).claudeAgent.generateContent = jest.fn().mockResolvedValue({
        content: 'Analysis report',
      });
      (engine as any).memoryStorage.store = jest.fn().mockResolvedValue('id');

      const result = await engine.executeWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.workflow_id).toBe('test-research-1');
    }, 60000);

    it('should execute competitive_analysis workflow', async () => {
      const request: WorkflowRequest = {
        id: 'test-competitive-1',
        type: 'competitive_analysis',
        topic: 'Competitor strategy analysis',
        platforms: [],
        parameters: {
          competitors: ['Company A', 'Company B'],
          aspects: ['pricing', 'features', 'marketing'],
        },
      };

      // Mock successful execution
      (engine as any).perplexityAgent.research = jest.fn().mockResolvedValue({
        summary: 'Competitive insights',
      });
      (engine as any).claudeAgent.generateContent = jest.fn().mockResolvedValue({
        content: 'Competitive analysis',
      });
      (engine as any).memoryStorage.store = jest.fn().mockResolvedValue('id');

      const result = await engine.executeWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.workflow_id).toBe('test-competitive-1');
    }, 60000);
  });

  describe('workflow dependencies', () => {
    it('should execute phases in correct order respecting dependencies', async () => {
      const request: WorkflowRequest = {
        id: 'test-deps-1',
        type: 'social_campaign',
        topic: 'Dependency test',
        platforms: ['twitter'],
        parameters: {},
      };

      const executionOrder: string[] = [];

      // Mock agents to track execution order
      (engine as any).perplexityAgent.research = jest.fn().mockImplementation(() => {
        executionOrder.push('research');
        return Promise.resolve({ summary: 'Research done' });
      });

      (engine as any).claudeAgent.generateContent = jest.fn().mockImplementation(() => {
        executionOrder.push('claude');
        return Promise.resolve({ content: 'Content generated' });
      });

      (engine as any).memoryStorage.store = jest.fn().mockResolvedValue('id');

      await engine.executeWorkflow(request);

      // Verify research happens before content generation
      const researchIndex = executionOrder.indexOf('research');
      const claudeIndex = executionOrder.lastIndexOf('claude');
      expect(researchIndex).toBeLessThan(claudeIndex);
    }, 60000);
  });

  describe('workflow results storage', () => {
    it('should store workflow results in memory', async () => {
      const request: WorkflowRequest = {
        id: 'test-storage-1',
        type: 'content_creation',
        topic: 'Storage test',
        platforms: ['twitter'],
        parameters: {},
      };

      const mockStore = jest.fn().mockResolvedValue('memory-id-456');
      (engine as any).perplexityAgent.research = jest.fn().mockResolvedValue({});
      (engine as any).claudeAgent.generateContent = jest.fn().mockResolvedValue({});
      (engine as any).memoryStorage.store = mockStore;

      await engine.executeWorkflow(request);

      // Verify memory storage was called
      expect(mockStore).toHaveBeenCalled();
    }, 60000);
  });

  describe('workflow execution tracking', () => {
    it('should track execution time', async () => {
      const request: WorkflowRequest = {
        id: 'test-timing-1',
        type: 'content_creation',
        topic: 'Timing test',
        platforms: ['twitter'],
        parameters: {},
      };

      (engine as any).perplexityAgent.research = jest.fn().mockResolvedValue({});
      (engine as any).claudeAgent.generateContent = jest.fn().mockResolvedValue({});
      (engine as any).memoryStorage.store = jest.fn().mockResolvedValue('id');

      const result = await engine.executeWorkflow(request);

      expect(result.execution_time).toBeGreaterThan(0);
      expect(typeof result.execution_time).toBe('number');
    }, 60000);

    it('should return completed and failed phases', async () => {
      const request: WorkflowRequest = {
        id: 'test-phases-1',
        type: 'social_campaign',
        topic: 'Phase tracking test',
        platforms: ['twitter'],
        parameters: {},
      };

      (engine as any).perplexityAgent.research = jest.fn().mockResolvedValue({});
      (engine as any).claudeAgent.generateContent = jest.fn().mockResolvedValue({});
      (engine as any).memoryStorage.store = jest.fn().mockResolvedValue('id');

      const result = await engine.executeWorkflow(request);

      expect(Array.isArray(result.completed_phases)).toBe(true);
      expect(Array.isArray(result.failed_phases)).toBe(true);
      expect(result.completed_phases.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('error handling', () => {
    it('should handle agent failures', async () => {
      const request: WorkflowRequest = {
        id: 'test-agent-fail-1',
        type: 'content_creation',
        topic: 'Agent failure test',
        platforms: ['twitter'],
        parameters: {},
      };

      (engine as any).perplexityAgent.research = jest.fn().mockRejectedValue(
        new Error('Agent unavailable'),
      );

      const result = await engine.executeWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 60000);

    it('should handle network errors', async () => {
      const request: WorkflowRequest = {
        id: 'test-network-fail-1',
        type: 'content_creation',
        topic: 'Network error test',
        platforms: ['twitter'],
        parameters: {},
      };

      (engine as any).perplexityAgent.research = jest.fn().mockRejectedValue(
        new Error('Network timeout'),
      );

      const result = await engine.executeWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 60000);

    it('should handle invalid workflow type', async () => {
      const request = {
        id: 'test-invalid-1',
        type: 'invalid_type' as any,
        topic: 'Invalid type test',
        platforms: ['twitter'],
        parameters: {},
      };

      const result = await engine.executeWorkflow(request);

      // Should handle gracefully (empty phases array)
      expect(result.success).toBe(true);
      expect(result.completed_phases).toHaveLength(0);
    }, 60000);
  });

  describe('concurrent workflow execution', () => {
    it('should handle multiple workflows concurrently', async () => {
      const request1: WorkflowRequest = {
        id: 'concurrent-1',
        type: 'content_creation',
        topic: 'First workflow',
        platforms: ['twitter'],
        parameters: {},
      };

      const request2: WorkflowRequest = {
        id: 'concurrent-2',
        type: 'content_creation',
        topic: 'Second workflow',
        platforms: ['linkedin'],
        parameters: {},
      };

      (engine as any).perplexityAgent.research = jest.fn().mockResolvedValue({});
      (engine as any).claudeAgent.generateContent = jest.fn().mockResolvedValue({});
      (engine as any).memoryStorage.store = jest.fn().mockResolvedValue('id');

      // Execute concurrently
      const [result1, result2] = await Promise.all([
        engine.executeWorkflow(request1),
        engine.executeWorkflow(request2),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.workflow_id).toBe('concurrent-1');
      expect(result2.workflow_id).toBe('concurrent-2');
    }, 60000);
  });
});
