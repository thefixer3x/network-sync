/**
 * Axios Client Utility with Timeout and Retry Logic
 *
 * Configures axios instances with:
 * - Request/response timeouts
 * - Automatic retry with exponential backoff
 * - Request/response interceptors for logging
 * - Error handling and classification
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

export interface AxiosClientConfig {
  baseURL?: string;
  timeout?: number; // milliseconds, default 10000
  maxRetries?: number; // default 3
  retryDelay?: number; // base delay in ms, default 1000
  retryBackoffMultiplier?: number; // default 2
  headers?: Record<string, string>;
}

const DEFAULT_CONFIG = {
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryBackoffMultiplier: 2,
};

// HTTP status codes that should trigger a retry
const RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network errors (no response received) are retryable
    return true;
  }

  // Check if status code is retryable
  return RETRYABLE_STATUS_CODES.has(error.response.status);
}

/**
 * Waits for a specified duration
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a configured axios instance with retry logic
 */
export function createAxiosClient(config: AxiosClientConfig = {}): AxiosInstance {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Create axios instance with base configuration
  const axiosConfig: any = {
    timeout: mergedConfig.timeout,
  };

  if (config.baseURL) {
    axiosConfig.baseURL = config.baseURL;
  }

  if (config.headers) {
    axiosConfig.headers = config.headers;
  }

  const instance = axios.create(axiosConfig);

  // Request interceptor for logging
  instance.interceptors.request.use(
    (requestConfig) => {
      console.log(
        `[Axios] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`,
      );
      return requestConfig;
    },
    (error) => {
      console.error('[Axios] Request error:', error.message);
      return Promise.reject(error);
    },
  );

  // Response interceptor for retry logic
  instance.interceptors.response.use(
    (response) => {
      // Success response - no retry needed
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & {
        _retryCount?: number;
      };

      // Initialize retry count
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0;
      }

      // Check if we should retry
      const shouldRetry =
        originalRequest._retryCount < mergedConfig.maxRetries &&
        isRetryableError(error);

      if (!shouldRetry) {
        console.error(
          `[Axios] Request failed after ${originalRequest._retryCount} retries:`,
          error.message,
        );
        return Promise.reject(error);
      }

      // Increment retry count
      originalRequest._retryCount++;

      // Calculate exponential backoff delay
      const retryDelay =
        mergedConfig.retryDelay *
        Math.pow(
          mergedConfig.retryBackoffMultiplier,
          originalRequest._retryCount - 1,
        );
      const jitter = Math.random() * 0.3 * retryDelay; // Add 0-30% jitter
      const delayMs = retryDelay + jitter;

      console.warn(
        `[Axios] Retry attempt ${originalRequest._retryCount}/${mergedConfig.maxRetries} ` +
          `for ${originalRequest.url} after ${Math.round(delayMs)}ms`,
        { error: error.message },
      );

      // Wait before retrying
      await delay(delayMs);

      // Retry the request
      return instance(originalRequest);
    },
  );

  return instance;
}

/**
 * Default axios client instance
 */
export const axiosClient = createAxiosClient();

/**
 * Creates axios client for social media platforms with specific timeouts
 */
export function createSocialMediaClient(
  baseURL: string,
  headers?: Record<string, string>,
): AxiosInstance {
  const clientConfig: AxiosClientConfig = {
    baseURL,
    timeout: 15000, // 15 seconds for social media APIs
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds base delay
  };

  if (headers) {
    clientConfig.headers = headers;
  }

  return createAxiosClient(clientConfig);
}
