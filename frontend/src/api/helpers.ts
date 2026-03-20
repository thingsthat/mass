import {
  isNetworkError,
  NetworkError,
  normalizeNetworkError,
  OfflineError,
  TimeoutError,
} from 'frontend/src/api/errors';

const getBaseUrl = (): string => {
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168')
  ) {
    return 'http://localhost:3000';
  }

  return '/api';
};

export const getEndpointUrl = (endpoint: string): string => {
  const endpointUrl = `${getBaseUrl()}${endpoint}`;
  return endpointUrl;
};

/**
 * Default timeout for API requests
 * This constant is kept for backward compatibility
 * 5 minutes. Note, because this is local, it's fine, but in production, it should be less seconds.
 * Ideally there will be better architecture to handle this.
 */
export const DEFAULT_API_TIMEOUT = 300000;

/**
 * Creates a timeout promise that rejects after the specified duration
 * @param timeoutMs Timeout duration in milliseconds
 * @param errorMessage Optional custom error message. Defaults to generic timeout message.
 * @returns A promise that rejects with a TimeoutError after the specified duration
 */
export const createTimeoutPromise = (timeoutMs: number, errorMessage?: string): Promise<never> => {
  const message = errorMessage || `Request timed out after ${timeoutMs}ms`;
  return new Promise((_, reject) => setTimeout(() => reject(new TimeoutError(message)), timeoutMs));
};

/**
 * Wraps a promise with a timeout, racing the original promise against a timeout
 * @param promise The promise to wrap with a timeout
 * @param timeoutMs Timeout duration in milliseconds (defaults to DEFAULT_API_TIMEOUT)
 * @param errorMessage Optional custom error message for timeout
 * @returns The result of the promise if it resolves before the timeout
 * @throws TimeoutError if the promise doesn't resolve before the timeout
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_API_TIMEOUT,
  errorMessage?: string
): Promise<T> => {
  return Promise.race([promise, createTimeoutPromise(timeoutMs, errorMessage)]);
};

/**
 * Retry configuration for network requests
 */
export type RetryConfig = {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
};

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors
};

/**
 * Calculates delay for retry with exponential backoff
 */
export const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
};

/**
 * Checks if an error should trigger a retry
 */
export const shouldRetryRequest = (
  error: unknown,
  attempt: number,
  config: RetryConfig
): boolean => {
  if (attempt >= config.maxRetries) {
    return false;
  }

  if (isNetworkError(error)) {
    if (error instanceof OfflineError) {
      return false;
    }
    return true;
  }

  if (error instanceof Error && 'status' in error) {
    const status = (error as any).status;
    return config.retryableStatusCodes.includes(status);
  }

  return false;
};

/**
 * Wraps a fetch error and converts it to a proper network error type
 */
export const wrapFetchError = (error: unknown, context?: string): Error => {
  // If it's already a proper error type, return it
  const normalized = normalizeNetworkError(error);
  if (normalized instanceof OfflineError || normalized instanceof TimeoutError) {
    return normalized;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError(
      context ? `${context}: Network request failed.` : 'Network request failed. Please try again.'
    );
  }

  return normalized;
};
