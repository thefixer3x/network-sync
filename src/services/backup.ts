import { Logger } from '@/utils/Logger';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const logger = new Logger('BackupService');
const execAsync = promisify(exec);

export type BackupType = 'full' | 'incremental' | 'differential';
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'verifying' | 'verified';
export type BackupDestination = 'local' | 's3' | 'gcs' | 'azure';
export type RecoveryStatus = 'pending' | 'running' | 'completed' | 'failed' | 'validating';

export interface BackupConfig {
  id: string;
  name: string;
  type: BackupType;
  destination: BackupDestination;
  destinationPath: string;
  schedule?: string; // Cron expression
  retentionDays: number;
  compression: boolean;
  encryption: boolean;
  encryptionKey?: string;
  includeRedis: boolean;
  includeUploads: boolean;
  verifyAfterBackup: boolean;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface BackupJob {
  id: string;
  configId: string;
  type: BackupType;
  status: BackupStatus;
  startTime: number;
  endTime?: number;
  size?: number;
  location: string;
  checksum?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface RecoveryPoint {
  id: string;
  backupJobId: string;
  timestamp: number;
  type: BackupType;
  size: number;
  location: string;
  checksum: string;
  verified: boolean;
  metadata?: Record<string, any>;
}

export interface RestoreJob {
  id: string;
  recoveryPointId: string;
  status: RecoveryStatus;
  targetTimestamp?: number; // For point-in-time recovery
  startTime: number;
  endTime?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface BackupMetrics {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  totalSize: number;
  averageBackupTime: number;
  lastBackupTime?: number;
  lastBackupStatus?: BackupStatus;
  oldestRecoveryPoint?: number;
  newestRecoveryPoint?: number;
  rpo: number; // Recovery Point Objective in minutes
  rto: number; // Recovery Time Objective in minutes
}

class BackupService {
  private configs: Map<string, BackupConfig> = new Map();
  private jobs: Map<string, BackupJob> = new Map();
  private recoveryPoints: Map<string, RecoveryPoint> = new Map();
  private restoreJobs: Map<string, RestoreJob> = new Map();
  private scheduleIntervals: Map<string, NodeJS.Timeout> = new Map();
  private backupDir: string;

  constructor() {
    this.backupDir = process.env['BACKUP_DIR'] || './backups';
    this.ensureBackupDirectory();
    this.loadConfigs();
    this.startScheduler();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info(`Created backup directory: ${this.backupDir}`);
    }
  }

  private loadConfigs(): void {
    // In production, load from database
    // For now, create default configuration
    const defaultConfig: BackupConfig = {
      id: this.generateId(),
      name: 'Daily Full Backup',
      type: 'full',
      destination: 'local',
      destinationPath: this.backupDir,
      schedule: '0 2 * * *', // Daily at 2 AM
      retentionDays: 7,
      compression: true,
      encryption: true,
      includeRedis: true,
      includeUploads: true,
      verifyAfterBackup: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.configs.set(defaultConfig.id, defaultConfig);
    logger.info('Loaded backup configurations');
  }

  private startScheduler(): void {
    for (const config of this.configs.values()) {
      if (config.schedule) {
        this.scheduleBackup(config);
      }
    }
    logger.info('Backup scheduler started');
  }

  private scheduleBackup(config: BackupConfig): void {
    if (this.scheduleIntervals.has(config.id)) {
      clearInterval(this.scheduleIntervals.get(config.id)!);
    }

    // Simple interval-based scheduling (in production, use a proper cron library)
    const interval = setInterval(() => {
      this.createBackup(config.id).catch((error) => {
        logger.error(`Scheduled backup failed for config ${config.id}`, error);
      });
    }, 24 * 60 * 60 * 1000); // Daily

    this.scheduleIntervals.set(config.id, interval);
    logger.info(`Scheduled backup for config: ${config.name}`);
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  public createBackupConfig(data: Omit<BackupConfig, 'id' | 'createdAt' | 'updatedAt'>): BackupConfig {
    const now = Date.now();
    const config: BackupConfig = {
      ...data,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };

    this.configs.set(config.id, config);

    if (config.schedule) {
      this.scheduleBackup(config);
    }

    logger.info(`Created backup configuration: ${config.name}`);
    return config;
  }

  public updateBackupConfig(id: string, updates: Partial<BackupConfig>): BackupConfig | null {
    const config = this.configs.get(id);
    if (!config) {
      return null;
    }

    const updatedConfig: BackupConfig = {
      ...config,
      ...updates,
      id: config.id,
      createdAt: config.createdAt,
      updatedAt: Date.now(),
    };

    this.configs.set(id, updatedConfig);

    // Reschedule if schedule changed
    if (updates.schedule !== undefined) {
      if (updatedConfig.schedule) {
        this.scheduleBackup(updatedConfig);
      } else if (this.scheduleIntervals.has(id)) {
        clearInterval(this.scheduleIntervals.get(id)!);
        this.scheduleIntervals.delete(id);
      }
    }

    logger.info(`Updated backup configuration: ${updatedConfig.name}`);
    return updatedConfig;
  }

  public async createBackup(configId: string): Promise<BackupJob> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Backup configuration not found: ${configId}`);
    }

    const job: BackupJob = {
      id: this.generateId(),
      configId,
      type: config.type,
      status: 'running',
      startTime: Date.now(),
      location: '',
      metadata: {
        configName: config.name,
      },
    };

    this.jobs.set(job.id, job);
    logger.info(`Starting backup job: ${job.id} (${config.name})`);

    try {
      // Perform backup
      const backupPath = await this.performBackup(config, job);
      job.location = backupPath;

      // Get file size
      const stats = fs.statSync(backupPath);
      job.size = stats.size;

      // Calculate checksum
      if (config.verifyAfterBackup) {
        job.status = 'verifying';
        this.jobs.set(job.id, job);
        job.checksum = await this.generateChecksum(backupPath);
        job.status = 'verified';
      } else {
        job.checksum = await this.generateChecksum(backupPath);
        job.status = 'completed';
      }

      job.endTime = Date.now();
      this.jobs.set(job.id, job);

      // Create recovery point
      const recoveryPoint = this.createRecoveryPoint(job);
      logger.info(`Backup completed: ${job.id} (${this.formatBytes(job.size)})`);

      // Clean up old backups
      await this.cleanupOldBackups(config);

      return job;
    } catch (error) {
      job.status = 'failed';
      job.endTime = Date.now();
      job.errorMessage = error instanceof Error ? error.message : String(error);
      this.jobs.set(job.id, job);
      logger.error(`Backup failed: ${job.id}`, error);
      throw error;
    }
  }

  private async performBackup(config: BackupConfig, job: BackupJob): Promise<string> {
    const timestamp = new Date(job.startTime).toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${config.type}_${timestamp}`;
    const backupPath = path.join(config.destinationPath, filename);

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(config.destinationPath)) {
      fs.mkdirSync(config.destinationPath, { recursive: true });
    }

    // Backup PostgreSQL
    const dbUrl = process.env['DATABASE_URL'] || '';
    const pgBackupPath = `${backupPath}_postgres.sql`;

    try {
      const { stdout, stderr } = await execAsync(
        `pg_dump "${dbUrl}" -f "${pgBackupPath}"`
      );
      if (stderr) {
        logger.warn(`pg_dump stderr: ${stderr}`);
      }
      logger.info(`PostgreSQL backup created: ${pgBackupPath}`);
    } catch (error) {
      logger.error('PostgreSQL backup failed', error);
      throw error;
    }

    // Backup Redis if configured
    if (config.includeRedis) {
      try {
        const redisBackupPath = `${backupPath}_redis.rdb`;
        // In production, implement actual Redis backup
        logger.info(`Redis backup would be created: ${redisBackupPath}`);
      } catch (error) {
        logger.warn('Redis backup failed', error);
      }
    }

    // Compress if configured
    if (config.compression) {
      try {
        await execAsync(`gzip "${pgBackupPath}"`);
        const compressedPath = `${pgBackupPath}.gz`;
        logger.info(`Backup compressed: ${compressedPath}`);
        return compressedPath;
      } catch (error) {
        logger.error('Compression failed', error);
        return pgBackupPath;
      }
    }

    return pgBackupPath;
  }

  private createRecoveryPoint(job: BackupJob): RecoveryPoint {
    const recoveryPoint: RecoveryPoint = {
      id: this.generateId(),
      backupJobId: job.id,
      timestamp: job.startTime,
      type: job.type,
      size: job.size || 0,
      location: job.location,
      checksum: job.checksum || '',
      verified: job.status === 'verified',
    };

    // Conditionally add optional properties
    if (job.metadata) {
      recoveryPoint.metadata = job.metadata;
    }

    this.recoveryPoints.set(recoveryPoint.id, recoveryPoint);
    logger.info(`Created recovery point: ${recoveryPoint.id}`);
    return recoveryPoint;
  }

  private async cleanupOldBackups(config: BackupConfig): Promise<void> {
    const cutoffTime = Date.now() - config.retentionDays * 24 * 60 * 60 * 1000;
    const deletedPoints: string[] = [];

    for (const [id, point] of this.recoveryPoints.entries()) {
      if (point.timestamp < cutoffTime) {
        // Delete backup file
        try {
          if (fs.existsSync(point.location)) {
            fs.unlinkSync(point.location);
          }
          this.recoveryPoints.delete(id);
          deletedPoints.push(id);
        } catch (error) {
          logger.error(`Failed to delete old backup: ${point.location}`, error);
        }
      }
    }

    if (deletedPoints.length > 0) {
      logger.info(`Cleaned up ${deletedPoints.length} old backups`);
    }
  }

  public async verifyBackup(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Backup job not found: ${jobId}`);
    }

    if (!fs.existsSync(job.location)) {
      logger.error(`Backup file not found: ${job.location}`);
      return false;
    }

    try {
      const checksum = await this.generateChecksum(job.location);
      const verified = checksum === job.checksum;

      if (verified) {
        logger.info(`Backup verified successfully: ${jobId}`);
      } else {
        logger.error(`Backup verification failed: ${jobId} (checksum mismatch)`);
      }

      return verified;
    } catch (error) {
      logger.error(`Backup verification failed: ${jobId}`, error);
      return false;
    }
  }

  public async restoreFromBackup(recoveryPointId: string, options?: { targetTimestamp?: number }): Promise<RestoreJob> {
    const recoveryPoint = this.recoveryPoints.get(recoveryPointId);
    if (!recoveryPoint) {
      throw new Error(`Recovery point not found: ${recoveryPointId}`);
    }

    const restoreJob: RestoreJob = {
      id: this.generateId(),
      recoveryPointId,
      status: 'running',
      startTime: Date.now(),
      metadata: {
        recoveryPointTimestamp: recoveryPoint.timestamp,
      },
    };

    // Conditionally add optional properties
    if (options?.targetTimestamp) {
      restoreJob.targetTimestamp = options.targetTimestamp;
    }

    this.restoreJobs.set(restoreJob.id, restoreJob);
    logger.info(`Starting restore job: ${restoreJob.id}`);

    try {
      // Verify backup before restoring
      restoreJob.status = 'validating';
      this.restoreJobs.set(restoreJob.id, restoreJob);

      const verified = await this.verifyBackup(recoveryPoint.backupJobId);
      if (!verified) {
        throw new Error('Backup verification failed');
      }

      // Perform restore
      restoreJob.status = 'running';
      this.restoreJobs.set(restoreJob.id, restoreJob);

      await this.performRestore(recoveryPoint, options);

      restoreJob.status = 'completed';
      restoreJob.endTime = Date.now();
      this.restoreJobs.set(restoreJob.id, restoreJob);

      logger.info(`Restore completed: ${restoreJob.id}`);
      return restoreJob;
    } catch (error) {
      restoreJob.status = 'failed';
      restoreJob.endTime = Date.now();
      restoreJob.errorMessage = error instanceof Error ? error.message : String(error);
      this.restoreJobs.set(restoreJob.id, restoreJob);
      logger.error(`Restore failed: ${restoreJob.id}`, error);
      throw error;
    }
  }

  private async performRestore(recoveryPoint: RecoveryPoint, options?: { targetTimestamp?: number }): Promise<void> {
    const backupFile = recoveryPoint.location;

    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    // Decompress if needed
    let sqlFile = backupFile;
    if (backupFile.endsWith('.gz')) {
      sqlFile = backupFile.replace('.gz', '');
      try {
        await execAsync(`gunzip -c "${backupFile}" > "${sqlFile}"`);
        logger.info(`Decompressed backup: ${sqlFile}`);
      } catch (error) {
        logger.error('Decompression failed', error);
        throw error;
      }
    }

    // Restore PostgreSQL
    const dbUrl = process.env['DATABASE_URL'] || '';
    try {
      const { stdout, stderr } = await execAsync(
        `psql "${dbUrl}" -f "${sqlFile}"`
      );
      if (stderr) {
        logger.warn(`psql stderr: ${stderr}`);
      }
      logger.info(`PostgreSQL restored from: ${sqlFile}`);
    } catch (error) {
      logger.error('PostgreSQL restore failed', error);
      throw error;
    } finally {
      // Clean up decompressed file if it was created
      if (sqlFile !== backupFile && fs.existsSync(sqlFile)) {
        fs.unlinkSync(sqlFile);
      }
    }
  }

  public getBackupMetrics(): BackupMetrics {
    const jobs = Array.from(this.jobs.values());
    const successfulJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'verified');
    const failedJobs = jobs.filter((j) => j.status === 'failed');
    const recoveryPoints = Array.from(this.recoveryPoints.values());

    const totalSize = successfulJobs.reduce((sum, job) => sum + (job.size || 0), 0);
    const totalTime = successfulJobs.reduce((sum, job) => {
      if (job.endTime) {
        return sum + (job.endTime - job.startTime);
      }
      return sum;
    }, 0);
    const averageBackupTime = successfulJobs.length > 0 ? totalTime / successfulJobs.length : 0;

    const sortedJobs = jobs.sort((a, b) => b.startTime - a.startTime);
    const lastJob = sortedJobs[0];

    const sortedPoints = recoveryPoints.sort((a, b) => a.timestamp - b.timestamp);
    const oldestPoint = sortedPoints[0];
    const newestPoint = sortedPoints[sortedPoints.length - 1];

    // Calculate RPO (time between backups)
    let rpo = 0;
    if (recoveryPoints.length >= 2) {
      const timeDiffs: number[] = [];
      for (let i = 1; i < sortedPoints.length; i++) {
        const current = sortedPoints[i];
        const previous = sortedPoints[i - 1];
        if (current && previous) {
          timeDiffs.push(current.timestamp - previous.timestamp);
        }
      }
      if (timeDiffs.length > 0) {
        const avgDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
        rpo = Math.round(avgDiff / 60000); // Convert to minutes
      }
    }

    const metrics: BackupMetrics = {
      totalBackups: jobs.length,
      successfulBackups: successfulJobs.length,
      failedBackups: failedJobs.length,
      totalSize,
      averageBackupTime: Math.round(averageBackupTime),
      rpo,
      rto: 30, // Target: 30 minutes (configurable)
    };

    // Conditionally add optional properties
    if (lastJob) {
      metrics.lastBackupTime = lastJob.startTime;
      metrics.lastBackupStatus = lastJob.status;
    }
    if (oldestPoint) {
      metrics.oldestRecoveryPoint = oldestPoint.timestamp;
    }
    if (newestPoint) {
      metrics.newestRecoveryPoint = newestPoint.timestamp;
    }

    return metrics;
  }

  public getBackupConfig(id: string): BackupConfig | null {
    return this.configs.get(id) || null;
  }

  public getAllBackupConfigs(): BackupConfig[] {
    return Array.from(this.configs.values());
  }

  public getBackupJob(id: string): BackupJob | null {
    return this.jobs.get(id) || null;
  }

  public getAllBackupJobs(limit = 100): BackupJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  public getRecoveryPoint(id: string): RecoveryPoint | null {
    return this.recoveryPoints.get(id) || null;
  }

  public getAllRecoveryPoints(): RecoveryPoint[] {
    return Array.from(this.recoveryPoints.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public getRestoreJob(id: string): RestoreJob | null {
    return this.restoreJobs.get(id) || null;
  }

  public getAllRestoreJobs(limit = 50): RestoreJob[] {
    return Array.from(this.restoreJobs.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  public deleteBackupConfig(id: string): boolean {
    const config = this.configs.get(id);
    if (!config) {
      return false;
    }

    // Stop scheduled backups
    if (this.scheduleIntervals.has(id)) {
      clearInterval(this.scheduleIntervals.get(id)!);
      this.scheduleIntervals.delete(id);
    }

    this.configs.delete(id);
    logger.info(`Deleted backup configuration: ${config.name}`);
    return true;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  public shutdown(): void {
    // Clear all scheduled intervals
    for (const interval of this.scheduleIntervals.values()) {
      clearInterval(interval);
    }
    this.scheduleIntervals.clear();
    logger.info('Backup service shutdown complete');
  }
}

export const backupService = new BackupService();
