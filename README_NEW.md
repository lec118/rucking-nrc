# 🎒 Rucking Tracker - 정량화 러킹 워크아웃 트래커

> **RuckScore 기반 과학적 러킹 추적 시스템**
> 칼로리, TRIMP, 기계적 부하, 수직 일, 골격/근육 자극을 종합하여 0-100점의 RuckScore 산출

---

## 📊 주요 기능

### 1. **정확한 시간 추적**
- **모노토닉 클록 사용** (`performance.now()`)
- 시스템 시간 변경에 영향 받지 않음 (Drift-free)
- 일시정지/재개 시 정확한 경과 시간 계산

### 2. **스마트 GPS 추적**
- **정확도 필터링**: 30m 이상 오차 샘플 자동 제거
- **정지 감지**: 5초 이상 0.4 m/s 미만 → 페이스 표시 `--:--`, 이동 시간 제외
- **속도 스무딩**: 이동 평균 + 칼만 필터로 스파이크 제거
- **실시간 지도**: 사용자 위치 추적 + 폴리라인 경로 표시

### 3. **정량화 메트릭 (RuckScore 0-100)**
6가지 과학적 지표를 종합한 RuckScore:

| 메트릭 | 설명 | 단위 | 가중치 |
|--------|------|------|--------|
| **에너지 소비** | MET 기반 칼로리 계산 | kcal | 30% |
| **TRIMP** | 심박수 기반 훈련 부하 (없으면 eTRIMP) | - | 25% |
| **기계적 부하** | Load × Distance | kg·km | 25% |
| **수직 일** | (BW + Load) × 9.81 × Gain ÷ 1000 | kJ | 10% |
| **골격/근육 자극** | Load, Distance, Gain 종합 | 0-10 | 10% |

### 4. **안전 경고**
- **ACWR**: 1주/4주 RuckScore 비율 > 1.5 → 과부하 경고
- **과부하**: Load > 0.2 × BW && Distance > 8km → 부상 위험 알림

### 5. **PWA + iOS 지원**
- **Web/PWA**: 설치 가능, 오프라인 지원
- **iOS Capacitor**: 백그라운드 GPS 추적 (화면 꺼짐 상태)

