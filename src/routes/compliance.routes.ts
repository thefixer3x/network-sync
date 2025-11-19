/**
 * Compliance Routes
 *
 * Provides endpoints for:
 * - Audit logging
 * - Consent management
 * - GDPR requests
 * - Data retention policies
 * - Privacy policies
 * - Compliance reporting
 */

import { Router, Request, Response } from 'express';
import { Logger } from '@/utils/Logger';
import {
  complianceService,
  AuditAction,
  ConsentType,
  GDPRRequestType,
  DataClassification,
} from '@/services/compliance';
import { authenticate, requirePermission, AuthRequest } from '@/middleware/auth';
import { Permission } from '@/services/security';

const logger = new Logger('ComplianceRoutes');
const router = Router();

/**
 * POST /compliance/audit
 * Log audit entry
 */
router.post('/audit', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { action, resourceType, resourceId, changes, metadata } = req.body;

    if (!action || !resourceType || !resourceId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'action, resourceType, and resourceId are required',
      });
      return;
    }

    const auditLog = complianceService.logAudit({
      userId: req.user.id,
      action,
      resourceType,
      resourceId,
      changes,
      metadata,
    });

    res.status(201).json({
      message: 'Audit log created successfully',
      auditLog: {
        id: auditLog.id,
        timestamp: auditLog.timestamp,
        action: auditLog.action,
        resourceType: auditLog.resourceType,
        resourceId: auditLog.resourceId,
      },
    });
  } catch (error) {
    logger.error('Log audit error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log audit entry',
    });
  }
});

/**
 * GET /compliance/audit
 * Get audit logs
 */
router.get(
  '/audit',
  authenticate,
  requirePermission(Permission.ADMIN_SECURITY),
  (req: Request, res: Response): void => {
    try {
      const userId = req.query['userId'] as string | undefined;
      const action = req.query['action'] as AuditAction | undefined;
      const resourceType = req.query['resourceType'] as string | undefined;
      const startDate = req.query['startDate'] ? parseInt(req.query['startDate'] as string) : undefined;
      const endDate = req.query['endDate'] ? parseInt(req.query['endDate'] as string) : undefined;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 100;

      // Build filters object conditionally
      const filters: {
        userId?: string;
        action?: AuditAction;
        resourceType?: string;
        startDate?: number;
        endDate?: number;
        limit?: number;
      } = {};
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (resourceType) filters.resourceType = resourceType;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (limit) filters.limit = limit;

      const logs = complianceService.getAuditLogs(filters);

      res.status(200).json({
        logs,
        count: logs.length,
      });
    } catch (error) {
      logger.error('Get audit logs error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get audit logs',
      });
    }
  }
);

/**
 * POST /compliance/consent
 * Record user consent
 */
router.post('/consent', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { consentType, granted, version, ipAddress, metadata } = req.body;

    if (!consentType || granted === undefined || !version) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'consentType, granted, and version are required',
      });
      return;
    }

    const consent = complianceService.recordConsent({
      userId: req.user.id,
      consentType,
      granted,
      version,
      ipAddress: ipAddress || (req.socket.remoteAddress as string),
      metadata,
    });

    res.status(201).json({
      message: 'Consent recorded successfully',
      consent: {
        id: consent.id,
        consentType: consent.consentType,
        granted: consent.granted,
        grantedAt: consent.grantedAt,
        revokedAt: consent.revokedAt,
        version: consent.version,
      },
    });
  } catch (error) {
    logger.error('Record consent error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to record consent',
    });
  }
});

/**
 * GET /compliance/consent/:userId
 * Get user consents
 */
router.get('/consent/:userId', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.params['userId'];
    if (!userId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required',
      });
      return;
    }

    // Users can only view their own consents unless they're admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot view other users consents',
      });
      return;
    }

    const consents = complianceService.getUserConsents(userId);

    res.status(200).json({
      userId,
      consents: consents.map((c) => ({
        id: c.id,
        consentType: c.consentType,
        granted: c.granted,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
        version: c.version,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Get consents error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get consents',
    });
  }
});

/**
 * POST /compliance/gdpr/request
 * Create GDPR request
 */
router.post('/gdpr/request', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { requestType, notes } = req.body;

    if (!requestType) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'requestType is required',
      });
      return;
    }

    const gdprRequest = complianceService.createGDPRRequest({
      userId: req.user.id,
      requestType,
      notes,
    });

    res.status(201).json({
      message: 'GDPR request created successfully',
      request: {
        id: gdprRequest.id,
        requestType: gdprRequest.requestType,
        status: gdprRequest.status,
        requestedAt: gdprRequest.requestedAt,
      },
    });
  } catch (error) {
    logger.error('Create GDPR request error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create GDPR request',
    });
  }
});

/**
 * GET /compliance/gdpr/request
 * Get GDPR requests
 */
router.get(
  '/gdpr/request',
  authenticate,
  requirePermission(Permission.ADMIN_SECURITY),
  (req: Request, res: Response): void => {
    try {
      const userId = req.query['userId'] as string | undefined;
      const requestType = req.query['requestType'] as GDPRRequestType | undefined;
      const status = req.query['status'] as string | undefined;

      // Build filters object conditionally
      const filters: {
        userId?: string;
        requestType?: GDPRRequestType;
        status?: string;
      } = {};
      if (userId) filters.userId = userId;
      if (requestType) filters.requestType = requestType;
      if (status) filters.status = status;

      const requests = complianceService.getGDPRRequests(filters);

      res.status(200).json({
        requests: requests.map((r) => ({
          id: r.id,
          userId: r.userId,
          requestType: r.requestType,
          status: r.status,
          requestedAt: r.requestedAt,
          completedAt: r.completedAt,
          processedBy: r.processedBy,
        })),
        count: requests.length,
      });
    } catch (error) {
      logger.error('Get GDPR requests error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get GDPR requests',
      });
    }
  }
);

