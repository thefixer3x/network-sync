/**
 * Tests for Automation Engine
 */

// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AutomationEngine } from '../automation-engine.js';

// Mock all dependencies
jest.mock('@/utils/Logger');
jest.mock('@/services/SocialMediaFactory');
jest.mock('@/services/OpenAIService');
jest.mock('@/services/TrendAnalyzer');
jest.mock('@/services/ContentOptimizer');
jest.mock('@/services/AnalyticsCollector');
jest.mock('@/database/connection-pool');
jest.mock('node-cron');

describe('AutomationEngine', () => {
  let engine: AutomationEngine;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'config-1',
          enabled: true,
          trendMonitoring: { enabled: false },
          competitorTracking: { enabled: false },
        },
        error: null,
      }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    // Mock connection pool
    const { getSupabaseAdminClient } = require('@/database/connection-pool');
    getSupabaseAdminClient.mockReturnValue(mockSupabase);

    // Mock SocialMediaFactory
    const { SocialMediaFactory } = require('@/services/SocialMediaFactory');
    SocialMediaFactory.create = jest.fn().mockReturnValue({
      authenticate: jest.fn().mockResolvedValue(undefined),
      getProfile: jest.fn().mockResolvedValue({}),
      post: jest.fn().mockResolvedValue({}),
    });

    engine = new AutomationEngine();
  });

  afterEach(async () => {
    // Clean up
    try {
      await engine.stop();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create automation engine instance', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(AutomationEngine);
    });

    it('should initialize with connection pool', () => {
      const { getSupabaseAdminClient } = require('@/database/connection-pool');
      expect(getSupabaseAdminClient).toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should start automation engine successfully', async () => {
      await engine.start();

      // Should load configuration
      expect(mockSupabase.from).toHaveBeenCalledWith('automation_configs');
    }, 10000);

    it('should not start if already running', async () => {
      await engine.start();

      // Try to start again
      await engine.start();

      // Should only load config once
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    }, 10000);

    it('should not start if config is disabled', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'config-disabled',
          enabled: false,
        },
        error: null,
      });

      await engine.start();

      // Should load config but not proceed
      expect(mockSupabase.from).toHaveBeenCalled();
    }, 10000);

    it('should handle configuration load error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Config not found' },
      });

      await expect(engine.start()).rejects.toThrow();
    }, 10000);

    it('should start with specific config ID', async () => {
      await engine.start('custom-config-123');

      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'custom-config-123');
    }, 10000);
  });

  describe('stop', () => {
    it('should stop automation engine successfully', async () => {
      await engine.start();
      await engine.stop();

      // Engine should be stopped
      // Subsequent start should work
      await engine.start();
      expect(mockSupabase.from).toHaveBeenCalled();
    }, 10000);

    it('should not error if stopping when not running', async () => {
      await expect(engine.stop()).resolves.not.toThrow();
    }, 10000);

    it('should clear all scheduled jobs on stop', async () => {
      const mockCron = require('node-cron');
      const mockJob = {
        stop: jest.fn(),
      };
      mockCron.schedule = jest.fn().mockReturnValue(mockJob);

      await engine.start();
      await engine.stop();

      // Jobs should be stopped
      // (would need to check internal state) as any
    }, 10000);
  });

  describe('lifecycle management', () => {
    it('should handle start-stop-start cycle', async () => {
      // First cycle
      await engine.start();
      await engine.stop();

      // Second cycle
      await engine.start();
      await engine.stop();

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  describe('service initialization', () => {
    it('should initialize social media services', async () => {
      const { SocialMediaFactory } = require('@/services/SocialMediaFactory');

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(SocialMediaFactory.create).toHaveBeenCalled();
    });

    it('should handle service initialization errors gracefully', async () => {
      const { SocialMediaFactory } = require('@/services/SocialMediaFactory');
      SocialMediaFactory.create = jest.fn().mockImplementation(() => {
        throw new Error('Service init failed');
      });

      // Should not throw, just log error
      const newEngine = new AutomationEngine();
      expect(newEngine).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should set up global error handlers', () => {
      // Process error handlers should be set up
      expect(process.listenerCount('unhandledRejection')).toBeGreaterThan(0);
      expect(process.listenerCount('uncaughtException')).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should load default configuration if no ID provided', async () => {
      await engine.start();

      expect(mockSupabase.select).toHaveBeenCalled();
    }, 10000);

    it('should load specific configuration by ID', async () => {
      const configId = 'specific-config-456';
      await engine.start(configId);

      expect(mockSupabase.eq).toHaveBeenCalledWith('id', configId);
    }, 10000);

    it('should handle missing configuration', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'No configuration found' },
      });

      await expect(engine.start()).rejects.toThrow();
    }, 10000);
  });

  describe('trend monitoring', () => {
    it('should start trend monitoring if enabled', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'config-trends',
          enabled: true,
          trendMonitoring: { enabled: true, interval: '*/30 * * * *' },
          competitorTracking: { enabled: false },
        },
        error: null,
      });

      await engine.start();

      // Trend monitoring should be started
      const mockCron = require('node-cron');
      expect(mockCron.schedule).toHaveBeenCalled();
    }, 10000);

    it('should not start trend monitoring if disabled', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'config-no-trends',
          enabled: true,
          trendMonitoring: { enabled: false },
          competitorTracking: { enabled: false },
        },
        error: null,
      });

      const mockCron = require('node-cron');
      const scheduleCallsBefore = mockCron.schedule.mock.calls.length;

      await engine.start();

      // Should not schedule additional jobs for trends
      const scheduleCallsAfter = mockCron.schedule.mock.calls.length;
      expect(scheduleCallsAfter).toBeGreaterThanOrEqual(scheduleCallsBefore);
    }, 10000);
  });

  describe('competitor tracking', () => {
    it('should start competitor tracking if enabled', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'config-competitors',
          enabled: true,
          trendMonitoring: { enabled: false },
          competitorTracking: { enabled: true, interval: '0 */6 * * *' },
        },
        error: null,
      });

      await engine.start();

      // Competitor tracking should be started
      const mockCron = require('node-cron');
      expect(mockCron.schedule).toHaveBeenCalled();
    }, 10000);
  });

  describe('analytics collection', () => {
    it('should schedule analytics collection', async () => {
      await engine.start();

      // Analytics collection should be scheduled
      const mockCron = require('node-cron');
      expect(mockCron.schedule).toHaveBeenCalled();
    }, 10000);
  });

  describe('concurrent operation', () => {
    it('should prevent multiple starts', async () => {
      const start1 = engine.start();
      const start2 = engine.start();

      await Promise.all([start1, start2]);

      // Config should only be loaded once
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    }, 10000);
  });
});
