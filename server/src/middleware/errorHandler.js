/**
 * Global Error Handler Middleware
 * Must be registered last in middleware chain
 */

const { AppError } = require('../types/errors');

/**
 * Mask sensitive data in logs
 */
function maskSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;

  const masked = { ...data };

  // Remove sensitive fields entirely
  delete masked.password;
  delete masked.password_hash;
  delete masked.token;
  delete masked.refreshToken;

  // Mask email
  if (masked.email) {
    const [local, domain] = masked.email.split('@');
    if (local && domain) {
      masked.email = `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
    }
  }

  // Mask GPS route (show count only)
  if (masked.route && Array.isArray(masked.route)) {
    masked.route = `[${masked.route.length} GPS points]`;
  }

  // Mask coordinates (round to area)
  if (masked.latitude && masked.longitude) {
    masked.location = `[${Math.floor(masked.latitude)}, ${Math.floor(masked.longitude)}] (rounded)`;
    delete masked.latitude;
    delete masked.longitude;
  }

  // Mask IP (show subnet only)
  if (masked.ip) {
    masked.ip = masked.ip.replace(/\.\d+$/, '.xxx');
  }

  return masked;
}

/**
 * Generate user-friendly error message based on error code
 */
function getUserMessage(error) {
  // In development, return actual message
  if (process.env.NODE_ENV === 'development') {
    return error.message;
  }

  // In production, return generic messages for security
  const genericMessages = {
    VALIDATION_ERROR: 'Invalid input provided',
    AUTHENTICATION_ERROR: 'Authentication required',
    AUTHORIZATION_ERROR: 'Access denied',
    NOT_FOUND: 'Resource not found',
    CONFLICT: 'Resource conflict',
    PAYLOAD_TOO_LARGE: 'Request payload too large',
    RATE_LIMIT_EXCEEDED: 'Too many requests',
    INTERNAL_ERROR: 'Internal server error',
    DATABASE_ERROR: 'Database error occurred',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
  };

  const errorType = error.code?.split('_')[0] + '_ERROR' || 'INTERNAL_ERROR';
  return genericMessages[errorType] || 'An error occurred';
}

/**
 * Log error with proper masking
 */
function logError(error, req) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: error.statusCode >= 500 ? 'ERROR' : 'WARN',
    type: error.name || 'Error',
    code: error.code || 'UNKNOWN',
    message: error.message,
    statusCode: error.statusCode || 500,
    path: req.path,
    method: req.method,
    requestId: req.id,
    userId: req.userId || null,
    ip: req.ip?.replace(/\.\d+$/, '.xxx'), // Mask IP
    userAgent: req.get('user-agent'),
    body: maskSensitiveData(req.body),
    params: req.params,
    query: req.query,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };

  if (error.statusCode >= 500) {
    console.error('[ERROR]', JSON.stringify(logEntry, null, 2));
  } else {
    console.warn('[WARN]', JSON.stringify(logEntry, null, 2));
  }

  // TODO: Send to logging service (e.g., Datadog, Sentry)
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: logEntry });
  // }
}

/**
 * Error Handler Middleware
 * MUST be registered last
 */
function errorHandler(err, req, res, next) {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Default error values
  let statusCode = 500;
  let errorResponse = {
    error: 'INTERNAL_ERROR',
    code: 'INTERNAL_001',
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorResponse = {
      error: err.getErrorType(),
      code: err.code,
      message: getUserMessage(err),
      details: err.details,
      timestamp: err.timestamp,
      path: req.path,
      method: req.method,
      retryable: err.retryable
    };
  }
  // Handle standard Error instances
  else if (err instanceof Error) {
    // Specific error types
    if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      errorResponse = {
        error: 'AUTHENTICATION_ERROR',
        code: 'AUTH_002',
        message: 'Invalid token',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      };
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      errorResponse = {
        error: 'AUTHENTICATION_ERROR',
        code: 'AUTH_003',
        message: 'Token expired',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      };
    } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
      // JSON parse error
      statusCode = 400;
      errorResponse = {
        error: 'VALIDATION_ERROR',
        code: 'VALIDATION_001',
        message: 'Invalid JSON in request body',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      };
    } else {
      // Generic error
      errorResponse.message = process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error';
    }
  }

  // Log error
  logError({
    ...err,
    statusCode,
    code: errorResponse.code
  }, req);

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found Handler
 * Should be registered before error handler
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    'NOT_FOUND_003',
    `Cannot ${req.method} ${req.path}`,
    null
  );

  next(error);
}

/**
 * Async handler wrapper
 * Catches errors from async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  logError,
  maskSensitiveData
};
