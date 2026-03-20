import { log } from 'core/src/helpers/logger';

import { TimeoutError } from 'frontend/src/api/errors';
import {
  calculateRetryDelay,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_API_TIMEOUT,
  getEndpointUrl,
  shouldRetryRequest,
  type RetryConfig,
  wrapFetchError,
} from 'frontend/src/api/helpers';

/**
 * Options for making an API request
 */
export type RequestOptions = {
  method?: 'GET' | 'POST';
  endpoint: string;
  body?: unknown;
  timeoutMs?: number;
  retryConfig?: RetryConfig;
  retryCount?: number;
  context?: string; // For logging/debugging
};

/**
 * Result of processing a response
 */
type ProcessedResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      shouldRetry: boolean;
      error: Error;
    };

/**
 * Type guard to check if response is an error
 */
function isErrorResponse<T>(
  response: ProcessedResponse<T>
): response is Extract<ProcessedResponse<T>, { success: false }> {
  return !response.success;
}

/**
 * Processes an HTTP response, handling errors and determining if retry is needed
 */
const processResponse = async <T>(
  response: Response,
  endpoint: string,
  retryCount: number,
  retryConfig: RetryConfig,
  parseResponse: (response: Response) => Promise<T>
): Promise<ProcessedResponse<T>> => {
  if (response.ok) {
    try {
      const data = await parseResponse(response);
      return { success: true, data };
    } catch (error) {
      // Parsing error - don't retry
      return {
        success: false,
        shouldRetry: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // Try to parse error response
  let errorMessage = `Failed to ${response.status === 404 ? 'find' : 'process'} ${endpoint}: ${response.statusText}`;
  try {
    const errorData = await response.json();
    if (errorData.error) {
      errorMessage = errorData.error;
    }
  } catch {
    // Use default error message
  }

  const error = new Error(errorMessage);
  (error as any).status = response.status;

  const shouldRetry = shouldRetryRequest(error, retryCount, retryConfig);

  return {
    success: false,
    shouldRetry,
    error,
  };
};

/**
 * Executes a fetch request with retry logic, error handling, and timeout
 */
export const executeRequest = async <T>(
  options: RequestOptions,
  parseResponse: (response: Response) => Promise<T>
): Promise<T | undefined> => {
  const {
    method = 'GET',
    endpoint,
    body,
    timeoutMs,
    retryConfig = DEFAULT_RETRY_CONFIG,
    retryCount = 0,
    context = method,
  } = options;

  const timeout = timeoutMs ?? DEFAULT_API_TIMEOUT;

  try {
    // Make the fetch request
    const fetchOptions: RequestInit = {
      method,
    };

    if (body !== undefined) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (method === 'POST' && typeof body !== 'string') {
        fetchOptions.headers = {
          'Content-Type': 'application/json',
        };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(getEndpointUrl(endpoint), {
        ...fetchOptions,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Process the response
    const result = await processResponse(
      response,
      endpoint,
      retryCount,
      retryConfig,
      parseResponse
    );

    if (result.success) {
      return result.data;
    }

    // Use type guard to narrow the type
    if (isErrorResponse(result)) {
      const { shouldRetry, error } = result;

      // Handle retry logic
      if (shouldRetry) {
        const delay = calculateRetryDelay(retryCount, retryConfig);
        log.debug(
          'API',
          `Retrying ${context} ${endpoint} after ${delay}ms (attempt ${retryCount + 1}/${retryConfig.maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeRequest({ ...options, retryCount: retryCount + 1 }, parseResponse);
      }

      // Don't retry - throw the error
      throw error;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError(`Request timed out after ${timeout}ms`);
    }
    // Wrap fetch errors in proper error types
    const wrappedError = wrapFetchError(error, `${context} ${endpoint}`);

    // Check if we should retry
    if (shouldRetryRequest(wrappedError, retryCount, retryConfig)) {
      const delay = calculateRetryDelay(retryCount, retryConfig);
      log.debug(
        'API',
        `Retrying ${context} ${endpoint} after ${delay}ms (attempt ${retryCount + 1}/${retryConfig.maxRetries})`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeRequest({ ...options, retryCount: retryCount + 1 }, parseResponse);
    }

    // Don't retry - throw the wrapped error
    throw wrappedError;
  }
};
