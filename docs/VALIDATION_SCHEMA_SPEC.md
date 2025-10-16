# Validation Schema Specification

## Overview

This document defines all validation schemas, error models, and error code mappings for the Good Ruck application.

---

## Forms and API Endpoints

### 1. Add Workout Form (Manual Entry)
**Location**: `src/components/AddWorkoutModal.jsx`
**API Endpoint**: `POST /api/workouts`

| Field | Type | Required | Min | Max | Step | Pattern | Default |
|-------|------|----------|-----|-----|------|---------|---------|
| `title` | string | No | 1 char | 100 chars | - | No HTML tags | "Manual Workout" |
| `distance` | number | Yes | 0.01 km | 1000 km | 0.1 | - | - |
| `duration` | number | Yes | 0.1 min | 1440 min | 0.1 | - | - |
| `weight` | number | No | 0 kg | 200 kg | 0.5 | - | null |
| `pace` | number | Auto-calculated | 1 min/km | 60 min/km | - | - | calculated |
| `date` | ISO8601 | Auto | 2020-01-01 | now+1 day | - | ISO format | now() |
| `route` | array | No | - | - | - | GPS coords | null |

### 2. Live Workout Setup Form
**Location**: `src/pages/LiveWorkout.jsx` (setup phase)
**API Endpoint**: `POST /api/workouts` (on finish)

| Field | Type | Required | Min | Max | Step | Pattern | Default |
|-------|------|----------|-----|-----|------|---------|---------|
| `title` | string | No | 1 char | 100 chars | - | No HTML tags | "GPS Tracked Workout" |
| `weight` | number | No | 0 kg | 200 kg | 0.5 | - | null |

### 3. Live Workout Submission (GPS)
**Location**: `src/pages/LiveWorkout.jsx` (handleStop)
**API Endpoint**: `POST /api/workouts`

| Field | Type | Required | Min | Max | Validation |
|-------|------|----------|-----|-----|------------|
| `title` | string | Yes | 1 char | 100 chars | XSS filter |
| `distance` | number | Yes | 0.01 km | 1000 km | GPS validated |
| `duration` | number | Yes | 0.1 min | 1440 min | Timer validated |
| `pace` | number | Yes | 1 min/km | 60 min/km | Calculated |
| `weight` | number | No | 0 kg | 200 kg | User input |
| `date` | ISO8601 | Yes | 2020-01-01 | now+1 day | ISO format |
| `route` | array | Yes | 2 points | 10,000 points | GPS coords |

### 4. GET /api/workouts (Query Parameters)

| Param | Type | Required | Min | Max | Default |
|-------|------|----------|-----|-----|---------|
| `limit` | integer | No | 1 | 100 | 50 |
| `offset` | integer | No | 0 | ∞ | 0 |
| `startDate` | ISO8601 | No | 2020-01-01 | now | null |
| `endDate` | ISO8601 | No | 2020-01-01 | now | null |

### 5. DELETE /api/workouts/:id

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `id` | integer | Yes | > 0, exists in DB |

---

## Validation Rules Details

### String Validation

```typescript
// Title validation
{
  type: 'string',
  minLength: 1,
  maxLength: 100,
  trim: true,
  sanitize: true, // Remove HTML tags
  pattern: /^[^<>]*$/, // No angle brackets
}
```

### Number Validation

```typescript
// Distance validation
{
  type: 'number',
  min: 0.01,
  max: 1000,
  precision: 2, // Max 2 decimal places
  coerce: true, // Auto-convert strings to numbers
}

// Duration validation
{
  type: 'number',
  min: 0.1,
  max: 1440, // 24 hours
  precision: 1,
  coerce: true,
}

// Weight validation
{
  type: 'number',
  min: 0,
  max: 200,
  precision: 1,
  coerce: true,
  optional: true,
  nullable: true,
}

// Pace validation
{
  type: 'number',
  min: 1,
  max: 60,
  precision: 1,
  refine: (pace, data) => {
    // Cross-field validation: pace should match duration/distance
    const calculated = data.duration / data.distance;
    return Math.abs(pace - calculated) < 0.5; // Allow 0.5 min/km tolerance
  }
}
```

