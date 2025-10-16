# Validation Usage Examples

Complete implementation examples for validation schemas and error handling.

---

## Frontend Examples

### 1. Manual Workout Form with React Hook Form + Zod

```tsx
// src/components/AddWorkoutModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ManualWorkoutSchema, ManualWorkoutFormData } from '../schemas/workout.schema';
import { workoutAPI } from '../services/api';
import { useState } from 'react';
import { createFormErrorState } from '../utils/errorHandler';
import { FormErrorState } from '../types/errors';

export function AddWorkoutModal({ onClose }: { onClose: () => void }) {
  const [submitError, setSubmitError] = useState<FormErrorState | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<ManualWorkoutFormData>({
    resolver: zodResolver(ManualWorkoutSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data: ManualWorkoutFormData) => {
    try {
      setSubmitError(null);

      // Transform data for API
      const workout = {
        title: data.title || 'Manual Workout',
        distance: data.distance,
        duration: data.duration,
        weight: data.weight || null,
        date: data.date || new Date().toISOString(),
        pace: data.duration / data.distance // Calculate pace
      };

      await workoutAPI.createWorkout(workout);
      onClose();
    } catch (error) {
      const formError = createFormErrorState(error);
      setSubmitError(formError);

      // Set field-specific errors
      Object.entries(formError.fieldErrors).forEach(([field, message]) => {
        setError(field as any, { message });
      });
    }
  };

  return (
    <div className="modal">
      <h2>Add Workout</h2>

      {/* Form-level error */}
      {submitError && !Object.keys(submitError.fieldErrors).length && (
        <div className="error-banner">
          {submitError.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Title field */}
        <div>
          <label>Workout Title</label>
          <input
            {...register('title')}
            placeholder="Morning Ruck"
          />
          {errors.title && (
            <span className="error">{errors.title.message}</span>
          )}
        </div>

        {/* Distance field */}
        <div>
          <label>Distance (km) *</label>
          <input
            type="number"
            step="0.1"
            {...register('distance')}
            placeholder="5.0"
          />
          {errors.distance && (
            <span className="error">{errors.distance.message}</span>
          )}
        </div>

        {/* Duration field */}
        <div>
          <label>Duration (minutes) *</label>
          <input
            type="number"
            step="0.1"
            {...register('duration')}
            placeholder="45"
          />
          {errors.duration && (
            <span className="error">{errors.duration.message}</span>
          )}
        </div>

        {/* Weight field */}
        <div>
          <label>Ruck Weight (kg)</label>
          <input
            type="number"
            step="0.5"
            {...register('weight')}
            placeholder="10.0"
          />
          {errors.weight && (
            <span className="error">{errors.weight.message}</span>
          )}
        </div>

        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Add Workout'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 2. API Service with Error Handling

```typescript
// src/services/api.ts
import axios from 'axios';
import { withRetry, handleApiError } from '../utils/errorHandler';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Transform error
    const appError = handleApiError(error);
    return Promise.reject(appError);
  }
);

export const workoutAPI = {
  async getWorkouts(params?: { limit?: number; offset?: number }) {
    const response = await apiClient.get('/workouts', { params });
    return response.data;
  },

  async createWorkout(workout: any) {
    // Retry on network errors or 5xx errors
    return withRetry(
      async () => {
        const response = await apiClient.post('/workouts', workout);
        return response.data;
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: (attempt, error) => {
          console.log(`Retrying... Attempt ${attempt}`, error);
        }
      }
    );
  },

  async deleteWorkout(id: number) {
    const response = await apiClient.delete(`/workouts/${id}`);
    return response.data;
  }
};
```

### 3. Reusable Error Message Component

```tsx
// src/components/ErrorMessage.tsx
import { FormErrorState } from '../types/errors';
import { getErrorIcon, getErrorTitle, formatErrorMessage } from '../utils/errorHandler';

