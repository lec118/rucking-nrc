/**
 * Error Types and Classes
 * Backend error handling
 */

const ERROR_CODES = {
  // Validation
  VALIDATION_001: { status: 400, message: 'Invalid input' },
  VALIDATION_002: { status: 400, message: 'Required field missing' },
  VALIDATION_003: { status: 400, message: 'Value too small' },
  VALIDATION_004: { status: 400, message: 'Value too large' },
  VALIDATION_005: { status: 400, message: 'Invalid format' },
  VALIDATION_006: { status: 400, message: 'Invalid GPS coordinates' },
  VALIDATION_007: { status: 400, message: 'Route data too large' },
  VALIDATION_008: { status: 400, message: 'Invalid date range' },
  VALIDATION_009: { status: 400, message: 'Unrealistic pace value' },
  VALIDATION_010: { status: 400, message: 'Distance and duration mismatch' },

  // Authentication
  AUTH_001: { status: 401, message: 'No token provided' },
  AUTH_002: { status: 401, message: 'Invalid token' },
  AUTH_003: { status: 401, message: 'Token expired' },
  AUTH_004: { status: 401, message: 'Invalid credentials' },

  // Authorization
  AUTHZ_001: { status: 403, message: 'Access denied' },
  AUTHZ_002: { status: 403, message: 'Not resource owner' },

  // Not Found
  NOT_FOUND_001: { status: 404, message: 'Workout not found' },
  NOT_FOUND_002: { status: 404, message: 'User not found' },
  NOT_FOUND_003: { status: 404, message: 'Resource not found' },

  // Conflict
  CONFLICT_001: { status: 409, message: 'Duplicate entry' },
  CONFLICT_002: { status: 409, message: 'Email already exists' },

  // Payload
  PAYLOAD_001: { status: 413, message: 'Request body too large' },
  PAYLOAD_002: { status: 413, message: 'Route data too large' },

  // Rate Limit
  RATE_LIMIT_001: { status: 429, message: 'Too many requests' },
  RATE_LIMIT_002: { status: 429, message: 'Too many login attempts' },

  // Internal
  INTERNAL_001: { status: 500, message: 'Internal server error' },
  DB_001: { status: 500, message: 'Database error' },
  DB_002: { status: 500, message: 'Database connection failed' },
  SERVICE_001: { status: 503, message: 'Service temporarily unavailable' }
};

/**
 * Custom Application Error
 */
class AppError extends Error {
  constructor(code, customMessage = null, details = null) {
    const errorInfo = ERROR_CODES[code] || ERROR_CODES.INTERNAL_001;

    super(customMessage || errorInfo.message);

    this.name = 'AppError';
    this.code = code;
    this.statusCode = errorInfo.status;
    this.details = details;
    this.retryable = errorInfo.status >= 500 && errorInfo.status < 600;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.getErrorType(),
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      retryable: this.retryable
    };
  }

  getErrorType() {
    const code = this.code;

    if (code.startsWith('VALIDATION')) return 'VALIDATION_ERROR';
    if (code.startsWith('AUTH_')) return 'AUTHENTICATION_ERROR';
    if (code.startsWith('AUTHZ')) return 'AUTHORIZATION_ERROR';
    if (code.startsWith('NOT_FOUND')) return 'NOT_FOUND';
    if (code.startsWith('CONFLICT')) return 'CONFLICT';
    if (code.startsWith('PAYLOAD')) return 'PAYLOAD_TOO_LARGE';
    if (code.startsWith('RATE_LIMIT')) return 'RATE_LIMIT_EXCEEDED';
    if (code.startsWith('DB')) return 'DATABASE_ERROR';
    if (code.startsWith('SERVICE')) return 'SERVICE_UNAVAILABLE';

    return 'INTERNAL_ERROR';
  }
}

/**
 * Validation Error (convenience)
 */
class ValidationError extends AppError {
  constructor(field, message, code = 'VALIDATION_001') {
    super(code, message, [{ field, message, code }]);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error (convenience)
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTH_001') {
    super(code, message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error (convenience)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied', code = 'AUTHZ_001') {
    super(code, message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error (convenience)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', code = 'NOT_FOUND_003') {
    super(code, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

/**
 * Database Error (convenience)
 */
class DatabaseError extends AppError {
  constructor(message = 'Database error', code = 'DB_001') {
    super(code, message);
    this.name = 'DatabaseError';
  }
}

module.exports = {
  ERROR_CODES,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError
};
