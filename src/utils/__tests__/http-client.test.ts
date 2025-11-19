/**
 * Tests for HTTP Client Utility
 */

// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HttpClient, createHttpClient } from '../http-client.js';

// Mock fetch globally
global.fetch = jest.fn() as any;

describe('HttpClient', () => {
  let client: HttpClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new HttpClient({
      timeout: 1000,
      maxRetries: 2,
      retryDelay: 100,
      circuitBreakerThreshold: 3,
    });
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const defaultClient = new HttpClient();
      expect(defaultClient).toBeDefined();
    });

    it('should create client with custom config', () => {
      const customClient = new HttpClient({
        timeout: 5000,
        maxRetries: 5,
      });
      expect(customClient).toBeDefined();
    });
  });

  describe('fetch', () => {
    it('should successfully fetch data', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const response = await client.fetch('https://api.example.com/test');
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockError = new Error('Network error');
      const mockSuccess = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      };

      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccess);

      const response = await client.fetch('https://api.example.com/test');
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 status code', async () => {
      const mock503 = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      };
      const mockSuccess = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock503)
        .mockResolvedValueOnce(mockSuccess);

      const response = await client.fetch('https://api.example.com/test');
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const mock400 = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mock400);

      const response = await client.fetch('https://api.example.com/test');
      expect(response.ok).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const mockError = new Error('Network error');

      (global.fetch as jest.Mock).mockRejectedValue(mockError);

      await expect(
        client.fetch('https://api.example.com/test'),
      ).rejects.toThrow();

      // Initial attempt + 2 retries = 3 calls
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('GET method', () => {
    it('should perform GET request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const response = await client.get('https://api.example.com/test');
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('POST method', () => {
    it('should perform POST request with body', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({ id: 1 }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const response = await client.post('https://api.example.com/test', {
        name: 'test',
      });

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const mockError = new Error('Service unavailable');
      (global.fetch as jest.Mock).mockRejectedValue(mockError);

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await client.fetch('https://api.example.com/test');
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open now
      await expect(
        client.fetch('https://api.example.com/test'),
      ).rejects.toThrow(/Circuit breaker OPEN/);
    });

    it('should reset circuit breaker', async () => {
      const mockError = new Error('Service unavailable');
      (global.fetch as jest.Mock).mockRejectedValue(mockError);

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await client.fetch('https://api.example.com/test');
        } catch (error) {
          // Expected to fail
        }
      }

      // Reset circuit breaker
      client.resetCircuitBreaker('api.example.com/test');

      const mockSuccess = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccess);

      // Should work after reset
      const response = await client.fetch('https://api.example.com/test');
      expect(response.ok).toBe(true);
    });
  });

  describe('createHttpClient', () => {
    it('should create a new HTTP client instance', () => {
      const customClient = createHttpClient({
        timeout: 5000,
        maxRetries: 5,
      });
      expect(customClient).toBeInstanceOf(HttpClient);
    });
  });
});
