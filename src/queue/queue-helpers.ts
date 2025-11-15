/**
 * Queue Helper Functions
 *
 * Common queue operations and job management utilities
 */

import { Job, JobOptions } from 'bull';
import { getQueueManager, JobType, JobPriority } from './bull-queue';
import { Logger } from '@/utils/Logger';

const logger = new Logger('QueueHelpers');

/**
 * Schedule content generation job
 */
export async function scheduleContentGeneration(data: {
  platform: string;
  topic?: string;
  scheduledFor?: Date;
}): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    priority: JobPriority.NORMAL,
    delay: data.scheduledFor ? data.scheduledFor.getTime() - Date.now() : 0,
  };

  const job = await manager.addJob(JobType.GENERATE_CONTENT, data, options);
  return job.id!.toString();
}

/**
 * Schedule post publication
 */
export async function schedulePost(data: {
  content: string;
  platform: string;
  accountId: string;
  scheduledFor: Date;
  metadata?: any;
}): Promise<string> {
  const manager = getQueueManager();

  const delay = Math.max(0, data.scheduledFor.getTime() - Date.now());

  const options: JobOptions = {
    priority: JobPriority.HIGH,
    delay,
  };

  const job = await manager.addJob(JobType.POST_CONTENT, data, options);
  logger.info(`Post scheduled for ${data.scheduledFor.toISOString()}`, {
    jobId: job.id,
    platform: data.platform,
  });

  return job.id!.toString();
}

/**
 * Queue analytics collection
 */
export async function queueAnalyticsCollection(data: {
  platform: string;
  accountId: string;
  timeRange?: { start: Date; end: Date };
}): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    priority: JobPriority.NORMAL,
  };

  const job = await manager.addJob(JobType.COLLECT_ANALYTICS, data, options);
  return job.id!.toString();
}

/**
 * Queue AI trend analysis
 */
export async function queueTrendAnalysis(data: {
  platform?: string;
  keywords?: string[];
  timeframe?: string;
}): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    priority: JobPriority.LOW,
  };

  const job = await manager.addJob(JobType.ANALYZE_TRENDS, data, options);
  return job.id!.toString();
}

/**
 * Queue content optimization
 */
export async function queueContentOptimization(data: {
  contentId: string;
  platform: string;
  goals?: string[];
}): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    priority: JobPriority.NORMAL,
  };

  const job = await manager.addJob(JobType.OPTIMIZE_CONTENT, data, options);
  return job.id!.toString();
}

/**
 * Schedule report generation
 */
export async function scheduleReportGeneration(data: {
  type: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
  includeCharts?: boolean;
}): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    priority: JobPriority.LOW,
  };

  const job = await manager.addJob(JobType.GENERATE_REPORT, data, options);
  return job.id!.toString();
}

/**
 * Queue account sync
 */
export async function queueAccountSync(data: {
  platform: string;
  accountId: string;
  syncType?: 'full' | 'incremental';
}): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    priority: JobPriority.HIGH,
  };

  const job = await manager.addJob(JobType.SYNC_ACCOUNTS, data, options);
  return job.id!.toString();
}

/**
 * Queue token refresh
 */
export async function queueTokenRefresh(data: {
  platform: string;
  accountId: string;
  urgent?: boolean;
}): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    priority: data.urgent ? JobPriority.CRITICAL : JobPriority.HIGH,
  };

  const job = await manager.addJob(JobType.REFRESH_TOKENS, data, options);
  return job.id!.toString();
}

/**
 * Schedule cleanup job
 */
export async function scheduleCleanup(data: {
  target: 'old_data' | 'failed_jobs' | 'cache';
  olderThanDays?: number;
}): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    priority: JobPriority.BACKGROUND,
  };

  const job = await manager.addJob(JobType.CLEANUP_OLD_DATA, data, options);
  return job.id!.toString();
}

/**
 * Batch add jobs
 */
export async function batchAddJobs<T = any>(
  jobType: JobType,
  dataArray: T[],
  options?: JobOptions
): Promise<string[]> {
  const manager = getQueueManager();
  const jobIds: string[] = [];

  for (const data of dataArray) {
    const job = await manager.addJob(jobType, data, options);
    jobIds.push(job.id!.toString());
  }

  logger.info(`Batch added ${dataArray.length} jobs of type ${jobType}`);
  return jobIds;
}

/**
 * Wait for job completion
 */
export async function waitForJobCompletion(
  queueName: string,
  jobId: string,
  timeout: number = 60000
): Promise<any> {
  const manager = getQueueManager();
  const job = await manager.getJob(queueName, jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${queueName}`);
  }

  return await job.finished();
}

/**
 * Cancel scheduled job
 */
export async function cancelJob(queueName: string, jobId: string): Promise<void> {
  const manager = getQueueManager();
  await manager.removeJob(queueName, jobId);
  logger.info(`Job ${jobId} cancelled in queue ${queueName}`);
}

/**
 * Retry failed jobs in bulk
 */
export async function retryFailedJobs(queueName: string, limit: number = 100): Promise<number> {
  const manager = getQueueManager();
  const stats = await manager.getQueueStats(queueName);

  if (stats.failed === 0) {
    logger.info(`No failed jobs to retry in queue ${queueName}`);
    return 0;
  }

  // Note: Bull doesn't have a built-in bulk retry, so this is a simplified version
  logger.info(`Found ${stats.failed} failed jobs in queue ${queueName}`);
  logger.warn('Bulk retry not implemented - use queue dashboard for manual retry');

  return 0;
}

/**
 * Get job progress
 */
export async function getJobProgress(
  queueName: string,
  jobId: string
): Promise<number | null> {
  const manager = getQueueManager();
  const status = await manager.getJobStatus(queueName, jobId);

  return status ? status.progress : null;
}

/**
 * Update job progress (call from within job processor)
 */
export async function updateJobProgress(job: Job, progress: number): Promise<void> {
  await job.progress(progress);
  logger.debug(`Job ${job.id} progress updated: ${progress}%`);
}

/**
 * Add job with priority
 */
export async function addPriorityJob<T = any>(
  jobType: JobType,
  data: T,
  priority: JobPriority
): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    priority,
  };

  const job = await manager.addJob(jobType, data, options);
  return job.id!.toString();
}

/**
 * Schedule recurring job (using cron-like pattern)
 */
export async function scheduleRecurringJob<T = any>(
  jobType: JobType,
  data: T,
  repeatOptions: {
    cron?: string;
    every?: number; // milliseconds
    limit?: number;
  }
): Promise<string> {
  const manager = getQueueManager();

  const options: JobOptions = {
    repeat: repeatOptions,
  };

  const job = await manager.addJob(jobType, data, options);
  logger.info(`Recurring job scheduled for type ${jobType}`, repeatOptions);

  return job.id!.toString();
}
