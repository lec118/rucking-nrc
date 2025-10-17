# 러킹 추적기 (Rucking Tracker)

정확한 GPS 기반 러킹(무게 배낭 착용 걷기/달리기) 운동 추적 및 정량적 트레이닝 분석 애플리케이션입니다.

## 주요 특징

### 🎯 정밀한 시간 측정
- **단조 시간(Monotonic Clock)**: `performance.now()` 사용으로 일시정지/재개 시 드리프트 제로
- **동적 시간 포맷**:
  - 1시간 미만: `mm:ss` (큰 폰트)
  - 1시간 이상: `HH:mm:ss` (최적화된 폰트)

### 📍 스마트 GPS 추적
- **정확도 필터링**: 30m 초과 샘플 자동 무시
- **속도 스무딩**: 이동 평균 + 간단한 칼만 필터
- **정지 감지**: 속도 < 0.4 m/s가 5초 이상 지속 시 자동 감지
  - 정지 중: 페이스 `--:--` 표시
  - `movingTime`, `movingDistance` 증가 중단

### 🗺️ 실시간 지도 추적
- 사용자 위치 자동 중심 이동
- 방향(heading) 반영
- 부드러운 애니메이션
- Polyline 경로 실시간 표시

### 📊 정량적 트레이닝 분석 (RuckScore 시스템)

운동 종료 후 6가지 과학적 지표 계산:

1. **에너지 소모 (kcal)**
   ```
   MET = 1.0 + 0.9 × 속도(km/h)
   부하계수 = 1 + (배낭무게 / 체중) × 0.6
   kcal = MET × 체중 × (시간/60) × 부하계수 × 보정계수
   ```

2. **심폐 부하 (TRIMP/eTRIMP)**
   - 심박수 있을 때: HR 기반 TRIMP
   - 심박수 없을 때: 속도 기반 eTRIMP

3. **기계적 부하 (kg·km)**
   ```
   기계적부하 = 배낭무게(kg) × 거리(km)
   ```

4. **수직 일량 (kJ)**
   ```
   수직일 = (체중 + 배낭무게) × 9.81 × 고도상승(m) / 1000
   ```

5. **골격/근육 자극 (BMS 0-10)**
   ```
   BMS = 10 × (0.4×부하정규화 + 0.3×거리정규화 + 0.3×고도정규화)
   ```

6. **종합 점수 (RuckScore 0-100)**
   ```
   RuckScore = 100 × (0.3×에너지 + 0.25×TRIMP + 0.25×기계적 + 0.10×수직 + 0.10×BMS)
   ```

#### RuckScore 해석
- **0-40**: 가벼운 운동 (회복/입문)
- **40-70**: 중간 강도 (유지/발전)
- **70-100**: 고강도 (챌린지/경쟁)

### 📱 PWA 지원
- 오프라인 동작 (Service Worker)
- 홈 화면 추가 가능
- 화면 꺼짐 방지 (Wake Lock API)

### ⚠️ iOS 제약사항
- **PWA 모드**: 백그라운드에서 JavaScript 실행 중단
  - 화면이 꺼지면 GPS 추적 및 타이머 멈춤
  - **해결책**: 화면 유지 설정 또는 iOS 네이티브 래퍼 사용

- **iOS 네이티브 래퍼 (Capacitor)**: 백그라운드 추적 완벽 지원
  - 화면 꺼진 상태에서도 GPS 추적 계속
  - 설정 가이드: [README-iOS.md](./README-iOS.md)

---

## 시작하기

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/yourusername/rucking-tracker.git
cd rucking-tracker

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 NEXT_PUBLIC_MAP_TILE_KEY 입력
```

### MapTiler API 키 발급
1. [MapTiler Cloud](https://cloud.maptiler.com/) 가입
2. 무료 API 키 생성
3. `.env.local`에 키 입력:
   ```
   NEXT_PUBLIC_MAP_TILE_KEY=your_key_here
   ```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 프로덕션 빌드

```bash
npm run build
npm start
```

---

## 사용 방법

### 1. 초기 설정
- **체중 입력** (kg): 에너지 소모 계산에 사용
- **배낭 무게 입력** (kg): 부하 계산에 사용
- 위치 권한 허용

### 2. 운동 시작
- **Start** 버튼 클릭
- GPS 신호 잡힐 때까지 대기 (보통 5-10초)
- 지도에 파란 점(현재 위치)과 빨간 선(경로) 표시

### 3. 운동 중
- **실시간 지표 확인**:
  - TIME: 경과 시간
  - DIST: 총 거리
  - PACE: 현재 페이스 (정지 시 `--:--`)
  - ELEV: 고도 상승

- **일시정지**: Pause 버튼
- **재개**: Resume 버튼

### 4. 운동 종료
- **End** 버튼 클릭
- RuckScore 및 트레이닝 지표 확인:
  - 에너지 소모 (kcal)
  - 심폐 부하 (TRIMP)
  - 기계적 부하 (kg·km)
  - 수직 일량 (kJ)
  - 골격/근육 자극 (BMS)
  - 종합 점수 (RuckScore)

### 5. 보정
- 처음 몇 번의 운동 후 실제 소모 칼로리와 비교하여 보정계수 조정 가능
- 기본값: `1.15` (평균적인 러킹 효율)

---

## 프로젝트 구조

```
rucking-tracker/
├── domain/                    # 도메인 로직 (순수 함수)
│   └── WorkoutSession.ts      # 운동 상태 머신, 시간 계산
├── services/                  # 플랫폼별 서비스
│   ├── GeoService.web.ts      # 웹 GPS 서비스
│   └── TimeSource.web.ts      # 웹 단조 시간 소스
├── lib/                       # 유틸리티
│   ├── paceSmoother.ts        # 속도 스무딩 (이동 평균 + 칼만 필터)
│   └── trainingMetrics.ts     # 트레이닝 지표 계산
├── features/live/             # UI 컴포넌트
│   └── LiveWorkoutView.tsx    # 메인 운동 화면
├── components/                # 재사용 가능 컴포넌트
│   └── RuckScoreGauge.tsx     # SVG 원형 게이지
├── app/                       # Next.js App Router
│   ├── (workout)/page.tsx     # 운동 페이지
│   └── api/workouts/route.ts  # 운동 저장 API
├── public/                    # 정적 파일
│   ├── manifest.webmanifest   # PWA 매니페스트
│   └── sw.js                  # Service Worker
├── ios/                       # iOS 네이티브 래퍼 (선택사항)
│   └── App/                   # Swift 코드
└── tests/                     # 테스트
    └── unit/                  # 단위 테스트
