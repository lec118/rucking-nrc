# 검증 스키마 및 규칙 요약

빠른 참조를 위한 검증 시스템 핵심 요약

---

## 📋 필드별 검증 규칙

### 운동 데이터 필드

| 필드 | 타입 | 필수 | 최소값 | 최대값 | 소수점 | 기본값 | 특수 규칙 |
|------|------|------|--------|--------|--------|--------|----------|
| **title** | string | ❌ | 1자 | 100자 | - | "Manual Workout" | HTML 태그 제거, `<>` 금지 |
| **distance** | number | ✅ | 0.01 km | 1000 km | 2자리 | - | 페이스와 교차 검증 |
| **duration** | number | ✅ | 0.1 min | 1440 min | 1자리 | - | 페이스와 교차 검증 |
| **pace** | number | ❌ | 1 min/km | 60 min/km | 1자리 | 계산값 | duration/distance와 ±0.5 오차 허용 |
| **weight** | number | ❌ | 0 kg | 200 kg | 1자리 | null | 음수 불가 |
| **date** | ISO8601 | ❌ | 2020-01-01 | 내일 | - | now() | ISO 8601 형식 필수 |
| **route** | array | ❌ | 2개 | 10,000개 | - | null | GPS 좌표 배열, 속도 검증 |

### GPS 좌표 검증

| 필드 | 타입 | 최소값 | 최대값 | 검증 |
|------|------|--------|--------|------|
| **latitude** | number | -90° | 90° | NaN 체크, 범위 검증 |
| **longitude** | number | -180° | 180° | NaN 체크, 범위 검증 |

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 최소값 | 최대값 | 기본값 |
|----------|------|------|--------|--------|--------|
| **limit** | integer | ❌ | 1 | 100 | 50 |
| **offset** | integer | ❌ | 0 | ∞ | 0 |
| **startDate** | ISO8601 | ❌ | - | - | null |
| **endDate** | ISO8601 | ❌ | - | - | null |

---

## 🔢 숫자 검증 상세

### Distance (거리)
```
✅ 유효: 0.01, 5.5, 10.25, 999.99
❌ 무효: 0, -5, 0.001 (너무 작음), 1001 (너무 큼), 5.123 (소수점 3자리)
```

### Duration (시간)
```
✅ 유효: 0.1, 30.5, 1440
❌ 무효: 0, -10, 0.05 (너무 작음), 1441 (너무 큼), 30.25 (소수점 2자리)
```

### Pace (페이스)
```
✅ 유효: 5.5, 10.0, 59.9
❌ 무효: 0.5 (너무 빠름), 61 (너무 느림)

계산 검증: |pace - (duration/distance)| ≤ 0.5
```

### Weight (무게)
```
✅ 유효: 0, 10.5, 200
❌ 무효: -1, 200.1
```

---

## 📝 문자열 검증 상세

### Title (제목)
```typescript
// 변환 과정
"  <script>Test</script>  "
→ trim: "<script>Test</script>"
→ HTML 제거: "Test"
→ 최종: "Test"

// 유효한 예시
✅ "Morning Ruck"
✅ "오후 운동"
✅ "Run #123"

// 무효한 예시
❌ "" (빈 문자열)
❌ "<div>Test</div>" (HTML)
❌ "A" * 101 (101자 이상)
```

---

## 📅 날짜 검증

### Date (날짜)
```typescript
// ISO 8601 형식 필수
✅ "2024-01-15T10:30:00.000Z"
✅ "2024-01-15T10:30:00+09:00"

❌ "2024-01-15" (시간 없음)
❌ "15/01/2024" (잘못된 형식)
❌ "2019-12-31T00:00:00Z" (2020년 이전)
❌ "2025-01-20T00:00:00Z" (내일 이후)

// 범위 검증
최소: 2020-01-01 00:00:00
최대: 현재 + 1일
```

---

## 🌍 GPS 검증

### Route (경로)
```typescript
// 배열 형식
[
  [37.5665, 126.9780],  // [위도, 경도]
  [37.5675, 126.9790],
  [37.5685, 126.9800]
]

// 검증 규칙
✅ 최소 2개 포인트
✅ 최대 10,000개 포인트
✅ 각 좌표 범위 내
✅ 연속 포인트 간 거리 < 1° (~111km)

// 무효한 예시
❌ [[37.5, 126.9]] (1개만)
❌ [[95, 200]] (범위 초과)
❌ [[37.5, 126.9], [40.5, 130.9]] (점프 너무 큼)
```