### Date Validation

```typescript
// ISO8601 date validation
{
  type: 'string',
  format: 'datetime', // ISO 8601
  refine: (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const minDate = new Date('2020-01-01');
    const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day

    return date >= minDate && date <= maxDate && !isNaN(date.getTime());
  }
}
```

### GPS Route Validation

```typescript
// Route array validation
{
  type: 'array',
  items: {
    type: 'tuple',
    items: [
      { type: 'number', min: -90, max: 90 }, // latitude
      { type: 'number', min: -180, max: 180 } // longitude
    ]
  },
  minItems: 2,
  maxItems: 10000,
  optional: true,
  nullable: true,
  refine: (route) => {
    // Validate each coordinate pair
    return route.every(([lat, lon]) =>
      !isNaN(lat) && !isNaN(lon) &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180
    );
  }
}
```

---

## Error Code Mapping

### HTTP Status Codes → Error Types → UI Messages

| HTTP | Error Type | Error Code | Backend Message | Frontend UI Message (Korean) |
|------|------------|------------|-----------------|------------------------------|
| **400** | VALIDATION_ERROR | `VALIDATION_001` | "Invalid input: {field}" | "입력값을 확인해주세요: {field}" |
| **400** | VALIDATION_ERROR | `VALIDATION_002` | "Field required: {field}" | "{field}은(는) 필수 입력 항목입니다" |
| **400** | VALIDATION_ERROR | `VALIDATION_003` | "Value too small: {field} must be >= {min}" | "{field}은(는) {min} 이상이어야 합니다" |
| **400** | VALIDATION_ERROR | `VALIDATION_004` | "Value too large: {field} must be <= {max}" | "{field}은(는) {max} 이하여야 합니다" |
| **400** | VALIDATION_ERROR | `VALIDATION_005` | "Invalid format: {field}" | "{field} 형식이 올바르지 않습니다" |
| **400** | VALIDATION_ERROR | `VALIDATION_006` | "Invalid GPS coordinates" | "GPS 좌표가 유효하지 않습니다" |
| **400** | VALIDATION_ERROR | `VALIDATION_007` | "Route has too many points" | "경로 데이터가 너무 큽니다" |
| **400** | VALIDATION_ERROR | `VALIDATION_008` | "Invalid date range" | "날짜 범위가 유효하지 않습니다" |
| **400** | VALIDATION_ERROR | `VALIDATION_009` | "Unrealistic pace value" | "페이스 값이 비현실적입니다" |
| **400** | VALIDATION_ERROR | `VALIDATION_010` | "Distance and duration mismatch" | "거리와 시간이 일치하지 않습니다" |
| **401** | AUTHENTICATION_ERROR | `AUTH_001` | "No token provided" | "로그인이 필요합니다" |
| **401** | AUTHENTICATION_ERROR | `AUTH_002` | "Invalid token" | "인증 정보가 올바르지 않습니다" |
| **401** | AUTHENTICATION_ERROR | `AUTH_003` | "Token expired" | "세션이 만료되었습니다. 다시 로그인해주세요" |
| **401** | AUTHENTICATION_ERROR | `AUTH_004` | "Invalid credentials" | "이메일 또는 비밀번호가 올바르지 않습니다" |
| **403** | AUTHORIZATION_ERROR | `AUTHZ_001` | "Access denied" | "접근 권한이 없습니다" |
| **403** | AUTHORIZATION_ERROR | `AUTHZ_002` | "Not resource owner" | "이 데이터에 접근할 권한이 없습니다" |
| **404** | NOT_FOUND | `NOT_FOUND_001` | "Workout not found" | "운동 기록을 찾을 수 없습니다" |
| **404** | NOT_FOUND | `NOT_FOUND_002` | "User not found" | "사용자를 찾을 수 없습니다" |
| **404** | NOT_FOUND | `NOT_FOUND_003` | "Resource not found" | "요청한 데이터를 찾을 수 없습니다" |
| **409** | CONFLICT | `CONFLICT_001` | "Duplicate entry" | "이미 존재하는 데이터입니다" |
| **409** | CONFLICT | `CONFLICT_002` | "Email already exists" | "이미 사용 중인 이메일입니다" |
| **413** | PAYLOAD_TOO_LARGE | `PAYLOAD_001` | "Request body too large" | "전송 데이터가 너무 큽니다" |
| **413** | PAYLOAD_TOO_LARGE | `PAYLOAD_002` | "Route data too large" | "GPS 경로 데이터가 너무 큽니다" |
| **429** | RATE_LIMIT_EXCEEDED | `RATE_LIMIT_001` | "Too many requests" | "요청이 너무 많습니다. 잠시 후 다시 시도해주세요" |
| **429** | RATE_LIMIT_EXCEEDED | `RATE_LIMIT_002` | "Too many login attempts" | "로그인 시도 횟수를 초과했습니다. {minutes}분 후 다시 시도해주세요" |
| **500** | INTERNAL_ERROR | `INTERNAL_001` | "Internal server error" | "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요" |
| **500** | DATABASE_ERROR | `DB_001` | "Database error" | "데이터 저장 중 오류가 발생했습니다" |
| **500** | DATABASE_ERROR | `DB_002` | "Database connection failed" | "데이터베이스 연결에 실패했습니다" |
| **503** | SERVICE_UNAVAILABLE | `SERVICE_001` | "Service temporarily unavailable" | "서비스를 일시적으로 사용할 수 없습니다" |

