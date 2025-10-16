import { describe, expect, it } from 'vitest';
import {
  createClientValidationError,
  formatFormErrorMessage,
  toFieldErrors
} from '../formValidation';
import { ErrorCode, ErrorType } from '../../types/errors';

describe('formValidation helpers', () => {
  it('creates a client validation error with shared shape', () => {
    const fieldErrors = { distance: 'Distance must be at least 0.01 km' };
    const formError = createClientValidationError(fieldErrors);

    expect(formError.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(formError.code).toBe(ErrorCode.FORM_001);
    expect(formError.fieldErrors).toEqual(fieldErrors);
    expect(formError.retryable).toBe(false);
    expect(formError.statusCode).toBe(0);
    expect(formatFormErrorMessage(formError)).toBe('Please review the highlighted inputs');
  });

  it('converts raw error records to field errors', () => {
    const rawErrors = {
      distance: 'Distance must be at least 0.01 km',
      duration: 'Duration must be at least 0.1 minutes'
    };

    expect(toFieldErrors(rawErrors)).toEqual(rawErrors);
  });
});
