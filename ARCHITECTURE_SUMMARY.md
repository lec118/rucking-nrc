# 🏗️ 아키텍처 요약 및 파일 구조

## 📁 전체 파일 구조 (32개 파일)

```
rucking-nrc/
├── domain/                    # 도메인 레이어 (비즈니스 로직)
│   ├── WorkoutSession.ts      ✅ 생성 완료
│   └── types.ts               📝 필요 시 추가
│
├── lib/                       # 라이브러리 레이어 (순수 함수)
│   ├── trainingMetrics.ts     ✅ 생성 완료
│   ├── paceSmoother.ts        ✅ 기존 파일 재활용
│   └── format.ts              ✅ 기존 파일 사용
│
├── services/                  # 서비스 레이어 (I/O)
│   ├── TimeSource.web.ts      📋 아래 참조
│   ├── GeoService.web.ts      📋 아래 참조
│   └── WorkoutService.ts      📋 아래 참조
│
├── features/                  # UI 레이어
│   └── live/
│       ├── LiveWorkoutView.tsx      📋 아래 참조
│       ├── RuckScoreGauge.tsx       📋 아래 참조
│       ├── MetricsTiles.tsx         📋 아래 참조
│       └── MapView.tsx              📋 아래 참조
│
├── pwa/                       # PWA 설정
│   ├── manifest.webmanifest   📋 아래 참조
│   └── sw.js                  📋 아래 참조
│
├── ios-wrapper/               # iOS Capacitor
│   └── capacitor.config.ts    📋 아래 참조
│
├── ios/                       # iOS Native
│   └── App/
│       ├── LocationService.swift           📋 아래 참조
│       ├── BackgroundLocationPlugin.swift  📋 아래 참조
│       ├── TimeSource.swift                📋 아래 참조
│       └── Info.plist                      📋 아래 참조
│
├── tests/                     # 테스트
│   └── unit/
│       ├── trainingMetrics.test.ts     📋 아래 참조
│       ├── workoutSession.test.ts      📋 아래 참조
│       └── paceSmoother.test.ts        📋 아래 참조
│
├── .github/                   # CI/CD
│   └── workflows/
│       └── ci.yml             📋 아래 참조
│
├── .husky/                    # Git Hooks
│   └── pre-commit             📋 아래 참조
│
├── 품질 가드 설정
│   ├── tsconfig.json          📋 아래 참조
│   ├── .eslintrc.cjs          📋 아래 참조
│   ├── .prettierrc            📋 아래 참조
│   └── .lintstagedrc          📋 아래 참조
│
├── 문서
│   ├── README.md              📋 아래 참조
│   ├── README-iOS.md          📋 아래 참조
│   ├── MIGRATION_GUIDE.md     ✅ 생성 완료
│   ├── DELETION_LIST.md       ✅ 생성 완료
│   └── ARCHITECTURE_SUMMARY.md (본 파일)
│
└── .env.example               📋 아래 참조
```

---

## 📋 나머지 파일 구조 및 핵심 내용

### 1. `/services/TimeSource.web.ts`

```typescript
// 모노토닉 클록 추상화 (performance.now)

export interface TimeSource {
  now(): number; // milliseconds
}

export const webTimeSource: TimeSource = {
  now: () => performance.now(),
};
```

**핵심**:
- `Date.now()` 대신 `performance.now()` 사용 (시스템 시간 변경에 영향 없음)
- Drift-free 타이머 구현
- iOS Native에서는 `systemUptime` 사용

---

### 2. `/services/GeoService.web.ts`

```typescript
// GPS 추적 서비스

import { GeoPoint } from '../domain/WorkoutSession';

export interface GeoService {
  watchPosition(callback: (point: GeoPoint) => void): number;
  clearWatch(watchId: number): void;
}

export const webGeoService: GeoService = {
  watchPosition(callback) {
    return navigator.geolocation.watchPosition(
      (pos) => {
        callback({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: performance.now(),
          speed: pos.coords.speed || undefined,
          heading: pos.coords.heading || undefined,
        });
      },
      (err) => console.error('GPS error:', err),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  },

  clearWatch(watchId) {
    navigator.geolocation.clearWatch(watchId);
  },
};
```

**핵심**:
- `enableHighAccuracy: true` 필수
- `accuracy > 30m` 필터링은 domain layer에서 처리
- iOS Native에서는 `CLLocationManager` 사용

