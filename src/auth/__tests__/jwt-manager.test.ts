import { describe, expect, it, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  refreshAccessToken,
  extractTokenFromHeader,
  type JWTPayload,
} from '../jwt-manager';

describe('JWT Manager', () => {
  let testPayload: JWTPayload;

  beforeEach(() => {
    // Set up test environment variables
    process.env['JWT_EXPIRES_IN'] = '1h';
    process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';

    testPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
      permissions: ['read', 'write'],
    };
  });

  describe('Token Generation', () => {
    it('should generate valid access token', () => {
      const token = generateAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should generate valid refresh token', () => {
      const token = generateRefreshToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate token pair', () => {
      const tokens = generateTokenPair(testPayload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens.expiresIn).toBe('1h');
    });

    it('should include payload data in token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.permissions).toEqual(testPayload.permissions);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
    });

    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
    });

    it('should throw error for invalid access token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyAccessToken(invalidToken)).toThrow('Invalid token');
    });

    it('should throw error for invalid refresh token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyRefreshToken(invalidToken)).toThrow('Invalid refresh token');
    });

    it('should throw error for expired access token', () => {
      // Generate token with very short expiration
      const secret = process.env['JWT_SECRET'] as string;
      const expiredToken = jwt.sign(testPayload, secret, {
        expiresIn: '1ms',
      });

      // Wait for token to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(() => verifyAccessToken(expiredToken)).toThrow('Token expired');
          resolve();
        }, 50);
      });
    });

    it('should not verify access token with refresh secret', () => {
      const accessToken = generateAccessToken(testPayload);

      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });

    it('should not verify refresh token with access secret', () => {
      const refreshToken = generateRefreshToken(testPayload);

      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('Token Decoding', () => {
    it('should decode token without verification', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(testPayload.userId);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid.token');

      expect(decoded).toBeNull();
    });

    it('should check if token is expired', () => {
      const token = generateAccessToken(testPayload);
      const expired = isTokenExpired(token);

      expect(expired).toBe(false);
    });

    it('should detect expired token', () => {
      const secret = process.env['JWT_SECRET'] as string;
      const expiredToken = jwt.sign(testPayload, secret, {
        expiresIn: '-1h', // Already expired
      });

      const expired = isTokenExpired(expiredToken);
      expect(expired).toBe(true);
    });

    it('should get token expiration date', () => {
      const token = generateAccessToken(testPayload);
      const expirationDate = getTokenExpiration(token);

      expect(expirationDate).toBeInstanceOf(Date);
      expect(expirationDate!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token expiration', () => {
      const expirationDate = getTokenExpiration('invalid.token');

      expect(expirationDate).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token using refresh token', () => {
      const refreshToken = generateRefreshToken(testPayload);
      const newAccessToken = refreshAccessToken(refreshToken);

      expect(newAccessToken).toBeDefined();
      expect(typeof newAccessToken).toBe('string');

      const decoded = verifyAccessToken(newAccessToken);
      expect(decoded.userId).toBe(testPayload.userId);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => refreshAccessToken('invalid.token')).toThrow();
    });

    it('should throw error for expired refresh token', () => {
      const refreshSecret = process.env['JWT_REFRESH_SECRET'] as string;
      const expiredToken = jwt.sign(testPayload, refreshSecret, {
        expiresIn: '-1h',
      });

      expect(() => refreshAccessToken(expiredToken)).toThrow('Refresh token expired');
    });
  });

  describe('Token Extraction', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test.jwt.token';
      const authHeader = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(null);
      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const extracted = extractTokenFromHeader('InvalidFormat token');
      expect(extracted).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const extracted = extractTokenFromHeader('test.jwt.token');
      expect(extracted).toBeNull();
    });

    it('should return null for empty Bearer token', () => {
      const extracted = extractTokenFromHeader('Bearer');
      expect(extracted).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full auth flow', () => {
      // 1. Generate token pair
      const { accessToken, refreshToken } = generateTokenPair(testPayload);

      // 2. Verify access token
      const decoded = verifyAccessToken(accessToken);
      expect(decoded.userId).toBe(testPayload.userId);

      // 3. Refresh access token
      const newAccessToken = refreshAccessToken(refreshToken);

      // 4. Verify new access token
      const newDecoded = verifyAccessToken(newAccessToken);
      expect(newDecoded.userId).toBe(testPayload.userId);
    });

    it('should handle token extraction and verification', () => {
      const token = generateAccessToken(testPayload);
      const authHeader = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);

      const decoded = verifyAccessToken(extracted!);
      expect(decoded.userId).toBe(testPayload.userId);
    });
  });
});
