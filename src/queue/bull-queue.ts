/**
 * Bull Queue Manager
 *
 * Distributed, persistent job queue system using Redis and Bull.
 * Replaces in-memory queue with robust, scalable job processing.
 */

import Bull, { Queue, Job, JobOptions, QueueOptions } from 'bull';
import { Logger } from '@/utils/Logger';

const logger = new Logger('QueueManager');

/**
 * Job types for type safety
 */
export enum JobType {
  // Content jobs
  GENERATE_CONTENT = 'generate-content',
  SCHEDULE_POST = 'schedule-post',
  POST_CONTENT = 'post-content',

  // Analytics jobs
  COLLECT_ANALYTICS = 'collect-analytics',
  GENERATE_REPORT = 'generate-report',

  // AI jobs
  ANALYZE_TRENDS = 'analyze-trends',
  OPTIMIZE_CONTENT = 'optimize-content',
  GENERATE_SUGGESTIONS = 'generate-suggestions',

  // Social media jobs
  SYNC_ACCOUNTS = 'sync-accounts',
  REFRESH_TOKENS = 'refresh-tokens',

  // Maintenance jobs
  CLEANUP_OLD_DATA = 'cleanup-old-data',
  REGENERATE_EMBEDDINGS = 'regenerate-embeddings',
}

/**
 * Job priority levels
 */
export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BACKGROUND = 5,
}

/**
 * Job status
 */
export interface JobStatus {
  id: string;
  type: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  data: any;
  result?: any;
  error?: string;
  attempts: number;
  timestamp: Date;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Bull Queue Manager
 */
class BullQueueManager {
  private static instance: BullQueueManager;
  private queues: Map<string, Queue> = new Map();
  private config: QueueOptions;
  private isInitialized = false;

  private constructor() {
    const redisConfig = {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      password: process.env['REDIS_PASSWORD'],
      db: parseInt(process.env['REDIS_QUEUE_DB'] || '1'), // Separate DB for queues
    };

    this.config = {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    };

    logger.info('Bull Queue Manager created');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BullQueueManager {
    if (!BullQueueManager.instance) {
      BullQueueManager.instance = new BullQueueManager();
    }
    return BullQueueManager.instance;
  }

  /**
   * Initialize queues
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Queue manager already initialized');
      return;
    }

    try {
      logger.info('Initializing Bull queue manager...');

      // Create queues for different job types
      const queueNames = [
        'content', // Content generation and posting
        'analytics', // Analytics collection and reporting
        'ai', // AI-powered tasks
        'social', // Social media operations
        'maintenance', // Background maintenance tasks
      ];

      for (const name of queueNames) {
        const queue = new Bull(name, this.config);

        // Setup event handlers
        this.setupQueueEventHandlers(queue, name);

        this.queues.set(name, queue);
        logger.info(`Queue "${name}" initialized`);
      }

      this.isInitialized = true;
      logger.info('Bull queue manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Bull queue manager:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers for queue monitoring
   */
  private setupQueueEventHandlers(queue: Queue, name: string): void {
    queue.on('error', (error) => {
      logger.error(`Queue "${name}" error:`, error);
    });

    queue.on('waiting', (jobId) => {
      logger.debug(`Job ${jobId} is waiting in queue "${name}"`);
    });

    queue.on('active', (job) => {
      logger.debug(`Job ${job.id} started processing in queue "${name}"`);
    });

    queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed in queue "${name}"`, {
        duration: Date.now() - job.timestamp,
      });
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed in queue "${name}":`, {
        error: error.message,
        attempts: job.attemptsMade,
        data: job.data,
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled in queue "${name}"`);
    });

    queue.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress: ${progress}% in queue "${name}"`);
    });
  }

