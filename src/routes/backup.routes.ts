import { Router, Request, Response } from 'express';
import { backupService, BackupConfig } from '@/services/backup';
import { Logger } from '@/utils/Logger';

// Simple authenticate middleware (in production, use a real auth middleware)
interface AuthRequest extends Request {
  user?: { id: string };
}

const logger = new Logger('BackupRoutes');

// Simple authentication middleware
const authenticate = (req: AuthRequest, res: Response, next: Function) => {
  // In production, implement real authentication
  req.user = { id: 'admin' };
  next();
};

const router = Router();

/**
 * @route   POST /backup/config
 * @desc    Create a new backup configuration
 * @access  Private (Admin only)
 */
router.post('/config', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      type,
      destination,
      destinationPath,
      schedule,
      retentionDays,
      compression,
      encryption,
      encryptionKey,
      includeRedis,
      includeUploads,
      verifyAfterBackup,
      metadata,
    } = req.body;

    // Validate required fields
    if (!name || !type || !destination || !destinationPath) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const config = backupService.createBackupConfig({
      name,
      type,
      destination,
      destinationPath,
      schedule,
      retentionDays: retentionDays || 7,
      compression: compression !== undefined ? compression : true,
      encryption: encryption !== undefined ? encryption : false,
      encryptionKey,
      includeRedis: includeRedis !== undefined ? includeRedis : true,
      includeUploads: includeUploads !== undefined ? includeUploads : true,
      verifyAfterBackup: verifyAfterBackup !== undefined ? verifyAfterBackup : true,
      metadata,
    });

    logger.info(`Backup config created: ${config.id} by user ${req.user?.id}`);
    res.status(201).json({ message: 'Backup configuration created', config });
  } catch (error) {
    logger.error('Failed to create backup config', error);
    res.status(500).json({ error: 'Failed to create backup configuration' });
  }
});

/**
 * @route   GET /backup/config
 * @desc    Get all backup configurations
 * @access  Private (Admin only)
 */
router.get('/config', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const configs = backupService.getAllBackupConfigs();
    res.json({ configs });
  } catch (error) {
    logger.error('Failed to get backup configs', error);
    res.status(500).json({ error: 'Failed to get backup configurations' });
  }
});

/**
 * @route   GET /backup/config/:id
 * @desc    Get a specific backup configuration
 * @access  Private (Admin only)
 */
router.get('/config/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Missing configuration ID' });
      return;
    }
    const config = backupService.getBackupConfig(id);

    if (!config) {
      res.status(404).json({ error: 'Backup configuration not found' });
      return;
    }

    res.json({ config });
  } catch (error) {
    logger.error('Failed to get backup config', error);
    res.status(500).json({ error: 'Failed to get backup configuration' });
  }
});

/**
 * @route   PATCH /backup/config/:id
 * @desc    Update a backup configuration
 * @access  Private (Admin only)
 */
router.patch('/config/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Missing configuration ID' });
      return;
    }
    const updates = req.body;

    const config = backupService.updateBackupConfig(id, updates);

    if (!config) {
      res.status(404).json({ error: 'Backup configuration not found' });
      return;
    }

    logger.info(`Backup config updated: ${id} by user ${req.user?.id}`);
    res.json({ message: 'Backup configuration updated', config });
  } catch (error) {
    logger.error('Failed to update backup config', error);
    res.status(500).json({ error: 'Failed to update backup configuration' });
  }
});

/**
 * @route   DELETE /backup/config/:id
 * @desc    Delete a backup configuration
 * @access  Private (Admin only)
 */
router.delete('/config/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Missing configuration ID' });
      return;
    }
    const success = backupService.deleteBackupConfig(id);

    if (!success) {
      res.status(404).json({ error: 'Backup configuration not found' });
      return;
    }

    logger.info(`Backup config deleted: ${id} by user ${req.user?.id}`);
    res.json({ message: 'Backup configuration deleted' });
  } catch (error) {
    logger.error('Failed to delete backup config', error);
    res.status(500).json({ error: 'Failed to delete backup configuration' });
  }
});

/**
 * @route   POST /backup/create/:configId
 * @desc    Trigger a manual backup
 * @access  Private (Admin only)
 */
router.post('/create/:configId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const configId = req.params['configId'];
    if (!configId) {
      res.status(400).json({ error: 'Missing configuration ID' });
      return;
    }

    logger.info(`Manual backup triggered: ${configId} by user ${req.user?.id}`);

    // Start backup asynchronously
    backupService.createBackup(configId)
      .then((job) => {
        logger.info(`Manual backup completed: ${job.id}`);
      })
      .catch((error) => {
        logger.error(`Manual backup failed: ${configId}`, error);
      });

    res.status(202).json({ message: 'Backup started', configId });
  } catch (error) {
    logger.error('Failed to start backup', error);
    res.status(500).json({ error: 'Failed to start backup' });
  }
});

