# Production Standards - Good Ruck MVP

## 1. Input Validation Standards

### 1.1 Backend Validation Schema (Zod)

```javascript
// server/src/schemas/workout.schema.js
const { z } = require('zod');

// GPS Coordinate Schema
const CoordinateSchema = z.tuple([
  z.number().min(-90).max(90),  // latitude
  z.number().min(-180).max(180) // longitude
]);

// Workout Creation Schema
const CreateWorkoutSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(100, "Title too long")
    .trim()
    .transform(str => str.replace(/[<>]/g, '')), // XSS prevention

  distance: z.number()
    .min(0.01, "Distance must be at least 10 meters")
    .max(1000, "Distance cannot exceed 1000km")
    .refine(val => Number(val.toFixed(2)) === val || true, {
      message: "Distance can have max 2 decimal places"
    }),

  duration: z.number()
    .min(0.1, "Duration must be at least 6 seconds")
    .max(1440, "Duration cannot exceed 24 hours")
    .refine(val => Number(val.toFixed(1)) === val || true, {
      message: "Duration can have max 1 decimal place"
    }),

  pace: z.number()
    .min(1, "Pace too fast (< 1 min/km unrealistic)")
    .max(60, "Pace too slow (> 60 min/km unrealistic)")
    .optional()
    .nullable(),

  weight: z.number()
    .min(0)
    .max(200, "Weight cannot exceed 200kg")
    .optional()
    .nullable(),

  date: z.string()
    .datetime({ message: "Invalid ISO 8601 date format" })
    .refine(dateStr => {
      const date = new Date(dateStr);
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return date <= tomorrow && date >= new Date('2020-01-01');
    }, {
      message: "Date must be between 2020-01-01 and tomorrow"
    }),

  route: z.array(CoordinateSchema)
    .min(2, "Route must have at least 2 points")
    .max(10000, "Route cannot exceed 10,000 points")
    .optional()
    .nullable()
});

// Update Workout Schema (partial)
const UpdateWorkoutSchema = CreateWorkoutSchema.partial();

// Query Parameter Schema
const WorkoutQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

module.exports = {
  CreateWorkoutSchema,
  UpdateWorkoutSchema,
  WorkoutQuerySchema,
  CoordinateSchema
};
```

### 1.2 Validation Middleware

```javascript
// server/src/middleware/validate.js
const { ZodError } = require('zod');

/**
 * Express middleware for Zod schema validation
 * @param {ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      // Validate and transform data
      const validated = await schema.parseAsync(req[source]);

      // Replace request data with validated/transformed data
      req[source] = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      // Unexpected error
      next(error);
    }
  };
};

module.exports = { validate };
```

### 1.3 Frontend Validation (React Hook Form + Zod)

```typescript
// src/schemas/workout.schema.ts
import { z } from 'zod';

export const workoutFormSchema = z.object({
  title: z.string()
    .min(1, "운동 제목을 입력해주세요")
    .max(100, "제목은 100자를 초과할 수 없습니다"),

  weight: z.coerce.number()
    .min(0, "무게는 0 이상이어야 합니다")
    .max(200, "무게는 200kg을 초과할 수 없습니다")
    .optional()
    .or(z.literal('')),

  distance: z.number()
    .min(0.01, "거리는 최소 10m 이상이어야 합니다")
    .max(1000, "거리는 1000km를 초과할 수 없습니다"),

  duration: z.number()
    .min(0.1, "시간은 최소 6초 이상이어야 합니다")
    .max(1440, "시간은 24시간을 초과할 수 없습니다")
});

export type WorkoutFormData = z.infer<typeof workoutFormSchema>;
```

```tsx
// src/components/AddWorkoutModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workoutFormSchema, WorkoutFormData } from '../schemas/workout.schema';

export function AddWorkoutModal() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutFormSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data: WorkoutFormData) => {
    try {
      await workoutAPI.createWorkout(data);
    } catch (error) {
      // Handle error (see Error Handling section)
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>운동 제목</label>
        <input
          {...register('title')}
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && (
          <span className="text-red-500 text-sm">{errors.title.message}</span>
        )}
      </div>

      <div>
        <label>무게 (kg)</label>
        <input
          type="number"
          step="0.5"
          {...register('weight')}
          className={errors.weight ? 'border-red-500' : ''}
        />
        {errors.weight && (
          <span className="text-red-500 text-sm">{errors.weight.message}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? '저장 중...' : '저장'}
      </button>
    </form>
  );
}
```

### 1.4 GPS Data Validation

```javascript
// src/utils/gpsValidation.js

/**
 * Validate GPS coordinate
 */
export function isValidCoordinate(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !isNaN(lat) &&
    !isNaN(lon)
  );
}

/**
 * Validate GPS accuracy (meters)
 */
export function isAcceptableAccuracy(accuracy, threshold = 50) {
  return accuracy > 0 && accuracy <= threshold;
}

/**
 * Detect unrealistic speed (GPS jumps)
 * @param {number} distance - Distance in km
 * @param {number} timeDelta - Time in seconds
 * @returns {boolean}
 */
export function isRealisticSpeed(distance, timeDelta) {
  if (timeDelta <= 0) return false;

  const speedKmh = (distance / (timeDelta / 3600)); // km/h
  const MAX_RUNNING_SPEED = 30; // km/h (conservative)

  return speedKmh <= MAX_RUNNING_SPEED;
}

/**
 * Sanitize route data
 */
export function sanitizeRoute(route) {
  if (!Array.isArray(route)) return [];

  return route.filter(([lat, lon]) =>
    isValidCoordinate(lat, lon)
  );
}
```

---

## 2. Error Handling Standards

### 2.1 Error Classification

```typescript
// src/types/errors.ts

export enum ErrorType {
  // User Errors (400-499)
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',

  // System Errors (500-599)
  INTERNAL = 'INTERNAL_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',

  // Network Errors
  NETWORK = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',

  // GPS Specific
  GPS_UNAVAILABLE = 'GPS_UNAVAILABLE',
  GPS_PERMISSION_DENIED = 'GPS_PERMISSION_DENIED',
  GPS_TIMEOUT = 'GPS_TIMEOUT',
  GPS_ACCURACY_LOW = 'GPS_ACCURACY_LOW'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
  retryable?: boolean;
  userMessage?: string;
}
```

### 2.2 Backend Error Handler