### Client-Side Errors (No HTTP)

| Error Type | Error Code | Scenario | UI Message |
|------------|------------|----------|------------|
| GPS_PERMISSION_DENIED | `GPS_001` | User denies GPS permission | "GPS 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요" |
| GPS_UNAVAILABLE | `GPS_002` | GPS not supported | "이 기기에서는 GPS를 사용할 수 없습니다" |
| GPS_TIMEOUT | `GPS_003` | GPS signal timeout | "GPS 신호를 찾을 수 없습니다. 실외로 이동하거나 잠시 후 다시 시도해주세요" |
| GPS_ACCURACY_LOW | `GPS_004` | GPS accuracy > threshold | "GPS 정확도가 낮습니다. 실외로 이동하거나 Wi-Fi를 켜주세요" |
| NETWORK_ERROR | `NETWORK_001` | Fetch failed (no response) | "네트워크 연결을 확인해주세요" |
| NETWORK_ERROR | `NETWORK_002` | Request timeout | "요청 시간이 초과되었습니다. 다시 시도해주세요" |
| FORM_ERROR | `FORM_001` | Form validation failed | "입력값을 확인해주세요" |
| FORM_ERROR | `FORM_002` | Required field empty | "필수 항목을 입력해주세요" |

---

## Client-Server Validation Responsibility

### Frontend Responsibility (Client-Side)

**Purpose**: User experience, immediate feedback, reduce server load

✅ **Must Validate**:
- Field type (string, number, date)
- Required fields
- Min/max length (strings)
- Min/max value (numbers)
- Step increment (numbers)
- Basic format (email, date, etc.)
- Real-time validation (on blur)
- Cross-field validation (pace ≈ duration/distance)

✅ **Should Provide**:
- Inline error messages (per field)
- Form-level error summary
- Disabled submit button if invalid
- Clear error messages in Korean

❌ **Should NOT Rely On**:
- Client-side validation alone (can be bypassed)
- Security-critical validation (XSS, SQL injection)
- Business logic validation (duplicates, authorization)

### Backend Responsibility (Server-Side)

**Purpose**: Security, data integrity, business logic

✅ **Must Validate**:
- All frontend validations (never trust client)
- Authorization (user owns resource)
- Business logic (duplicates, constraints)
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize input)
- Rate limiting (prevent abuse)
- Payload size (prevent DoS)
- GPS data realism (speed, distance checks)

✅ **Should Provide**:
- Structured error responses
- Error codes for client mapping
- Detailed logs (with PII masking)
- Generic user messages (no info disclosure)

❌ **Should NOT**:
- Return stack traces to client
- Expose database structure in errors
- Log sensitive data (passwords, tokens)
- Trust client-provided IDs without verification

