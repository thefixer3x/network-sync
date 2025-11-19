/**
 * Security Routes
 *
 * Provides endpoints for:
 * - Authentication (login, logout, refresh)
 * - API key management
 * - Session management
 * - Security events and audit logs
 * - IP management (whitelist/blacklist)
 * - Security statistics
 */

import { Router, Request, Response } from 'express';
import { Logger } from '@/utils/Logger';
import {
  securityService,
  UserRole,
  Permission,
  SecurityEventType,
  SecuritySeverity,
} from '@/services/security';
import {
  authenticate,
  requireRole,
  requirePermission,
  rateLimit,
  AuthRequest,
} from '@/middleware/auth';

const logger = new Logger('SecurityRoutes');
const router = Router();

/**
 * POST /security/auth/login
 * User login - create session
 */
router.post('/auth/login', rateLimit({ limit: 10 }), (req: Request, res: Response): void => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'userId and password are required',
      });
      return;
    }

    // TODO: Validate password against database
    // For now, we'll just create a session
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const { session, token, refreshToken } = securityService.createSession(
      userId,
      ipAddress,
      userAgent
    );

    // Update IP reputation
    securityService.updateIpReputation(ipAddress, true);

    res.status(200).json({
      message: 'Login successful',
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    logger.error('Login error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login',
    });
  }
});

/**
 * POST /security/auth/logout
 * User logout - destroy session
 */
router.post('/auth/logout', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Token required',
      });
      return;
    }

    const success = securityService.destroySession(token);

    if (success) {
      res.status(200).json({
        message: 'Logout successful',
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Session not found',
      });
    }
  } catch (error) {
    logger.error('Logout error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout',
    });
  }
});

/**
 * POST /security/auth/refresh
 * Refresh session token
 */
router.post('/auth/refresh', rateLimit({ limit: 20 }), (req: Request, res: Response): void => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'refreshToken is required',
      });
      return;
    }

    const tokens = securityService.refreshSession(refreshToken);

    if (tokens) {
      res.status(200).json({
        message: 'Token refreshed successfully',
        token: tokens.token,
        refreshToken: tokens.refreshToken,
      });
    } else {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      });
    }
  } catch (error) {
    logger.error('Token refresh error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh token',
    });
  }
});

/**
 * GET /security/auth/sessions
 * Get user's active sessions
 */
router.get('/auth/sessions', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const sessions = securityService.getUserSessions(req.user.id);

    res.status(200).json({
      sessions: sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Get sessions error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get sessions',
    });
  }
});

/**
 * POST /security/api-keys
 * Create API key
 */
router.post('/api-keys', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { name, permissions, expiresAt, rateLimit } = req.body;

    if (!name) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'name is required',
      });
      return;
    }

    const { apiKey, key } = securityService.createApiKey({
      name,
      userId: req.user.id,
      permissions: permissions || [],
      expiresAt,
      rateLimit,
    });

    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key, // Return the actual key only once
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    logger.error('Create API key error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create API key',
    });
  }
});

/**
 * GET /security/api-keys
 * List user's API keys
 */
router.get('/api-keys', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const apiKeys = securityService.getApiKeys(req.user.id);

    res.status(200).json({
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        permissions: key.permissions,
        rateLimit: key.rateLimit,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('List API keys error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list API keys',
    });
  }
});

/**
 * DELETE /security/api-keys/:apiKeyId
 * Revoke API key
 */
router.delete('/api-keys/:apiKeyId', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const apiKeyId = req.params['apiKeyId'];
    if (!apiKeyId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'apiKeyId is required',
      });
      return;
    }

    const success = securityService.revokeApiKey(apiKeyId);

    if (success) {
      res.status(200).json({
        message: 'API key revoked successfully',
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found',
      });
    }
  } catch (error) {
    logger.error('Revoke API key error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke API key',
    });
  }
});

/**
 * GET /security/events
 * Get security events (audit log)
 */