```javascript
// server/src/middleware/errorHandler.js

class AppError extends Error {
  constructor(type, message, statusCode = 500, details = null) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = statusCode >= 500 && statusCode < 600;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware (must be last)
function errorHandler(err, req, res, next) {
  // Log error for monitoring
  console.error({
    timestamp: new Date().toISOString(),
    type: err.type || 'UNKNOWN',
    message: err.message,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Generate user-friendly message
  const userMessage = getUserMessage(err.type, statusCode);

  // Send response
  res.status(statusCode).json({
    error: err.type || 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : userMessage,
    code: err.code,
    details: process.env.NODE_ENV === 'development' ? err.details : undefined,
    retryable: err.retryable || false,
    timestamp: new Date().toISOString()
  });
}

function getUserMessage(errorType, statusCode) {
  const messages = {
    VALIDATION_ERROR: '입력값이 올바르지 않습니다.',
    NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
    DATABASE_ERROR: '데이터 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
    INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  };

  return messages[errorType] || messages.INTERNAL_ERROR;
}

// Async handler wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { AppError, errorHandler, asyncHandler };
```

### 2.3 Frontend Error Boundary

```tsx
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service (e.g., Sentry)
    console.error('ErrorBoundary caught:', error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
          <div className="max-w-md text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-4">문제가 발생했습니다</h1>
            <p className="text-zinc-400 mb-6">
              앱 실행 중 오류가 발생했습니다. 페이지를 새로고침해주세요.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                새로고침
              </button>
              <button
                onClick={this.handleReset}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                다시 시도
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left bg-zinc-900 p-4 rounded-lg">
                <summary className="cursor-pointer text-sm text-zinc-500 mb-2">
                  에러 상세
                </summary>
                <pre className="text-xs text-red-400 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 2.4 API Error Handler with Retry

```typescript
// src/services/apiErrorHandler.ts
import { AppError, ErrorType } from '../types/errors';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/**
 * Exponential backoff retry wrapper
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const mergedConfig = { ...defaultRetryConfig, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === mergedConfig.maxRetries) {
        break;
      }

      // Check if error is retryable
      const statusCode = (error as any).statusCode || (error as any).status;
      if (!mergedConfig.retryableStatuses.includes(statusCode)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        mergedConfig.baseDelay * Math.pow(2, attempt),
        mergedConfig.maxDelay
      );

      console.log(`Retrying request (attempt ${attempt + 1}/${mergedConfig.maxRetries}) after ${delay}ms`);

      await sleep(delay);
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Transform API errors to AppError
 */
export function handleApiError(error: any): AppError {
  // Network error
  if (!error.response) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network error occurred',
      userMessage: '네트워크 연결을 확인해주세요.',
      retryable: true
    };
  }

  const { status, data } = error.response;

  // Map status codes to error types
  let type: ErrorType;
  let retryable = false;

  if (status >= 400 && status < 500) {
    if (status === 401) {
      type = ErrorType.AUTHENTICATION;
    } else if (status === 403) {
      type = ErrorType.AUTHORIZATION;
    } else if (status === 404) {
      type = ErrorType.NOT_FOUND;
    } else {
      type = ErrorType.VALIDATION;
    }
  } else if (status >= 500) {
    type = ErrorType.INTERNAL;
    retryable = true;
  } else {
    type = ErrorType.INTERNAL;
  }

  return {
    type,
    message: data?.message || 'An error occurred',
    code: data?.code,
    statusCode: status,
    details: data?.details,
    retryable,
    userMessage: data?.message || getUserMessage(type)
  };
}

function getUserMessage(type: ErrorType): string {
  const messages: Record<ErrorType, string> = {
    [ErrorType.VALIDATION]: '입력값을 확인해주세요.',
    [ErrorType.AUTHENTICATION]: '로그인이 필요합니다.',
    [ErrorType.AUTHORIZATION]: '접근 권한이 없습니다.',
    [ErrorType.NOT_FOUND]: '요청한 데이터를 찾을 수 없습니다.',
    [ErrorType.CONFLICT]: '이미 존재하는 데이터입니다.',
    [ErrorType.INTERNAL]: '서버 오류가 발생했습니다.',
    [ErrorType.DATABASE]: '데이터 처리 중 오류가 발생했습니다.',
    [ErrorType.EXTERNAL_API]: '외부 서비스 연결 실패',
    [ErrorType.NETWORK]: '네트워크 연결을 확인해주세요.',
    [ErrorType.TIMEOUT]: '요청 시간이 초과되었습니다.',
    [ErrorType.GPS_UNAVAILABLE]: 'GPS를 사용할 수 없습니다.',
    [ErrorType.GPS_PERMISSION_DENIED]: 'GPS 권한이 거부되었습니다.',
    [ErrorType.GPS_TIMEOUT]: 'GPS 신호를 찾을 수 없습니다.',
    [ErrorType.GPS_ACCURACY_LOW]: 'GPS 정확도가 낮습니다.'
  };

  return messages[type] || '오류가 발생했습니다.';
}
```

### 2.5 User-Facing Error Messages

```tsx
// src/components/ErrorMessage.tsx
import { AppError, ErrorType } from '../types/errors';

interface ErrorMessageProps {
  error: AppError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({ error, onRetry, onDismiss }: ErrorMessageProps) {
  if (!error) return null;

  const isRetryable = error.retryable;
  const icon = getErrorIcon(error.type);

  return (
    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-400 mb-1">
            {getErrorTitle(error.type)}
          </h3>
          <p className="text-sm text-zinc-300">
            {error.userMessage || error.message}
          </p>

          {isRetryable && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={onRetry}
                className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                다시 시도
              </button>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  닫기
                </button>
              )}
            </div>
          )}
        </div>
        {onDismiss && !isRetryable && (
          <button
            onClick={onDismiss}
            className="text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function getErrorIcon(type: ErrorType): string {
  const icons: Record<ErrorType, string> = {
    [ErrorType.VALIDATION]: '⚠️',
    [ErrorType.AUTHENTICATION]: '🔒',
    [ErrorType.AUTHORIZATION]: '🚫',
    [ErrorType.NOT_FOUND]: '🔍',
    [ErrorType.CONFLICT]: '⚡',
    [ErrorType.INTERNAL]: '❌',
    [ErrorType.DATABASE]: '💾',
    [ErrorType.EXTERNAL_API]: '🔌',
    [ErrorType.NETWORK]: '📡',
    [ErrorType.TIMEOUT]: '⏱️',
    [ErrorType.GPS_UNAVAILABLE]: '📍',
    [ErrorType.GPS_PERMISSION_DENIED]: '🚫',
    [ErrorType.GPS_TIMEOUT]: '⏱️',
    [ErrorType.GPS_ACCURACY_LOW]: '📡'
  };

  return icons[type] || '❌';
}

function getErrorTitle(type: ErrorType): string {
  const titles: Record<ErrorType, string> = {
    [ErrorType.VALIDATION]: '입력 오류',
    [ErrorType.AUTHENTICATION]: '인증 필요',
    [ErrorType.AUTHORIZATION]: '권한 없음',
    [ErrorType.NOT_FOUND]: '찾을 수 없음',
    [ErrorType.CONFLICT]: '충돌 발생',
    [ErrorType.INTERNAL]: '서버 오류',
    [ErrorType.DATABASE]: '데이터베이스 오류',
    [ErrorType.EXTERNAL_API]: 'API 오류',
    [ErrorType.NETWORK]: '네트워크 오류',
    [ErrorType.TIMEOUT]: '시간 초과',
    [ErrorType.GPS_UNAVAILABLE]: 'GPS 사용 불가',
    [ErrorType.GPS_PERMISSION_DENIED]: 'GPS 권한 거부',
    [ErrorType.GPS_TIMEOUT]: 'GPS 시간 초과',
    [ErrorType.GPS_ACCURACY_LOW]: 'GPS 정확도 낮음'
  };

  return titles[type] || '오류 발생';
}
```

---

## 3. Security Hardening

### 3.1 Authentication & Authorization

```javascript
// server/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access and refresh tokens
 */
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify access token middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw new AppError(
      'AUTHENTICATION_ERROR',
      'No token provided',
      401
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'access') {
      throw new AppError(
        'AUTHENTICATION_ERROR',
        'Invalid token type',
        401
      );
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError(
        'AUTHENTICATION_ERROR',
        'Token expired',
        401
      );
    }

    throw new AppError(
      'AUTHENTICATION_ERROR',
      'Invalid token',
      401
    );
  }
}

