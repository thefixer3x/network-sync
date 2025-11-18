/**
 * Authentication Middleware
 *
 * Provides middleware for:
 * - JWT token authentication
 * - API key authentication
 * - Role-based access control (RBAC)
 * - Permission checks
 * - Rate limiting
 * - IP blocking
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@/utils/Logger';
import {
  securityService,
  UserRole,
  Permission,
  SecurityEventType,
  SecuritySeverity,
} from '@/services/security';

const logger = new Logger('AuthMiddleware');

/**
 * Extended request interface with auth data
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    sessionId?: string;
    apiKeyId?: string;
  };
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" and "Token <token>" formats
  const parts = authHeader.split(' ');
  if (parts.length === 2 && (parts[0] === 'Bearer' || parts[0] === 'Token')) {
    return parts[1] || null;
  }

  return null;
}

/**
 * Extract API key from header
 */
function extractApiKey(req: Request): string | null {
  return req.headers['x-api-key'] as string || null;
}

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Authenticate request with JWT token or API key
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Check if IP is blocked
  if (securityService.isIpBlocked(ipAddress)) {
    securityService.logEvent({
      type: SecurityEventType.ACCESS_DENIED,
      severity: SecuritySeverity.WARNING,
      ipAddress,
      userAgent,
      resource: req.path,
      action: req.method,
      outcome: 'failure',
      message: `Access denied - IP blocked: ${ipAddress}`,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Your IP address has been blocked due to suspicious activity',
    });
    return;
  }

  // Try token authentication first
  const token = extractToken(req);
  if (token) {
    const session = securityService.validateSession(token);
    if (session) {
      // Attach user to request
      req.user = {
        id: session.userId,
        role: UserRole.USER, // Default role, should be fetched from database
        sessionId: session.id,
      };

      securityService.logEvent({
        type: SecurityEventType.ACCESS_GRANTED,
        severity: SecuritySeverity.INFO,
        userId: session.userId,
        ipAddress,
        userAgent,
        resource: req.path,
        action: req.method,
        outcome: 'success',
        message: 'Access granted via session token',
      });

      next();
      return;
    }
  }

  // Try API key authentication
  const apiKey = extractApiKey(req);
  if (apiKey) {
    const validatedKey = securityService.validateApiKey(apiKey);
    if (validatedKey) {
      // Check rate limit for API key
      const rateLimitKey = `apikey:${validatedKey.id}`;
      if (!securityService.checkRateLimit(rateLimitKey, validatedKey.rateLimit)) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'API key rate limit exceeded',
        });
        return;
      }

      // Attach user to request
      req.user = {
        id: validatedKey.userId,
        role: UserRole.API_CLIENT,
        apiKeyId: validatedKey.id,
      };

      securityService.logEvent({
        type: SecurityEventType.ACCESS_GRANTED,
        severity: SecuritySeverity.INFO,
        userId: validatedKey.userId,
        ipAddress,
        userAgent,
        resource: req.path,
        action: req.method,
        outcome: 'success',
        message: 'Access granted via API key',
        metadata: { apiKeyId: validatedKey.id },
      });

      next();
      return;
    }
  }

  // No valid authentication
  securityService.logEvent({
    type: SecurityEventType.ACCESS_DENIED,
    severity: SecuritySeverity.WARNING,
    ipAddress,
    userAgent,
    resource: req.path,
    action: req.method,
    outcome: 'failure',
    message: 'Access denied - no valid authentication',
  });

  res.status(401).json({
    error: 'Unauthorized',
    message: 'Valid authentication required',
  });
}

/**
 * Require specific role
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      securityService.logEvent({
        type: SecurityEventType.ACCESS_DENIED,
        severity: SecuritySeverity.WARNING,
        userId: req.user.id,
        ipAddress: getClientIp(req),
        resource: req.path,
        action: req.method,
        outcome: 'failure',
        message: `Access denied - role ${req.user.role} not in required roles: ${roles.join(', ')}`,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Require specific permission
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Check if user has all required permissions
    const hasPermissions = securityService.hasAllPermissions(req.user.role, permissions);

    if (!hasPermissions) {
      securityService.logEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        severity: SecuritySeverity.WARNING,
        userId: req.user.id,
        ipAddress: getClientIp(req),
        resource: req.path,
        action: req.method,
        outcome: 'failure',
        message: `Permission denied - missing permissions: ${permissions.join(', ')}`,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Require any of the permissions
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Check if user has any of the required permissions
    const hasPermissions = securityService.hasAnyPermission(req.user.role, permissions);

    if (!hasPermissions) {
      securityService.logEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        severity: SecuritySeverity.WARNING,
        userId: req.user.id,
        ipAddress: getClientIp(req),
        resource: req.path,
        action: req.method,
        outcome: 'failure',
        message: `Permission denied - missing any of permissions: ${permissions.join(', ')}`,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options: { limit?: number; identifier?: (req: Request) => string } = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const limit = options.limit || 100; // Default 100 requests per minute
    const identifier = options.identifier
      ? options.identifier(req)
      : `ip:${getClientIp(req)}`;

    if (!securityService.checkRateLimit(identifier, limit)) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
      return;
    }

    next();
  };
}

/**
 * IP whitelist middleware
 */
export function ipWhitelist(req: Request, res: Response, next: NextFunction): void {
  const ipAddress = getClientIp(req);

  if (!securityService.isIpWhitelisted(ipAddress)) {
    securityService.logEvent({
      type: SecurityEventType.ACCESS_DENIED,
      severity: SecuritySeverity.WARNING,
      ipAddress,
      resource: req.path,
      action: req.method,
      outcome: 'failure',
      message: `Access denied - IP not whitelisted: ${ipAddress}`,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Your IP address is not allowed to access this resource',
    });
    return;
  }

  next();
}

/**
 * Anomaly detection middleware
 */
export function detectAnomalies(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user) {
    const hasAnomalies = securityService.detectAnomalies(req.user.id);
    if (hasAnomalies) {
      logger.warn('Anomalies detected for user', { userId: req.user.id });
      // Continue but log the anomaly - don't block the request
    }
  }

  next();
}

/**
 * Optional authentication (doesn't fail if no auth provided)
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const session = securityService.validateSession(token);
    if (session) {
      req.user = {
        id: session.userId,
        role: UserRole.USER,
        sessionId: session.id,
      };
    }
  } else {
    const apiKey = extractApiKey(req);
    if (apiKey) {
      const validatedKey = securityService.validateApiKey(apiKey);
      if (validatedKey) {
        req.user = {
          id: validatedKey.userId,
          role: UserRole.API_CLIENT,
          apiKeyId: validatedKey.id,
        };
      }
    }
  }

  next();
}
