# 운동 추적기 (Workout Tracker)

React + TypeScript 기반 실시간 GPS 운동 추적 애플리케이션입니다.

## 주요 기능

### 1. 정확한 경과 시간 측정
- **단조 시간 소스** 사용: `performance.now()` (웹) / `systemUptime` (iOS)
- 일시정지/재개 시 드리프트 없음
- 시간 포맷:
  - 1시간 미만: `mm:ss`
  - 1시간 이상: `HH:mm:ss`

### 2. 정지 중 페이스 업데이트 방지
- 속도 < 0.4 m/s가 **5초 이상** 지속되면 정지로 판단
- 정지 중에는:
  - `movingTime` / `movingDistance` 증가 안 함
  - 페이스 표시: `--:--`
- 정확도 필터: **30m 초과** 샘플 무시
- 속도 스무딩:
  - 이동 평균 (Moving Average)
  - 간단한 칼만 필터 (Kalman Filter)

### 3. 지도 자동 추적
- 사용자 위치에 맞춰 지도 카메라 자동 이동
- 방향(heading) 반영
- 부드러운 애니메이션
- Polyline 경로 표시

### 4. PWA 지원
- 오프라인 동작 (Service Worker)
- 홈 화면 추가 가능
- **iOS 제약사항**:
  - PWA는 백그라운드에서 JavaScript 실행 중단
  - 화면이 꺼지면 GPS 추적 멈춤
  - **해결책**: 화면 유지 설정 또는 iOS 네이티브 래퍼 사용

---

## 구현된 모듈

### Domain Layer
- **`domain/WorkoutSession.ts`**: 운동 세션 상태 머신
  - 상태: idle, running, paused, ended
  - 단조 시간 기반 경과 시간 계산
  - 움직임 감지 및 페이스 계산
  - 정확도 필터링

### Service Layer
- **`services/GeoService.web.ts`**: GPS 위치 추적
  - navigator.geolocation.watchPosition
  - 속도 스무딩 (이동 평균 + 칼만 필터)
  - 정확도 필터 (30m 초과 무시)

- **`services/TimeSource.web.ts`**: 단조 시간 소스
  - performance.now() 사용
  - 드리프트 방지

### Utilities
- **`lib/paceSmoother.ts`**: 속도 스무딩
  - 이동 평균 (윈도우 크기: 5)
  - 간단한 칼만 필터 (Q=0.01, R=0.1)

---

## 기존 LiveWorkout 통합 가이드

### 1. GeoService 통합

기존 `src/pages/LiveWorkout.jsx`의 GPS 로직을 교체:

```typescript
import { GeoService } from '@/services/GeoService.web';
import { TimeSource } from '@/services/TimeSource.web';
import {
  createSession,
  startSession,
  updateLocation,
  formatTime,
  formatPace
} from '@/domain/WorkoutSession';

// GeoService 초기화
const geoService = useRef(new GeoService());

// 위치 업데이트 핸들러
const handleLocationUpdate = (data: {
  lat: number;
  lng: number;
  speed: number;
  accuracy: number;
  heading: number | null;
}) => {
  setSession(prev => updateLocation(
    prev,
    data.lat,
    data.lng,
    data.speed,
    data.accuracy,
    TimeSource.now()
  ));
};

// 시작 버튼
const handleStart = () => {
  geoService.current.start(handleLocationUpdate);
};
```

### 2. 단조 시간 기반 타이머

기존 `duration` 상태를 `elapsedMs`로 교체:

```typescript
const [session, setSession] = useState(() =>
  createSession(TimeSource.now())
);

// 타이머
useEffect(() => {
  if (session.state !== 'running') return;

  const interval = setInterval(() => {
    const elapsed = getElapsedTime(session, TimeSource.now());
    setElapsedTime(elapsed);
  }, 1000);

  return () => clearInterval(interval);
}, [session]);
```

### 3. 페이스 표시

```typescript
// 정지 중: '--:--', 움직이는 중: 'X:XX'
<div>
  <label>페이스</label>
  <span>{formatPace(session.currentPace)}</span>
</div>
```

---

## Vercel 배포

### 1. 환경 변수 설정
Vercel 대시보드 → 프로젝트 → Settings → Environment Variables

```
NEXT_PUBLIC_MAP_TILE_KEY=your_maptiler_api_key
```

### 2. 배포
```bash
npm run build
vercel --prod
```

---

## 개인정보 보호

### 위치 데이터 처리
- **기본**: 모든 계산은 기기 내에서만 수행
- **서버 저장**: 최소한의 요약 데이터만 (사용자 동의 시)
  - 거리, 시간, 평균 속도
  - **경로 데이터는 저장하지 않음**

---

## 테스트

### 단위 테스트 작성 예시

```typescript
// tests/domain/WorkoutSession.test.ts
import { describe, it, expect } from 'vitest';
import { createSession, updateLocation, formatPace } from '@/domain/WorkoutSession';

describe('WorkoutSession', () => {
  it('속도 < 0.4 m/s가 5초 이상 지속되면 페이스 --:--', () => {
    let session = createSession(0);

    // 6초 동안 0.3 m/s로 이동
    for (let i = 1; i <= 6; i++) {
      session = updateLocation(session, 37.5, 127.0, 0.3, 10, i * 1000);
    }

    expect(formatPace(session.currentPace)).toBe('--:--');
  });

  it('정확도 > 30m 샘플 무시', () => {
    let session = createSession(0);
    const pathLengthBefore = session.path.length;

    session = updateLocation(session, 37.5, 127.0, 1.0, 50, 1000);

    expect(session.path.length).toBe(pathLengthBefore);
  });
});
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
- 화면 유지 설정 권장
- 또는 iOS 네이티브 래퍼 필요

---

## 라이선스

MIT
