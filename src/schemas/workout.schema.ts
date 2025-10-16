import { z } from 'zod';
import { FIELD_ERROR_MESSAGES } from '../types/errors';

const sanitizeTitle = (value: string) => value.replace(/[<>]/g, '');

const LATITUDE_MESSAGE = 'Latitude must be between -90 and 90 degrees';
const LONGITUDE_MESSAGE = 'Longitude must be between -180 and 180 degrees';
const DISTANCE_DECIMAL_MESSAGE = 'Distance accepts up to two decimal places';
const DURATION_DECIMAL_MESSAGE = 'Duration accepts up to one decimal place';
const WEIGHT_DECIMAL_MESSAGE = 'Weight accepts up to one decimal place';
const PACE_MISMATCH_MESSAGE = 'Pace must match the distance and duration within ±0.5 min/km';
const REALISTIC_PACE_MESSAGE = 'Distance and duration combination is unrealistic (pace must be between 1 and 60 min/km)';
const DATE_RANGE_MESSAGE = 'Date must be between 2020-01-01 and tomorrow';
const ROUTE_JUMP_MESSAGE = 'Consecutive GPS points are too far apart';
const ROUTE_INVALID_MESSAGE = FIELD_ERROR_MESSAGES.route.invalid || 'Route contains invalid coordinates';
const TITLE_REQUIRED_MESSAGE = 'Title is required';
const ID_INTEGER_MESSAGE = 'ID must be a positive integer';
const LIMIT_INTEGER_MESSAGE = 'limit must be an integer';
const OFFSET_INTEGER_MESSAGE = 'offset must be an integer';
const DATE_RANGE_ORDER_MESSAGE = 'Start date must be before or equal to end date';

const GPSCoordinateSchema = z.tuple([
  z.number().min(-90, LATITUDE_MESSAGE).max(90, LATITUDE_MESSAGE),
  z.number().min(-180, LONGITUDE_MESSAGE).max(180, LONGITUDE_MESSAGE)
]);

const WeightInputSchema = z
  .union([
    z
      .coerce
      .number({
        invalid_type_error: FIELD_ERROR_MESSAGES.weight.type
      })
      .min(0, FIELD_ERROR_MESSAGES.weight.min)
      .max(200, FIELD_ERROR_MESSAGES.weight.max),
    z.literal(''),
    z.null()
  ])
  .superRefine((value, ctx) => {
    if (value === '' || value === null || typeof value !== 'number') {
      return;
    }

    if (Number(value.toFixed(1)) !== Number(value.toFixed(10))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: WEIGHT_DECIMAL_MESSAGE
      });
    }
  })
  .transform((value) => {
    if (value === '' || value === null || typeof value !== 'number') {
      return null;
    }
    return value;
  });

export const ManualWorkoutSchema = z.object({
  title: z
    .string()
    .trim()
    .max(100, FIELD_ERROR_MESSAGES.title.max)
    .transform(sanitizeTitle),
  distance: z.coerce.number({
    required_error: FIELD_ERROR_MESSAGES.distance.required,
    invalid_type_error: FIELD_ERROR_MESSAGES.distance.type
  })
    .min(0.01, FIELD_ERROR_MESSAGES.distance.min)
    .max(1000, FIELD_ERROR_MESSAGES.distance.max)
    .refine(
      (value) => Number(value.toFixed(2)) === Number(value.toFixed(10)),
      { message: DISTANCE_DECIMAL_MESSAGE }
    ),
  duration: z.coerce.number({
    required_error: FIELD_ERROR_MESSAGES.duration.required,
    invalid_type_error: FIELD_ERROR_MESSAGES.duration.type
  })
    .min(0.1, FIELD_ERROR_MESSAGES.duration.min)
    .max(1440, FIELD_ERROR_MESSAGES.duration.max)
    .refine(
      (value) => Number(value.toFixed(1)) === Number(value.toFixed(10)),
      { message: DURATION_DECIMAL_MESSAGE }
    ),
  weight: WeightInputSchema,
  date: z
    .string()
    .datetime({ message: FIELD_ERROR_MESSAGES.date.invalid })
    .optional()
    .default(() => new Date().toISOString())
}).refine((data) => {
  if (!data.distance || !data.duration) {
    return true;
  }
  const pace = data.duration / data.distance;
  return pace >= 1 && pace <= 60;
}, {
  message: REALISTIC_PACE_MESSAGE,
  path: ['distance']
});

export type ManualWorkoutFormData = z.infer<typeof ManualWorkoutSchema>;

export const LiveWorkoutSetupSchema = z.object({
  title: z
    .string()
    .trim()
    .max(100, FIELD_ERROR_MESSAGES.title.max)
    .transform(sanitizeTitle),
  weight: WeightInputSchema
});

export type LiveWorkoutSetupFormData = z.infer<typeof LiveWorkoutSetupSchema>;