/**
 * Check if user owns resource
 */
function authorizeOwnership(resourceType) {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    const userId = req.userId;

    // Check ownership in database
    const isOwner = await checkOwnership(resourceType, resourceId, userId);

    if (!isOwner) {
      throw new AppError(
        'AUTHORIZATION_ERROR',
        'You do not have permission to access this resource',
        403
      );
    }

    next();
  };
}

async function checkOwnership(resourceType, resourceId, userId) {
  // Implementation depends on your database structure
  // For workouts:
  const workout = db.prepare('SELECT user_id FROM workouts WHERE id = ?').get(resourceId);
  return workout && workout.user_id === userId;
}

module.exports = {
  generateTokens,
  authenticateToken,
  authorizeOwnership
};
```

### 3.2 CORS Configuration

```javascript
// server/src/config/cors.js
const cors = require('cors');

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};

module.exports = cors(corsOptions);
```

### 3.3 CSRF Protection

```javascript
// server/src/middleware/csrf.js
const crypto = require('crypto');

// Simple CSRF token implementation for SPA
const csrfTokens = new Map(); // In production, use Redis

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function csrfProtection(req, res, next) {
  // GET requests: provide token
  if (req.method === 'GET') {
    const token = generateCsrfToken();
    csrfTokens.set(req.userId, token);
    res.setHeader('X-CSRF-Token', token);
    return next();
  }

  // State-changing requests: verify token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const providedToken = req.headers['x-csrf-token'];
    const storedToken = csrfTokens.get(req.userId);

    if (!providedToken || !storedToken || providedToken !== storedToken) {
      return res.status(403).json({
        error: 'CSRF_ERROR',
        message: 'Invalid CSRF token'
      });
    }

    // Token used once
    csrfTokens.delete(req.userId);
  }

  next();
}

module.exports = { csrfProtection };
```

### 3.4 Secure Token Storage (Frontend)

```typescript
// src/utils/tokenStorage.ts

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const TOKEN_KEY = '__auth_tokens__';

/**
 * Secure token storage
 * - Access token: memory only (cleared on page refresh)
 * - Refresh token: httpOnly cookie (best) or localStorage (fallback)
 */
class TokenStorage {
  private accessToken: string | null = null;

  setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    // Store access token in memory
    this.accessToken = accessToken;

    // Store refresh token in localStorage (encrypt in production)
    const tokenData: TokenData = {
      accessToken: '', // Don't persist access token
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000
    };

    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    try {
      const data = localStorage.getItem(TOKEN_KEY);
      if (!data) return null;

      const tokenData: TokenData = JSON.parse(data);

      // Check expiry
      if (Date.now() > tokenData.expiresAt) {
        this.clearTokens();
        return null;
      }

      return tokenData.refreshToken;
    } catch {
      return null;
    }
  }

  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null || this.getRefreshToken() !== null;
  }
}

export const tokenStorage = new TokenStorage();
```

### 3.5 Dependency Scanning Setup

```json
// package.json (add scripts)
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "audit:production": "npm audit --production",
    "security:check": "npm run audit && npm run lint:security",
    "lint:security": "eslint . --ext .js,.jsx,.ts,.tsx --config .eslintrc.security.js"
  },
  "devDependencies": {
    "eslint-plugin-security": "^1.7.1",
    "snyk": "^1.1000.0"
  }
}
```

```javascript
// .eslintrc.security.js
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
  rules: {
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error'
  }
};
```

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --production
        continue-on-error: true

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run ESLint security rules
        run: npm run lint:security
```

### 3.6 Environment Variables

```bash
# .env.example (commit this)
# Server
NODE_ENV=development
PORT=3001
DATABASE_URL=./workouts.db

# Security
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# API Keys (if needed)
GOOGLE_MAPS_API_KEY=

# Monitoring (optional)
SENTRY_DSN=
```

```bash
# .env (do NOT commit)
NODE_ENV=production
PORT=3001
DATABASE_URL=file:./production.db

JWT_SECRET=jH8kL9mN2pQ4rS6tU8vW0xY2zA4bC6dE8fG0hI2jK4lM6nO8pQ0rS2tU4vW6xY8z
JWT_REFRESH_SECRET=aA1bB2cC3dD4eE5fF6gG7hH8iI9jJ0kK1lL2mM3nN4oO5pP6qQ7rR8sS9tT0uU1v
ALLOWED_ORIGINS=https://your-app.vercel.app

GOOGLE_MAPS_API_KEY=AIza...
SENTRY_DSN=https://...
```

```typescript
// src/config/env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD
};

// Validate required env vars
const requiredEnvVars = ['VITE_API_URL'];

requiredEnvVars.forEach(envVar => {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

---

## 4. GPS Accuracy Policy

### 4.1 GPS Configuration

```typescript
// src/config/gps.ts

export const GPS_CONFIG = {
  // Accuracy thresholds (meters)
  EXCELLENT_ACCURACY: 10,
  GOOD_ACCURACY: 30,
  ACCEPTABLE_ACCURACY: 50,
  POOR_ACCURACY: 100,

  // Timeouts (milliseconds)
  INITIAL_TIMEOUT: 10000,  // 10s for first fix
  UPDATE_TIMEOUT: 5000,    // 5s for updates

  // Speed limits (km/h)
  MAX_REALISTIC_SPEED: 30,  // Max human running speed
  MIN_MOVEMENT_SPEED: 0.5,  // Filter GPS drift

  // Distance filters (km)
  MIN_DISTANCE_INCREMENT: 0.005,  // 5 meters minimum
  MAX_SINGLE_JUMP: 0.1,           // 100 meters max jump

  // Update intervals
  MIN_TIME_BETWEEN_UPDATES: 1000, // 1 second

  // Position options
  HIGH_ACCURACY_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  },

  LOW_ACCURACY_OPTIONS: {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 30000
  }
};

