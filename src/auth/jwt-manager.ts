/**
 * JWT Token Management System
 *
 * Handles JWT token generation, validation, and refresh
 * for authentication and authorization.
 */

import jwt from 'jsonwebtoken';
import { Logger } from '@/utils/Logger';

const logger = new Logger('JWTManager');

// JWT Configuration - MUST be set via environment variables
// Validated by env-validation.ts at startup
if (!process.env['JWT_SECRET'] || !process.env['JWT_REFRESH_SECRET']) {
  throw new Error(
    'JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables. ' +
      'These are required for security. See .env.example for details.'
  );
}

const JWT_SECRET = process.env['JWT_SECRET'];
const JWT_EXPIRES_IN: string | number = process.env['JWT_EXPIRES_IN'] || '1h';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'];
const JWT_REFRESH_EXPIRES_IN: string | number = process.env['JWT_REFRESH_EXPIRES_IN'] || '7d';

// JWT Payload Interface
export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  permissions?: string[];
}

// Token Pair Interface
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string | number;
}

// Decoded Token Interface
export interface DecodedToken extends JWTPayload {
  iat: number;
  exp: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: JWTPayload): string {
  try {
    const options: jwt.SignOptions = {
      expiresIn: JWT_EXPIRES_IN as any,
    };

    const token = jwt.sign(payload, JWT_SECRET, options);

    logger.debug(`Access token generated for user: ${payload.userId}`);
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: JWTPayload): string {
  try {
    const options: jwt.SignOptions = {
      expiresIn: JWT_REFRESH_EXPIRES_IN as any,
    };

    const token = jwt.sign(payload, JWT_REFRESH_SECRET, options);

    logger.debug(`Refresh token generated for user: ${payload.userId}`);
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: JWTPayload): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN,
  };
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    logger.debug(`Access token verified for user: ${decoded.userId}`);
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Access token expired');
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token');
      throw new Error('Invalid token');
    } else {
      logger.error('Error verifying access token:', error);
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Verify JWT refresh token
 */
export function verifyRefreshToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as DecodedToken;
    logger.debug(`Refresh token verified for user: ${decoded.userId}`);
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Refresh token expired');
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid refresh token');
      throw new Error('Invalid refresh token');
    } else {
      logger.error('Error verifying refresh token:', error);
      throw new Error('Refresh token verification failed');
    }
  }
}

/**
 * Decode token without verification (use for debugging only)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    try {
      // First try verifying as an access token, ignoring expiration
      const decodedAccess = jwt.verify(token, JWT_SECRET, {
        ignoreExpiration: true,
      }) as DecodedToken;
      return decodedAccess;
    } catch (accessError) {
      // If that fails, try verifying as a refresh token
      const decodedRefresh = jwt.verify(token, JWT_REFRESH_SECRET, {
        ignoreExpiration: true,
      }) as DecodedToken;
      return decodedRefresh;
    }
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    logger.error('Error checking token expiration:', error);
    return true;
  }
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = decodeToken(token);
    if (!decoded) return null;

    return new Date(decoded.exp * 1000);
  } catch (error) {
    logger.error('Error getting token expiration:', error);
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): string {
  try {
    const decoded = verifyRefreshToken(refreshToken);

    // Create new access token with same payload (excluding iat/exp)
    const payload: JWTPayload = {
      userId: decoded.userId,
      email: decoded.email,
      ...(decoded.role ? { role: decoded.role } : {}),
      ...(decoded.permissions ? { permissions: decoded.permissions } : {}),
    };

    return generateAccessToken(payload);
  } catch (error) {
    logger.error('Error refreshing access token:', error);
    throw error;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  // Format: "Bearer <token>"
  const parts = authorizationHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] ?? null;
}

/**
 * Validate JWT configuration
 * Note: Basic validation (presence of secrets) happens at module load
 * This function performs additional security checks
 */
export function validateJWTConfig(): void {
  const warnings: string[] = [];

  if (JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long');
  }

  if (JWT_REFRESH_SECRET.length < 32) {
    warnings.push('JWT_REFRESH_SECRET should be at least 32 characters long');
  }

  if (JWT_SECRET === JWT_REFRESH_SECRET) {
    warnings.push('JWT_SECRET and JWT_REFRESH_SECRET should be different');
  }

  if (JWT_SECRET.includes('development') || JWT_SECRET.includes('test')) {
    warnings.push('JWT_SECRET appears to contain development/test keywords');
  }

  if (JWT_REFRESH_SECRET.includes('development') || JWT_REFRESH_SECRET.includes('test')) {
    warnings.push('JWT_REFRESH_SECRET appears to contain development/test keywords');
  }

  if (warnings.length > 0 && process.env['NODE_ENV'] === 'production') {
    logger.error('JWT Configuration Warnings (PRODUCTION):');
    warnings.forEach((warning) => logger.error(`  - ${warning}`));
    throw new Error('Invalid JWT configuration for production');
  } else if (warnings.length > 0) {
    logger.warn('JWT Configuration Warnings:');
    warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }
}

// Perform security validation on module load
validateJWTConfig();