```

---

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript (strict mode)
- **스타일링**: Tailwind CSS
- **지도**: MapLibre GL JS
- **GPS**: Web Geolocation API
- **PWA**: Service Worker, Web App Manifest
- **iOS 래퍼**: Capacitor (선택사항)
- **테스트**: Vitest

---

## 개인정보 보호

### 위치 데이터 처리 원칙
1. **기본**: 모든 계산은 기기 내에서만 수행
2. **서버 저장**: 최소한의 요약 데이터만 (사용자 동의 시)
   - 거리, 시간, 평균 속도, RuckScore
   - **경로 데이터(GPS 좌표)는 절대 저장하지 않음**
3. **투명성**: 저장되는 데이터 목록 명시
4. **제어권**: 사용자가 언제든지 데이터 삭제 가능

---

## 안전 수칙

### 부상 예방 (ACWR)
- **Acute:Chronic Workload Ratio**: 급성부하 / 만성부하 비율
- **권장 범위**: 0.8 - 1.3
- **위험 구간**: > 1.5 (부상 위험 증가)

### 점진적 과부하
- 주당 거리 증가: **10% 이하**
- 배낭 무게 증가: **2-3kg씩**
- 고도 상승 증가: 서서히

### 회복
- 고강도 운동 후 48시간 휴식
- RuckScore 70+ 운동은 주 2회 이하 권장

---

## 배포

### Vercel (추천)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

환경 변수 설정:
- Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
- `NEXT_PUBLIC_MAP_TILE_KEY` 입력

### Netlify

```bash
# Netlify CLI 설치
npm i -g netlify-cli

# 배포
netlify deploy --prod
```

---

## iOS 네이티브 래퍼 (선택사항)

백그라운드 추적을 위해서는 Capacitor를 사용한 iOS 네이티브 래퍼가 필요합니다.

상세 가이드: [README-iOS.md](./README-iOS.md)

---

## 테스트

```bash
# 단위 테스트 실행
npm test

# 커버리지
npm run test:coverage
```

---

## 문제 해결

### "위치 권한 거부됨"
- 브라우저 설정 → 위치 권한 허용
- iOS: 설정 → Safari → 위치 → 허용

### "지도가 표시되지 않음"
- `.env.local`에 `NEXT_PUBLIC_MAP_TILE_KEY` 설정 확인
- MapTiler 키 유효성 확인

### "iOS에서 백그라운드 추적 안 됨"
- PWA는 백그라운드 제약 있음 (정상)
- 화면 유지 설정 활성화 권장
- 또는 iOS 네이티브 래퍼 사용: [README-iOS.md](./README-iOS.md)

### "페이스가 '--:--'로 계속 표시됨"
- GPS 정확도가 낮을 수 있음 (실내, 건물 사이)
- 야외 개활지로 이동
- GPS 신호 안정화까지 30초 정도 대기

### "거리가 부정확함"
- GPS 정확도 필터링 작동 중 (30m 초과 샘플 무시)
- 실내/터널에서는 거리 측정 부정확
- 고층 빌딩 사이에서도 다중 경로 효과로 부정확할 수 있음

---

## 기여

이슈 및 풀 리퀘스트 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 라이선스

MIT License - 자유롭게 사용 및 수정 가능

---

## 연락처

- GitHub Issues: [https://github.com/yourusername/rucking-tracker/issues](https://github.com/yourusername/rucking-tracker/issues)
- Email: your.email@example.com

---

## 참고 자료

### 러킹 관련
- [GORUCK Training](https://www.goruck.com/pages/training)
- [Military Rucking Guidelines](https://www.military.com/military-fitness/army-fitness-requirements/army-ruck-march-standards)

### 트레이닝 과학
- [TRIMP (Training Impulse)](https://www.trainingpeaks.com/blog/what-is-trimp/)
- [ACWR (Acute:Chronic Workload Ratio)](https://www.scienceforsport.com/acwr/)
- [MET Values](https://sites.google.com/site/compendiumofphysicalactivities/)

### 기술 문서
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/api/)
- [Capacitor](https://capacitorjs.com/docs)

---

**행복한 러킹 되세요! 🎒🏃‍♂️**
