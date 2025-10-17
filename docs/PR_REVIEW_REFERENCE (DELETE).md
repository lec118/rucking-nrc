# Codex Report & PR Review Criteria

## 1. Codex 리포트 / 변경 파일 목록

- docs/SECURITY_CONTROLS.md — 보안 통제 표준안 정리 (STRIDE·토큰 정책·CORS/CSRF·Rate limit·로드맵·체크리스트)
- docs/SECURITY_REPORT.md — 취약점 스캔 명령과 개선 전/후 요약
- src/context/AuthContext.jsx — 인메모리 Access Token, Silent Refresh, CSRF 토큰 발급 로직
- src/context/WorkoutContext.jsx — 인증/CSRF 헤더 적용 및 로깅 연계
- src/services/auth.js — 인증 API 래퍼 및 CSRF 토큰 엔드포인트 호출
- src/services/api.js — Bearer/CSRF 헤더 처리와 공통 fetch 핸들러
- server/index.js — 화이트리스트 CORS, CSRF 더블 서브밋 토큰, 인증 미들웨어, Zod 검증 파이프라인
- server_py/requirements.txt — pip-audit 추가
- package.json — 테스트/스캔 스크립트 및 커버리지 실행
- src/test/mocks/workouts.ts — 테스트 데이터 팩토리
- src/utils/__tests__/workoutStats.test.ts — 핵심 유틸 단위 테스트
- src/components/__tests__/AddWorkoutModal.test.tsx — 폼 플로우 통합 테스트
- src/services/__tests__/api.test.ts — API 서비스 단위 테스트
- src/context/__tests__/AuthContext.test.tsx — 인증 상태 관리 통합 테스트
- src/app/__tests__/ErrorBoundary.test.tsx — 에러 UI 스냅샷 테스트
- .github/workflows/ci.yml — GitHub Actions (캐시, 매트릭스 테스트, 보안 스캔, 실패 시 Slack 알림 옵션)

### 주요 완료사항
1. 테스트 전략에 맞춘 유닛/통합/스냅샷 테스트 추가
2. 인증/토큰/CSRF 흐름 및 보안 미들웨어 강화
3. npm·pip-audit 스크립트와 CI 파이프라인 구성
4. 보안 통제 및 개선 리포트 문서화

### 추가 실행 필요
- `npm install && pip install -r server_py/requirements.txt`
- `npm run test:ci` 및 `npm run scan` (네트워크 가능 환경)
- Slack 알림을 원하면 `SLACK_WEBHOOK_URL` 시크릿 등록

---

## 2. PR 리뷰 기준표

### 7.1 Automated Checks (Must Pass)
| Check              | Tool                    | Threshold             | Blocking |
|--------------------|-------------------------|-----------------------|----------|
| Unit Tests         | Vitest                  | 100 % pass            | Yes      |
| Test Coverage      | Vitest                  | ≥ 목표치(예:75 %)      | Yes      |
| Type Check         | TypeScript              | 0 errors              | Yes      |
| Linting            | ESLint                  | 0 errors              | Yes      |
| Security Lint      | eslint-plugin-security  | 0 errors              | Yes      |
| Dependency Audit   | npm audit               | 0 high/critical       | Yes      |
| Build              | Vite                    | Success               | Yes      |

### 7.2 Code Quality Review

#### Input Validation — ★★★★☆ (Required ≥4)
- [ ] 모든 사용자 입력 Zod 검증
- [ ] 검증 스키마에 명확한 에러 메시지
- [ ] 경계값/널/언디파인 처리
- [ ] 백엔드·프런트엔드 규칙 일치
- [ ] GPS 좌표 범위·현실성 검증

#### Error Handling — ★★★★☆ (Required ≥4)
- [ ] 비동기 로직 try/catch 처리
- [ ] 에러 타입(AppError 등) 일관성
- [ ] 사용자 친화 메시지
- [ ] 네트워크 재시도 로직
- [ ] React ErrorBoundary 적용
- [ ] 로깅/모니터링 연계

#### Security — ★★★★☆ (Required ≥5)
- [ ] 코드에 비밀번호·시크릿 없음
- [ ] 보호 라우트 인증 강제
- [ ] 리소스 권한 검사
- [ ] SQL Injection 방어(파라미터 바인딩)
- [ ] XSS 방어(입력 정제/출력 인코딩)
- [ ] CSRF 토큰 검증
- [ ] CORS 화이트리스트 구성

#### GPS Accuracy — ★★★★☆ (Required ≥4)
- [ ] 정확도 임계값 적용
- [ ] 속도 검증 로직
- [ ] 거리 점프 필터링
- [ ] 타임아웃 처리
- [ ] 권한 거부 플로우
- [ ] 저정확 모드 폴백

#### Testing — ★★★★☆ (Required ≥3)
- [ ] 신규 함수 단위 테스트
- [ ] 컴포넌트 통합 테스트
- [ ] 핵심 경로 E2E 테스트
- [ ] 엣지 케이스 검증
- [ ] 모킹·스텁 적절 사용
- [ ] 테스트 이름 명확

#### Performance — ★★★★☆ (Required ≥3)
- [ ] 불필요한 리렌더링 없음
- [ ] 대규모 리스트 가상화
- [ ] 이미지 최적화
- [ ] 코드 스플리팅
- [ ] 번들 크기 점검
- [ ] DB 쿼리 최적화

#### Code Style — ★★★★☆ (Required ≥4)
- [ ] 컨벤션 준수
- [ ] 함수는 작고 단일 책임
- [ ] 변수명 명확
- [ ] 주석은 “왜”를 설명
- [ ] 프로덕션 코드 console.log 금지
- [ ] TypeScript 타입 명확

### 7.3 Review Template
```markdown
## PR Review Checklist

### Automated Checks
- [ ] All tests passing
- [ ] Coverage ≥ 목표치
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] No security vulnerabilities
- [ ] Build successful

### Code Quality

**Input Validation**: ★★★★☆
- Comments: …

**Error Handling**: ★★★★☆
- Comments: …

**Security**: ★★★★☆
- Comments: …

**GPS Accuracy**: ★★★★☆
- Comments: …

**Testing**: ★★★★☆
- Comments: …

**Performance**: ★★★★☆
- Comments: …

**Code Style**: ★★★★☆
- Comments: …

### Overall Assessment
- [ ] Approve
- [ ] Request Changes
- [ ] Comment

### Additional Comments
…
```

### 7.4 Severity Levels
| Level    | Description                              | Action                  |
|----------|------------------------------------------|-------------------------|
| Critical | 보안 취약점, 데이터 손실 위험             | Must fix before merge   |
| Major    | 기능 오류, UX 저하                       | Should fix before merge |
| Minor    | 코드 품질/최적화 개선                    | Can address later       |
| Suggestion | 선택적 개선                            | Optional                |

### 7.5 Common Issues Guide
```typescript
// Missing validation
const workout = CreateWorkoutSchema.parse(req.body);
db.insert(workout);
```
```typescript
// Unhandled errors
try {
  const data = await fetchData();
} catch (error) {
  handleApiError(error);
}
```
```typescript
// Hardcoded credentials
const API_URL = import.meta.env.VITE_API_URL;
```
```typescript
// No GPS validation
if (isAcceptableAccuracy(accuracy) && isRealisticSpeed(dist, time)) {
  setDistance(prev => prev + dist);
}
```
