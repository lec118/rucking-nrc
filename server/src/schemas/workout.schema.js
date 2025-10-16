/**
 * Backend Validation Schemas (Zod)
 * Security-first validation for all API endpoints
 */

const { z } = require('zod');

/**
 * GPS Coordinate Schema
 */
const GPSCoordinateSchema = z.tuple([
  z.number().min(-90).max(90),  // latitude
  z.number().min(-180).max(180) // longitude
]);

/**
 * Workout Creation Schema
 * POST /api/workouts
 */
const CreateWorkoutSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less')
    .trim()
    .transform(str => {
      // Remove HTML tags (XSS prevention)
      return str.replace(/<[^>]*>/g, '');
    })
    .refine(str => {
      // No angle brackets allowed
      return !/<|>/.test(str);
    }, {
      message: 'Title contains forbidden characters'
    })
    .default('Workout'),

  distance: z.number({
    required_error: 'Distance is required',
    invalid_type_error: 'Distance must be a number'
  })
    .min(0.01, 'Distance must be at least 0.01 km (10 meters)')
    .max(1000, 'Distance cannot exceed 1000 km')
    .refine(val => {
      // Max 2 decimal places
      const decimals = (val.toString().split('.')[1] || '').length;
      return decimals <= 2;
    }, {
      message: 'Distance can have maximum 2 decimal places'
    }),

  duration: z.number({
    required_error: 'Duration is required',
    invalid_type_error: 'Duration must be a number'
  })
    .min(0.1, 'Duration must be at least 0.1 minutes (6 seconds)')
    .max(1440, 'Duration cannot exceed 1440 minutes (24 hours)')
    .refine(val => {
      // Max 1 decimal place
      const decimals = (val.toString().split('.')[1] || '').length;
      return decimals <= 1;
    }, {
      message: 'Duration can have maximum 1 decimal place'
    }),

  pace: z.number()
    .min(1, 'Pace must be at least 1 min/km (unrealistic if faster)')
    .max(60, 'Pace cannot exceed 60 min/km (unrealistic if slower)')
    .optional()
    .nullable()
    .transform(val => val === undefined ? null : val),

  weight: z.number()
    .min(0, 'Weight must be non-negative')
    .max(200, 'Weight cannot exceed 200 kg')
    .optional()
    .nullable()
    .transform(val => val === undefined ? null : val),

  date: z.string()
    .datetime({ message: 'Date must be in ISO 8601 format' })
    .refine(dateStr => {
      const date = new Date(dateStr);
      const minDate = new Date('2020-01-01');
      const maxDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // +1 day

      return date >= minDate && date <= maxDate && !isNaN(date.getTime());
    }, {
      message: 'Date must be between 2020-01-01 and tomorrow'
    })
    .default(() => new Date().toISOString()),

  route: z.array(GPSCoordinateSchema)
    .min(2, 'Route must have at least 2 GPS points')
    .max(10000, 'Route cannot exceed 10,000 GPS points')
    .optional()
    .nullable()
    .transform(val => val === undefined ? null : val)
    .refine((route) => {
      if (!route) return true;

      // Validate all coordinates are within valid range
      return route.every(([lat, lon]) =>
        !isNaN(lat) && !isNaN(lon) &&
        lat >= -90 && lat <= 90 &&
        lon >= -180 && lon <= 180
      );
    }, {
      message: 'Route contains invalid GPS coordinates'
    })
    .refine((route) => {
      if (!route || route.length < 2) return true;

      // Check for realistic distances between consecutive points
      for (let i = 1; i < route.length; i++) {
        const [lat1, lon1] = route[i - 1];
        const [lat2, lon2] = route[i];

        // Calculate distance (simplified check)
        const latDiff = Math.abs(lat2 - lat1);
        const lonDiff = Math.abs(lon2 - lon1);

        // If jump is > 1 degree (~111km), likely GPS error
        if (latDiff > 1 || lonDiff > 1) {
          return false;
        }
      }

      return true;
    }, {
      message: 'Route contains unrealistic GPS jumps'
    })
})
  .refine((data) => {
    // Cross-field validation: pace should match duration/distance
    if (!data.pace) return true;

    const calculated = data.duration / data.distance;
    const tolerance = 0.5; // Allow 0.5 min/km difference

    return Math.abs(data.pace - calculated) <= tolerance;
  }, {
    message: 'Pace does not match duration and distance',
    path: ['pace']
  })
  .refine((data) => {
    // Validate realistic pace based on duration/distance
    const pace = data.duration / data.distance;

    return pace >= 1 && pace <= 60;
  }, {
    message: 'Unrealistic pace: workout appears too fast or too slow',
    path: ['distance']
  });

/**
 * Update Workout Schema (Partial)
 * PUT /api/workouts/:id
 */
const UpdateWorkoutSchema = CreateWorkoutSchema.partial();

/**
 * Workout Query Parameters Schema
 * GET /api/workouts
 */
const WorkoutQuerySchema = z.object({
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(50),

  offset: z.coerce.number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be non-negative')
    .default(0),

  startDate: z.string()
    .datetime({ message: 'Start date must be in ISO 8601 format' })
    .optional(),

  endDate: z.string()
    .datetime({ message: 'End date must be in ISO 8601 format' })
    .optional()
})
  .refine((data) => {
    // Validate date range
    if (!data.startDate || !data.endDate) return true;

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    return start <= end;
  }, {
    message: 'Start date must be before or equal to end date',
    path: ['startDate']
  });

/**
 * Workout ID Parameter Schema
 * GET/DELETE /api/workouts/:id
 */
const WorkoutIdSchema = z.coerce.number()
  .int('Workout ID must be an integer')
  .positive('Workout ID must be positive');

/**
 * Transform Zod errors to API error format
 */
function transformZodErrors(zodError) {
  return zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: getErrorCode(err),
    constraint: err.code === 'too_small' || err.code === 'too_big' ? {
      type: err.code === 'too_small' ? 'min' : 'max',
      value: err.minimum || err.maximum
    } : undefined
  }));
}

/**
 * Map Zod error codes to our error codes
 */
function getErrorCode(zodError) {
  const codeMap = {
    'invalid_type': 'VALIDATION_001',
    'invalid_string': 'VALIDATION_005',
    'too_small': 'VALIDATION_003',
    'too_big': 'VALIDATION_004',
    'invalid_date': 'VALIDATION_005',
    'custom': 'VALIDATION_001'
  };

  // Special cases
  if (zodError.message.includes('required')) {
    return 'VALIDATION_002';
  }

  if (zodError.message.includes('GPS') || zodError.message.includes('coordinates')) {
    return 'VALIDATION_006';
  }

  if (zodError.message.includes('Route') && zodError.message.includes('points')) {
    return 'VALIDATION_007';
  }

  if (zodError.message.includes('date') && zodError.message.includes('range')) {
    return 'VALIDATION_008';
  }

  if (zodError.message.includes('pace') || zodError.message.includes('unrealistic')) {
    return 'VALIDATION_009';
  }

  return codeMap[zodError.code] || 'VALIDATION_001';
}

module.exports = {
  CreateWorkoutSchema,
  UpdateWorkoutSchema,
  WorkoutQuerySchema,
  WorkoutIdSchema,
  GPSCoordinateSchema,
  transformZodErrors
};