interface ErrorMessageProps {
  error: FormErrorState | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({ error, onRetry, onDismiss }: ErrorMessageProps) {
  if (!error) return null;

  const icon = getErrorIcon(error.type);
  const title = getErrorTitle(error.type);
  const message = formatErrorMessage(error);

  return (
    <div className={`error-message ${error.retryable ? 'retryable' : ''}`}>
      <div className="error-header">
        <span className="error-icon">{icon}</span>
        <h3 className="error-title">{title}</h3>
        {onDismiss && (
          <button onClick={onDismiss} className="dismiss-btn">✕</button>
        )}
      </div>

      <p className="error-body">{message}</p>

      {/* Field errors */}
      {Object.keys(error.fieldErrors).length > 0 && (
        <ul className="field-errors">
          {Object.entries(error.fieldErrors).map(([field, msg]) => (
            <li key={field}>
              <strong>{field}:</strong> {msg}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      {error.retryable && onRetry && (
        <div className="error-actions">
          <button onClick={onRetry} className="retry-btn">
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Backend Examples

### 1. Express Route with Validation

```javascript
// server/src/routes/workouts.js
const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { CreateWorkoutSchema, WorkoutQuerySchema, WorkoutIdSchema } = require('../schemas/workout.schema');
const { NotFoundError, DatabaseError } = require('../types/errors');
const db = require('../database');

// GET /api/workouts
router.get(
  '/',
  validate(WorkoutQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { limit, offset, startDate, endDate } = req.query;

    let query = 'SELECT * FROM workouts';
    const params = [];

    // Add date filters
    if (startDate && endDate) {
      query += ' WHERE date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ' WHERE date >= ?';
      params.push(startDate);
    } else if (endDate) {
      query += ' WHERE date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      const workouts = db.prepare(query).all(...params);

      // Parse route JSON
      const parsed = workouts.map(w => ({
        ...w,
        route: w.route ? JSON.parse(w.route) : null
      }));

      res.json({
        data: parsed,
        pagination: {
          limit,
          offset,
          total: db.prepare('SELECT COUNT(*) as count FROM workouts').get().count
        }
      });
    } catch (error) {
      throw new DatabaseError('Failed to fetch workouts', 'DB_001');
    }
  })
);

// GET /api/workouts/:id
router.get(
  '/:id',
  validate(WorkoutIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);

      if (!workout) {
        throw new NotFoundError('Workout', 'NOT_FOUND_001');
      }

      workout.route = workout.route ? JSON.parse(workout.route) : null;
      res.json(workout);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to fetch workout', 'DB_001');
    }
  })
);

// POST /api/workouts
router.post(
  '/',
  validate(CreateWorkoutSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { date, title, distance, duration, pace, weight, route } = req.body;

    try {
      const stmt = db.prepare(`
        INSERT INTO workouts (date, title, distance, duration, pace, weight, route)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        date,
        title,
        distance,
        duration,
        pace,
        weight,
        route ? JSON.stringify(route) : null
      );

      const newWorkout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid);
      newWorkout.route = newWorkout.route ? JSON.parse(newWorkout.route) : null;

      res.status(201).json(newWorkout);
    } catch (error) {
      throw new DatabaseError('Failed to create workout', 'DB_001');
    }
  })
);

// DELETE /api/workouts/:id
router.delete(
  '/:id',
  validate(WorkoutIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const stmt = db.prepare('DELETE FROM workouts WHERE id = ?');
      const result = stmt.run(id);

      if (result.changes === 0) {
        throw new NotFoundError('Workout', 'NOT_FOUND_001');
      }

      res.json({ message: 'Workout deleted successfully' });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to delete workout', 'DB_001');
    }
  })
);

module.exports = router;
```

### 2. Server Setup with Error Handling

```javascript
// server/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const workoutRoutes = require('./src/routes/workouts');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Good Ruck API is running' });
});

app.use('/api/workouts', workoutRoutes);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
```

---

## Testing Examples

### 1. Frontend Unit Tests

```typescript
// src/schemas/__tests__/workout.schema.test.ts
import { describe, it, expect } from 'vitest';
import { ManualWorkoutSchema, parseZodErrors } from '../workout.schema';

