/**
 * Tests for Automation Engine
 */

// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const mockSocialCreate = jest.fn();
const mockCronSchedule = jest.fn();

describe('AutomationEngine', () => {
  let AutomationEngine: any;
  let engine: AutomationEngine;
  let mockSupabase: any;
  let loadConfigurationMock: jest.Mock;
  let scheduleAutomationTasksMock: jest.Mock;
  let startTrendMonitoringMock: jest.Mock;
  let startCompetitorTrackingMock: jest.Mock;
  let scheduleAnalyticsCollectionMock: jest.Mock;
  let initializeServicesMock: jest.Mock;
  let setupErrorHandlingMock: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env['OPENAI_API_KEY'] = 'test-openai-key';

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

    jest.doMock('@/utils/Logger', () => ({
      Logger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      })),
    }));

    jest.doMock('@/services/SocialMediaFactory', () => ({
      SocialMediaFactory: {
        create: mockSocialCreate,
      },
    }));

    jest.doMock('@/services/OpenAIService', () => ({
      OpenAIService: jest.fn().mockImplementation(() => ({
        generateContent: jest.fn(),
      })),
    }));

    jest.doMock('@/services/TrendAnalyzer', () => ({
      TrendAnalyzer: jest.fn().mockImplementation(() => ({
        startMonitoring: jest.fn(),
        stopMonitoring: jest.fn(),
      })),
    }));

    jest.doMock('@/services/ContentOptimizer', () => ({
      ContentOptimizer: jest.fn().mockImplementation(() => ({
        optimize: jest.fn(),
      })),
    }));

    jest.doMock('@/services/AnalyticsCollector', () => ({
      AnalyticsCollector: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        stop: jest.fn(),
      })),
    }));

    jest.doMock('node-cron', () => ({
      schedule: mockCronSchedule,
    }));

    // Mock SocialMediaFactory
    mockSocialCreate.mockReturnValue({
      authenticate: jest.fn().mockResolvedValue(undefined),
      getProfile: jest.fn().mockResolvedValue({}),
      post: jest.fn().mockResolvedValue({}),
    });

    mockCronSchedule.mockReturnValue({ stop: jest.fn() });

    const poolModule = await import('@/database/connection-pool');
    const poolInstance = poolModule.default.getInstance();
    (poolInstance as any).supabaseAdminClient = mockSupabase;

    ({ AutomationEngine } = await import('../automation-engine.js'));

    const originalInitializeServices = AutomationEngine.prototype.initializeServices;
    jest
      .spyOn(AutomationEngine.prototype as any, 'initializeServices')
      .mockImplementation(function (this: any) {
        return originalInitializeServices.call(this);
      });
    initializeServicesMock = (AutomationEngine.prototype as any).initializeServices as jest.Mock;
    jest
      .spyOn(AutomationEngine.prototype as any, 'setupErrorHandling')
      .mockImplementation(() => {});
    setupErrorHandlingMock = (AutomationEngine.prototype as any).setupErrorHandling as jest.Mock;
    jest
      .spyOn(AutomationEngine.prototype as any, 'loadConfiguration')
      .mockResolvedValue({
        id: 'config-1',
        enabled: true,
        trendMonitoring: { enabled: false },
        competitorTracking: { enabled: false },
        postingSchedule: { items: [] },
        analytics: { enabled: false },
      } as any);
    loadConfigurationMock = (AutomationEngine.prototype as any).loadConfiguration as jest.Mock;
    jest
      .spyOn(AutomationEngine.prototype as any, 'scheduleAutomationTasks')
      .mockResolvedValue(undefined);
    scheduleAutomationTasksMock = (AutomationEngine.prototype as any)
      .scheduleAutomationTasks as jest.Mock;
    jest
      .spyOn(AutomationEngine.prototype as any, 'startTrendMonitoring')
      .mockResolvedValue(undefined);
    startTrendMonitoringMock = (AutomationEngine.prototype as any)
      .startTrendMonitoring as jest.Mock;
    jest
      .spyOn(AutomationEngine.prototype as any, 'startCompetitorTracking')
      .mockResolvedValue(undefined);
    startCompetitorTrackingMock = (AutomationEngine.prototype as any)
      .startCompetitorTracking as jest.Mock;
    jest
      .spyOn(AutomationEngine.prototype as any, 'scheduleAnalyticsCollection')
      .mockResolvedValue(undefined);
    scheduleAnalyticsCollectionMock = (AutomationEngine.prototype as any)
      .scheduleAnalyticsCollection as jest.Mock;

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

    it('should initialize with connection pool', async () => {
      const poolModule = await import('@/database/connection-pool');
      expect(poolModule.getSupabaseAdminClient()).toBe(mockSupabase);
    });
  });

  describe('start', () => {
    it('should start automation engine successfully', async () => {
      await expect(engine.start()).resolves.not.toThrow();
      expect(loadConfigurationMock).toHaveBeenCalled();
      expect(engine['isRunning']).toBe(true);
    }, 10000);

    it('should not start if already running', async () => {
      await engine.start();

      // Try to start again
      await engine.start();

      expect(loadConfigurationMock).toHaveBeenCalledTimes(1);
    }, 10000);

    it('should not start if config is disabled', async () => {
      loadConfigurationMock.mockResolvedValueOnce({
        id: 'config-disabled',
        enabled: false,
        trendMonitoring: { enabled: false },
        competitorTracking: { enabled: false },
        postingSchedule: { items: [] },
        analytics: { enabled: false },
      });

      await engine.start();

      expect(engine['isRunning']).toBe(false);
    }, 10000);

    it('should handle configuration load error', async () => {
      loadConfigurationMock.mockRejectedValueOnce(new Error('Config not found'));

      await expect(engine.start()).rejects.toThrow();
    }, 10000);

    it('should start with specific config ID', async () => {
      await engine.start('custom-config-123');

      expect(loadConfigurationMock).toHaveBeenCalledWith('custom-config-123');
    }, 10000);
  });

  describe('stop', () => {
    it('should stop automation engine successfully', async () => {
      await engine.start();
      await engine.stop();

      // Engine should be stopped
      // Subsequent start should work
      await engine.start();
      expect(engine['isRunning']).toBe(true);
    }, 10000);

    it('should not error if stopping when not running', async () => {
      await expect(engine.stop()).resolves.not.toThrow();
    }, 10000);

    it('should clear all scheduled jobs on stop', async () => {
      await engine.start();
      const stopSpy = jest.fn();
      engine['scheduledJobs'].set('mock-job', { stop: stopSpy } as any);

      await engine.stop();

      expect(stopSpy).toHaveBeenCalled();
      expect(engine['scheduledJobs'].size).toBe(0);
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

      expect(loadConfigurationMock).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  describe('service initialization', () => {
    it('should initialize social media services', async () => {
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(initializeServicesMock).toHaveBeenCalled();
    });

    it('should handle service initialization errors gracefully', async () => {
      mockSocialCreate.mockImplementationOnce(() => {
        throw new Error('Service init failed');
      });

      // Should not throw, just log error through original implementation
      const newEngine = new AutomationEngine();
      expect(newEngine).toBeDefined();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(initializeServicesMock).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should set up global error handlers', () => {
      expect(setupErrorHandlingMock).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should load default configuration if no ID provided', async () => {
      await engine.start();

      expect(loadConfigurationMock).toHaveBeenCalled();
    }, 10000);

    it('should load specific configuration by ID', async () => {
      const configId = 'specific-config-456';
      await engine.start(configId);

      expect(loadConfigurationMock).toHaveBeenCalledWith(configId);
    }, 10000);

    it('should handle missing configuration', async () => {
      loadConfigurationMock.mockRejectedValueOnce(new Error('No configuration found'));

      await expect(engine.start()).rejects.toThrow();
    }, 10000);
  });

  describe('trend monitoring', () => {
    it('should start trend monitoring if enabled', async () => {
      loadConfigurationMock.mockResolvedValueOnce({
        id: 'config-trends',
        enabled: true,
        trendMonitoring: { enabled: true, interval: '*/30 * * * *' },
        competitorTracking: { enabled: false },
        postingSchedule: { items: [] },
        analytics: { enabled: false },
      });

      await engine.start();

      // Trend monitoring should be started
      expect(startTrendMonitoringMock).toHaveBeenCalled();
    }, 10000);

    it('should not start trend monitoring if disabled', async () => {
      loadConfigurationMock.mockResolvedValueOnce({
        id: 'config-no-trends',
        enabled: true,
        trendMonitoring: { enabled: false },
        competitorTracking: { enabled: false },
        postingSchedule: { items: [] },
        analytics: { enabled: false },
      });

      await engine.start();

      expect(startTrendMonitoringMock).not.toHaveBeenCalled();
    }, 10000);
  });

  describe('competitor tracking', () => {
    it('should start competitor tracking if enabled', async () => {
      loadConfigurationMock.mockResolvedValueOnce({
        id: 'config-competitors',
        enabled: true,
        trendMonitoring: { enabled: false },
        competitorTracking: { enabled: true, interval: '0 */6 * * *' },
        postingSchedule: { items: [] },
        analytics: { enabled: false },
      });

      await engine.start();

      // Competitor tracking should be started
      expect(startCompetitorTrackingMock).toHaveBeenCalled();
    }, 10000);
  });

  describe('analytics collection', () => {
    it('should schedule analytics collection', async () => {
      await engine.start();

      // Analytics collection should be scheduled
      expect(scheduleAnalyticsCollectionMock).toHaveBeenCalled();
    }, 10000);
  });

  describe('concurrent operation', () => {
    it('should prevent multiple starts', async () => {
      const start1 = engine.start();
      const start2 = engine.start();

      await Promise.all([start1, start2]);

      // Config should only be loaded once
      expect(loadConfigurationMock).toHaveBeenCalledTimes(1);
    }, 10000);
  });
});