export const WorkoutSubmitSchema = z.object({
  title: z
    .string({
      required_error: TITLE_REQUIRED_MESSAGE,
      invalid_type_error: FIELD_ERROR_MESSAGES.title.invalid
    })
    .trim()
    .min(1, TITLE_REQUIRED_MESSAGE)
    .max(100, FIELD_ERROR_MESSAGES.title.max)
    .transform(sanitizeTitle),
  distance: z
    .number({
      required_error: FIELD_ERROR_MESSAGES.distance.required,
      invalid_type_error: FIELD_ERROR_MESSAGES.distance.type
    })
    .min(0.01, FIELD_ERROR_MESSAGES.distance.min)
    .max(1000, FIELD_ERROR_MESSAGES.distance.max),
  duration: z
    .number({
      required_error: FIELD_ERROR_MESSAGES.duration.required,
      invalid_type_error: FIELD_ERROR_MESSAGES.duration.type
    })
    .min(0.1, FIELD_ERROR_MESSAGES.duration.min)
    .max(1440, FIELD_ERROR_MESSAGES.duration.max),
  pace: z
    .number({
      invalid_type_error: FIELD_ERROR_MESSAGES.pace?.unrealistic ?? 'Invalid pace value'
    })
    .min(1, FIELD_ERROR_MESSAGES.pace?.min ?? 'Pace must be at least 1 min/km')
    .max(60, FIELD_ERROR_MESSAGES.pace?.max ?? 'Pace must be at most 60 min/km')
    .optional()
    .nullable(),
  weight: z
    .number({
      invalid_type_error: FIELD_ERROR_MESSAGES.weight.type
    })
    .min(0, FIELD_ERROR_MESSAGES.weight.min)
    .max(200, FIELD_ERROR_MESSAGES.weight.max)
    .optional()
    .nullable(),
  date: z
    .string()
    .datetime({ message: FIELD_ERROR_MESSAGES.date.invalid })
    .refine((value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return false;
      }

      const minDate = new Date('2020-01-01T00:00:00Z');
      const maxDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return date >= minDate && date <= maxDate;
    }, {
      message: DATE_RANGE_MESSAGE
    }),
  route: z
    .array(GPSCoordinateSchema, {
      invalid_type_error: FIELD_ERROR_MESSAGES.route.type
    })
    .min(2, FIELD_ERROR_MESSAGES.route.min)
    .max(10000, FIELD_ERROR_MESSAGES.route.max)
    .optional()
    .nullable()
    .refine((route) => {
      if (!route) {
        return true;
      }

      for (let index = 1; index < route.length; index += 1) {
        const [prevLat, prevLon] = route[index - 1];
        const [lat, lon] = route[index];
        const latDiff = Math.abs(lat - prevLat);
        const lonDiff = Math.abs(lon - prevLon);

        if (latDiff > 1 || lonDiff > 1) {
          return false;
        }
      }

      return true;
    }, {
      message: ROUTE_JUMP_MESSAGE
    })
}).refine((data) => {
  if (!data.pace) {
    return true;
  }

  const calculated = data.duration / data.distance;
  return Math.abs(data.pace - calculated) <= 0.5;
}, {
  message: PACE_MISMATCH_MESSAGE,
  path: ['pace']
});

export type WorkoutSubmitData = z.infer<typeof WorkoutSubmitSchema>;

export const WorkoutQuerySchema = z.object({
  limit: z
    .coerce
    .number({
      invalid_type_error: LIMIT_INTEGER_MESSAGE
    })
    .int(LIMIT_INTEGER_MESSAGE)
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .optional()
    .default(50),
  offset: z
    .coerce
    .number({
      invalid_type_error: OFFSET_INTEGER_MESSAGE
    })
    .int(OFFSET_INTEGER_MESSAGE)
    .min(0, 'offset must be at least 0')
    .optional()
    .default(0),
  startDate: z
    .string()
    .datetime({ message: FIELD_ERROR_MESSAGES.date.invalid })
    .optional(),
  endDate: z
    .string()
    .datetime({ message: FIELD_ERROR_MESSAGES.date.invalid })
    .optional()
}).refine((data) => {
  if (!data.startDate || !data.endDate) {
    return true;
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start <= end;
}, {
  message: DATE_RANGE_ORDER_MESSAGE,
  path: ['startDate']
});

export type WorkoutQueryParams = z.infer<typeof WorkoutQuerySchema>;

export const WorkoutIdSchema = z
  .coerce
  .number({
    invalid_type_error: ID_INTEGER_MESSAGE
  })
  .int(ID_INTEGER_MESSAGE)
  .positive(ID_INTEGER_MESSAGE);

export function parseZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  error.errors.forEach((issue) => {
    const path = issue.path.join('.') || 'form';
    fieldErrors[path] = issue.message;
  });

  return fieldErrors;
}

export function validateWorkout<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: parseZodErrors(result.error) };
}
