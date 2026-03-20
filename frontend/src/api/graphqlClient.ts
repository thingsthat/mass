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
 * Executes a GraphQL query or mutation with retry logic and timeout
 *
 * @param query The GraphQL query or mutation string
 * @param variables Optional variables for the GraphQL operation
 * @param requiresAuth Whether this operation requires authentication
 * @param retryCount Internal retry counter
 * @param timeoutMs Timeout in milliseconds (defaults to DEFAULT_API_TIMEOUT)
 * @param options Optional: encryptResponse - request server to encrypt the response
 * @returns The response data
 */
export type ExecuteGraphQLOptions = { encryptResponse?: boolean };

export const executeGraphQL = async <T = any>(
  query: string,
  variables: Record<string, any> = {},
  requiresAuth: boolean = false,
  retryCount: number = 0,
  timeoutMs?: number,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  options?: ExecuteGraphQLOptions
): Promise<T> => {
  const timeout = timeoutMs ?? DEFAULT_API_TIMEOUT;
  const url = getEndpointUrl('/graphql');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        credentials: 'include', // Ensures cookies are sent when available (production)
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP errors
    if (!response.ok) {
      // Check if this status code should be retried
      const error = new Error(`GraphQL request failed: ${response.statusText}`);
      (error as any).status = response.status;

      // Try to parse error response body to get actual GraphQL error message
      let errorMessage = `GraphQL request failed: ${response.statusText}`;
      try {
        const errorBody = await response.clone().json();
        if (errorBody.errors && errorBody.errors.length > 0) {
          const graphqlErrors = errorBody.errors.map((e: any) => e.message).join('; ');
          errorMessage = `GraphQL errors: ${graphqlErrors}`;
        }
      } catch (_parseError) {
        // If we can't parse the error body, use the default message
      }

      const finalError = new Error(errorMessage);
      (finalError as any).status = response.status;

      if (shouldRetryRequest(finalError, retryCount, retryConfig)) {
        const delay = calculateRetryDelay(retryCount, retryConfig);
        log.debug(
          'GRAPHQL',
          `Retrying GraphQL request after ${delay}ms (attempt ${retryCount + 1}/${retryConfig.maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeGraphQL(
          query,
          variables,
          requiresAuth,
          retryCount + 1,
          timeout,
          retryConfig,
          options
        );
      }

      throw finalError;
    }

    // Parse the response
    const result = await response.json();

    // Handle GraphQL errors
    if (result.errors && result.errors.length > 0) {
      const errorMessage = result.errors.map((e: any) => e.message).join('; ');

      // Check if any error indicates authentication failure
      throw new Error(`GraphQL errors: ${errorMessage}`);
    }

    return result.data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError(`GraphQL request timed out after ${timeout}ms`);
    }
    // Wrap fetch errors in proper error types
    const wrappedError = wrapFetchError(error, 'GraphQL');

    // Check if we should retry
    if (shouldRetryRequest(wrappedError, retryCount, retryConfig)) {
      const delay = calculateRetryDelay(retryCount, retryConfig);
      log.debug(
        'GRAPHQL',
        `Retrying GraphQL request after ${delay}ms (attempt ${retryCount + 1}/${retryConfig.maxRetries})`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeGraphQL(
        query,
        variables,
        requiresAuth,
        retryCount + 1,
        timeout,
        retryConfig,
        options
      );
    }

    // Don't retry - throw the wrapped error
    throw wrappedError;
  }
};
