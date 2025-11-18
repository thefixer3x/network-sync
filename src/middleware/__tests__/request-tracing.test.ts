/**
 * Tests for Request Tracing Middleware
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import {
  requestTracingMiddleware,
  errorTracingMiddleware,
  getMetrics,
  getMetricsSummary,
  clearTracing,
  getTraceContext,
  createChildTrace,
  completeChildTrace,
} from '../request-tracing.js';

// Mock Express Request, Response, and NextFunction
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/test',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as Request;
}

function createMockResponse(): Response {
  const res: Partial<Response> = {
    setHeader: jest.fn(),
    send: jest.fn(function (this: Response, body: any) {
      return this;
    }),
    statusCode: 200,
  };
  return res as Response;
}

describe('Request Tracing Middleware', () => {
  beforeEach(() => {
    clearTracing();
    jest.clearAllMocks();
  });

  describe('requestTracingMiddleware', () => {
    it('should generate request ID if not provided', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);

      expect(req.requestId).toBeDefined();
      expect(req.startTime).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        req.requestId,
      );
      expect(next).toHaveBeenCalled();
    });

    it('should use provided request ID from headers', () => {
      const customRequestId = 'custom-request-id-123';
      const req = createMockRequest({
        headers: { 'x-request-id': customRequestId },
      });
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);

      expect(req.requestId).toBe(customRequestId);
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        customRequestId,
      );
    });

    it('should capture parent request ID', () => {
      const parentId = 'parent-id-123';
      const req = createMockRequest({
        headers: { 'x-parent-request-id': parentId },
      });
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);

      expect(req.traceContext?.parentId).toBe(parentId);
    });

    it('should capture client IP from headers', () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);

      expect(req.traceContext?.ip).toBe('192.168.1.1');
    });

    it('should create trace context', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);

      expect(req.traceContext).toBeDefined();
      expect(req.traceContext?.endpoint).toBe('/test');
      expect(req.traceContext?.method).toBe('GET');
    });

    it('should capture metrics on response', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);

      // Simulate response
      const originalSend = res.send as jest.Mock;
      res.send.call(res, { data: 'test' });

      // Check metrics were recorded
      const metrics = getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]?.endpoint).toBe('/test');
      expect(metrics[0]?.method).toBe('GET');
      expect(metrics[0]?.statusCode).toBe(200);
    });
  });

  describe('errorTracingMiddleware', () => {
    it('should capture error with trace context', () => {
      const error = new Error('Test error');
      const req = createMockRequest({ requestId: 'error-test-id' });
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      // Set up trace context
      req.startTime = Date.now();
      req.traceContext = {
        requestId: 'error-test-id',
        endpoint: '/test',
        method: 'GET',
        startTime: req.startTime,
      };

      res.status = jest.fn().mockReturnThis() as any;
      res.json = jest.fn().mockReturnThis() as any;

      errorTracingMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          requestId: 'error-test-id',
        }),
      );

      // Check error metrics
      const metrics = getMetrics();
      const errorMetric = metrics.find((m) => m.error);
      expect(errorMetric).toBeDefined();
      expect(errorMetric?.error).toBe('Test error');
    });
  });

  describe('getTraceContext', () => {
    it('should retrieve trace context by request ID', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);

      const traceContext = getTraceContext(req.requestId!);
      expect(traceContext).toBeDefined();
      expect(traceContext?.requestId).toBe(req.requestId);
    });

    it('should return undefined for non-existent request ID', () => {
      const traceContext = getTraceContext('non-existent-id');
      expect(traceContext).toBeUndefined();
    });
  });

  describe('getMetricsSummary', () => {
    it('should calculate summary statistics', () => {
      // Create multiple requests
      for (let i = 0; i < 10; i++) {
        const req = createMockRequest({ path: `/test${i}` });
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        requestTracingMiddleware(req, res, next);
        res.send.call(res, { data: 'test' });
      }

      const summary = getMetricsSummary();
      expect(summary.totalRequests).toBe(10);
      expect(summary.averageDuration).toBeGreaterThanOrEqual(0);
      expect(summary.errorRate).toBe(0);
      expect(summary.requestsByMethod['GET']).toBe(10);
    });

    it('should handle empty metrics', () => {
      clearTracing();
      const summary = getMetricsSummary();
      expect(summary.totalRequests).toBe(0);
      expect(summary.averageDuration).toBe(0);
    });
  });

  describe('Child Trace', () => {
    it('should create child trace from parent', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);

      const childTrace = createChildTrace(req.requestId!, 'database-query');

      expect(childTrace.parentId).toBe(req.requestId);
      expect(childTrace.endpoint).toBe('database-query');
      expect(childTrace.method).toBe('INTERNAL');
    });

    it('should complete child trace', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);

      const childTrace = createChildTrace(req.requestId!, 'database-query');
      completeChildTrace(childTrace.requestId, 200);

      const metrics = getMetrics();
      const childMetric = metrics.find(
        (m) => m.requestId === childTrace.requestId,
      );
      expect(childMetric).toBeDefined();
      expect(childMetric?.statusCode).toBe(200);
    });
  });

  describe('clearTracing', () => {
    it('should clear all traces and metrics', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      requestTracingMiddleware(req, res, next);
      res.send.call(res, { data: 'test' });

      expect(getMetrics().length).toBeGreaterThan(0);

      clearTracing();

      expect(getMetrics().length).toBe(0);
    });
  });
});