  /**
   * Get queue by name
   */
  private getQueue(queueName: string): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" not found. Available: ${Array.from(this.queues.keys()).join(', ')}`);
    }
    return queue;
  }

  /**
   * Determine queue name from job type
   */
  private getQueueNameForJobType(jobType: JobType): string {
    if (jobType.includes('content') || jobType.includes('post')) {
      return 'content';
    }
    if (jobType.includes('analytics') || jobType.includes('report')) {
      return 'analytics';
    }
    if (jobType.includes('analyze') || jobType.includes('optimize') || jobType.includes('generate')) {
      return 'ai';
    }
    if (jobType.includes('sync') || jobType.includes('refresh') || jobType.includes('tokens')) {
      return 'social';
    }
    return 'maintenance';
  }

  /**
   * Add job to queue
   */
  public async addJob<T = any>(
    jobType: JobType,
    data: T,
    options?: JobOptions
  ): Promise<Job> {
    if (!this.isInitialized) {
      throw new Error('Queue manager not initialized');
    }

    const queueName = this.getQueueNameForJobType(jobType);
    const queue = this.getQueue(queueName);

    const job = await queue.add(jobType, data, options);

    logger.info(`Job added to queue "${queueName}":`, {
      id: job.id,
      type: jobType,
      priority: options?.priority,
    });

    return job;
  }

  /**
   * Process jobs for a specific type
   */
  public async processJobs<T = any>(
    jobType: JobType,
    processor: (job: Job<T>) => Promise<any>,
    concurrency: number = 1
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Queue manager not initialized');
    }

    const queueName = this.getQueueNameForJobType(jobType);
    const queue = this.getQueue(queueName);

    queue.process(jobType, concurrency, async (job) => {
      logger.info(`Processing job ${job.id} of type ${jobType}`, {
        attempt: job.attemptsMade + 1,
        data: job.data,
      });

      try {
        const result = await processor(job);
        logger.info(`Job ${job.id} processed successfully`);
        return result;
      } catch (error) {
        logger.error(`Job ${job.id} processing failed:`, error);
        throw error;
      }
    });

    logger.info(`Processor registered for job type "${jobType}" with concurrency ${concurrency}`);
  }

  /**
   * Get job by ID
   */
  public async getJob(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.getQueue(queueName);
    return await queue.getJob(jobId);
  }

  /**
   * Get job status
   */
  public async getJobStatus(queueName: string, jobId: string): Promise<JobStatus | null> {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id!.toString(),
      type: job.name,
      status: state as any,
      progress: typeof progress === 'number' ? progress : 0,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      attempts: job.attemptsMade,
      timestamp: new Date(job.timestamp),
    };
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(queueName: string): Promise<QueueStats> {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  /**
   * Get all queue statistics
   */
  public async getAllQueueStats(): Promise<Record<string, QueueStats>> {
    const stats: Record<string, QueueStats> = {};

    for (const [name] of this.queues) {
      stats[name] = await this.getQueueStats(name);
    }

    return stats;
  }

  /**
   * Pause queue
   */
  public async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    logger.info(`Queue "${queueName}" paused`);
  }

  /**
   * Resume queue
   */
  public async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info(`Queue "${queueName}" resumed`);
  }

  /**
   * Remove job from queue
   */
  public async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      logger.info(`Job ${jobId} removed from queue "${queueName}"`);
    }
  }

  /**
   * Retry failed job
   */
  public async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.retry();
      logger.info(`Job ${jobId} retried in queue "${queueName}"`);
    }
  }

  /**
   * Clean old jobs
   */
  public async cleanQueue(
    queueName: string,
    grace: number = 24 * 3600 * 1000, // 24 hours
    status: 'completed' | 'failed' = 'completed'
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, status);
    logger.info(`Cleaned ${status} jobs older than ${grace}ms from queue "${queueName}"`);
  }

  /**
   * Empty queue (remove all jobs)
   */
  public async emptyQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.empty();
    logger.warn(`Queue "${queueName}" emptied`);
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down Bull queue manager...');

    try {
      const closePromises = Array.from(this.queues.values()).map((queue) => queue.close());
      await Promise.all(closePromises);

      this.queues.clear();
      this.isInitialized = false;

      logger.info('Bull queue manager shut down successfully');
    } catch (error) {
      logger.error('Error during Bull queue manager shutdown:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized || this.queues.size === 0) {
        return false;
      }

      // Try to get stats from first queue as health check
      const firstQueue = Array.from(this.queues.values())[0];
      await firstQueue.getJobCounts();

      return true;
    } catch (error) {
      logger.error('Queue health check failed:', error);
      return false;
    }
  }
}

/**
 * Initialize queue manager
 */
export async function initializeQueueManager(): Promise<void> {
  const manager = BullQueueManager.getInstance();
  await manager.initialize();
}

/**
 * Get queue manager instance
 */
export function getQueueManager(): BullQueueManager {
  return BullQueueManager.getInstance();
}

/**
 * Export manager class
 */
export default BullQueueManager;