export type GPSAccuracyLevel = 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';

export function getAccuracyLevel(accuracy: number): GPSAccuracyLevel {
  if (accuracy <= GPS_CONFIG.EXCELLENT_ACCURACY) return 'excellent';
  if (accuracy <= GPS_CONFIG.GOOD_ACCURACY) return 'good';
  if (accuracy <= GPS_CONFIG.ACCEPTABLE_ACCURACY) return 'acceptable';
  if (accuracy <= GPS_CONFIG.POOR_ACCURACY) return 'poor';
  return 'unacceptable';
}
```

### 4.2 GPS Manager

```typescript
// src/services/gpsManager.ts
import { GPS_CONFIG, getAccuracyLevel } from '../config/gps';
import { calculateDistance, isRealisticSpeed } from '../utils/gpsValidation';

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GPSError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
  message: string;
}

export class GPSManager {
  private watchId: number | null = null;
  private lastPosition: GPSPosition | null = null;
  private isTracking: boolean = false;
  private useHighAccuracy: boolean = true;

  /**
   * Check if GPS is available
   */
  static isAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Request GPS permission and get initial position
   */
  async requestPermission(): Promise<GPSPosition> {
    if (!GPSManager.isAvailable()) {
      throw {
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by this browser'
      } as GPSError;
    }

    try {
      const position = await this.getCurrentPosition(
        GPS_CONFIG.INITIAL_TIMEOUT
      );
      return position;
    } catch (error) {
      throw this.handleGPSError(error);
    }
  }

  /**
   * Get current position (one-time)
   */
  private getCurrentPosition(timeout: number): Promise<GPSPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(this.transformPosition(position));
        },
        (error) => {
          reject(error);
        },
        {
          ...GPS_CONFIG.HIGH_ACCURACY_OPTIONS,
          timeout
        }
      );
    });
  }

  /**
   * Start continuous tracking
   */
  startTracking(
    onPosition: (position: GPSPosition) => void,
    onError: (error: GPSError) => void
  ): void {
    if (this.isTracking) {
      console.warn('GPS tracking is already active');
      return;
    }

    this.isTracking = true;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const gpsPosition = this.transformPosition(position);

        // Validate and filter position
        if (this.isValidPosition(gpsPosition)) {
          onPosition(gpsPosition);
          this.lastPosition = gpsPosition;
        }
      },
      (error) => {
        const gpsError = this.handleGPSError(error);

        // Try fallback to low accuracy
        if (this.useHighAccuracy && error.code === 3) { // TIMEOUT
          console.warn('High accuracy timeout, falling back to low accuracy');
          this.useHighAccuracy = false;
          this.stopTracking();
          this.startTracking(onPosition, onError);
          return;
        }

        onError(gpsError);
      },
      this.useHighAccuracy
        ? GPS_CONFIG.HIGH_ACCURACY_OPTIONS
        : GPS_CONFIG.LOW_ACCURACY_OPTIONS
    );
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    this.lastPosition = null;
  }

  /**
   * Transform native position to our format
   */
  private transformPosition(position: GeolocationPosition): GPSPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
  }

  /**
   * Validate position data
   */
  private isValidPosition(position: GPSPosition): boolean {
    // Check accuracy
    if (position.accuracy > GPS_CONFIG.ACCEPTABLE_ACCURACY) {
      console.warn(`Low GPS accuracy: ${position.accuracy}m`);
      return false;
    }

    // Check if we have a previous position
    if (!this.lastPosition) {
      return true; // First position is always valid
    }

    // Check time delta
    const timeDelta = (position.timestamp - this.lastPosition.timestamp) / 1000; // seconds
    if (timeDelta < GPS_CONFIG.MIN_TIME_BETWEEN_UPDATES / 1000) {
      return false; // Too soon
    }

    // Calculate distance
    const distance = calculateDistance(
      this.lastPosition.latitude,
      this.lastPosition.longitude,
      position.latitude,
      position.longitude
    );

    // Filter GPS drift (too small movement)
    if (distance < GPS_CONFIG.MIN_DISTANCE_INCREMENT) {
      return false;
    }

    // Filter unrealistic jumps
    if (distance > GPS_CONFIG.MAX_SINGLE_JUMP) {
      console.warn(`GPS jump detected: ${distance}km`);
      return false;
    }

    // Check realistic speed
    if (!isRealisticSpeed(distance, timeDelta)) {
      console.warn(`Unrealistic speed detected`);
      return false;
    }

    return true;
  }

  /**
   * Handle GPS errors
   */
  private handleGPSError(error: GeolocationPositionError): GPSError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return {
          code: 'PERMISSION_DENIED',
          message: 'GPS 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.'
        };
      case error.POSITION_UNAVAILABLE:
        return {
          code: 'POSITION_UNAVAILABLE',
          message: 'GPS 신호를 찾을 수 없습니다. 실외로 이동하거나 잠시 후 다시 시도해주세요.'
        };
      case error.TIMEOUT:
        return {
          code: 'TIMEOUT',
          message: 'GPS 신호 검색 시간이 초과되었습니다.'
        };
      default:
        return {
          code: 'POSITION_UNAVAILABLE',
          message: 'GPS 오류가 발생했습니다.'
        };
    }
  }

  /**
   * Get accuracy level
   */
  getAccuracyLevel(accuracy: number) {
    return getAccuracyLevel(accuracy);
  }
}

export const gpsManager = new GPSManager();
```

### 4.3 GPS Status Component

```tsx
// src/components/GPSStatus.tsx
import { GPSPosition } from '../services/gpsManager';
import { getAccuracyLevel } from '../config/gps';

interface GPSStatusProps {
  position: GPSPosition | null;
  isTracking: boolean;
}

