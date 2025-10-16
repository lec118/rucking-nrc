import { ErrorType, ErrorCode, ERROR_MESSAGES, FormErrorState, FieldError } from '../types/errors';

export function createClientValidationError(fieldErrors: FieldError): FormErrorState {
  return {
    type: ErrorType.VALIDATION_ERROR,
    code: ErrorCode.FORM_001,
    message: ERROR_MESSAGES[ErrorCode.FORM_001],
    fieldErrors,
    retryable: false,
    statusCode: 0
  };
}

export function formatFormErrorMessage(formError?: FormErrorState | null) {
  if (!formError) {
    return null;
  }

  return formError.message || ERROR_MESSAGES[formError.code] || ERROR_MESSAGES[ErrorCode.FORM_001];
}

export function toFieldErrors(errors: Record<string, string>): FieldError {
  return Object.keys(errors).reduce<FieldError>((acc, key) => {
    acc[key] = errors[key];
    return acc;
  }, {});
}
