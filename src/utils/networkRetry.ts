import { AppError, ErrorType } from '../types/errors';
import { handleApiError, sleep } from './errorHandler';

export interface NetworkRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: AppError, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<NetworkRetryOptions, 'onRetry'>> = {
  attempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  backoffFactor: 2,
  jitter: true
};

function shouldRetry(error: AppError): boolean {
  if (error.type === ErrorType.NETWORK_ERROR) {
    return true;
  }

  if (!error.statusCode) {
    return false;
  }

  // Retry on server-side errors (5xx)
  return error.statusCode >= 500 && error.statusCode < 600;
}

export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  backoffFactor: number,
  maxDelayMs: number,
  jitter: boolean
): number {
  const delay = Math.min(baseDelayMs * Math.pow(backoffFactor, attempt), maxDelayMs);
  if (!jitter) {
    return delay;
  }

  const half = delay / 2;
  return Math.floor(half + Math.random() * half);
}

export async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  options: NetworkRetryOptions = {}
): Promise<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: AppError | null = null;

  for (let attempt = 0; attempt < mergedOptions.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const appError = handleApiError(error);
      lastError = appError;

      if (!shouldRetry(appError) || attempt === mergedOptions.attempts - 1) {
        break;
      }

      const delay = calculateBackoffDelay(
        attempt,
        mergedOptions.baseDelayMs,
        mergedOptions.backoffFactor,
        mergedOptions.maxDelayMs,
        mergedOptions.jitter
      );

      if (mergedOptions.onRetry) {
        mergedOptions.onRetry(attempt + 1, appError, delay);
      }

      await sleep(delay);
    }
  }

  if (!lastError) {
    throw new Error('Network operation failed without an error object');
  }

  throw lastError;
}
