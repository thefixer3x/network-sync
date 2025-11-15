/**
 * Data Encryption Utilities
 *
 * AES-256-CBC encryption for sensitive data (credentials, API keys, tokens)
 * stored in the database
 */

import CryptoJS from 'crypto-js';
import { Logger } from '@/utils/Logger';

const logger = new Logger('DataEncryption');

// Encryption configuration
const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || 'default-key-change-in-production-must-be-32-chars';
const ENCRYPTION_ALGORITHM = process.env['ENCRYPTION_ALGORITHM'] || 'aes-256-cbc';

/**
 * Encrypted data format
 */
export interface EncryptedData {
  encryptedValue: string;
  iv: string; // Initialization vector
  algorithm: string;
  encryptedAt: string;
}

/**
 * Encrypt sensitive data
 */
export function encryptData(plainText: string): EncryptedData {
  try {
    if (!plainText) {
      throw new Error('Cannot encrypt empty data');
    }

    // Validate encryption key
    validateEncryptionKey();

    // Generate random IV for each encryption
    const iv = CryptoJS.lib.WordArray.random(16);

    // Encrypt using AES
    const encrypted = CryptoJS.AES.encrypt(plainText, ENCRYPTION_KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    logger.debug('Data encrypted successfully');

    return {
      encryptedValue: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Hex),
      algorithm: ENCRYPTION_ALGORITHM,
      encryptedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: EncryptedData): string {
  try {
    if (!encryptedData || !encryptedData.encryptedValue) {
      throw new Error('Invalid encrypted data');
    }

    // Validate encryption key
    validateEncryptionKey();

    // Parse IV from hex
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);

    // Decrypt using AES
    const decrypted = CryptoJS.AES.decrypt(encryptedData.encryptedValue, ENCRYPTION_KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plainText = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plainText) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }

    logger.debug('Data decrypted successfully');
    return plainText;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt credentials object
 */
export function encryptCredentials(credentials: Record<string, string>): Record<string, EncryptedData> {
  const encrypted: Record<string, EncryptedData> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (value) {
      encrypted[key] = encryptData(value);
    }
  }

  logger.info(`Encrypted ${Object.keys(encrypted).length} credential fields`);
  return encrypted;
}

/**
 * Decrypt credentials object
 */
export function decryptCredentials(encryptedCredentials: Record<string, EncryptedData>): Record<string, string> {
  const decrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(encryptedCredentials)) {
    if (value) {
      decrypted[key] = decryptData(value);
    }
  }

  logger.info(`Decrypted ${Object.keys(decrypted).length} credential fields`);
  return decrypted;
}

/**
 * Hash sensitive data (one-way) - for comparison purposes
 */
export function hashData(data: string): string {
  try {
    const hash = CryptoJS.SHA256(data);
    return hash.toString(CryptoJS.enc.Hex);
  } catch (error) {
    logger.error('Hashing error:', error);
    throw new Error('Failed to hash data');
  }
}

/**
 * Validate encryption key configuration
 */
function validateEncryptionKey(): void {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }

  if (ENCRYPTION_KEY === 'default-key-change-in-production-must-be-32-chars') {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('Default encryption key cannot be used in production');
    }
    logger.warn('Using default encryption key - not suitable for production');
  }

  if (ENCRYPTION_KEY.length < 32) {
    throw new Error('Encryption key must be at least 32 characters');
  }
}

/**
 * Generate a secure encryption key
 */
export function generateEncryptionKey(length: number = 32): string {
  const randomBytes = CryptoJS.lib.WordArray.random(length);
  return randomBytes.toString(CryptoJS.enc.Hex);
}

/**
 * Rotate encryption - re-encrypt with new key
 */
export function rotateEncryption(
  encryptedData: EncryptedData,
  oldKey: string,
  newKey: string
): EncryptedData {
  try {
    // Temporarily override the encryption key
    const originalKey = process.env['ENCRYPTION_KEY'];
    process.env['ENCRYPTION_KEY'] = oldKey;

    // Decrypt with old key
    const plainText = decryptData(encryptedData);

    // Re-encrypt with new key
    process.env['ENCRYPTION_KEY'] = newKey;
    const reEncrypted = encryptData(plainText);

    // Restore original key
    process.env['ENCRYPTION_KEY'] = originalKey;

    logger.info('Encryption rotated successfully');
    return reEncrypted;
  } catch (error) {
    logger.error('Encryption rotation error:', error);
    throw new Error('Failed to rotate encryption');
  }
}

/**
 * Check if data needs re-encryption (for key rotation)
 */
export function needsReEncryption(encryptedData: EncryptedData): boolean {
  // Check if algorithm has changed
  if (encryptedData.algorithm !== ENCRYPTION_ALGORITHM) {
    return true;
  }

  // Check if encrypted more than 90 days ago (key rotation policy)
  const encryptedDate = new Date(encryptedData.encryptedAt);
  const daysSinceEncryption = (Date.now() - encryptedDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceEncryption > 90;
}

/**
 * Validate encryption configuration on module load
 */
export function validateEncryptionConfig(): void {
  const warnings: string[] = [];

  if (ENCRYPTION_KEY === 'default-key-change-in-production-must-be-32-chars') {
    warnings.push('ENCRYPTION_KEY is using default development value');
  }

  if (ENCRYPTION_KEY.length < 32) {
    warnings.push('ENCRYPTION_KEY should be at least 32 characters long');
  }

  if (warnings.length > 0 && process.env['NODE_ENV'] === 'production') {
    logger.error('Encryption Configuration Errors:');
    warnings.forEach((warning) => logger.error(`  - ${warning}`));
    throw new Error('Invalid encryption configuration for production');
  } else if (warnings.length > 0) {
    logger.warn('Encryption Configuration Warnings:');
    warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }
}

// Validate on module load
validateEncryptionConfig();