---

### 3. `/services/WorkoutService.ts`

```typescript
// 워크아웃 세션 관리 + 메트릭 계산 조합

import { WorkoutSession, createWorkoutSession, startWorkout, pauseWorkout, resumeWorkout, endWorkout, addGeoPoint } from '../domain/WorkoutSession';
import { calculateMetrics, MetricsResult } from '../lib/trainingMetrics';
import { webTimeSource } from './TimeSource.web';
import { webGeoService } from './GeoService.web';

export class WorkoutService {
  private session: WorkoutSession | null = null;
  private gpsWatchId: number | null = null;

  start(bodyWeightKg: number, loadKg: number) {
    this.session = createWorkoutSession({ bodyWeightKg, loadKg });
    this.session = startWorkout(this.session, webTimeSource.now());

    // GPS 추적 시작
    this.gpsWatchId = webGeoService.watchPosition((point) => {
      if (this.session) {
        this.session = addGeoPoint(this.session, point);
      }
    });
  }

  pause() {
    if (this.session) {
      this.session = pauseWorkout(this.session, webTimeSource.now());
    }
  }

  resume() {
    if (this.session) {
      this.session = resumeWorkout(this.session, webTimeSource.now());
    }
  }

  end(rpe?: number): MetricsResult | null {
    if (!this.session) return null;

    this.session = endWorkout(this.session, webTimeSource.now(), rpe);

    // GPS 추적 중단
    if (this.gpsWatchId !== null) {
      webGeoService.clearWatch(this.gpsWatchId);
    }

    // 메트릭 계산
    const metrics = calculateMetrics({
      bodyWeightKg: this.session.bodyWeightKg,
      loadKg: this.session.loadKg,
      distanceKm: this.session.distanceM / 1000,
      movingTimeMin: this.session.movingTimeMs / 60000,
      elevationGainM: this.session.elevationGainM,
      hrAvg: this.session.hrAvg,
      hrRest: this.session.hrRest,
      hrMax: this.session.hrMax,
      rpe: this.session.rpe,
    });

    return metrics;
  }

  getSession() {
    return this.session;
  }
}
```

---

### 4. `/features/live/RuckScoreGauge.tsx`

