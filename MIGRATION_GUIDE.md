# 🔄 RuckScore 마이그레이션 가이드

## 📋 개요

본 마이그레이션은 **레거시 "exercise effect / muscle engage" 로직을 완전히 제거**하고, **새로운 RuckScore 기반 정량화 시스템**으로 전환합니다.

### 마이그레이션 일정
- **브랜치**: `feat/ruck-metrics-replacement`
- **피처 플래그**: `NEXT_PUBLIC_RUCK_METRICS_V3=true` (기본값)
- **목표**: Zero 코드 충돌, 완전한 테스트 커버리지, CI 통과

---

## 🗑️ 삭제 목록 (Legacy Code Removal)

### 완전 삭제 대상
다음 파일들은 **레거시 로직만 포함**하므로 완전히 삭제됩니다:

| 파일 경로 | 삭제 이유 | 대체 모듈 |
|---------|---------|----------|
| `/src/components/EffectivenessMetrics.jsx` | 레거시 "Performance Metrics" UI (effect 기반) | `/features/live/RuckScoreView.tsx` |
| `/src/components/BodyEffectiveness.jsx` | 레거시 "Body Impact" UI (muscle engage 하드코딩) | `/features/live/MetricsTiles.tsx` |
| `/src/utils/workoutStats.js` | 레거시 통계 계산 로직 (effect 기반) | `/lib/trainingMetrics.ts` |

### 부분 수정 대상
다음 파일들은 **일부 레거시 로직 포함**하므로 surgically remove:

| 파일 경로 | 수정 내용 |
|---------|---------|
| `/src/context/WorkoutContext.jsx` | `effect`, `muscleEngage` 관련 state/함수 제거 |
| `/src/pages/Home.jsx` | `<EffectivenessMetrics />`, `<BodyEffectiveness />` 임포트 제거 |
| `/src/pages/LiveWorkout.jsx` | 레거시 메트릭 계산 로직 제거, 새 도메인/서비스 API로 교체 |

---

## 🏗️ 새 아키텍처

### 의존성 흐름
```
UI (features/*)
  ↓
Services (services/*)
  ↓
Domain + Lib (domain/*, lib/*)
```

**규칙**:
- `lib/*`: 순수 함수만, I/O 금지
- `services/*`: I/O 처리 (GPS, Time, API)
- `domain/*`: 비즈니스 로직 (상태 머신, 도메인 모델)
- `features/*`: UI 컴포넌트 (React)

### 핵심 모듈

#### 1. 도메인 레이어
- `/domain/WorkoutSession.ts`: 상태 머신 (idle → running → paused → ended)
- `/domain/types.ts`: 공유 타입 정의

#### 2. 라이브러리 레이어 (순수 함수)
- `/lib/trainingMetrics.ts`: RuckScore 계산 (kcal, TRIMP, BMS 등)
- `/lib/paceSmoother.ts`: 속도 스무딩 (이동 평균 + 칼만 필터)
- `/lib/format.ts`: 시간/거리 포맷팅

#### 3. 서비스 레이어 (I/O)
- `/services/TimeSource.web.ts`: `performance.now()` (모노토닉 클록)
- `/services/GeoService.web.ts`: GPS 추적, 정확도 필터링
- `/services/WorkoutService.ts`: 세션 관리 + 메트릭 계산 조합

#### 4. UI 레이어
- `/features/live/LiveWorkoutView.tsx`: 라이브 운동 화면
- `/features/live/RuckScoreGauge.tsx`: RuckScore 게이지 (0-100)
- `/features/live/MetricsTiles.tsx`: 메트릭 타일 (kcal, TRIMP, kg·km, kJ)
- `/features/live/MapView.tsx`: 지도 + 폴리라인

---

## 🧪 테스트 전략

### Unit Tests (필수)
- `/tests/unit/trainingMetrics.test.ts`: 모든 공식 검증
- `/tests/unit/workoutSession.test.ts`: 상태 전환, pause/resume 드리프트 없음
- `/tests/unit/paceSmoother.test.ts`: 스파이크 감소, 정확도 필터링

### 커버리지 목표
- **도메인/라이브러리**: 90% 이상
- **서비스**: 70% 이상
- **UI**: 50% 이상 (주요 흐름)

---

## 🚀 마이그레이션 체크리스트

### Phase 1: 준비 (완료)
- [x] 새 브랜치 생성 (`feat/ruck-metrics-replacement`)
- [x] 레거시 코드 분석 및 삭제 목록 작성
- [x] 새 아키텍처 설계

### Phase 2: 핵심 모듈 구현
- [x] `/domain/WorkoutSession.ts`
- [x] `/lib/trainingMetrics.ts`
- [x] `/lib/paceSmoother.ts` (기존 파일 재활용)
- [ ] `/services/TimeSource.web.ts`
- [ ] `/services/GeoService.web.ts`
- [ ] `/services/WorkoutService.ts`

