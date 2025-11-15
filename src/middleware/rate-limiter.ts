/**
 * Rate Limiting Middleware
 *
 * Implements Redis-backed rate limiting to prevent abuse and ensure fair usage
 */

import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { Logger } from '@/utils/Logger';
import type { NextRequest } from 'next/server';

const logger = new Logger('RateLimiter');

// Redis client configuration
const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env['REDIS_PASSWORD'];

// Rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later',
  },

  // AI-powered endpoints (more expensive)
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 requests per hour
    message: 'AI endpoint rate limit exceeded, please try again later',
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later',
  },

  // Content posting endpoints
  posting: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 posts per hour
    message: 'Posting rate limit exceeded, please try again later',
  },

  // Analytics/reporting endpoints
  analytics: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Analytics rate limit exceeded, please slow down',
  },

  // Webhook endpoints
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 webhooks per minute
    message: 'Webhook rate limit exceeded',
  },
};

/**
 * Create Redis client for rate limiting
 */
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  try {
    const client = createClient({
      url: REDIS_URL,
      password: REDIS_PASSWORD,
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger.info('Redis client connected for rate limiting');
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw new Error('Redis connection failed');
  }
}

/**
 * Create rate limiter with Redis store
 */
export async function createRateLimiter(
  configName: keyof typeof RATE_LIMIT_CONFIGS = 'general'
) {
  const config = RATE_LIMIT_CONFIGS[configName];

  try {
    const client = await getRedisClient();

    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: config.message,
      standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers
      store: new RedisStore({
        // @ts-expect-error - RedisStore types are not fully compatible
        client: client,
        prefix: `rate_limit:${configName}:`,
      }),
      // Key generator based on IP and user ID if authenticated
      keyGenerator: (req: any) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
        const userId = req.user?.userId;
        return userId ? `user:${userId}` : `ip:${ip}`;
      },
      // Skip rate limiting for specific conditions
      skip: (req: any) => {
        // Skip rate limiting if API key is valid (service-to-service)
        const apiKey = req.headers['x-api-key'];
        const validAPIKey = process.env['API_KEY'];
        return apiKey === validAPIKey && !!validAPIKey;
      },
    });
  } catch (error) {
    logger.warn('Redis not available, using in-memory rate limiter');

    // Fallback to in-memory store if Redis is not available
    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: config.message,
      standardHeaders: true,
      legacyHeaders: false,
    });
  }
}

/**
 * Rate limiter for Next.js API routes
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  configName: keyof typeof RATE_LIMIT_CONFIGS = 'general'
): Promise<Response | null> {
  try {
    const config = RATE_LIMIT_CONFIGS[configName];
    const client = await getRedisClient();

    // Get identifier (user ID or IP)
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userId = (request as any).user?.userId;
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;

    // Skip if valid API key
    const apiKey = request.headers.get('x-api-key');
    const validAPIKey = process.env['API_KEY'];
    if (apiKey === validAPIKey && validAPIKey) {
      return null; // Skip rate limiting
    }

    // Redis key
    const key = `rate_limit:${configName}:${identifier}`;

    // Get current count
    const current = await client.incr(key);

    // Set expiration on first request
    if (current === 1) {
      await client.pExpire(key, config.windowMs);
    }

    // Check if limit exceeded
    if (current > config.max) {
      const ttl = await client.pTTL(key);
      const resetTime = new Date(Date.now() + ttl);

      logger.warn(`Rate limit exceeded for ${identifier} on ${configName} endpoint`);

      return new Response(
        JSON.stringify({
          error: config.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(ttl / 1000),
          resetTime: resetTime.toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(ttl / 1000).toString(),
            'X-RateLimit-Limit': config.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toISOString(),
          },
        }
      );
    }

    // Add rate limit headers to response (will be set by the handler)
    const remaining = config.max - current;
    logger.debug(
      `Rate limit check: ${identifier} - ${current}/${config.max} (${remaining} remaining)`
    );

    return null; // Allow request to continue
  } catch (error) {
    logger.error('Rate limiting error:', error);
    // Fail open - allow request if rate limiting fails
    return null;
  }
}

/**
 * Get rate limit status for a user/IP
 */
export async function getRateLimitStatus(
  identifier: string,
  configName: keyof typeof RATE_LIMIT_CONFIGS = 'general'
): Promise<{
  current: number;
  limit: number;
  remaining: number;
  resetTime: Date | null;
}> {
  try {
    const config = RATE_LIMIT_CONFIGS[configName];
    const client = await getRedisClient();
    const key = `rate_limit:${configName}:${identifier}`;

    const current = (await client.get(key)) || '0';
    const currentCount = parseInt(current, 10);
    const ttl = await client.pTTL(key);

    return {
      current: currentCount,
      limit: config.max,
      remaining: Math.max(0, config.max - currentCount),
      resetTime: ttl > 0 ? new Date(Date.now() + ttl) : null,
    };
  } catch (error) {
    logger.error('Error getting rate limit status:', error);
    throw error;
  }
}

/**
 * Reset rate limit for a specific identifier
 */
export async function resetRateLimit(
  identifier: string,
  configName: keyof typeof RATE_LIMIT_CONFIGS = 'general'
): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `rate_limit:${configName}:${identifier}`;
    await client.del(key);
    logger.info(`Rate limit reset for ${identifier} on ${configName}`);
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
    throw error;
  }
}

/**
 * Cleanup Redis connection
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client disconnected');
  }
}

/**
 * Helper to create rate limit response
 */
export function createRateLimitResponse(
  configName: keyof typeof RATE_LIMIT_CONFIGS,
  retryAfterSeconds: number
): Response {
  const config = RATE_LIMIT_CONFIGS[configName];
  const resetTime = new Date(Date.now() + retryAfterSeconds * 1000);

  return new Response(
    JSON.stringify({
      error: config.message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfterSeconds,
      resetTime: resetTime.toISOString(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfterSeconds.toString(),
        'X-RateLimit-Limit': config.max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetTime.toISOString(),
      },
    }
  );
}
