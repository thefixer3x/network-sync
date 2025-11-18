/**
 * Webhook Signature Verification
 *
 * Verifies webhook signatures from social media platforms to ensure
 * authenticity and prevent replay attacks
 */

import crypto from 'node:crypto';
import { Logger } from '@/utils/Logger';

const logger = new Logger('WebhookSignature');

/**
 * Webhook verification result
 */
export interface VerificationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Generic HMAC signature verification
 */
export function verifyHMACSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  try {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(typeof payload === 'string' ? payload : payload.toString());
    const expectedSignature = hmac.digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Twitter/X webhook signature verification
 * Format: sha256=<signature>
 */
export function verifyTwitterSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): VerificationResult {
  try {
    if (!signature || !signature.startsWith('sha256=')) {
      return { isValid: false, reason: 'Invalid signature format' };
    }

    const signatureHash = signature.replace('sha256=', '');
    const isValid = verifyHMACSignature(payload, signatureHash, secret, 'sha256');

    logger.debug(`Twitter webhook signature verification: ${isValid ? 'valid' : 'invalid'}`);
    return isValid ? { isValid: true } : { isValid: false, reason: 'Signature mismatch' };
  } catch (error) {
    logger.error('Twitter signature verification error:', error);
    return { isValid: false, reason: 'Verification failed' };
  }
}

/**
 * LinkedIn webhook signature verification
 * Format: <signature>
 */
export function verifyLinkedInSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): VerificationResult {
  try {
    const isValid = verifyHMACSignature(payload, signature, secret, 'sha256');

    logger.debug(`LinkedIn webhook signature verification: ${isValid ? 'valid' : 'invalid'}`);
    return isValid ? { isValid: true } : { isValid: false, reason: 'Signature mismatch' };
  } catch (error) {
    logger.error('LinkedIn signature verification error:', error);
    return { isValid: false, reason: 'Verification failed' };
  }
}

/**
 * Facebook/Instagram webhook signature verification
 * Format: sha256=<signature>
 */
export function verifyFacebookSignature(
  payload: string | Buffer,
  signature: string,
  appSecret: string
): VerificationResult {
  try {
    if (!signature || !signature.startsWith('sha256=')) {
      // Try sha1 for backward compatibility
      if (signature.startsWith('sha1=')) {
        const signatureHash = signature.replace('sha1=', '');
        const isValid = verifyHMACSignature(payload, signatureHash, appSecret, 'sha1');
        return isValid ? { isValid: true } : { isValid: false, reason: 'Signature mismatch' };
      }
      return { isValid: false, reason: 'Invalid signature format' };
    }

    const signatureHash = signature.replace('sha256=', '');
    const isValid = verifyHMACSignature(payload, signatureHash, appSecret, 'sha256');

    logger.debug(`Facebook webhook signature verification: ${isValid ? 'valid' : 'invalid'}`);
    return isValid ? { isValid: true } : { isValid: false, reason: 'Signature mismatch' };
  } catch (error) {
    logger.error('Facebook signature verification error:', error);
    return { isValid: false, reason: 'Verification failed' };
  }
}

/**
 * Verify timestamp to prevent replay attacks
 * Rejects requests older than the tolerance window
 */
export function verifyTimestamp(
  timestamp: number,
  toleranceSeconds: number = 300 // 5 minutes default
): VerificationResult {
  try {
    const currentTime = Math.floor(Date.now() / 1000);
    const age = currentTime - timestamp;

    if (age > toleranceSeconds) {
      logger.warn(`Webhook timestamp too old: ${age} seconds`);
      return {
        isValid: false,
        reason: `Timestamp too old (${age}s > ${toleranceSeconds}s)`,
      };
    }

    if (age < -toleranceSeconds) {
      logger.warn(`Webhook timestamp in future: ${Math.abs(age)} seconds`);
      return {
        isValid: false,
        reason: 'Timestamp in future',
      };
    }

    return { isValid: true };
  } catch (error) {
    logger.error('Timestamp verification error:', error);
    return { isValid: false, reason: 'Invalid timestamp' };
  }
}

