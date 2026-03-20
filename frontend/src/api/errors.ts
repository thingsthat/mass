/**
 * Custom error classes for better error handling and user feedback
 */

export class OfflineError extends Error {
  constructor(message: string = "You're offline. Please check your connection.") {
    super(message);
    this.name = 'OfflineError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed. Please try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out. Please try again.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (
    error instanceof OfflineError ||
    error instanceof NetworkError ||
    error instanceof TimeoutError
  ) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Check for common network error patterns
  return (
    name.includes('network') ||
    name.includes('fetch') ||
    name.includes('timeout') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('connection') ||
    message.includes('dns') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('aborted') ||
    message.includes('cors')
  );
}

/**
 * Classifies an error into a specific network error type
 */
export function classifyNetworkError(
  error: unknown
): OfflineError | NetworkError | TimeoutError | null {
  if (
    error instanceof OfflineError ||
    error instanceof NetworkError ||
    error instanceof TimeoutError
  ) {
    return error;
  }

  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Check for timeout errors
  if (
    name.includes('timeout') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('etimedout')
  ) {
    return new TimeoutError(error.message || 'Request timed out. Please try again.');
  }

  // Check for offline errors
  if (
    name.includes('offline') ||
    message.includes('offline') ||
    message.includes('no internet') ||
    message.includes('network is unreachable')
  ) {
    return new OfflineError(error.message || "You're offline. Please check your connection.");
  }

  // Check for other network errors
  if (isNetworkError(error)) {
    return new NetworkError(error.message || 'Network request failed. Please try again.');
  }

  return null;
}

/**
 * Converts a fetch error or other error to a proper network error type
 * Returns the original error if it's not network-related
 */
export function normalizeNetworkError(error: unknown): Error {
  const classified = classifyNetworkError(error);

  if (classified) {
    return classified;
  }

  // If it's already an Error, return it
  if (error instanceof Error) {
    return error;
  }

  // Convert unknown errors to generic Error
  return new Error(String(error));
}
