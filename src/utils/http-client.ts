/**
 * HTTP Client Utility with Timeout, Retry, and Circuit Breaker
 *
 * Features:
 * - Configurable request timeout
 * - Exponential backoff retry logic
 * - Circuit breaker pattern for failing endpoints
 * - Request/response logging
 * - Automatic error classification (retryable vs non-retryable)
 */

export interface HttpClientConfig {
  timeout?: number; // milliseconds, default 10000
  maxRetries?: number; // default 3
  retryDelay?: number; // base delay in ms, default 1000
  retryBackoffMultiplier?: number; // default 2
  circuitBreakerThreshold?: number; // failures before opening circuit, default 5
  circuitBreakerTimeout?: number; // ms before half-open state, default 60000
}

export interface HttpRequestOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface RetryableError extends Error {
  retryable: boolean;
  statusCode?: number;
  response?: Response;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const DEFAULT_CONFIG: Required<HttpClientConfig> = {
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryBackoffMultiplier: 2,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000, // 1 minute
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

// Circuit breaker state per endpoint
const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Creates a retryable error with metadata
 */
function createRetryableError(
  message: string,
  retryable: boolean,
  statusCode?: number,
  response?: Response,
): RetryableError {
  const error = new Error(message) as RetryableError;
  error.retryable = retryable;
  if (statusCode !== undefined) {
    error.statusCode = statusCode;
  }
  if (response !== undefined) {
    error.response = response;
  }
  return error;
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const retryableError = error as RetryableError;
    if ('retryable' in retryableError) {
      return retryableError.retryable;
    }
    // Network errors are typically retryable
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')
    );
  }
  return false;
}

/**
 * Gets or creates circuit breaker state for an endpoint
 */
function getCircuitBreakerState(endpoint: string): CircuitBreakerState {
  if (!circuitBreakers.has(endpoint)) {
    circuitBreakers.set(endpoint, {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
    });
  }
  return circuitBreakers.get(endpoint)!;
}

/**
 * Updates circuit breaker state after a request
 */
function updateCircuitBreaker(
  endpoint: string,
  success: boolean,
  config: Required<HttpClientConfig>,
): void {
  const state = getCircuitBreakerState(endpoint);

  if (success) {
    // Reset on success
    state.failures = 0;
    state.state = 'closed';
  } else {
    // Increment failures
    state.failures++;
    state.lastFailureTime = Date.now();

    // Open circuit if threshold exceeded
    if (state.failures >= config.circuitBreakerThreshold) {
      state.state = 'open';
      console.warn(
        `[Circuit Breaker] OPEN for ${endpoint} (${state.failures} failures)`,
      );
    }
  }
}

/**
 * Checks if circuit breaker allows the request
 */
function checkCircuitBreaker(
  endpoint: string,
  config: Required<HttpClientConfig>,
): boolean {
  const state = getCircuitBreakerState(endpoint);

  if (state.state === 'closed') {
    return true;
  }

  if (state.state === 'open') {
    const timeSinceLastFailure = Date.now() - state.lastFailureTime;
    if (timeSinceLastFailure >= config.circuitBreakerTimeout) {
      // Move to half-open state
      state.state = 'half-open';
      console.info(`[Circuit Breaker] HALF-OPEN for ${endpoint}`);
      return true;
    }
    return false;
  }

  // half-open state: allow request to test if service recovered
  return true;
}

/**
 * Extracts the endpoint (hostname + path) from a URL
 */
function extractEndpoint(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Waits for a specified duration
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a timeout promise that rejects after specified duration
 */
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(createRetryableError(`Request timeout after ${ms}ms`, true));
    }, ms);
  });
}

/**
 * HTTP Client with timeout and retry logic
 */
export class HttpClient {
  private config: Required<HttpClientConfig>;

  constructor(config: HttpClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Performs a fetch request with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number,
  ): Promise<Response> {
    const fetchPromise = fetch(url, options);
    const timeoutPromise = createTimeoutPromise(timeout);

    try {
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      // If timeout, try to abort the fetch (if AbortController was used)
      throw error;
    }
  }

  /**
   * Performs a fetch request with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<Response> {
    const timeout = options.timeout ?? this.config.timeout;
    const maxRetries = options.maxRetries ?? this.config.maxRetries;
    const baseRetryDelay = options.retryDelay ?? this.config.retryDelay;

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response = await this.fetchWithTimeout(url, options, timeout);

        // Check if response status is retryable
        if (!response.ok && RETRYABLE_STATUS_CODES.has(response.status)) {
          throw createRetryableError(
            `HTTP ${response.status}: ${response.statusText}`,
            true,
            response.status,
            response,
          );
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const shouldRetry =
          attempt < maxRetries &&
          isRetryableError(error);

        if (!shouldRetry) {
          throw error;
        }

        // Calculate exponential backoff delay
        const retryDelay =
          baseRetryDelay * Math.pow(this.config.retryBackoffMultiplier, attempt);
        const jitter = Math.random() * 0.3 * retryDelay; // Add 0-30% jitter
        const delayMs = retryDelay + jitter;

        console.warn(
          `[HTTP Client] Retry attempt ${attempt + 1}/${maxRetries} for ${url} after ${Math.round(delayMs)}ms`,
          { error: lastError.message },
        );

        await delay(delayMs);
        attempt++;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Performs a fetch request with circuit breaker, timeout, and retry
   */
  async fetch(url: string, options: HttpRequestOptions = {}): Promise<Response> {
    const endpoint = extractEndpoint(url);

    // Check circuit breaker
    if (!checkCircuitBreaker(endpoint, this.config)) {
      throw createRetryableError(
        `Circuit breaker OPEN for ${endpoint}. Service temporarily unavailable.`,
        true,
      );
    }

    try {
      const response = await this.fetchWithRetry(url, options);
      updateCircuitBreaker(endpoint, true, this.config);
      return response;
    } catch (error) {
      updateCircuitBreaker(endpoint, false, this.config);
      throw error;
    }
  }

  /**
   * Performs a GET request
   */
  async get(url: string, options: HttpRequestOptions = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  /**
   * Performs a POST request
   */
  async post(
    url: string,
    body?: unknown,
    options: HttpRequestOptions = {},
  ): Promise<Response> {
    const fetchOptions: HttpRequestOptions = {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    return this.fetch(url, fetchOptions);
  }

  /**
   * Performs a PUT request
   */
  async put(
    url: string,
    body?: unknown,
    options: HttpRequestOptions = {},
  ): Promise<Response> {
    const fetchOptions: HttpRequestOptions = {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    return this.fetch(url, fetchOptions);
  }

  /**
   * Performs a DELETE request
   */
  async delete(url: string, options: HttpRequestOptions = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }

  /**
   * Resets circuit breaker state for a specific endpoint or all endpoints
   */
  resetCircuitBreaker(endpoint?: string): void {
    if (endpoint) {
      circuitBreakers.delete(endpoint);
      console.info(`[Circuit Breaker] Reset for ${endpoint}`);
    } else {
      circuitBreakers.clear();
      console.info('[Circuit Breaker] Reset all endpoints');
    }
  }

  /**
   * Gets circuit breaker statistics
   */
  getCircuitBreakerStats(): Map<string, CircuitBreakerState> {
    return new Map(circuitBreakers);
  }
}

/**
 * Default HTTP client instance
 */
export const httpClient = new HttpClient();

/**
 * Creates a custom HTTP client with specific configuration
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}
