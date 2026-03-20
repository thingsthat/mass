import { DEFAULT_RETRY_CONFIG, type RetryConfig } from 'frontend/src/api/helpers';
import { executeRequest } from 'frontend/src/api/requestHandler';

/**
 * Gets the current auth token
/**
 * Makes a GET request to the API with retry logic and timeout
 */
export const get = async <T>(
  endpoint: string,
  retryCount: number = 0,
  timeoutMs?: number,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> => {
  const result = await executeRequest<T>(
    {
      method: 'GET',
      endpoint,
      timeoutMs,
      retryConfig,
      retryCount,
      context: 'GET',
    },
    async response => (await response.json()) as T
  );
  if (result === undefined) {
    throw new Error(`Request to ${endpoint} returned no data`);
  }
  return result;
};

/**
 * Makes a POST request to the API with retry logic and timeout
 */
export const post = async <T, U = void>(
  endpoint: string,
  data: T,
  retryCount: number = 0,
  timeoutMs?: number,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<U> => {
  const result = await executeRequest<U>(
    {
      method: 'POST',
      endpoint,
      body: data,
      timeoutMs,
      retryConfig,
      retryCount,
      context: 'POST',
    },
    async response => {
      try {
        return (await response.json()) as U;
      } catch {
        // Return void for endpoints that don't return JSON
        return {} as unknown as U;
      }
    }
  );
  if (result === undefined) {
    throw new Error(`Request to ${endpoint} returned no data`);
  }
  return result;
};

/**
 * Makes a POST request that returns a streaming response with retry logic and timeout
 * Note: For streaming requests, timeout only applies to initial connection, not the stream itself
 * Streaming requests have limited retry logic (only for initial connection failures)
 */
export const postStream = async <T>(
  endpoint: string,
  data: T,
  retryCount: number = 0,
  timeoutMs?: number,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> => {
  const result = await executeRequest<Response>(
    {
      method: 'POST',
      endpoint,
      body: data,
      timeoutMs,
      retryConfig,
      retryCount,
      context: 'POST STREAM',
    },
    async response => response // Return response as-is for streaming
  );
  if (result === undefined) {
    throw new Error(`Request to ${endpoint} returned no data`);
  }
  return result;
};
