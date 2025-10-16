import { AppError, ErrorType, ErrorCode, ERROR_MESSAGES, FieldError, FormErrorState } from '../types/errors';

const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred';

export function handleApiError(error: any): AppError {
  if (!error || !error.response) {
    return {
      type: ErrorType.NETWORK_ERROR,
      code: ErrorCode.NETWORK_001,
      message: ERROR_MESSAGES[ErrorCode.NETWORK_001],
      retryable: true
    };
  }

  const { status, data = {} } = error.response;
  const errorType = (data.error as ErrorType) || ErrorType.INTERNAL_ERROR;
  const errorCode = (data.code as ErrorCode) || ErrorCode.INTERNAL_001;
  const message = data.message || ERROR_MESSAGES[errorCode] || DEFAULT_ERROR_MESSAGE;

  return {
    type: errorType,
    code: errorCode,
    message,
    details: data.details,
    statusCode: status,
    retryable: status >= 500 && status < 600,
    timestamp: data.timestamp,
    path: data.path,
    method: data.method
  };
}

export function parseValidationErrors(appError: AppError): FieldError {
  const fieldErrors: FieldError = {};

  if (Array.isArray(appError.details)) {
    appError.details.forEach((detail) => {
      if (detail.field) {
        fieldErrors[detail.field] = detail.message;
      }
    });
  }

  return fieldErrors;
}

export function createFormErrorState(error: any): FormErrorState {
  const appError = handleApiError(error);

  return {
    type: appError.type,
    code: appError.code,
    message: appError.message,
    fieldErrors: parseValidationErrors(appError),
    retryable: appError.retryable,
    statusCode: appError.statusCode
  };
}

export function isRetryableError(error: AppError): boolean {
  return error.retryable === true;
}

export function isValidationError(error: AppError): boolean {
  return error.type === ErrorType.VALIDATION_ERROR;
}

export function isAuthError(error: AppError): boolean {
  return error.type === ErrorType.AUTHENTICATION_ERROR;
}

export function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  const maxDelay = 10000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 1000;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    onRetry?: (attempt: number, error: AppError) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;

  let lastError: AppError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = handleApiError(error);

      if (!lastError.retryable || (lastError.statusCode && lastError.statusCode < 500)) {
        break;
      }

      if (attempt === maxRetries) {
        break;
      }

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      const delay = getRetryDelay(attempt, baseDelay);
      await sleep(delay);
    }
  }

  if (!lastError) {
    throw new Error(DEFAULT_ERROR_MESSAGE);
  }

  throw lastError;
}

export function handleGPSError(error: GeolocationPositionError): AppError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        type: ErrorType.GPS_PERMISSION_DENIED,
        code: ErrorCode.GPS_001,
        message: ERROR_MESSAGES[ErrorCode.GPS_001],
        retryable: false
      };
    case error.POSITION_UNAVAILABLE:
      return {
        type: ErrorType.GPS_UNAVAILABLE,
        code: ErrorCode.GPS_002,
        message: ERROR_MESSAGES[ErrorCode.GPS_002],
        retryable: true
      };
    case error.TIMEOUT:
      return {
        type: ErrorType.GPS_TIMEOUT,
        code: ErrorCode.GPS_003,
        message: ERROR_MESSAGES[ErrorCode.GPS_003],
        retryable: true
      };
    default:
      return {
        type: ErrorType.GPS_UNAVAILABLE,
        code: ErrorCode.GPS_002,
        message: ERROR_MESSAGES[ErrorCode.GPS_002],
        retryable: true
      };
  }
}

export function createGPSAccuracyError(accuracy: number): AppError {
  return {
    type: ErrorType.GPS_ACCURACY_LOW,
    code: ErrorCode.GPS_004,
    message: `${ERROR_MESSAGES[ErrorCode.GPS_004]} (current: ${Math.round(accuracy)}m)`,
    retryable: true
  };
}

export function formatErrorMessage(error: AppError): string {
  return error.message || ERROR_MESSAGES[error.code] || DEFAULT_ERROR_MESSAGE;
}

export function getErrorIcon(type: ErrorType): string {
  const icons: Record<ErrorType, string> = {
    [ErrorType.VALIDATION_ERROR]: '!',
    [ErrorType.AUTHENTICATION_ERROR]: 'AUTH',
    [ErrorType.AUTHORIZATION_ERROR]: 'NO',
    [ErrorType.NOT_FOUND]: '404',
    [ErrorType.CONFLICT]: 'CONFLICT',
    [ErrorType.PAYLOAD_TOO_LARGE]: 'PAYLOAD',
    [ErrorType.RATE_LIMIT_EXCEEDED]: 'LIMIT',
    [ErrorType.INTERNAL_ERROR]: 'SERVER',
    [ErrorType.DATABASE_ERROR]: 'DB',
    [ErrorType.SERVICE_UNAVAILABLE]: 'SERVICE',
    [ErrorType.GPS_PERMISSION_DENIED]: 'GPS',
    [ErrorType.GPS_UNAVAILABLE]: 'GPS',
    [ErrorType.GPS_TIMEOUT]: 'GPS',
    [ErrorType.GPS_ACCURACY_LOW]: 'GPS',
    [ErrorType.NETWORK_ERROR]: 'NET',
    [ErrorType.FORM_ERROR]: 'FORM'
  };

  return icons[type] || 'INFO';
}

export function getErrorTitle(type: ErrorType): string {
  const titles: Record<ErrorType, string> = {
    [ErrorType.VALIDATION_ERROR]: 'Validation Error',
    [ErrorType.AUTHENTICATION_ERROR]: 'Authentication Required',
    [ErrorType.AUTHORIZATION_ERROR]: 'Access Denied',
    [ErrorType.NOT_FOUND]: 'Not Found',
    [ErrorType.CONFLICT]: 'Conflict Detected',
    [ErrorType.PAYLOAD_TOO_LARGE]: 'Payload Too Large',
    [ErrorType.RATE_LIMIT_EXCEEDED]: 'Rate Limit Exceeded',
    [ErrorType.INTERNAL_ERROR]: 'Server Error',
    [ErrorType.DATABASE_ERROR]: 'Database Error',
    [ErrorType.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    [ErrorType.GPS_PERMISSION_DENIED]: 'GPS Permission Denied',
    [ErrorType.GPS_UNAVAILABLE]: 'GPS Unavailable',
    [ErrorType.GPS_TIMEOUT]: 'GPS Timeout',
    [ErrorType.GPS_ACCURACY_LOW]: 'GPS Accuracy Low',
    [ErrorType.NETWORK_ERROR]: 'Network Error',
    [ErrorType.FORM_ERROR]: 'Form Error'
  };

  return titles[type] || 'Error';
}
