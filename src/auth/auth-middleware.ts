/**
 * Authentication Middleware
 *
 * Middleware functions for protecting routes and validating JWT tokens
 */

import type { NextRequest } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, type DecodedToken } from './jwt-manager';
import { Logger } from '@/utils/Logger';

const logger = new Logger('AuthMiddleware');

// Extended Request with user data
export interface AuthenticatedRequest extends NextRequest {
  user?: DecodedToken;
}

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Authenticate request and extract user from JWT token
 */
export function authenticate(request: NextRequest): DecodedToken {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new AuthenticationError('No authorization header provided');
    }

    // Extract token
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthenticationError('Invalid authorization header format');
    }

    // Verify token
    const user = verifyAccessToken(token);

    logger.debug(`User authenticated: ${user.userId}`);
    return user;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        throw new AuthenticationError('Access token expired', 401);
      } else if (error.message === 'Invalid token') {
        throw new AuthenticationError('Invalid access token', 401);
      }
    }

    logger.error('Authentication error:', error);
    throw new AuthenticationError('Authentication failed');
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(handler: (request: AuthenticatedRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const user = authenticate(request);
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      return await handler(authenticatedRequest);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return new Response(
          JSON.stringify({
            error: error.message,
            code: 'AUTHENTICATION_FAILED',
          }),
          {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      logger.error('Unexpected error in requireAuth:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Check if user has required role
 */
export function hasRole(user: DecodedToken, requiredRole: string): boolean {
  return user.role === requiredRole || user.role === 'admin';
}

/**
 * Check if user has required permission
 */
export function hasPermission(user: DecodedToken, requiredPermission: string): boolean {
  if (user.role === 'admin') {
    return true;
  }

  return user.permissions?.includes(requiredPermission) ?? false;
}

/**
 * Middleware to require specific role
 */
export function requireRole(
  role: string,
  handler: (request: AuthenticatedRequest) => Promise<Response>
) {
  return requireAuth(async (request: AuthenticatedRequest) => {
    if (!request.user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!hasRole(request.user, role)) {
      throw new AuthorizationError(`Role '${role}' required`);
    }

    return await handler(request);
  });
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(
  permission: string,
  handler: (request: AuthenticatedRequest) => Promise<Response>
) {
  return requireAuth(async (request: AuthenticatedRequest) => {
    if (!request.user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!hasPermission(request.user, permission)) {
      throw new AuthorizationError(`Permission '${permission}' required`);
    }

    return await handler(request);
  });
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(
  permissions: string[],
  handler: (request: AuthenticatedRequest) => Promise<Response>
) {
  return requireAuth(async (request: AuthenticatedRequest) => {
    if (!request.user) {
      throw new AuthenticationError('User not authenticated');
    }

    const hasAnyPermission = permissions.some((permission) =>
      hasPermission(request.user!, permission)
    );

    if (!hasAnyPermission) {
      throw new AuthorizationError(`One of [${permissions.join(', ')}] permissions required`);
    }

    return await handler(request);
  });
}

/**
 * Optional authentication - doesn't fail if token is missing
 */
export function optionalAuth(
  handler: (request: AuthenticatedRequest) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const authenticatedRequest = request as AuthenticatedRequest;

    try {
      const user = authenticate(request);
      authenticatedRequest.user = user;
    } catch (error) {
      // Ignore authentication errors for optional auth
      logger.debug('Optional auth: No valid token provided');
      authenticatedRequest.user = undefined;
    }

    return await handler(authenticatedRequest);
  };
}

/**
 * Get current user from request (returns null if not authenticated)
 */
export function getCurrentUser(request: NextRequest): DecodedToken | null {
  try {
    return authenticate(request);
  } catch (error) {
    return null;
  }
}

/**
 * Validate API key from header (for service-to-service auth)
 */
export function validateAPIKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validAPIKey = process.env['API_KEY'];

  if (!validAPIKey) {
    logger.warn('API_KEY not configured');
    return false;
  }

  return apiKey === validAPIKey;
}

/**
 * Middleware to require API key
 */
export function requireAPIKey(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    if (!validateAPIKey(request)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or missing API key',
          code: 'INVALID_API_KEY',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return await handler(request);
  };
}