/**
 * Generic webhook verification middleware
 */
export function verifyWebhookSignature(
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram',
  payload: string | Buffer,
  signature: string,
  secret: string,
  timestamp?: number
): VerificationResult {
  try {
    // Verify timestamp if provided
    if (timestamp !== undefined) {
      const timestampResult = verifyTimestamp(timestamp);
      if (!timestampResult.isValid) {
        return timestampResult;
      }
    }

    // Verify signature based on platform
    switch (platform) {
      case 'twitter':
        return verifyTwitterSignature(payload, signature, secret);

      case 'linkedin':
        return verifyLinkedInSignature(payload, signature, secret);

      case 'facebook':
      case 'instagram':
        return verifyFacebookSignature(payload, signature, secret);

      default:
        return { isValid: false, reason: `Unsupported platform: ${platform}` };
    }
  } catch (error) {
    logger.error('Webhook verification error:', error);
    return { isValid: false, reason: 'Verification failed' };
  }
}

/**
 * Generate webhook signature for testing/sending
 */
export function generateWebhookSignature(
  payload: string | Buffer,
  secret: string,
  algorithm: string = 'sha256'
): string {
  const hmac = crypto.createHmac(algorithm, secret);
  hmac.update(typeof payload === 'string' ? payload : payload.toString());
  return hmac.digest('hex');
}

/**
 * Verify challenge token (used by Facebook/Instagram for webhook setup)
 */
export function verifyChallengeToken(
  providedToken: string,
  expectedToken: string
): boolean {
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedToken),
      Buffer.from(expectedToken)
    );
  } catch (error) {
    logger.error('Challenge token verification error:', error);
    return false;
  }
}

/**
 * Extract signature from headers based on platform
 */
export function extractSignatureFromHeaders(
  headers: Record<string, string | undefined>,
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram'
): string | null {
  switch (platform) {
    case 'twitter':
      return headers['x-twitter-webhooks-signature'] || null;

    case 'linkedin':
      return headers['x-linkedin-signature'] || null;

    case 'facebook':
    case 'instagram':
      return headers['x-hub-signature-256'] || headers['x-hub-signature'] || null;

    default:
      return null;
  }
}

/**
 * Webhook verification middleware for Next.js
 */
export function createWebhookVerifier(
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram',
  getSecret: () => string
) {
  return async (request: Request): Promise<Response | null> => {
    try {
      // Get the raw body
      const body = await request.text();

      // Extract signature from headers
      const headers = Object.fromEntries(request.headers.entries());
      const signature = extractSignatureFromHeaders(headers, platform);

      if (!signature) {
        logger.warn(`No signature found for ${platform} webhook`);
        return new Response(
          JSON.stringify({
            error: 'Missing signature',
            code: 'WEBHOOK_SIGNATURE_MISSING',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Get webhook secret
      const secret = getSecret();

      if (!secret) {
        logger.error(`Webhook secret not configured for ${platform}`);
        return new Response(
          JSON.stringify({
            error: 'Webhook configuration error',
            code: 'WEBHOOK_NOT_CONFIGURED',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Verify signature
      const result = verifyWebhookSignature(platform, body, signature, secret);

      if (!result.isValid) {
        logger.warn(`Webhook signature verification failed for ${platform}: ${result.reason}`);
        return new Response(
          JSON.stringify({
            error: 'Invalid signature',
            code: 'WEBHOOK_SIGNATURE_INVALID',
            reason: result.reason,
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      logger.info(`Webhook verified successfully for ${platform}`);
      return null; // Verification passed, continue processing
    } catch (error) {
      logger.error('Webhook verification middleware error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          code: 'WEBHOOK_VERIFICATION_ERROR',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