### GPS 속도 검증
```typescript
// 연속된 두 포인트 간
const distance = calculateDistance(point1, point2); // km
const timeDelta = (point2.timestamp - point1.timestamp) / 1000; // 초
const speedKmh = (distance / timeDelta) * 3600;

✅ speedKmh ≤ 30 (현실적인 달리기 속도)
❌ speedKmh > 30 (GPS 점프 의심)
```

---

## ⚠️ 에러 코드 매핑

### 검증 에러 (400)

| 코드 | HTTP | 시나리오 | 백엔드 메시지 | 프론트엔드 메시지 |
|------|------|----------|---------------|-------------------|
| **VALIDATION_001** | 400 | 잘못된 타입 | "Invalid input: {field}" | "입력값이 올바르지 않습니다" |
| **VALIDATION_002** | 400 | 필수 필드 누락 | "Field required: {field}" | "{field}은(는) 필수 입력 항목입니다" |
| **VALIDATION_003** | 400 | 최소값 미만 | "Value too small" | "{field}은(는) {min} 이상이어야 합니다" |
| **VALIDATION_004** | 400 | 최대값 초과 | "Value too large" | "{field}은(는) {max} 이하여야 합니다" |
| **VALIDATION_005** | 400 | 형식 오류 | "Invalid format" | "{field} 형식이 올바르지 않습니다" |
| **VALIDATION_006** | 400 | GPS 좌표 오류 | "Invalid GPS coordinates" | "GPS 좌표가 유효하지 않습니다" |
| **VALIDATION_007** | 400 | 경로 너무 큼 | "Route has too many points" | "경로 데이터가 너무 큽니다" |
| **VALIDATION_008** | 400 | 날짜 범위 오류 | "Invalid date range" | "날짜 범위가 유효하지 않습니다" |
| **VALIDATION_009** | 400 | 비현실적 페이스 | "Unrealistic pace value" | "페이스 값이 비현실적입니다" |
| **VALIDATION_010** | 400 | 거리/시간 불일치 | "Distance and duration mismatch" | "거리와 시간이 일치하지 않습니다" |

### GPS 에러 (클라이언트)

| 코드 | 시나리오 | 메시지 |
|------|----------|--------|
| **GPS_001** | 권한 거부 | "GPS 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요" |
| **GPS_002** | GPS 미지원 | "이 기기에서는 GPS를 사용할 수 없습니다" |
| **GPS_003** | 타임아웃 | "GPS 신호를 찾을 수 없습니다. 실외로 이동하거나 잠시 후 다시 시도해주세요" |
| **GPS_004** | 정확도 낮음 | "GPS 정확도가 낮습니다. 실외로 이동하거나 Wi-Fi를 켜주세요" |

---

## 🔄 교차 검증 규칙

### 1. Pace 일관성 검증
```typescript
// 페이스는 duration/distance와 일치해야 함
const calculatedPace = duration / distance;
const providedPace = pace;

✅ Math.abs(providedPace - calculatedPace) ≤ 0.5
❌ 차이가 0.5 초과 → VALIDATION_010
```

### 2. 날짜 범위 검증
```typescript
// startDate가 endDate보다 앞서야 함
if (startDate && endDate) {
  ✅ new Date(startDate) ≤ new Date(endDate)
  ❌ startDate > endDate → VALIDATION_008
}
```

### 3. 현실성 검증
```typescript
// 거리와 시간으로 계산한 페이스가 현실적이어야 함
const pace = duration / distance;

✅ 1 ≤ pace ≤ 60
❌ pace < 1 (너무 빠름) → VALIDATION_009
❌ pace > 60 (너무 느림) → VALIDATION_009
```

---

## 🛡️ 보안 검증

### XSS 방지
```typescript
// Title 필드 sanitization
input: "<script>alert('xss')</script>Test"
→ HTML 태그 제거
→ output: "Test"

// Regex 검증
✅ /^[^<>]*$/.test(title) // < > 없음
❌ title.includes('<') || title.includes('>')
```

### SQL Injection 방지
```javascript
// ❌ 나쁜 예 (취약)
db.query(`SELECT * FROM workouts WHERE id = ${req.params.id}`);

// ✅ 좋은 예 (안전)
db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
```

---

## 📊 검증 책임 분리