/**
 * POST /compliance/gdpr/request/:requestId/process
 * Process GDPR request
 */
router.post(
  '/gdpr/request/:requestId/process',
  authenticate,
  requirePermission(Permission.ADMIN_SECURITY),
  (req: AuthRequest, res: Response): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const requestId = req.params['requestId'];
      if (!requestId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'requestId is required',
        });
        return;
      }

      const { action, data } = req.body;

      if (!action || (action !== 'approve' && action !== 'reject')) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'action must be "approve" or "reject"',
        });
        return;
      }

      const request = complianceService.processGDPRRequest(
        requestId,
        req.user.id,
        action,
        data
      );

      if (!request) {
        res.status(404).json({
          error: 'Not Found',
          message: 'GDPR request not found',
        });
        return;
      }

      res.status(200).json({
        message: `GDPR request ${action}d successfully`,
        request: {
          id: request.id,
          status: request.status,
          completedAt: request.completedAt,
          processedBy: request.processedBy,
          data: request.data,
        },
      });
    } catch (error) {
      logger.error('Process GDPR request error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process GDPR request',
      });
    }
  }
);

/**
 * GET /compliance/data/:userId
 * Get user data (for GDPR access requests)
 */
router.get('/data/:userId', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.params['userId'];
    if (!userId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required',
      });
      return;
    }

    // Users can only access their own data unless they're admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot access other users data',
      });
      return;
    }

    const userData = complianceService.getUserData(userId);

    if (!userData) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User data not found',
      });
      return;
    }

    res.status(200).json({
      userData,
    });
  } catch (error) {
    logger.error('Get user data error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user data',
    });
  }
});

/**
 * GET /compliance/export/:userId
 * Export user data (for GDPR portability requests)
 */
router.get('/export/:userId', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.params['userId'];
    if (!userId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required',
      });
      return;
    }

    // Users can only export their own data unless they're admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot export other users data',
      });
      return;
    }

    const exportData = complianceService.exportUserData(userId);

    if (!exportData) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User data not found',
      });
      return;
    }

    res.status(200).json({
      export: exportData,
    });
  } catch (error) {
    logger.error('Export user data error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export user data',
    });
  }
});

/**
 * POST /compliance/retention
 * Create retention policy
 */
router.post(
  '/retention',
  authenticate,
  requirePermission(Permission.ADMIN_SECURITY),
  (req: Request, res: Response): void => {
    try {
      const { name, dataType, retentionPeriodDays, classification, autoDelete, legalBasis } = req.body;

      if (!name || !dataType || !retentionPeriodDays || !classification) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'name, dataType, retentionPeriodDays, and classification are required',
        });
        return;
      }

      const policy = complianceService.createRetentionPolicy({
        name,
        dataType,
        retentionPeriodDays,
        classification,
        autoDelete: autoDelete || false,
        legalBasis,
      });

      res.status(201).json({
        message: 'Retention policy created successfully',
        policy,
      });
    } catch (error) {
      logger.error('Create retention policy error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create retention policy',
      });
    }
  }
);

/**
 * GET /compliance/retention
 * Get retention policies
 */
router.get(
  '/retention',
  authenticate,
  requirePermission(Permission.ADMIN_SECURITY),
  (req: Request, res: Response): void => {
    try {
      const policies = complianceService.getRetentionPolicies();

      res.status(200).json({
        policies,
        count: policies.length,
      });
    } catch (error) {
      logger.error('Get retention policies error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get retention policies',
      });
    }
  }
);

/**
 * POST /compliance/privacy-policy
 * Create privacy policy version
 */
router.post(
  '/privacy-policy',
  authenticate,
  requirePermission(Permission.ADMIN_SECURITY),
  (req: Request, res: Response): void => {
    try {
      const { version, content, effectiveDate, changes } = req.body;

      if (!version || !content || !effectiveDate) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'version, content, and effectiveDate are required',
        });
        return;
      }

      const policy = complianceService.createPrivacyPolicy({
        version,
        content,
        effectiveDate,
        changes,
      });

      res.status(201).json({
        message: 'Privacy policy created successfully',
        policy: {
          id: policy.id,
          version: policy.version,
          effectiveDate: policy.effectiveDate,
          publishedAt: policy.publishedAt,
          isActive: policy.isActive,
        },
      });
    } catch (error) {
      logger.error('Create privacy policy error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create privacy policy',
      });
    }
  }
);

/**
 * GET /compliance/privacy-policy
 * Get active privacy policy
 */
router.get('/privacy-policy', (req: Request, res: Response): void => {
  try {
    const policy = complianceService.getActivePrivacyPolicy();

    if (!policy) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No active privacy policy found',
      });
      return;
    }

    res.status(200).json({
      policy: {
        id: policy.id,
        version: policy.version,
        content: policy.content,
        effectiveDate: policy.effectiveDate,
        publishedAt: policy.publishedAt,
      },
    });
  } catch (error) {
    logger.error('Get privacy policy error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get privacy policy',
    });
  }
});

/**
 * POST /compliance/report
 * Generate compliance report
 */
router.post(
  '/report',
  authenticate,
  requirePermission(Permission.ADMIN_SECURITY),
  (req: Request, res: Response): void => {
    try {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'startDate and endDate are required',
        });
        return;
      }

      const report = complianceService.generateComplianceReport({
        startDate,
        endDate,
      });

      res.status(200).json({
        message: 'Compliance report generated successfully',
        report,
      });
    } catch (error) {
      logger.error('Generate report error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate compliance report',
      });
    }
  }
);

export { router as complianceRouter };
