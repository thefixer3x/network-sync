/**
 * Security Middleware
 *
 * CORS, CSRF, and security headers configuration
 */

import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { Logger } from '@/utils/Logger';

const logger = new Logger('SecurityMiddleware');

// Configuration
const ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] || '').split(',').filter(Boolean);
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';

/**
 * CORS Configuration
 */
export const CORS_CONFIG = {
  allowedOrigins: IS_PRODUCTION
    ? ALLOWED_ORIGINS
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Security Headers Configuration
 */
export const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self';",
};

/**
 * Apply CORS headers to response
 */
export function applyCORSHeaders(request: NextRequest, response: Response): Response {
  const origin = request.headers.get('origin');

  // Check if origin is allowed
  const isAllowedOrigin =
    origin && (CORS_CONFIG.allowedOrigins.includes(origin) || CORS_CONFIG.allowedOrigins.includes('*'));

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', CORS_CONFIG.allowedMethods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '));
  response.headers.set('Access-Control-Expose-Headers', CORS_CONFIG.exposedHeaders.join(', '));
  response.headers.set('Access-Control-Max-Age', CORS_CONFIG.maxAge.toString());

  return response;
}

/**
 * Handle preflight (OPTIONS) requests
 */
export function handlePreflight(request: NextRequest): Response | null {
  if (request.method === 'OPTIONS') {
    const response = new Response(null, { status: 204 });
    return applyCORSHeaders(request, response);
  }
  return null;
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: Response): Response {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * CSRF Token Management
 */
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  const token = randomUUID();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  csrfTokens.set(sessionId, { token, expiresAt });

  // Clean up expired tokens
  cleanupExpiredTokens();

  logger.debug(`CSRF token generated for session: ${sessionId}`);
  return token;
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);

  if (!stored) {
    logger.warn(`CSRF verification failed: No token for session ${sessionId}`);
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    logger.warn(`CSRF verification failed: Token expired for session ${sessionId}`);
    csrfTokens.delete(sessionId);
    return false;
  }

  if (stored.token !== token) {
    logger.warn(`CSRF verification failed: Invalid token for session ${sessionId}`);
    return false;
  }

  logger.debug(`CSRF token verified for session: ${sessionId}`);
  return true;
}

/**
 * Cleanup expired CSRF tokens
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(sessionId);
    }
  }
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(request: NextRequest): Response | null {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }

  // Skip CSRF for API key authenticated requests
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey === process.env['API_KEY']) {
    return null;
  }

  // Get session ID from cookie or header
  const sessionId = request.cookies.get('sessionId')?.value || request.headers.get('x-session-id');

  if (!sessionId) {
    logger.warn('CSRF protection: No session ID provided');
    return new Response(
      JSON.stringify({
        error: 'Missing session ID',
        code: 'CSRF_SESSION_MISSING',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Get CSRF token from header
  const csrfToken = request.headers.get('x-csrf-token');

  if (!csrfToken) {
    logger.warn('CSRF protection: No CSRF token provided');
    return new Response(
      JSON.stringify({
        error: 'Missing CSRF token',
        code: 'CSRF_TOKEN_MISSING',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Verify CSRF token
  if (!verifyCSRFToken(sessionId, csrfToken)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null; // CSRF verification passed
}

/**
 * Validate origin matches allowed list
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');

  if (!origin) {
    // Same-origin requests don't have Origin header
    return true;
  }

  return CORS_CONFIG.allowedOrigins.includes(origin) || CORS_CONFIG.allowedOrigins.includes('*');
}

/**
 * Origin validation middleware
 */
export function originValidation(request: NextRequest): Response | null {
  if (!validateOrigin(request)) {
    logger.warn(`Origin validation failed: ${request.headers.get('origin')}`);
    return new Response(
      JSON.stringify({
        error: 'Origin not allowed',
        code: 'ORIGIN_NOT_ALLOWED',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null;
}

/**
 * Combined security middleware
 */
export function securityMiddleware(request: NextRequest): Response | null {
  // 1. Handle preflight
  const preflightResponse = handlePreflight(request);
  if (preflightResponse) {
    return applySecurityHeaders(preflightResponse);
  }

  // 2. Validate origin
  const originError = originValidation(request);
  if (originError) {
    return originError;
  }

  // 3. CSRF protection for state-changing methods
  const csrfError = csrfProtection(request);
  if (csrfError) {
    return csrfError;
  }

  return null; // All security checks passed
}

/**
 * Export configuration for Next.js next.config.js
 */
export const nextSecurityHeaders = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
  key,
  value,
}));