### Phase 3: UI 구현
- [ ] `/features/live/LiveWorkoutView.tsx`
- [ ] `/features/live/RuckScoreGauge.tsx`
- [ ] `/features/live/MetricsTiles.tsx`
- [ ] `/features/live/MapView.tsx`

### Phase 4: PWA 설정
- [ ] `/pwa/manifest.webmanifest`
- [ ] `/pwa/sw.js` (오프라인 셸)
- [ ] `/public/icons/` (PWA 아이콘)

### Phase 5: iOS Capacitor (선택)
- [ ] `/ios-wrapper/capacitor.config.ts`
- [ ] `/ios/App/LocationService.swift`
- [ ] `/ios/App/BackgroundLocationPlugin.swift`
- [ ] `/ios/App/Info.plist` (백그라운드 위치 권한)

### Phase 6: 품질 가드
- [ ] `/tsconfig.json` (strict mode)
- [ ] `/.eslintrc.cjs` (순환 참조 금지)
- [ ] `/.prettierrc`
- [ ] `/.husky/pre-commit` (lint-staged)
- [ ] `/.github/workflows/ci.yml`

### Phase 7: 테스트
- [ ] Unit tests 작성 및 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm lint` 통과 (0 warnings, 0 errors)
- [ ] `pnpm test` 통과
- [ ] `pnpm build` 성공

### Phase 8: 레거시 제거
- [ ] 레거시 파일 삭제
- [ ] 레거시 임포트 제거
- [ ] 레거시 Context 정리

### Phase 9: 문서
- [ ] README 업데이트 (한국어)
- [ ] iOS 가이드 작성
- [ ] API 문서 작성

### Phase 10: 배포
- [ ] Vercel 배포
- [ ] 피처 플래그 테스트
- [ ] 롤백 시나리오 확인

---

## 🔙 롤백 방법

### 피처 플래그로 비활성화
```bash
# .env.local
NEXT_PUBLIC_RUCK_METRICS_V3=false
```

이 플래그를 `false`로 설정하면:
1. 새 UI가 숨겨짐
2. 레거시 메트릭 표시 (호환 레이어를 통해)
3. 앱이 정상 빌드/실행됨

### Git 롤백
```bash
# 브랜치 전체 롤백
git checkout main

# 특정 파일만 롤백
git checkout main -- src/pages/LiveWorkout.jsx
```

---

## 📊 메트릭 공식 요약

### 1. 에너지 소비 (kcal)
```
MET = 1.0 + 0.9 * Speed_kmh
LoadFactor = 1 + (Load / BW) * 0.6
kcal = MET * BW * (Time/60) * LoadFactor * calibrationFactor
```

### 2. TRIMP (심박수)
```
HRr = (HRavg - HRrest) / (HRmax - HRrest)
TRIMP = Time * HRr * 100
```

### 3. eTRIMP (심박수 없을 때)
```
Intensity = clamp(Speed_kmh / vdotRefKmh, 0, 1.5)
eTRIMP = Time * Intensity * 100
```

### 4. 기계적 부하 (kg·km)
```
MechLoad = Load * Dist
```

### 5. 수직 일 (kJ)
```
VertWork_kJ = ((BW + Load) * 9.81 * Gain) / 1000
```

### 6. 골격/근육 자극 (BMS, 0-10)
```
Lnorm = min(Load/20, 1)
Dnorm = min(Dist/10, 1)
Gnorm = min(Gain/400, 1)
BMS = 10 * (0.4*Lnorm + 0.3*Dnorm + 0.3*Gnorm)
```

### 7. RuckScore (0-100)
```
EE_norm = min(kcal/800, 1)
TRIMP_norm = min(trimp/150, 1)
Mech_norm = min(MechLoad/120, 1)
Vert_norm = min(VertWork_kJ/12, 1)
BMS_norm = BMS/10
RuckScore = 100 * (0.3*EE + 0.25*TRIMP + 0.25*Mech + 0.10*Vert + 0.10*BMS)
```

---

## ⚠️ 주의사항

### 1. PWA 백그라운드 제한 (iOS)
iOS Safari PWA는 **화면이 꺼지면 GPS 업데이트가 중단**됩니다.
- **해결책**: iOS Capacitor wrapper 사용 (백그라운드 위치 권한)
- **문서**: `/README-iOS.md` 참고

### 2. 보정 (Calibration)
처음 5회 세션은 **보정 기간**입니다:
- 개인별 상위 20% 평균으로 정규화 앵커 조정
- RPE와 비교하여 `calibrationFactor` 미세 조정

### 3. 안전 경고
- **ACWR**: 1주/4주 RuckScore 비율 > 1.5 시 경고
- **과부하**: Load > 0.2 * BW && Dist > 8km 시 경고

---

## 📞 지원

- **버그 리포트**: GitHub Issues
- **문의**: 프로젝트 README 참고
