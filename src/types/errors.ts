export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GPS_PERMISSION_DENIED = 'GPS_PERMISSION_DENIED',
  GPS_UNAVAILABLE = 'GPS_UNAVAILABLE',
  GPS_TIMEOUT = 'GPS_TIMEOUT',
  GPS_ACCURACY_LOW = 'GPS_ACCURACY_LOW',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FORM_ERROR = 'FORM_ERROR'
}

export enum ErrorCode {
  VALIDATION_001 = 'VALIDATION_001',
  VALIDATION_002 = 'VALIDATION_002',
  VALIDATION_003 = 'VALIDATION_003',
  VALIDATION_004 = 'VALIDATION_004',
  VALIDATION_005 = 'VALIDATION_005',
  VALIDATION_006 = 'VALIDATION_006',
  VALIDATION_007 = 'VALIDATION_007',
  VALIDATION_008 = 'VALIDATION_008',
  VALIDATION_009 = 'VALIDATION_009',
  VALIDATION_010 = 'VALIDATION_010',

  AUTH_001 = 'AUTH_001',
  AUTH_002 = 'AUTH_002',
  AUTH_003 = 'AUTH_003',
  AUTH_004 = 'AUTH_004',

  AUTHZ_001 = 'AUTHZ_001',
  AUTHZ_002 = 'AUTHZ_002',

  NOT_FOUND_001 = 'NOT_FOUND_001',
  NOT_FOUND_002 = 'NOT_FOUND_002',
  NOT_FOUND_003 = 'NOT_FOUND_003',

  CONFLICT_001 = 'CONFLICT_001',
  CONFLICT_002 = 'CONFLICT_002',

  PAYLOAD_001 = 'PAYLOAD_001',
  PAYLOAD_002 = 'PAYLOAD_002',

  RATE_LIMIT_001 = 'RATE_LIMIT_001',
  RATE_LIMIT_002 = 'RATE_LIMIT_002',

  INTERNAL_001 = 'INTERNAL_001',
  DB_001 = 'DB_001',
  DB_002 = 'DB_002',
  SERVICE_001 = 'SERVICE_001',

  GPS_001 = 'GPS_001',
  GPS_002 = 'GPS_002',
  GPS_003 = 'GPS_003',
  GPS_004 = 'GPS_004',

  NETWORK_001 = 'NETWORK_001',
  NETWORK_002 = 'NETWORK_002',

  FORM_001 = 'FORM_001',
  FORM_002 = 'FORM_002'
}

export interface ValidationError {
  field: string;
  message: string;
  code: ErrorCode;
  constraint?: {
    type: string;
    value?: unknown;
  };
}

export interface AppError {
  type: ErrorType;
  code: ErrorCode;
  message: string;
  details?: ValidationError[];
  statusCode?: number;
  retryable: boolean;
  timestamp?: string;
  path?: string;
  method?: string;
}

export interface FieldError {
  [fieldName: string]: string;
}