---

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
```

**`.env.local` 편집**:
```bash
NEXT_PUBLIC_RUCK_METRICS_V3=true
NEXT_PUBLIC_MAP_TILE_KEY=your_maptiler_key
```

### 2. 개발 서버 실행

```bash
pnpm dev
```

http://localhost:3000 접속

### 3. Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

---

## 📱 PWA 설치 (iOS Safari)

### iPhone에서 설치하기
1. Safari에서 앱 열기
2. 하단 **공유 버튼** (□↑) 탭
3. **홈 화면에 추가** 선택
4. **추가** 탭

### ⚠️ iOS PWA 제한사항
- **화면이 꺼지면 GPS 업데이트 중단됨**
- 백그라운드 위치 추적 불가
- **해결책**: iOS Capacitor wrapper 사용 (README-iOS.md 참고)

---

## 🏗️ 아키텍처

### 의존성 흐름
```
UI (features/*)
  ↓
Services (services/*)
  ↓
Domain + Lib (domain/*, lib/*)
```

### 핵심 모듈

#### 도메인 레이어 (순수 비즈니스 로직)
- `/domain/WorkoutSession.ts`: 상태 머신 (idle → running → paused → ended)

#### 라이브러리 레이어 (순수 함수)
- `/lib/trainingMetrics.ts`: RuckScore 계산
- `/lib/paceSmoother.ts`: 속도 스무딩
- `/lib/format.ts`: 포맷팅 유틸

#### 서비스 레이어 (I/O)
- `/services/TimeSource.web.ts`: 모노토닉 클록
- `/services/GeoService.web.ts`: GPS 추적
- `/services/WorkoutService.ts`: 세션 관리

#### UI 레이어
- `/features/live/LiveWorkoutView.tsx`: 라이브 운동 화면
- `/features/live/RuckScoreGauge.tsx`: RuckScore 게이지
- `/features/live/MetricsTiles.tsx`: 메트릭 타일

---

## 📐 메트릭 공식

### 1. 에너지 소비 (kcal)
```
MET = 1.0 + 0.9 × Speed_kmh
LoadFactor = 1 + (Load / BW) × 0.6
kcal = MET × BW × (Time/60) × LoadFactor × calibrationFactor
```

### 2. TRIMP (심박수)
```
HRr = (HRavg - HRrest) / (HRmax - HRrest)
TRIMP = Time × HRr × 100
```

### 3. eTRIMP (심박수 없을 때)
```
Intensity = clamp(Speed_kmh / vdotRefKmh, 0, 1.5)
eTRIMP = Time × Intensity × 100
```

### 4. 골격/근육 자극 (BMS, 0-10)
```
Lnorm = min(Load/20, 1)
Dnorm = min(Dist/10, 1)
Gnorm = min(Gain/400, 1)
BMS = 10 × (0.4×Lnorm + 0.3×Dnorm + 0.3×Gnorm)
```

### 5. RuckScore (0-100)
```
EE_norm = min(kcal/800, 1)
TRIMP_norm = min(trimp/150, 1)
Mech_norm = min(MechLoad/120, 1)
Vert_norm = min(VertWork_kJ/12, 1)
BMS_norm = BMS/10

RuckScore = 100 × (
  0.3 × EE_norm +
  0.25 × TRIMP_norm +
  0.25 × Mech_norm +
  0.10 × Vert_norm +
  0.10 × BMS_norm
)
```

---

## 🎯 보정 (Calibration)

### 개인화 보정
처음 5회 세션은 **보정 기간**입니다:
1. 개인별 상위 20% 평균으로 정규화 앵커 조정
2. RPE(주관적 운동 강도)와 비교하여 `calibrationFactor` 미세 조정
3. 6회차부터 정확한 개인화 RuckScore 제공

### RPE 기반 미세 조정
- RPE 높은데 RuckScore 낮음 → `calibrationFactor` 증가
- RPE 낮은데 RuckScore 높음 → `calibrationFactor` 감소

---

## ⚠️ 안전 가이드

### 1. ACWR 경고
```
ACWR = (최근 1주 RuckScore 합계) / (최근 4주 RuckScore 평균)
```
- **ACWR > 1.5**: 급격한 부하 증가 → 부상 위험 ⚠️
- **권장**: 매주 10% 이내 증가

### 2. 과부하 경고
- **조건**: Load > 0.2 × BW && Distance > 8km
- **예**: 체중 70kg, 부하 15kg 이상, 거리 8km 이상
- **권장**: 점진적 증가, 충분한 회복

### 3. 초보자 가이드라인
| 주차 | 부하 | 거리 | 빈도 |
|------|------|------|------|
| 1-2주 | 5-10kg | 3-5km | 주 2회 |
| 3-4주 | 10-15kg | 5-8km | 주 2-3회 |
| 5-8주 | 15-20kg | 8-12km | 주 3회 |

---

## 🔒 개인정보 보호

### 로컬 우선 저장
- 모든 운동 데이터는 **로컬 스토리지에만 저장**
- 서버 전송 없음 (오프라인 동작 가능)
- GPS 경로는 **기기 내부에만 저장**

### 선택적 클라우드 동기화
- 사용자가 명시적으로 활성화 시에만 동기화
- 암호화 전송 (HTTPS)
- 언제든지 삭제 가능

---

## 🛠️ 개발

### 프로젝트 구조
```
rucking-nrc/
├── domain/           # 비즈니스 로직 (순수 함수)
├── lib/              # 유틸리티 (순수 함수)
├── services/         # I/O 서비스
├── features/         # UI 컴포넌트
├── pwa/              # PWA 설정
├── ios/              # iOS Native
└── tests/            # 테스트
```

### 스크립트
```bash
pnpm dev        # 개발 서버
pnpm build      # 프로덕션 빌드
pnpm test       # 단위 테스트
pnpm lint       # ESLint 실행
pnpm typecheck  # TypeScript 검사
pnpm format     # Prettier 포맷팅
```

### 품질 가드
- **TypeScript strict mode** 활성화
- **ESLint**: 순환 참조 금지, 0 warnings
- **Husky**: pre-commit hook (lint-staged)
- **CI**: GitHub Actions (typecheck, lint, test, build)

---

## 🧪 테스트

### 단위 테스트 실행
```bash
pnpm test
```

### 커버리지
```bash
pnpm test:coverage
```

### 주요 테스트
- `trainingMetrics.test.ts`: 모든 공식 검증
- `workoutSession.test.ts`: 상태 전환, pause/resume
- `paceSmoother.test.ts`: 스무딩 정확도

---

## 📚 추가 문서

- [마이그레이션 가이드](MIGRATION_GUIDE.md) - 레거시 → RuckScore 전환
- [삭제 목록](DELETION_LIST.md) - 레거시 코드 제거 리스트
- [아키텍처 요약](ARCHITECTURE_SUMMARY.md) - 전체 파일 구조
- [iOS 가이드](README-iOS.md) - iOS Capacitor 설정

---

## 📈 로드맵

### v1.0 (현재)
- [x] 모노토닉 클록 기반 타이머
- [x] GPS 추적 + 정확도 필터링
- [x] RuckScore 계산 (6가지 메트릭)
- [x] PWA 지원

### v1.1 (계획)
- [ ] iOS Capacitor wrapper (백그라운드 GPS)
- [ ] 심박수 센서 연동 (Bluetooth)
- [ ] 주간/월간 통계
- [ ] 훈련 계획 제안

### v2.0 (향후)
- [ ] 소셜 기능 (친구와 비교)
- [ ] AI 기반 부하 최적화
- [ ] 웨어러블 연동 (Apple Watch, Garmin)

---

## 🤝 기여

이슈 및 PR 환영합니다!

### 개발 가이드라인
1. 새 브랜치 생성: `feat/your-feature`
2. 커밋 메시지: 한국어 사용, 명확한 의도
3. 테스트 작성 필수
4. ESLint + Prettier 통과 확인

---

## 📄 라이선스

MIT License

---

## 👨‍💻 만든 사람

- **Claude Code** + 사용자님

---

## 🙏 감사

- **MapTiler**: 지도 타일 제공
- **Leaflet**: 지도 라이브러리
- **Vercel**: 호스팅

---

**💡 Tip**: RuckScore가 낮게 나온다면, 부하를 늘리거나 거리를 늘리거나 속도를 높이세요!
