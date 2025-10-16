import { AppError, ErrorType } from '../types/errors';

export type ErrorCategory = 'user' | 'system' | 'network' | 'gps' | 'unknown';

export function isAppError(error: unknown): error is AppError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (
    'type' in error &&
    'code' in error &&
    'message' in error &&
    'retryable' in error
  );
}

export function classifyError(error: unknown): ErrorCategory {
  if (isAppError(error)) {
    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
      case ErrorType.FORM_ERROR:
        return 'user';
      case ErrorType.NETWORK_ERROR:
        return 'network';
      case ErrorType.GPS_PERMISSION_DENIED:
      case ErrorType.GPS_UNAVAILABLE:
      case ErrorType.GPS_TIMEOUT:
      case ErrorType.GPS_ACCURACY_LOW:
        return 'gps';
      case ErrorType.INTERNAL_ERROR:
      case ErrorType.DATABASE_ERROR:
      case ErrorType.SERVICE_UNAVAILABLE:
      case ErrorType.PAYLOAD_TOO_LARGE:
      case ErrorType.RATE_LIMIT_EXCEEDED:
        return 'system';
      default:
        return 'unknown';
    }
  }

  if (error instanceof Error) {
    return 'system';
  }

  return 'unknown';
}