export interface FormErrorState {
  type: ErrorType;
  code: ErrorCode;
  message: string;
  fieldErrors: FieldError;
  retryable: boolean;
  statusCode?: number;
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_001]: '입력값이 올바르지 않습니다.',
  [ErrorCode.VALIDATION_002]: '필수 입력 항목입니다.',
  [ErrorCode.VALIDATION_003]: '값이 최소 허용 범위보다 작습니다.',
  [ErrorCode.VALIDATION_004]: '값이 최대 허용 범위를 초과했습니다.',
  [ErrorCode.VALIDATION_005]: '형식이 올바르지 않습니다.',
  [ErrorCode.VALIDATION_006]: 'GPS 좌표가 올바르지 않습니다.',
  [ErrorCode.VALIDATION_007]: '경로 데이터가 너무 큽니다.',
  [ErrorCode.VALIDATION_008]: '날짜 범위가 올바르지 않습니다.',
  [ErrorCode.VALIDATION_009]: '페이스 값이 비현실적입니다.',
  [ErrorCode.VALIDATION_010]: '거리와 시간이 서로 맞지 않습니다.',

  [ErrorCode.AUTH_001]: '로그인이 필요합니다.',
  [ErrorCode.AUTH_002]: '인증 정보가 올바르지 않습니다.',
  [ErrorCode.AUTH_003]: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  [ErrorCode.AUTH_004]: '이메일 또는 비밀번호가 올바르지 않습니다.',

  [ErrorCode.AUTHZ_001]: '접근 권한이 없습니다.',
  [ErrorCode.AUTHZ_002]: '리소스 소유자만 접근할 수 있습니다.',

  [ErrorCode.NOT_FOUND_001]: '운동 기록을 찾을 수 없습니다.',
  [ErrorCode.NOT_FOUND_002]: '사용자를 찾을 수 없습니다.',
  [ErrorCode.NOT_FOUND_003]: '요청한 리소스를 찾을 수 없습니다.',

  [ErrorCode.CONFLICT_001]: '이미 존재하는 값입니다.',
  [ErrorCode.CONFLICT_002]: '이미 사용 중인 이메일입니다.',

  [ErrorCode.PAYLOAD_001]: '요청 데이터가 너무 큽니다.',
  [ErrorCode.PAYLOAD_002]: '경로 데이터가 너무 큽니다.',

  [ErrorCode.RATE_LIMIT_001]: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  [ErrorCode.RATE_LIMIT_002]: '로그인 시도 횟수가 초과되었습니다. 잠시 후 다시 시도해 주세요.',

  [ErrorCode.INTERNAL_001]: '예상치 못한 서버 오류가 발생했습니다.',
  [ErrorCode.DB_001]: '데이터베이스 오류가 발생했습니다.',
  [ErrorCode.DB_002]: '데이터베이스 연결에 실패했습니다.',
  [ErrorCode.SERVICE_001]: '서비스를 일시적으로 이용할 수 없습니다.',

  [ErrorCode.GPS_001]: 'GPS 권한이 거부되었습니다. 설정에서 권한을 허용해 주세요.',
  [ErrorCode.GPS_002]: '현재 기기에서 GPS를 사용할 수 없습니다.',
  [ErrorCode.GPS_003]: 'GPS 신호를 찾을 수 없습니다. 야외에서 다시 시도해 주세요.',
  [ErrorCode.GPS_004]: 'GPS 정확도가 낮습니다. 신호 상태를 개선해 주세요.',

  [ErrorCode.NETWORK_001]: '네트워크 연결을 확인해 주세요.',
  [ErrorCode.NETWORK_002]: '요청 시간이 초과되었습니다. 다시 시도해 주세요.',

  [ErrorCode.FORM_001]: '입력 항목을 다시 확인해 주세요.',
  [ErrorCode.FORM_002]: '필수 입력 항목이 비어 있습니다.'
};

export const FIELD_ERROR_MESSAGES: Record<string, Record<string, string>> = {
  distance: {
    required: '거리를 입력해 주세요.',
    min: '거리는 최소 0.01km 이상이어야 합니다.',
    max: '거리는 최대 1000km 이하로 입력해 주세요.',
    type: '거리는 숫자로 입력해 주세요.',
    positive: '거리는 양수여야 합니다.'
  },
  duration: {
    required: '시간을 입력해 주세요.',
    min: '시간은 최소 0.1분 이상이어야 합니다.',
    max: '시간은 최대 1440분 이하로 입력해 주세요.',
    type: '시간은 숫자로 입력해 주세요.'
  },
  weight: {
    min: '무게는 0 이상이어야 합니다.',
    max: '무게는 200kg 이하로 입력해 주세요.',
    type: '무게는 숫자로 입력해 주세요.'
  },
  title: {
    required: '제목을 입력해 주세요.',
    max: '제목은 최대 100자까지 입력할 수 있습니다.',
    invalid: '제목에 특수문자 <, > 는 사용할 수 없습니다.'
  },
  route: {
    min: '경로는 최소 2개의 포인트가 필요합니다.',
    max: '경로 포인트는 최대 10,000개까지 허용됩니다.',
    invalid: '경로에 올바르지 않은 GPS 좌표가 포함되어 있습니다.',
    type: '경로는 GPS 좌표 배열로 전달해야 합니다.'
  },
  pace: {
    min: '페이스는 최소 1분/km 이상이어야 합니다.',
    max: '페이스는 최대 60분/km 이하로 입력해 주세요.',
    unrealistic: '페이스 값이 비현실적입니다.'
  },
  date: {
    required: '날짜를 입력해 주세요.',
    invalid: '날짜 형식이 올바르지 않습니다.',
    past: '날짜는 2020-01-01 이후여야 합니다.',
    future: '날짜는 미래 날짜가 될 수 없습니다.'
  }
};