export function GPSStatus({ position, isTracking }: GPSStatusProps) {
  if (!position) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <div className="animate-pulse text-yellow-400">📡</div>
          <span className="text-sm text-yellow-300">GPS 신호 검색 중...</span>
        </div>
      </div>
    );
  }

  const accuracyLevel = getAccuracyLevel(position.accuracy);
  const statusColor = {
    excellent: 'green',
    good: 'blue',
    acceptable: 'yellow',
    poor: 'orange',
    unacceptable: 'red'
  }[accuracyLevel];

  const statusIcon = {
    excellent: '🟢',
    good: '🔵',
    acceptable: '🟡',
    poor: '🟠',
    unacceptable: '🔴'
  }[accuracyLevel];

  return (
    <div className={`bg-${statusColor}-900/20 border border-${statusColor}-500/50 rounded-lg p-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={isTracking ? 'animate-pulse' : ''}>
            {statusIcon}
          </div>
          <div>
            <div className="text-sm font-medium">
              GPS 상태: {accuracyLevel === 'excellent' ? '우수' :
                         accuracyLevel === 'good' ? '좋음' :
                         accuracyLevel === 'acceptable' ? '보통' :
                         accuracyLevel === 'poor' ? '낮음' : '매우 낮음'}
            </div>
            <div className="text-xs text-zinc-400">
              정확도: ±{position.accuracy.toFixed(0)}m
            </div>
          </div>
        </div>
        {isTracking && (
          <div className="text-xs text-zinc-500">
            추적 중
          </div>
        )}
      </div>

      {accuracyLevel === 'poor' || accuracyLevel === 'unacceptable' ? (
        <div className="mt-2 text-xs text-zinc-400">
          ⚠️ 실외로 이동하거나 Wi-Fi를 켜면 정확도가 향상됩니다.
        </div>
      ) : null}
    </div>
  );
}
```

### 4.4 Permission Denied Flow

```tsx
// src/components/GPSPermissionDenied.tsx
export function GPSPermissionDenied({ onRetry }: { onRetry: () => void }) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold mb-4">GPS 권한이 필요합니다</h1>
        <p className="text-zinc-400 mb-6">
          운동 추적을 위해 위치 권한을 허용해주세요.
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={onRetry}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            권한 허용하기
          </button>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {showInstructions ? '도움말 닫기' : '권한 설정 방법'}
          </button>
        </div>

        {showInstructions && (
          <div className="bg-zinc-900 rounded-lg p-6 text-left space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Chrome (Android)</h3>
              <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                <li>설정 &gt; 개인정보 보호 및 보안</li>
                <li>사이트 설정 &gt; 위치</li>
                <li>차단된 사이트에서 이 앱 찾기</li>
                <li>허용으로 변경</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Safari (iOS)</h3>
              <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                <li>설정 &gt; Safari</li>
                <li>위치 &gt; 사용 중 허용</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 5. Test Strategy

### 5.1 Test Pyramid

```
        /\
       /E2E\         10% - End-to-End Tests (Playwright/Cypress)
      /______\           Critical user flows
     /        \
    /Integration\    20% - Integration Tests (Testing Library)
   /____________\       Component + API interactions
  /              \
 /  Unit Tests    \  70% - Unit Tests (Vitest/Jest)
/__________________\     Pure functions, utilities, hooks
```

### 5.2 Coverage Goals

| Category | Target | Critical Path |
|----------|--------|---------------|
| **Overall** | 80% | 95% |
| **Utils** | 90% | 100% |
| **Services** | 85% | 95% |
| **Components** | 75% | 90% |
| **Hooks** | 85% | 95% |
| **Backend** | 80% | 90% |

### 5.3 Test Setup

```bash
# Install dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @playwright/test
npm install -D supertest # for backend API tests
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData'
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

### 5.4 Unit Tests - Utilities

```typescript
// src/utils/__tests__/workoutStats.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculatePace,
  groupByWeek,
  calculateAverageWeight,
  getLast7Days
} from '../workoutStats';

describe('workoutStats', () => {
  describe('calculatePace', () => {
    it('should calculate correct pace', () => {
      const result = calculatePace(30, 5); // 30 min, 5 km
      expect(result).toBe(6); // 6 min/km
    });

    it('should return 0 for zero distance', () => {
      const result = calculatePace(30, 0);
      expect(result).toBe(0);
    });

    it('should handle decimal values', () => {
      const result = calculatePace(25.5, 5.1);
      expect(result).toBeCloseTo(5, 1);
    });
  });

  describe('groupByWeek', () => {
    it('should group workouts by week', () => {
      const workouts = [
        { date: '2024-01-01', distance: 5, duration: 30 },
        { date: '2024-01-03', distance: 3, duration: 20 },
        { date: '2024-01-08', distance: 7, duration: 40 }
      ];

      const result = groupByWeek(workouts);

      expect(result).toHaveLength(2); // 2 different weeks
      expect(result[0].distance).toBe(8); // 5 + 3
      expect(result[1].distance).toBe(7);
    });

    it('should calculate average pace per week', () => {
      const workouts = [
        { date: '2024-01-01', distance: 5, duration: 30 }
      ];

      const result = groupByWeek(workouts);

      expect(result[0].avgPace).toBe(6); // 30/5 = 6 min/km
    });
  });

  describe('calculateAverageWeight', () => {
    it('should calculate average weight', () => {
      const workouts = [
        { weight: 10 },
        { weight: 20 },
        { weight: 30 }
      ];

      const result = calculateAverageWeight(workouts);
      expect(result).toBe('20.0');
    });

    it('should return 0 for empty array', () => {
      const result = calculateAverageWeight([]);
      expect(result).toBe(0);
    });

    it('should ignore null weights', () => {
      const workouts = [
        { weight: 10 },
        { weight: null },
        { weight: 20 }
      ];

      const result = calculateAverageWeight(workouts);
      expect(result).toBe('15.0');
    });
  });
});
```

### 5.5 Unit Tests - GPS Validation

```typescript
// src/utils/__tests__/gpsValidation.test.ts
import { describe, it, expect } from 'vitest';
import {
  isValidCoordinate,
  isAcceptableAccuracy,
  isRealisticSpeed,
  sanitizeRoute
} from '../gpsValidation';

describe('gpsValidation', () => {
  describe('isValidCoordinate', () => {
    it('should accept valid coordinates', () => {
      expect(isValidCoordinate(37.5665, 126.9780)).toBe(true); // Seoul
      expect(isValidCoordinate(0, 0)).toBe(true); // Null Island
      expect(isValidCoordinate(-90, -180)).toBe(true); // Extremes
      expect(isValidCoordinate(90, 180)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinate(91, 0)).toBe(false); // Lat out of range
      expect(isValidCoordinate(0, 181)).toBe(false); // Lon out of range
      expect(isValidCoordinate(NaN, 0)).toBe(false); // NaN
      expect(isValidCoordinate(null, 0)).toBe(false); // Null
    });
  });

  describe('isAcceptableAccuracy', () => {
    it('should accept good accuracy', () => {
      expect(isAcceptableAccuracy(10, 50)).toBe(true);
      expect(isAcceptableAccuracy(50, 50)).toBe(true);
    });

    it('should reject poor accuracy', () => {
      expect(isAcceptableAccuracy(51, 50)).toBe(false);
      expect(isAcceptableAccuracy(100, 50)).toBe(false);
    });

    it('should reject invalid values', () => {
      expect(isAcceptableAccuracy(-1, 50)).toBe(false);
      expect(isAcceptableAccuracy(0, 50)).toBe(false);
    });
  });

  describe('isRealisticSpeed', () => {
    it('should accept realistic speeds', () => {
      // 5 km in 1 hour = 5 km/h (walking)
      expect(isRealisticSpeed(5, 3600)).toBe(true);

      // 10 km in 1 hour = 10 km/h (jogging)
      expect(isRealisticSpeed(10, 3600)).toBe(true);

      // 20 km in 1 hour = 20 km/h (running)
      expect(isRealisticSpeed(20, 3600)).toBe(true);
    });

    it('should reject unrealistic speeds', () => {
      // 100 km in 1 hour = 100 km/h (car speed)
      expect(isRealisticSpeed(100, 3600)).toBe(false);

      // 1 km in 1 second = 3600 km/h
      expect(isRealisticSpeed(1, 1)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isRealisticSpeed(0, 3600)).toBe(true); // Standing still
      expect(isRealisticSpeed(5, 0)).toBe(false); // Zero time
      expect(isRealisticSpeed(5, -1)).toBe(false); // Negative time
    });
  });

  describe('sanitizeRoute', () => {
    it('should filter invalid coordinates', () => {
      const route = [
        [37.5665, 126.9780],  // Valid
        [91, 0],               // Invalid lat
        [0, 181],              // Invalid lon
        [37.5, 127.0]          // Valid
      ];

      const result = sanitizeRoute(route);
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        [37.5665, 126.9780],
        [37.5, 127.0]
      ]);
    });

    it('should handle empty array', () => {
      expect(sanitizeRoute([])).toEqual([]);
    });

    it('should handle non-array input', () => {
      expect(sanitizeRoute(null)).toEqual([]);
      expect(sanitizeRoute(undefined)).toEqual([]);
    });
  });
});
```

### 5.6 Integration Tests - API

```typescript
// src/services/__tests__/api.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { workoutAPI } from '../api';

// Mock fetch
global.fetch = vi.fn();

describe('workoutAPI', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('getWorkouts', () => {
    it('should fetch workouts successfully', async () => {
      const mockWorkouts = [
        { id: 1, distance: 5, duration: 30 },
        { id: 2, distance: 10, duration: 60 }
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkouts
      });

      const result = await workoutAPI.getWorkouts();

      expect(result).toEqual(mockWorkouts);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/workouts')
      );
    });

    it('should throw error on failure', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(workoutAPI.getWorkouts()).rejects.toThrow();
    });
  });

  describe('createWorkout', () => {
    it('should create workout successfully', async () => {
      const newWorkout = {
        title: 'Test Workout',
        distance: 5,
        duration: 30,
        date: '2024-01-01T00:00:00Z'
      };

      const mockResponse = { id: 1, ...newWorkout };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await workoutAPI.createWorkout(newWorkout);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/workouts'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newWorkout)
        })
      );
    });
  });
});
```

### 5.7 Component Tests

```tsx
// src/components/__tests__/StatsCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsCard from '../StatsCard';

describe('StatsCard', () => {
  it('should render stats correctly', () => {
    render(
      <StatsCard
        label="Total Distance"
        value="42.5"
        unit="km"
        icon="🏃"
      />
    );

    expect(screen.getByText('Total Distance')).toBeInTheDocument();
    expect(screen.getByText('42.5')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
    expect(screen.getByText('🏃')).toBeInTheDocument();
  });

  it('should handle zero values', () => {
    render(
      <StatsCard
        label="Workouts"
        value="0"
        unit="runs"
        icon="🎯"
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
```

### 5.8 E2E Tests - Critical Paths

```typescript
// e2e/workout-tracking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workout Tracking Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);

    // Set mock location (Seoul)
    await context.setGeolocation({
      latitude: 37.5665,
      longitude: 126.9780
    });

    await page.goto('/');
  });

  test('should complete full workout tracking flow', async ({ page }) => {
    // Navigate to live workout
    await page.click('text=Start Workout');

    // Should show GPS status
    await expect(page.locator('text=GPS')).toBeVisible();

    // Fill workout info
    await page.fill('input[name="title"]', 'Morning Run');
    await page.fill('input[name="weight"]', '10');
    await page.click('text=Continue to Tracking');

    // Should show tracking screen
    await expect(page.locator('text=Live Workout')).toBeVisible();

    // Start workout
    await page.click('text=Start Workout');

    // Should show recording status
    await expect(page.locator('text=Recording')).toBeVisible();

    // Wait a bit
    await page.waitForTimeout(2000);

    // Stop workout
    await page.click('text=Stop');

    // Should show save button
    await expect(page.locator('text=Workout Saved')).toBeVisible();

    // Go back to home
    await page.click('text=Go Back');

    // Should see new workout in list
    await expect(page.locator('text=Morning Run')).toBeVisible();
  });

  test('should handle GPS permission denied', async ({ page, context }) => {
    // Reset permissions
    await context.clearPermissions();

    await page.goto('/live-workout');

    // Should show permission denied message
    await expect(page.locator('text=GPS 권한이 필요합니다')).toBeVisible();

    // Should show retry button
    await expect(page.locator('text=권한 허용하기')).toBeVisible();
  });
});

test.describe('Data Visualization', () => {
  test('should display charts correctly', async ({ page }) => {
    await page.goto('/');

    // Should show activity chart
    await expect(page.locator('text=Activity Overview')).toBeVisible();

    // Should have view toggle buttons
    await expect(page.locator('text=7 Days')).toBeVisible();
    await expect(page.locator('text=Weekly')).toBeVisible();

    // Switch to weekly view
    await page.click('text=Weekly');

    // Chart should update (check for specific elements)
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
  });
});
```

### 5.9 Backend Tests

```javascript
// server/src/__tests__/workouts.test.js
const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const app = require('../app'); // Export app separately from server
const db = require('../database');

describe('Workout API', () => {
  beforeAll(() => {
    // Setup test database
    db.exec(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        distance REAL NOT NULL,
        duration REAL NOT NULL,
        date TEXT NOT NULL
      )
    `);
  });

  afterAll(() => {
    db.exec('DROP TABLE workouts');
    db.close();
  });

  describe('POST /api/workouts', () => {
    it('should create workout with valid data', async () => {
      const newWorkout = {
        title: 'Test Run',
        distance: 5.5,
        duration: 35.0,
        date: '2024-01-01T10:00:00Z'
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(newWorkout)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        ...newWorkout
      });
    });

    it('should reject invalid distance', async () => {
      const invalidWorkout = {
        title: 'Invalid',
        distance: -5, // Negative!
        duration: 30,
        date: '2024-01-01T10:00:00Z'
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(invalidWorkout)
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/workouts')
        .send({ title: 'Incomplete' })
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/workouts', () => {
    it('should return all workouts', async () => {
      const response = await request(app)
        .get('/api/workouts')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('DELETE /api/workouts/:id', () => {
    it('should delete existing workout', async () => {
      // Create a workout first
      const workout = await request(app)
        .post('/api/workouts')
        .send({
          title: 'To Delete',
          distance: 5,
          duration: 30,
          date: '2024-01-01T10:00:00Z'
        });

      // Delete it
      await request(app)
        .delete(`/api/workouts/${workout.body.id}`)
        .expect(200);

      // Verify it's gone
      await request(app)
        .get(`/api/workouts/${workout.body.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent workout', async () => {
      await request(app)
        .delete('/api/workouts/99999')
        .expect(404);
    });
  });
});
```

### 5.10 Mock Data Strategy

```typescript
// src/test/mockData/workouts.ts
export const mockWorkouts = [
  {
    id: 1,
    title: 'Morning Run',
    distance: 5.2,
    duration: 32.0,
    pace: 6.15,
    weight: 10,
    date: '2024-01-15T06:30:00Z',
    route: [
      [37.5665, 126.9780],
      [37.5675, 126.9790],
      [37.5685, 126.9800]
    ]
  },
  {
    id: 2,
    title: 'Evening Ruck',
    distance: 8.0,
    duration: 55.0,
    pace: 6.88,
    weight: 15,
    date: '2024-01-16T18:00:00Z',
    route: [
      [37.5600, 126.9700],
      [37.5610, 126.9710]
    ]
  }
];

export const mockGPSPosition = {
  latitude: 37.5665,
  longitude: 126.9780,
  accuracy: 10,
  timestamp: Date.now()
};

export const mockGPSError = {
  code: 'PERMISSION_DENIED' as const,
  message: 'GPS permission denied'
};
```

---

## 6. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] **Project Setup**
  - [ ] Install TypeScript: `npm install -D typescript @types/react @types/react-dom`
  - [ ] Configure tsconfig.json
  - [ ] Rename .jsx → .tsx (incrementally)
  - [ ] Setup ESLint + Prettier

- [ ] **Environment Variables**
  - [ ] Create .env.example (commit)
  - [ ] Move API URL to environment variables
  - [ ] Setup Railway environment variables
  - [ ] Add env validation (src/config/env.ts)

- [ ] **Input Validation - Backend**
  - [ ] Install Zod: `npm install zod`
  - [ ] Create validation schemas (server/src/schemas/)
  - [ ] Implement validation middleware
  - [ ] Add validation to all POST/PUT endpoints
  - [ ] Update error responses

- [ ] **Input Validation - Frontend**
  - [ ] Install React Hook Form + Zod: `npm install react-hook-form @hookform/resolvers/zod`
  - [ ] Create frontend schemas (src/schemas/)
  - [ ] Update AddWorkoutModal with validation
  - [ ] Add GPS data validation utilities
  - [ ] Add client-side error messages

### Phase 2: Error Handling (Week 1-2)
- [ ] **Error Infrastructure**
  - [ ] Create error types (src/types/errors.ts)
  - [ ] Implement AppError class (backend)
  - [ ] Create error handler middleware (backend)
  - [ ] Add async handler wrapper

- [ ] **Frontend Error Handling**
  - [ ] Implement ErrorBoundary component
  - [ ] Create ErrorMessage component
  - [ ] Add retry logic with exponential backoff
  - [ ] Update API service with error handling
  - [ ] Add user-friendly error messages

- [ ] **Error Monitoring**
  - [ ] Setup Sentry (optional but recommended)
  - [ ] Add error logging
  - [ ] Create error reporting utility

### Phase 3: Security Hardening (Week 2)
- [ ] **Authentication System**
  - [ ] Design user schema (add user table)
  - [ ] Install JWT: `npm install jsonwebtoken`
  - [ ] Implement token generation
  - [ ] Create auth middleware
  - [ ] Add login/logout endpoints
  - [ ] Update workout endpoints with auth
  - [ ] Add user_id to workouts table

- [ ] **Frontend Auth**
  - [ ] Create TokenStorage utility
  - [ ] Implement auth context
  - [ ] Add login/logout UI
  - [ ] Add token refresh logic
  - [ ] Protect routes

- [ ] **Security Middleware**
  - [ ] Configure CORS properly
  - [ ] Add rate limiting: `npm install express-rate-limit`
  - [ ] Implement CSRF protection
  - [ ] Add helmet: `npm install helmet`
  - [ ] Setup security headers

- [ ] **Dependency Security**
  - [ ] Run `npm audit`
  - [ ] Fix vulnerabilities
  - [ ] Setup GitHub Dependabot
  - [ ] Add security GitHub Action
  - [ ] Install eslint-plugin-security

### Phase 4: GPS Improvements (Week 2-3)
- [ ] **GPS Manager**
  - [ ] Create GPS configuration
  - [ ] Implement GPSManager class
  - [ ] Add accuracy filtering
  - [ ] Add speed validation
  - [ ] Implement fallback to low accuracy

- [ ] **GPS UI**
  - [ ] Create GPSStatus component
  - [ ] Add GPSPermissionDenied component
  - [ ] Update LiveWorkout with new GPS manager
  - [ ] Add accuracy indicators
  - [ ] Implement permission instructions

- [ ] **GPS Data Optimization**
  - [ ] Add route simplification (Douglas-Peucker algorithm)
  - [ ] Throttle GPS updates
  - [ ] Compress route data for storage

### Phase 5: Testing (Week 3)
- [ ] **Test Setup**
  - [ ] Install testing libraries
  - [ ] Configure Vitest
  - [ ] Configure Playwright
  - [ ] Create test utilities
  - [ ] Setup mock data

- [ ] **Write Tests**
  - [ ] Unit tests for utilities (workoutStats, gpsValidation)
  - [ ] Unit tests for GPS manager
  - [ ] Integration tests for API service
  - [ ] Component tests (StatsCard, WorkoutChart)
  - [ ] E2E test for workout flow
  - [ ] E2E test for GPS permission

- [ ] **Backend Tests**
  - [ ] Install supertest: `npm install -D supertest`
  - [ ] Test workout CRUD endpoints
  - [ ] Test validation
  - [ ] Test authentication
  - [ ] Test error handling

- [ ] **CI/CD**
  - [ ] Create GitHub Actions workflow
  - [ ] Add test job
  - [ ] Add security scan job
  - [ ] Add build job
  - [ ] Setup coverage reporting

### Phase 6: Performance & Polish (Week 4)
- [ ] **Performance**
  - [ ] Add React.memo to expensive components
  - [ ] Add useMemo/useCallback where needed
  - [ ] Implement code splitting
  - [ ] Add service worker for offline
  - [ ] Optimize bundle size

- [ ] **Database**
  - [ ] Add indexes to SQLite
  - [ ] Implement pagination
  - [ ] Add database migrations system

- [ ] **UI/UX**
  - [ ] Replace OpenStreetMap iframe with proper map library
  - [ ] Replace emojis with icon library
  - [ ] Add loading skeletons
  - [ ] Improve mobile responsiveness
  - [ ] Add data export feature

- [ ] **Documentation**
  - [ ] Write README
  - [ ] Add API documentation
  - [ ] Create user guide
  - [ ] Document deployment process

### Phase 7: Deployment (Week 4)
- [ ] **Backend Deployment**
  - [ ] Verify Railway configuration
  - [ ] Setup production environment variables
  - [ ] Configure database backups
  - [ ] Test production API

- [ ] **Frontend Deployment**
  - [ ] Create Vercel account
  - [ ] Configure Vercel project
  - [ ] Setup environment variables
  - [ ] Configure custom domain (optional)
  - [ ] Deploy and test

- [ ] **Monitoring**
  - [ ] Setup error tracking (Sentry)
  - [ ] Add analytics (optional)
  - [ ] Setup uptime monitoring
  - [ ] Configure alerts

---

## 7. PR Review Criteria Matrix

### 7.1 Automated Checks (Must Pass)
| Check | Tool | Threshold | Blocking |
|-------|------|-----------|----------|
| Unit Tests | Vitest | 100% pass | ✅ Yes |
| Test Coverage | Vitest | ≥80% | ✅ Yes |
| Type Check | TypeScript | 0 errors | ✅ Yes |
| Linting | ESLint | 0 errors | ✅ Yes |
| Security Lint | eslint-plugin-security | 0 errors | ✅ Yes |
| Dependency Audit | npm audit | 0 high/critical | ✅ Yes |
| Build | Vite | Success | ✅ Yes |

### 7.2 Code Quality Review

#### **Input Validation**
- [ ] All user inputs validated with Zod
- [ ] Validation schemas have proper error messages
- [ ] Edge cases handled (min/max, null, undefined)
- [ ] Backend validation matches frontend
- [ ] GPS coordinates validated for range and realism

**Score: ⭐⭐⭐⭐⭐ (Required: 4+)**

#### **Error Handling**
- [ ] All async operations wrapped with try-catch
- [ ] Errors properly typed (AppError interface)
- [ ] User-facing error messages are clear
- [ ] Retry logic implemented for network errors
- [ ] Error boundaries present for React components
- [ ] Errors logged for debugging

**Score: ⭐⭐⭐⭐⭐ (Required: 4+)**

#### **Security**
- [ ] No secrets in code
- [ ] Authentication required for protected routes
- [ ] Authorization checked for resource access
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (input sanitization)
- [ ] CSRF token validated
- [ ] CORS properly configured

**Score: ⭐⭐⭐⭐⭐ (Required: 5)**

#### **GPS Accuracy**
- [ ] Accuracy threshold enforced
- [ ] Speed validation implemented
- [ ] Distance jumps filtered
- [ ] Timeout handling present
- [ ] Permission denied flow handled
- [ ] Fallback to low accuracy mode

**Score: ⭐⭐⭐⭐⭐ (Required: 4+)**

#### **Testing**
- [ ] New functions have unit tests
- [ ] Components have integration tests
- [ ] Critical paths have E2E tests
- [ ] Edge cases tested
- [ ] Mocks/stubs used appropriately
- [ ] Test names descriptive

**Score: ⭐⭐⭐⭐⭐ (Required: 3+)**

#### **Performance**
- [ ] No unnecessary re-renders
- [ ] Large lists virtualized
- [ ] Images optimized
- [ ] Code split appropriately
- [ ] Bundle size checked
- [ ] Database queries optimized

**Score: ⭐⭐⭐⭐⭐ (Required: 3+)**

#### **Code Style**
- [ ] Follows project conventions
- [ ] Functions are small and focused
- [ ] Variable names descriptive
- [ ] Comments explain "why" not "what"
- [ ] No console.log in production code
- [ ] TypeScript types properly defined

**Score: ⭐⭐⭐⭐⭐ (Required: 4+)**

### 7.3 Review Template

```markdown
## PR Review Checklist

### Automated Checks
- [ ] All tests passing
- [ ] Coverage ≥80%
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] No security vulnerabilities
- [ ] Build successful

### Code Quality

**Input Validation**: ⭐⭐⭐⭐⭐
- Comments: [Reviewer notes]

**Error Handling**: ⭐⭐⭐⭐⭐
- Comments: [Reviewer notes]

**Security**: ⭐⭐⭐⭐⭐
- Comments: [Reviewer notes]

**GPS Accuracy**: ⭐⭐⭐⭐⭐
- Comments: [Reviewer notes]

**Testing**: ⭐⭐⭐⭐⭐
- Comments: [Reviewer notes]

**Performance**: ⭐⭐⭐⭐⭐
- Comments: [Reviewer notes]

**Code Style**: ⭐⭐⭐⭐⭐
- Comments: [Reviewer notes]

### Overall Assessment
- [ ] ✅ Approve
- [ ] 🔄 Request Changes
- [ ] 💬 Comment

### Additional Comments
[Detailed feedback]
```

### 7.4 Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| 🔴 **Critical** | Security vulnerability, data loss risk | Must fix before merge |
| 🟠 **Major** | Broken functionality, poor UX | Should fix before merge |
| 🟡 **Minor** | Code quality, optimization | Can address later |
| 🟢 **Suggestion** | Nice-to-have improvement | Optional |

### 7.5 Common Issues Guide

**❌ Missing validation**
```typescript
// Bad
const workout = req.body;
db.insert(workout);

// Good
const workout = CreateWorkoutSchema.parse(req.body);
db.insert(workout);
```

**❌ Unhandled errors**
```typescript
// Bad
const data = await fetchData();

// Good
try {
  const data = await fetchData();
} catch (error) {
  handleApiError(error);
}
```

**❌ Hardcoded credentials**
```typescript
// Bad
const API_URL = 'https://api.example.com';

// Good
const API_URL = import.meta.env.VITE_API_URL;
```

**❌ No GPS validation**
```typescript
// Bad
setDistance(prev => prev + calculateDistance(...));

// Good
if (isAcceptableAccuracy(accuracy) && isRealisticSpeed(dist, time)) {
  setDistance(prev => prev + dist);
}
```

---

## Summary

This production standards document provides:

1. ✅ **Input Validation**: Zod schemas with examples for backend and frontend
2. ✅ **Error Handling**: Comprehensive error classification, boundaries, and user messages
3. ✅ **Security**: Authentication, CORS, CSRF, token storage, and dependency scanning
4. ✅ **GPS Accuracy**: Thresholds, validation, fallback strategies, and UX flows
5. ✅ **Testing**: Test pyramid, coverage goals, and examples for all layers
6. ✅ **Implementation Checklist**: 4-week phased rollout with specific tasks
7. ✅ **PR Review Criteria**: Automated checks and quality scoring matrix

**Next Steps**:
1. Review and approve standards
2. Begin Phase 1 (Foundation)
3. Set up GitHub Project board with checklist items
4. Schedule weekly reviews to track progress

Would you like me to create any of these files in your project, or would you like more details on any specific section?