/**
 * @route   GET /backup/jobs
 * @desc    Get all backup jobs
 * @access  Private (Admin only)
 */
router.get('/jobs', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 100;
    const jobs = backupService.getAllBackupJobs(limit);
    res.json({ jobs });
  } catch (error) {
    logger.error('Failed to get backup jobs', error);
    res.status(500).json({ error: 'Failed to get backup jobs' });
  }
});

/**
 * @route   GET /backup/jobs/:id
 * @desc    Get a specific backup job
 * @access  Private (Admin only)
 */
router.get('/jobs/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Missing job ID' });
      return;
    }
    const job = backupService.getBackupJob(id);

    if (!job) {
      res.status(404).json({ error: 'Backup job not found' });
      return;
    }

    res.json({ job });
  } catch (error) {
    logger.error('Failed to get backup job', error);
    res.status(500).json({ error: 'Failed to get backup job' });
  }
});

/**
 * @route   POST /backup/verify/:jobId
 * @desc    Verify a backup
 * @access  Private (Admin only)
 */
router.post('/verify/:jobId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobId = req.params['jobId'];
    if (!jobId) {
      res.status(400).json({ error: 'Missing job ID' });
      return;
    }
    const verified = await backupService.verifyBackup(jobId);

    logger.info(`Backup verification: ${jobId} - ${verified ? 'PASSED' : 'FAILED'} by user ${req.user?.id}`);
    res.json({ verified });
  } catch (error) {
    logger.error('Failed to verify backup', error);
    res.status(500).json({ error: 'Failed to verify backup' });
  }
});

/**
 * @route   GET /backup/recovery-points
 * @desc    Get all recovery points
 * @access  Private (Admin only)
 */
router.get('/recovery-points', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const recoveryPoints = backupService.getAllRecoveryPoints();
    res.json({ recoveryPoints });
  } catch (error) {
    logger.error('Failed to get recovery points', error);
    res.status(500).json({ error: 'Failed to get recovery points' });
  }
});

/**
 * @route   GET /backup/recovery-points/:id
 * @desc    Get a specific recovery point
 * @access  Private (Admin only)
 */
router.get('/recovery-points/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Missing recovery point ID' });
      return;
    }
    const recoveryPoint = backupService.getRecoveryPoint(id);

    if (!recoveryPoint) {
      res.status(404).json({ error: 'Recovery point not found' });
      return;
    }

    res.json({ recoveryPoint });
  } catch (error) {
    logger.error('Failed to get recovery point', error);
    res.status(500).json({ error: 'Failed to get recovery point' });
  }
});

/**
 * @route   POST /backup/restore/:recoveryPointId
 * @desc    Restore from a recovery point
 * @access  Private (Admin only)
 */
router.post('/restore/:recoveryPointId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const recoveryPointId = req.params['recoveryPointId'];
    if (!recoveryPointId) {
      res.status(400).json({ error: 'Missing recovery point ID' });
      return;
    }
    const { targetTimestamp } = req.body;

    logger.info(`Restore initiated: ${recoveryPointId} by user ${req.user?.id}`);

    // Start restore asynchronously
    backupService.restoreFromBackup(recoveryPointId, { targetTimestamp })
      .then((job) => {
        logger.info(`Restore completed: ${job.id}`);
      })
      .catch((error) => {
        logger.error(`Restore failed: ${recoveryPointId}`, error);
      });

    res.status(202).json({ message: 'Restore started', recoveryPointId });
  } catch (error) {
    logger.error('Failed to start restore', error);
    res.status(500).json({ error: 'Failed to start restore' });
  }
});

/**
 * @route   GET /backup/restore/jobs
 * @desc    Get all restore jobs
 * @access  Private (Admin only)
 */
router.get('/restore/jobs', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 50;
    const jobs = backupService.getAllRestoreJobs(limit);
    res.json({ jobs });
  } catch (error) {
    logger.error('Failed to get restore jobs', error);
    res.status(500).json({ error: 'Failed to get restore jobs' });
  }
});

/**
 * @route   GET /backup/restore/jobs/:id
 * @desc    Get a specific restore job
 * @access  Private (Admin only)
 */
router.get('/restore/jobs/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Missing restore job ID' });
      return;
    }
    const job = backupService.getRestoreJob(id);

    if (!job) {
      res.status(404).json({ error: 'Restore job not found' });
      return;
    }

    res.json({ job });
  } catch (error) {
    logger.error('Failed to get restore job', error);
    res.status(500).json({ error: 'Failed to get restore job' });
  }
});

/**
 * @route   GET /backup/metrics
 * @desc    Get backup metrics and statistics
 * @access  Private (Admin only)
 */
router.get('/metrics', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const metrics = backupService.getBackupMetrics();
    res.json({ metrics });
  } catch (error) {
    logger.error('Failed to get backup metrics', error);
    res.status(500).json({ error: 'Failed to get backup metrics' });
  }
});

export const backupRouter = router;
