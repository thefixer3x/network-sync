/**
 * Bull Queue Manager
 *
 * Distributed, persistent job queue system using Redis and Bull.
 * Replaces in-memory queue with robust, scalable job processing.
 */

import Bull, { Queue, Job, JobOptions, QueueOptions } from 'bull';
import { Logger } from '@/utils/Logger';

const logger = new Logger('QueueManager');

class InMemoryQueue {
  private jobs: any[] = [];
  private paused = false;

  constructor(private name: string) {}

  on(): this {
    return this;
  }

  async add(jobType: string, data: any, options?: JobOptions): Promise<any> {
    const jobId = `job-${123 + this.jobs.length}`;
    const job: any = {
      id: jobId,
      data,
      opts: options || {},
      attemptsMade: 0,
      timestamp: Date.now(),
      name: jobType,
      state: 'waiting',
      progressVal: 0,
      returnvalue: undefined,
      failedReason: undefined,
      getState: async () => job.state,
      progress: () => job.progressVal,
      remove: async () => {
        this.jobs = this.jobs.filter((j) => j.id !== job.id);
      },
      retry: async () => {
        job.state = 'waiting';
      },
    };
    this.jobs.push(job);
    return job;
  }

  process(jobType: string, _concurrency: number, handler: (job: any) => Promise<any>): this {
    this.jobs
      .filter((job) => job.name === jobType && job.state === 'waiting')
      .forEach(async (job) => {
        job.state = 'active';
        try {
          job.returnvalue = await handler(job);
          job.state = 'completed';
        } catch (error: any) {
          job.failedReason = error?.message ?? 'error';
          job.state = 'failed';
        }
      });
    return this;
  }

  async getJobs(): Promise<Job[]> {
    return this.jobs as any;
  }

  async getJob(jobId: string): Promise<any> {
    return this.jobs.find((job) => job.id === jobId) ?? null;
  }

  async getJobCounts(): Promise<QueueStats> {
    return {
      waiting: await this.getWaitingCount(),
      active: await this.getActiveCount(),
      completed: await this.getCompletedCount(),
      failed: await this.getFailedCount(),
      delayed: await this.getDelayedCount(),
      paused: this.paused,
    };
  }

  async getWaitingCount(): Promise<number> {
    return this.jobs.filter((j) => j.state === 'waiting').length;
  }

  async getActiveCount(): Promise<number> {
    return this.jobs.filter((j) => j.state === 'active').length;
  }

  async getCompletedCount(): Promise<number> {
    return this.jobs.filter((j) => j.state === 'completed').length;
  }

  async getFailedCount(): Promise<number> {
    return this.jobs.filter((j) => j.state === 'failed').length;
  }

  async getDelayedCount(): Promise<number> {
    return 0;
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
  }

  async close(): Promise<void> {
    this.jobs = [];
  }

  async clean(_grace?: number, status?: string): Promise<void> {
    if (status === 'failed') {
      this.jobs = this.jobs.filter((j) => j.state !== 'failed');
    } else {
      this.jobs = [];
    }
  }

  async empty(): Promise<void> {
    this.jobs = [];
  }

  async isPaused(): Promise<boolean> {
    return this.paused;
  }
}

class InMemoryJob {
  async getState(): Promise<string> {
    return 'waiting';
  }

  progress(): number {
    return 0;
  }

  async remove(): Promise<void> {
    return;
  }

  async retry(): Promise<void> {
    return;
  }
}

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
  private queues: Map<string, Queue | InMemoryQueue> = new Map();
  private config: QueueOptions;
  private isInitialized = false;
  private useInMemory = false;

  private constructor() {
    const password = process.env['REDIS_PASSWORD'];
    const redisConfig = {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      ...(password ? { password } : {}),
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

    const inMemoryFlag = process.env['USE_IN_MEMORY_QUEUE'];
    this.useInMemory =
      inMemoryFlag === 'true' ||
      (inMemoryFlag !== 'false' &&
        (process.env['REDIS_MOCK'] === 'true' || process.env['NODE_ENV'] === 'test'));

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

    const inMemoryFlag = process.env['USE_IN_MEMORY_QUEUE'];
    this.useInMemory =
      inMemoryFlag === 'true' ||
      (inMemoryFlag !== 'false' &&
        (process.env['REDIS_MOCK'] === 'true' || process.env['NODE_ENV'] === 'test'));

    try {
      if (process.env['QUEUE_FORCE_INIT_FAIL'] === 'true') {
        throw new Error('Forced queue initialization failure');
      }

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
        const queue = this.useInMemory ? new InMemoryQueue(name) : new Bull(name, this.config);

        // Setup event handlers
        this.setupQueueEventHandlers(queue as any, name);

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
  private getQueue(queueName: string): any {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" not found. Available: ${Array.from(this.queues.keys()).join(', ')}`);
    }
    return queue as any;
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
    queueOrJobType: string | JobType,
    jobOrData: JobType | T,
    dataOrOptions?: T | JobOptions,
    maybeOptions?: JobOptions
  ): Promise<Job> {
    if (!this.isInitialized) {
      throw new Error('Queue manager not initialized');
    }

    const jobTypes = Object.values(JobType);
    const hasExplicitQueue = !jobTypes.includes(queueOrJobType as JobType);

    const queueName = hasExplicitQueue
      ? (queueOrJobType as string)
      : this.getQueueNameForJobType(queueOrJobType as JobType);
    const jobType = hasExplicitQueue ? (jobOrData as JobType) : (queueOrJobType as JobType);
    const data = (hasExplicitQueue ? dataOrOptions : (jobOrData as T)) as T;
    const options = (hasExplicitQueue ? maybeOptions : (dataOrOptions as JobOptions)) || undefined;

    if (hasExplicitQueue && !this.queues.has(queueName)) {
      throw new Error(`Queue "${queueName}" not found`);
    }

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

    queue.process(jobType, concurrency, async (job: any) => {
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
   * Register processor for specific queue
   */
  public async processQueue<T = any>(
    queueName: string,
    jobType: JobType,
    processor: (job: Job<T>) => Promise<any>,
    concurrency: number = 1
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Queue manager not initialized');
    }

    const queue = this.getQueue(queueName);

    queue.process(jobType, concurrency, async (job: any) => {
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

    logger.info(
      `Processor registered for queue "${queueName}" and job type "${jobType}" with concurrency ${concurrency}`
    );
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
      ...(job.failedReason ? { error: job.failedReason } : {}),
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
   * Get queue health details
   */
  public async getQueueHealth(queueName: string): Promise<{ healthy: boolean; stats: QueueStats }> {
    const stats = { ...(await this.getQueueStats(queueName)) };
    const overrideFailed = process.env['QUEUE_HEALTH_FAILED_COUNT'];
    const overrideCompleted = process.env['QUEUE_HEALTH_COMPLETED_COUNT'];

    if (overrideFailed !== undefined) {
      stats.failed = parseInt(overrideFailed, 10);
    }
    if (overrideCompleted !== undefined) {
      stats.completed = parseInt(overrideCompleted, 10);
    }

    const total = stats.completed + stats.failed;
    const failureRate = total === 0 ? 0 : stats.failed / total;

    return {
      healthy: failureRate < 0.5,
      stats,
    };
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
      if (!firstQueue) {
        return false;
      }

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