router.get(
  '/events',
  authenticate,
  requirePermission(Permission.ADMIN_SECURITY),
  (req: Request, res: Response): void => {
    try {
      const type = req.query['type'] as SecurityEventType | undefined;
      const severity = req.query['severity'] as SecuritySeverity | undefined;
      const userId = req.query['userId'] as string | undefined;
      const ipAddress = req.query['ipAddress'] as string | undefined;
      const startTime = req.query['startTime'] ? parseInt(req.query['startTime'] as string) : undefined;
      const endTime = req.query['endTime'] ? parseInt(req.query['endTime'] as string) : undefined;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 100;

      // Build filters object conditionally
      const filters: {
        type?: SecurityEventType;
        severity?: SecuritySeverity;
        userId?: string;
        ipAddress?: string;
        startTime?: number;
        endTime?: number;
        limit?: number;
      } = {};
      if (type) filters.type = type;
      if (severity) filters.severity = severity;
      if (userId) filters.userId = userId;
      if (ipAddress) filters.ipAddress = ipAddress;
      if (startTime) filters.startTime = startTime;
      if (endTime) filters.endTime = endTime;
      if (limit) filters.limit = limit;

      const events = securityService.getEvents(filters);

      res.status(200).json({
        events,
        count: events.length,
      });
    } catch (error) {
      logger.error('Get events error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get security events',
      });
    }
  }
);

/**
 * GET /security/statistics
 * Get security statistics
 */
router.get(
  '/statistics',
  authenticate,
  requirePermission(Permission.ADMIN_SECURITY),
  (req: Request, res: Response): void => {
    try {
      const statistics = securityService.getStatistics();

      res.status(200).json({
        statistics,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Get statistics error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get security statistics',
      });
    }
  }
);

/**
 * POST /security/ip/block
 * Block IP address
 */
router.post(
  '/ip/block',
  authenticate,
  requireRole(UserRole.ADMIN),
  (req: Request, res: Response): void => {
    try {
      const { ipAddress } = req.body;

      if (!ipAddress) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'ipAddress is required',
        });
        return;
      }

      securityService.blockIp(ipAddress);

      res.status(200).json({
        message: `IP address ${ipAddress} blocked successfully`,
      });
    } catch (error) {
      logger.error('Block IP error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to block IP',
      });
    }
  }
);

/**
 * POST /security/ip/unblock
 * Unblock IP address
 */
router.post(
  '/ip/unblock',
  authenticate,
  requireRole(UserRole.ADMIN),
  (req: Request, res: Response): void => {
    try {
      const { ipAddress } = req.body;

      if (!ipAddress) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'ipAddress is required',
        });
        return;
      }

      securityService.unblockIp(ipAddress);

      res.status(200).json({
        message: `IP address ${ipAddress} unblocked successfully`,
      });
    } catch (error) {
      logger.error('Unblock IP error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to unblock IP',
      });
    }
  }
);

/**
 * POST /security/ip/whitelist
 * Add IP to whitelist
 */
router.post(
  '/ip/whitelist',
  authenticate,
  requireRole(UserRole.ADMIN),
  (req: Request, res: Response): void => {
    try {
      const { ipAddress } = req.body;

      if (!ipAddress) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'ipAddress is required',
        });
        return;
      }

      securityService.whitelistIp(ipAddress);

      res.status(200).json({
        message: `IP address ${ipAddress} added to whitelist successfully`,
      });
    } catch (error) {
      logger.error('Whitelist IP error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to whitelist IP',
      });
    }
  }
);

/**
 * DELETE /security/ip/whitelist/:ipAddress
 * Remove IP from whitelist
 */
router.delete(
  '/ip/whitelist/:ipAddress',
  authenticate,
  requireRole(UserRole.ADMIN),
  (req: Request, res: Response): void => {
    try {
      const ipAddress = req.params['ipAddress'];
      if (!ipAddress) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'ipAddress is required',
        });
        return;
      }

      securityService.removeFromWhitelist(ipAddress);

      res.status(200).json({
        message: `IP address ${ipAddress} removed from whitelist successfully`,
      });
    } catch (error) {
      logger.error('Remove from whitelist error', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to remove from whitelist',
      });
    }
  }
);

/**
 * GET /security/permissions
 * Get all available permissions
 */
router.get('/permissions', authenticate, (req: Request, res: Response): void => {
  try {
    const permissions = Object.values(Permission);

    res.status(200).json({
      permissions,
    });
  } catch (error) {
    logger.error('Get permissions error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get permissions',
    });
  }
});

/**
 * GET /security/roles
 * Get all available roles
 */
router.get('/roles', authenticate, (req: Request, res: Response): void => {
  try {
    const roles = Object.values(UserRole);

    res.status(200).json({
      roles,
    });
  } catch (error) {
    logger.error('Get roles error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get roles',
    });
  }
});

export { router as securityRouter };