### Validation Overlap Strategy

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (UX)                    │
│  • Type checking                                    │
│  • Required fields                                  │
│  • Min/max values                                   │
│  • Format validation                                │
│  • Real-time feedback                               │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ API Request
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│               Backend (Security)                    │
│  • Re-validate ALL frontend rules                  │
│  • Authorization checks                             │
│  • Business logic validation                        │
│  • SQL injection prevention                         │
│  • XSS sanitization                                 │
│  • Rate limiting                                    │
│  • Payload size limits                              │
│  • GPS realism checks                               │
└─────────────────────────────────────────────────────┘
```

**Key Principle**: **Defense in Depth**
- Frontend validates for UX
- Backend validates for security
- Both validate the same rules independently
- Backend is the source of truth

---

## Error Response Format

### Backend Error Response Structure

```json
{
  "error": "VALIDATION_ERROR",
  "code": "VALIDATION_003",
  "message": "Validation failed",
  "details": [
    {
      "field": "distance",
      "message": "Value too small: distance must be >= 0.01",
      "code": "VALIDATION_003",
      "constraint": {
        "type": "min",
        "value": 0.01
      }
    },
    {
      "field": "title",
      "message": "Field required: title",
      "code": "VALIDATION_002"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/workouts",
  "method": "POST"
}
```

### Frontend Error State Structure

```typescript
{
  type: 'VALIDATION_ERROR',
  code: 'VALIDATION_003',
  message: '입력값을 확인해주세요',
  fieldErrors: {
    distance: '거리는 0.01 이상이어야 합니다',
    title: '제목은 필수 입력 항목입니다'
  },
  retryable: false,
  statusCode: 400
}
```

---

## Field-Specific Error Messages

### Distance Field

| Scenario | Error Code | Backend | Frontend (Korean) |
|----------|------------|---------|-------------------|
| Empty (required) | VALIDATION_002 | "Field required: distance" | "거리는 필수 입력 항목입니다" |
| Too small (< 0.01) | VALIDATION_003 | "Value too small: distance must be >= 0.01" | "거리는 0.01km 이상이어야 합니다" |
| Too large (> 1000) | VALIDATION_004 | "Value too large: distance must be <= 1000" | "거리는 1000km 이하여야 합니다" |
| Not a number | VALIDATION_001 | "Invalid input: distance must be a number" | "거리는 숫자로 입력해주세요" |
| Negative | VALIDATION_003 | "Value too small: distance must be >= 0.01" | "거리는 양수여야 합니다" |

### Duration Field

| Scenario | Error Code | Backend | Frontend (Korean) |
|----------|------------|---------|-------------------|
| Empty (required) | VALIDATION_002 | "Field required: duration" | "시간은 필수 입력 항목입니다" |
| Too small (< 0.1) | VALIDATION_003 | "Value too small: duration must be >= 0.1" | "시간은 0.1분 이상이어야 합니다" |
| Too large (> 1440) | VALIDATION_004 | "Value too large: duration must be <= 1440" | "시간은 24시간 이하여야 합니다" |
| Not a number | VALIDATION_001 | "Invalid input: duration must be a number" | "시간은 숫자로 입력해주세요" |

### Weight Field

| Scenario | Error Code | Backend | Frontend (Korean) |
|----------|------------|---------|-------------------|
| Too large (> 200) | VALIDATION_004 | "Value too large: weight must be <= 200" | "무게는 200kg 이하여야 합니다" |
| Negative | VALIDATION_003 | "Value too small: weight must be >= 0" | "무게는 0 이상이어야 합니다" |
| Not a number | VALIDATION_001 | "Invalid input: weight must be a number" | "무게는 숫자로 입력해주세요" |

### Title Field

| Scenario | Error Code | Backend | Frontend (Korean) |
|----------|------------|---------|-------------------|
| Too long (> 100) | VALIDATION_004 | "Value too large: title must be <= 100 chars" | "제목은 100자 이하여야 합니다" |
| Contains HTML | VALIDATION_005 | "Invalid format: title contains forbidden characters" | "제목에 특수문자를 사용할 수 없습니다" |

### Route Field

| Scenario | Error Code | Backend | Frontend (Korean) |
|----------|------------|---------|-------------------|
| Too few points (< 2) | VALIDATION_003 | "Value too small: route must have at least 2 points" | "경로는 최소 2개 지점 이상이어야 합니다" |
| Too many points (> 10k) | VALIDATION_007 | "Route has too many points (max 10,000)" | "경로 데이터가 너무 큽니다 (최대 10,000개)" |
| Invalid coordinates | VALIDATION_006 | "Invalid GPS coordinates" | "GPS 좌표가 유효하지 않습니다" |
| Not an array | VALIDATION_001 | "Invalid input: route must be an array" | "경로 데이터 형식이 올바르지 않습니다" |

---

## Example Validation Scenarios

### Scenario 1: Valid Manual Workout

**Request**:
```json
POST /api/workouts
{
  "title": "Morning Ruck",
  "distance": 5.2,
  "duration": 45,
  "weight": 15,
  "date": "2024-01-15T06:30:00.000Z"
}
```

**Response**: ✅ `201 Created`
```json
{
  "id": 123,
  "title": "Morning Ruck",
  "distance": 5.2,
  "duration": 45,
  "pace": 8.7,
  "weight": 15,
  "date": "2024-01-15T06:30:00.000Z",
  "route": null,
  "created_at": "2024-01-15T06:35:00.000Z"
}
```

### Scenario 2: Invalid Distance (Too Small)

**Request**:
```json
POST /api/workouts
{
  "title": "Test",
  "distance": 0.005,
  "duration": 10
}
```

**Response**: ❌ `400 Bad Request`
```json
{
  "error": "VALIDATION_ERROR",
  "code": "VALIDATION_003",
  "message": "Validation failed",
  "details": [
    {
      "field": "distance",
      "message": "Value too small: distance must be >= 0.01",
      "code": "VALIDATION_003",
      "constraint": {
        "type": "min",
        "value": 0.01
      }
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Frontend displays**: "거리는 0.01km 이상이어야 합니다"

### Scenario 3: Multiple Validation Errors

**Request**:
```json
POST /api/workouts
{
  "title": "",
  "distance": -5,
  "duration": 2000,
  "weight": 250
}
```

**Response**: ❌ `400 Bad Request`
```json
{
  "error": "VALIDATION_ERROR",
  "code": "VALIDATION_001",
  "message": "Multiple validation errors",
  "details": [
    {
      "field": "title",
      "message": "Field required: title",
      "code": "VALIDATION_002"
    },
    {
      "field": "distance",
      "message": "Value too small: distance must be >= 0.01",
      "code": "VALIDATION_003"
    },
    {
      "field": "duration",
      "message": "Value too large: duration must be <= 1440",
      "code": "VALIDATION_004"
    },
    {
      "field": "weight",
      "message": "Value too large: weight must be <= 200",
      "code": "VALIDATION_004"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Frontend displays**:
- "제목은 필수 입력 항목입니다"
- "거리는 0.01km 이상이어야 합니다"
- "시간은 24시간 이하여야 합니다"
- "무게는 200kg 이하여야 합니다"

---

## File Structure

```
src/
├── schemas/
│   ├── workout.schema.ts          # Frontend Zod schemas
│   ├── gps.schema.ts               # GPS validation schemas
│   └── common.schema.ts            # Shared schemas
├── types/
│   ├── errors.ts                   # Error type definitions
│   ├── validation.ts               # Validation types
│   └── api.ts                      # API response types
└── utils/
    ├── validation.ts               # Validation utilities
    └── errorMessages.ts            # Error message mapping

server/
├── src/
│   ├── schemas/
│   │   ├── workout.schema.js      # Backend Zod schemas
│   │   ├── gps.schema.js          # GPS validation
│   │   └── common.schema.js       # Shared schemas
│   ├── types/
│   │   ├── errors.js              # Error classes
│   │   └── validation.js          # Validation types
│   ├── middleware/
│   │   ├── validate.js            # Validation middleware
│   │   └── errorHandler.js        # Error handling
│   └── utils/
│       └── errorCodes.js          # Error code constants
```

---

**End of Specification**