### Frontend 책임 (UX 중심)
```
✅ 해야 할 것:
- 필드 타입 검증 (string, number, date)
- 필수 필드 검증
- 최소/최대값 검증
- 기본 형식 검증 (이메일, 날짜 등)
- 실시간 피드백 (onBlur)
- 교차 필드 검증 (pace 일관성)

❌ 하지 말아야 할 것:
- 보안 검증만 믿기 (우회 가능)
- 비즈니스 로직 검증 (서버에서)
- 중복 데이터 체크 (서버에서)
```

### Backend 책임 (보안 중심)
```
✅ 해야 할 것:
- Frontend 모든 검증 재실행 (신뢰하지 않음)
- 권한 검증 (Authorization)
- 비즈니스 로직 검증 (중복, 제약)
- SQL Injection 방지
- XSS 방지 (입력 sanitization)
- Rate Limiting
- Payload 크기 제한
- GPS 현실성 검증 (속도, 거리)

❌ 하지 말아야 할 것:
- 클라이언트 검증만 믿기
- 스택 트레이스 노출
- 데이터베이스 구조 노출
- 민감 데이터 로깅 (비밀번호, 토큰)
```

---

## 🔧 사용 예시

### Frontend (React Hook Form + Zod)
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ManualWorkoutSchema } from '../schemas/workout.schema';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(ManualWorkoutSchema),
  mode: 'onBlur'
});

const onSubmit = async (data) => {
  try {
    await workoutAPI.createWorkout(data);
  } catch (error) {
    // 에러 처리
  }
};
```

### Backend (Express + Zod)
```javascript
const { validate } = require('./middleware/validate');
const { CreateWorkoutSchema } = require('./schemas/workout.schema');

app.post('/api/workouts',
  validate(CreateWorkoutSchema, 'body'),
  async (req, res) => {
    // req.body는 이미 검증되고 변환됨
    const workout = req.body;
    // ...
  }
);
```

---

## 📦 파일 위치

### Frontend
```
src/
├── types/errors.ts              # 에러 타입 정의 (46개 에러 코드)
├── schemas/workout.schema.ts    # Zod 스키마 (5개 스키마)
└── utils/errorHandler.ts        # 에러 처리 유틸리티
```

### Backend
```
server/src/
├── types/errors.js              # 에러 클래스 (6개 클래스)
├── schemas/workout.schema.js    # Zod 스키마 (4개 스키마)
├── middleware/
│   ├── validate.js              # 검증 미들웨어
│   └── errorHandler.js          # 에러 핸들러
```

---

## 🎯 핵심 원칙

### 1. Defense in Depth (다층 방어)
```
Frontend 검증 (UX)
    ↓
Backend 검증 (보안)
    ↓
Database 제약 (무결성)
```

### 2. Never Trust Client (클라이언트 신뢰 금지)
```
모든 입력을 의심
→ 타입 검증
→ 범위 검증
→ 형식 검증
→ 비즈니스 로직 검증
→ 권한 검증
```

### 3. Fail Fast (빠른 실패)
```
잘못된 입력 즉시 거부
→ 리소스 낭비 방지
→ 명확한 에러 메시지
→ 사용자 경험 개선
```

### 4. Clear Error Messages (명확한 에러 메시지)
```
개발 환경: 상세한 기술 정보
프로덕션: 사용자 친화적 메시지 (한글)
로그: 민감 정보 마스킹
```

---

## ✅ 검증 체크리스트

### 새 필드 추가 시
- [ ] Frontend Zod 스키마 추가
- [ ] Backend Zod 스키마 추가 (동일 규칙)
- [ ] 에러 코드 정의 (errors.ts)
- [ ] 한글 에러 메시지 추가
- [ ] 단위 테스트 작성
- [ ] API 문서 업데이트

### 새 API 엔드포인트 추가 시
- [ ] 요청 body/query/params 스키마 정의
- [ ] validate 미들웨어 적용
- [ ] 권한 검증 미들웨어 적용
- [ ] 에러 핸들링 추가
- [ ] 민감 데이터 로깅 방지
- [ ] 통합 테스트 작성

---

## 📚 참고 문서

- [VALIDATION_SCHEMA_SPEC.md](VALIDATION_SCHEMA_SPEC.md) - 전체 스펙
- [VALIDATION_USAGE_EXAMPLES.md](VALIDATION_USAGE_EXAMPLES.md) - 사용 예제
- [security-ADR.md](security-ADR.md) - 보안 정책

---

**마지막 업데이트**: 2024-01-15