```typescript
// RuckScore 게이지 컴포넌트 (0-100)

interface Props {
  score: number; // 0-100
}

export default function RuckScoreGauge({ score }: Props) {
  const percentage = Math.max(0, Math.min(100, score));
  const color = getScoreColor(score);

  return (
    <div className="relative w-48 h-48">
      {/* SVG 원형 게이지 */}
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="#27272a"
          strokeWidth="8"
        />
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${percentage * 2.51} 251`}
          className="transition-all duration-500"
        />
      </svg>

      {/* 중앙 점수 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold">{Math.round(score)}</div>
        <div className="text-sm text-zinc-500">RuckScore</div>
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'; // green
  if (score >= 60) return '#3b82f6'; // blue
  if (score >= 40) return '#f59e0b'; // orange
  return '#ef4444'; // red
}
```

**핵심**:
- SVG `<circle>` 사용 (경량, 애니메이션 가능)
- `strokeDasharray`로 진행률 표시
- 점수 범위별 색상 변경

---

### 5. `/features/live/MetricsTiles.tsx`

```typescript
// 메트릭 타일 (2x2 그리드)

interface Props {
  metrics: MetricsResult;
}

export default function MetricsTiles({ metrics }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 에너지 소비 */}
      <TileCard
        icon="🔥"
        label="에너지 소비"
        value={metrics.kcal}
        unit="kcal"
        tooltip="MET 기반 에너지 소비 계산"
      />

      {/* TRIMP */}
      <TileCard
        icon="❤️"
        label="훈련 부하"
        value={metrics.trimp}
        unit="TRIMP"
        tooltip="심박수 기반 훈련 부하 (없으면 eTRIMP)"
      />

      {/* 기계적 부하 */}
      <TileCard
        icon="💪"
        label="기계적 부하"
        value={metrics.mechLoadKgKm}
        unit="kg·km"
        tooltip="Load * Distance"
      />

      {/* 수직 일 */}
      <TileCard
        icon="⛰️"
        label="수직 일"
        value={metrics.vertWorkKj}
        unit="kJ"
        tooltip="(BW + Load) * 9.81 * Gain / 1000"
      />
    </div>
  );
}
```

---

### 6. `/pwa/manifest.webmanifest`

```json
{
  "name": "Rucking Tracker",
  "short_name": "Ruck",
  "description": "정량화 러킹 트래커 (RuckScore)",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#18181b",
  "theme_color": "#f97316",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### 7. `/pwa/sw.js`

```javascript
// Service Worker - 오프라인 셸

const CACHE_NAME = 'rucking-v1';
const URLS_TO_CACHE = [
  '/',
  '/live-workout',
  '/offline.html'
];

// 설치
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// 요청 가로채기
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// ⚠️ iOS PWA 백그라운드 제한:
// - 화면이 꺼지면 GPS 업데이트 중단
// - 백그라운드 위치 추적 불가
// - 해결책: iOS Capacitor wrapper 사용
```

---

### 8. `/tests/unit/trainingMetrics.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { calculateMetrics } from '../../lib/trainingMetrics';

describe('trainingMetrics', () => {
  test('에너지 소비 계산 - 기본 케이스', () => {
    const result = calculateMetrics({
      bodyWeightKg: 70,
      loadKg: 15,
      distanceKm: 5,
      movingTimeMin: 60,
    });

    expect(result.kcal).toBeGreaterThan(0);
    expect(result.kcal).toBeLessThan(1000);
  });

  test('RuckScore 범위 검증 (0-100)', () => {
    const result = calculateMetrics({
      bodyWeightKg: 70,
      loadKg: 20,
      distanceKm: 10,
      movingTimeMin: 120,
      elevationGainM: 200,
    });

    expect(result.ruckScore).toBeGreaterThanOrEqual(0);
    expect(result.ruckScore).toBeLessThanOrEqual(100);
  });

  test('TRIMP vs eTRIMP', () => {
    // 심박수 있을 때
    const withHR = calculateMetrics({
      bodyWeightKg: 70,
      loadKg: 15,
      distanceKm: 5,
      movingTimeMin: 60,
      hrAvg: 140,
      hrRest: 60,
      hrMax: 180,
    });

    // 심박수 없을 때
    const withoutHR = calculateMetrics({
      bodyWeightKg: 70,
      loadKg: 15,
      distanceKm: 5,
      movingTimeMin: 60,
    });

    expect(withHR.trimp).toBeGreaterThan(0);
    expect(withoutHR.trimp).toBeGreaterThan(0);
  });
});
```

---

### 9. `/.eslintrc.cjs`

```javascript
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['import'],
  rules: {
    'import/no-cycle': 'error', // 순환 참조 금지
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

---

### 10. `/.github/workflows/ci.yml`

```yaml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

---

### 11. `/.env.example`

```bash
# 피처 플래그 (기본값: true)
NEXT_PUBLIC_RUCK_METRICS_V3=true

# MapTiler API Key
NEXT_PUBLIC_MAP_TILE_KEY=your_maptiler_key_here

# Vercel URL (선택)
NEXT_PUBLIC_VERCEL_URL=https://your-app.vercel.app
```

---

## 🎯 구현 우선순위

### 즉시 구현 필요 (P0)
1. ✅ `/domain/WorkoutSession.ts`
2. ✅ `/lib/trainingMetrics.ts`
3. `/services/TimeSource.web.ts`
4. `/services/GeoService.web.ts`
5. `/services/WorkoutService.ts`
6. `/features/live/LiveWorkoutView.tsx`
7. `/features/live/RuckScoreGauge.tsx`

### 2단계 (P1)
8. `/features/live/MetricsTiles.tsx`
9. `/pwa/manifest.webmanifest`
10. `/pwa/sw.js`
11. `/tests/unit/*.test.ts`

### 3단계 (P2 - 선택)
12. iOS Capacitor wrapper
13. 품질 가드 강화
14. CI/CD 최적화

---

## ✅ 다음 단계

1. **서비스 레이어 구현** (`TimeSource`, `GeoService`, `WorkoutService`)
2. **UI 컴포넌트 구현** (`LiveWorkoutView`, `RuckScoreGauge`)
3. **레거시 파일 삭제** (DELETION_LIST.md 참고)
4. **테스트 작성 및 실행**
5. **빌드 및 배포**

---

전체 32개 파일 중 **3개 핵심 파일 생성 완료**, 나머지는 위 구조를 참고하여 구현하시면 됩니다!