describe('ManualWorkoutSchema', () => {
  it('should validate correct data', () => {
    const validData = {
      title: 'Morning Run',
      distance: 5.5,
      duration: 45,
      weight: 10
    };

    const result = ManualWorkoutSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject negative distance', () => {
    const invalidData = {
      distance: -5,
      duration: 30
    };

    const result = ManualWorkoutSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = parseZodErrors(result.error);
      expect(errors.distance).toContain('0.01');
    }
  });

  it('should reject duration > 1440 minutes', () => {
    const invalidData = {
      distance: 5,
      duration: 2000
    };

    const result = ManualWorkoutSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = parseZodErrors(result.error);
      expect(errors.duration).toContain('1440');
    }
  });

  it('should sanitize HTML in title', () => {
    const dataWithHTML = {
      title: '<script>alert("xss")</script>Test',
      distance: 5,
      duration: 30
    };

    const result = ManualWorkoutSchema.safeParse(dataWithHTML);
    expect(result.success).toBe(true);

    if (result.success) {
      // HTML should be removed
      expect(result.data.title).toBe('Test');
    }
  });
});
```

### 2. Backend Integration Tests

```javascript
// server/src/__tests__/workouts.test.js
const request = require('supertest');
const app = require('../app');

describe('POST /api/workouts', () => {
  it('should create workout with valid data', async () => {
    const validWorkout = {
      title: 'Test Workout',
      distance: 5.5,
      duration: 45,
      weight: 15
    };

    const response = await request(app)
      .post('/api/workouts')
      .send(validWorkout)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      title: 'Test Workout',
      distance: 5.5,
      duration: 45,
      weight: 15
    });
  });

  it('should reject invalid distance', async () => {
    const invalidWorkout = {
      title: 'Test',
      distance: -5,
      duration: 30
    };

    const response = await request(app)
      .post('/api/workouts')
      .send(invalidWorkout)
      .expect(400);

    expect(response.body).toMatchObject({
      error: 'VALIDATION_ERROR',
      code: 'VALIDATION_003'
    });

    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'distance',
          code: 'VALIDATION_003'
        })
      ])
    );
  });

  it('should handle multiple validation errors', async () => {
    const invalidWorkout = {
      distance: -5,
      duration: 2000,
      weight: 300
    };

    const response = await request(app)
      .post('/api/workouts')
      .send(invalidWorkout)
      .expect(400);

    expect(response.body.details).toHaveLength(3);
    expect(response.body.error).toBe('VALIDATION_ERROR');
  });
});
```

---

## Common Patterns

### 1. Validation Before Submission

```typescript
// Pre-validate before API call
import { validateWorkout, ManualWorkoutSchema } from '../schemas/workout.schema';

function handleFormSubmit(formData: any) {
  const result = validateWorkout(ManualWorkoutSchema, formData);

  if (!result.success) {
    // Show errors without API call
    showErrors(result.errors);
    return;
  }

  // Proceed with API call
  submitToAPI(result.data);
}
```

### 2. Error Recovery with Retry

```typescript
// Automatically retry on network errors
try {
  const workout = await workoutAPI.createWorkout(data);
} catch (error) {
  if (isRetryableError(error)) {
    // Retry logic
    await sleep(1000);
    const workout = await workoutAPI.createWorkout(data);
  } else {
    // Show error to user
    showError(error);
  }
}
```

### 3. Field-Level Validation

```tsx
// Real-time validation on blur
const handleDistanceBlur = (value: string) => {
  const result = z.coerce.number().min(0.01).max(1000).safeParse(value);

  if (!result.success) {
    setFieldError('distance', '거리는 0.01~1000km 사이여야 합니다');
  } else {
    clearFieldError('distance');
  }
};
```

---

## Installation Commands

```bash
# Frontend dependencies
npm install zod react-hook-form @hookform/resolvers/zod

# Backend dependencies
cd server
npm install zod
```

---

**End of Examples**
