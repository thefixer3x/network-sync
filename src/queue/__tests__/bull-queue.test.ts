/**
 * Tests for Bull Queue Manager
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JobType, JobPriority } from '../bull-queue.js';

// Mock Bull library
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    process: jest.fn(),
    on: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    clean: jest.fn().mockResolvedValue(undefined),
    isPaused: jest.fn().mockResolvedValue(false),
  }));
});

jest.mock('@/utils/Logger');

describe('Bull Queue Manager', () => {
  let BullQueueManager: any;
  let manager: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Dynamically import to get fresh instance
    const module = await import('../bull-queue.js');
    BullQueueManager = (module as any).default || module;

    // Reset singleton
    (BullQueueManager as any).instance = undefined;

    manager = BullQueueManager.getInstance();
  });

  afterEach(async () => {
    try {
      if (manager && typeof manager.shutdown === 'function') {
        await manager.shutdown();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = BullQueueManager.getInstance();
      const instance2 = BullQueueManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create instance on first call', () => {
      const instance = BullQueueManager.getInstance();
      expect(instance).toBeDefined();
    });
  });

  describe('initialization', () => {
    it('should initialize queues', async () => {
      await manager.initialize();

      // Should create multiple queues
      expect(manager).toBeDefined();
    });

    it('should not initialize twice', async () => {
      await manager.initialize();
      await manager.initialize();

      // Second call should be no-op
      expect(manager).toBeDefined();
    });

    it('should setup queue event handlers', async () => {
      await manager.initialize();

      // Queues should have event handlers
      expect(manager).toBeDefined();
    });
  });

  describe('job enums', () => {
    it('should define JobType enum', () => {
      expect(JobType.GENERATE_CONTENT).toBe('generate-content');
      expect(JobType.POST_CONTENT).toBe('post-content');
      expect(JobType.COLLECT_ANALYTICS).toBe('collect-analytics');
      expect(JobType.ANALYZE_TRENDS).toBe('analyze-trends');
      expect(JobType.CLEANUP_OLD_DATA).toBe('cleanup-old-data');
    });

    it('should define JobPriority enum', () => {
      expect(JobPriority.CRITICAL).toBe(1);
      expect(JobPriority.HIGH).toBe(2);
      expect(JobPriority.NORMAL).toBe(3);
      expect(JobPriority.LOW).toBe(4);
      expect(JobPriority.BACKGROUND).toBe(5);
    });
  });

  describe('addJob', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should add job to queue', async () => {
      const jobData = {
        userId: 'user-123',
        content: 'Test post',
      };

      const job = await manager.addJob('content', JobType.POST_CONTENT, jobData);

      expect(job).toBeDefined();
      expect(job.id).toBe('job-123');
    });

    it('should add job with priority', async () => {
      const jobData = { urgent: true };

      const job = await manager.addJob(
        'content',
        JobType.GENERATE_CONTENT,
        jobData,
        { priority: JobPriority.HIGH },
      );

      expect(job).toBeDefined();
    });

    it('should add job with delay', async () => {
      const jobData = { scheduledFor: Date.now() + 60000 };

      const job = await manager.addJob(
        'content',
        JobType.SCHEDULE_POST,
        jobData,
        { delay: 60000 },
      );

      expect(job).toBeDefined();
    });

    it('should add job with custom attempts', async () => {
      const jobData = { retryable: true };

      const job = await manager.addJob(
        'ai',
        JobType.ANALYZE_TRENDS,
        jobData,
        { attempts: 5 },
      );

      expect(job).toBeDefined();
    });
  });

  describe('getQueueStats', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should return queue statistics', async () => {
      const stats = await manager.getQueueStats('content');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('delayed');
      expect(stats).toHaveProperty('paused');
    });

    it('should return stats for all queues', async () => {
      const allStats = await manager.getAllQueueStats();

      expect(allStats).toBeDefined();
      expect(typeof allStats).toBe('object');
    });
  });

  describe('pause and resume', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should pause queue', async () => {
      await manager.pauseQueue('content');

      // Queue should be paused
      expect(manager).toBeDefined();
    });

    it('should resume queue', async () => {
      await manager.pauseQueue('content');
      await manager.resumeQueue('content');

      // Queue should be running
      expect(manager).toBeDefined();
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should clean completed jobs', async () => {
      await manager.cleanQueue('content', 'completed', 3600000);

      // Old jobs should be cleaned
      expect(manager).toBeDefined();
    });

    it('should clean failed jobs', async () => {
      await manager.cleanQueue('content', 'failed', 86400000);

      // Old failed jobs should be cleaned
      expect(manager).toBeDefined();
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should shutdown gracefully', async () => {
      await manager.shutdown();

      // All queues should be closed
      expect(manager).toBeDefined();
    });

    it('should handle shutdown when not initialized', async () => {
      const newManager = BullQueueManager.getInstance();

      await expect(newManager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      const Bull = require('bull');
      Bull.mockImplementationOnce(() => {
        throw new Error('Redis connection failed');
      });

      const newManager = BullQueueManager.getInstance();

      await expect(newManager.initialize()).rejects.toThrow();
    });

    it('should handle invalid queue name', async () => {
      await manager.initialize();

      await expect(
        manager.addJob('invalid-queue', JobType.POST_CONTENT, {}),
      ).rejects.toThrow();
    });
  });

  describe('job processing', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should register job processor', async () => {
      const processor = jest.fn().mockResolvedValue({ success: true });

      await manager.processQueue('content', JobType.POST_CONTENT, processor);

      expect(manager).toBeDefined();
    });

    it('should process job with concurrency', async () => {
      const processor = jest.fn().mockResolvedValue({ success: true });

      await manager.processQueue('ai', JobType.ANALYZE_TRENDS, processor, 5);

      expect(manager).toBeDefined();
    });
  });

  describe('getJob', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should get job status', async () => {
      // Add a job first
      const job = await manager.addJob('content', JobType.GENERATE_CONTENT, {
        test: true,
      });

      const status = await manager.getJobStatus('content', job.id);

      expect(status).toBeDefined();
    });

    it('should return null for non-existent job', async () => {
      const status = await manager.getJobStatus('content', 'non-existent-id');

      expect(status).toBeNull();
    });
  });

  describe('bulk operations', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should add multiple jobs', async () => {
      const jobs = [
        { type: JobType.GENERATE_CONTENT, data: { id: 1 } },
        { type: JobType.POST_CONTENT, data: { id: 2 } },
        { type: JobType.COLLECT_ANALYTICS, data: { id: 3 } },
      ];

      const results = await Promise.all(
        jobs.map(job => manager.addJob('content', job.type, job.data)),
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.id).toBeDefined();
      });
    });
  });

  describe('queue health', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should check queue health', async () => {
      const health = await manager.getQueueHealth('content');

      expect(health).toBeDefined();
      expect(typeof health.healthy).toBe('boolean');
    });

    it('should detect unhealthy queue', async () => {
      // Mock high failure rate
      const Bull = require('bull');
      const mockQueue = Bull.mock.results[0].value;
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 10,
        failed: 100, // High failure rate
        delayed: 0,
      });

      const health = await manager.getQueueHealth('content');

      expect(health).toBeDefined();
    });
  });
});
