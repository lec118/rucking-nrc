/**
 * Validation Middleware
 * Validates requests using Zod schemas
 */

const { ZodError } = require('zod');
const { transformZodErrors } = require('../schemas/workout.schema');

/**
 * Validation middleware factory
 * @param {ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      // Validate and transform data
      const validated = await schema.parseAsync(req[source]);

      // Replace request data with validated/transformed data
      req[source] = validated;

      // Add validated flag
      req.validated = req.validated || {};
      req.validated[source] = true;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = transformZodErrors(error);

        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          code: details[0]?.code || 'VALIDATION_001',
          message: details.length === 1 ? details[0].message : 'Multiple validation errors',
          details,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        });
      }

      // Unexpected error
      next(error);
    }
  };
}

/**
 * Validate multiple sources in one middleware
 * @param {Object} schemas - Object with source as key and schema as value
 * @example validateMultiple({ body: CreateWorkoutSchema, query: WorkoutQuerySchema })
 */
function validateMultiple(schemas) {
  return async (req, res, next) => {
    try {
      const errors = [];

      for (const [source, schema] of Object.entries(schemas)) {
        try {
          const validated = await schema.parseAsync(req[source]);
          req[source] = validated;

          req.validated = req.validated || {};
          req.validated[source] = true;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...transformZodErrors(error));
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          code: errors[0]?.code || 'VALIDATION_001',
          message: errors.length === 1 ? errors[0].message : 'Multiple validation errors',
          details: errors,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional validation (doesn't fail on empty)
 */
function validateOptional(schema, source = 'body') {
  return async (req, res, next) => {
    // Skip if source is empty
    if (!req[source] || Object.keys(req[source]).length === 0) {
      return next();
    }

    return validate(schema, source)(req, res, next);
  };
}

module.exports = {
  validate,
  validateMultiple,
  validateOptional
};
