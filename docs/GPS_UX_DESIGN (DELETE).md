# GPS Feature UX Design & Implementation

Complete GPS functionality design including accuracy thresholds, permission flows, fallback strategies, noise handling, and offline UX.

---

## Table of Contents
1. [GPS State Machine](#gps-state-machine)
2. [Accuracy Thresholds](#accuracy-thresholds)
3. [Permission Flow](#permission-flow)
4. [Fallback Strategies](#fallback-strategies)
5. [Multipath Noise Handling](#multipath-noise-handling)
6. [Offline UX](#offline-ux)
7. [Component Architecture](#component-architecture)
8. [Implementation Pseudocode](#implementation-pseudocode)

---

## GPS State Machine

### Primary States

```
┌─────────────────────────────────────────────────────────────────┐
│                         GPS State Machine                        │
└─────────────────────────────────────────────────────────────────┘

                            ┌──────────┐
                            │  IDLE    │
                            │ (未使用)  │
                            └────┬─────┘
                                 │
                                 │ User starts workout
                                 ▼
                          ┌──────────────┐
                          │ REQUESTING   │
                          │ (권한 요청 중)│
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    │ Granted    │ Denied     │
                    ▼            ▼
          ┌─────────────┐  ┌─────────────┐
          │ INITIALIZING│  │  DENIED     │
          │ (GPS 검색 중)│  │ (권한 거부)  │
          └──────┬──────┘  └─────┬───────┘
                 │                │
      ┌──────────┼──────────┐     │ Manual fallback
      │ Success  │ Timeout  │     ▼
      ▼          ▼          │  ┌──────────────┐
┌──────────┐ ┌──────────┐  │  │   FALLBACK   │
│ TRACKING │ │ TIMEOUT  │  │  │ (수동 입력)   │
│(추적 중)  │ │(시간 초과)│──┘  └──────────────┘
└────┬─────┘ └────┬─────┘
     │            │
     │            │ Retry / Use cached
     │            ▼
     │     ┌──────────────┐
     │     │   DEGRADED   │
     │     │(저정밀 모드)  │
     │     └──────┬───────┘
     │            │
     │◄───────────┘
     │
     │ Low accuracy detected
     ▼
┌──────────────┐
│  LOW_ACCURACY│
│(정확도 낮음)  │
└──────┬───────┘
       │
       │ Wait for improvement / Continue
       │
       ▼
┌──────────────┐
│   TRACKING   │ ──► User stops workout ──► ┌──────────┐
│  (계속 추적)  │                            │ FINISHED │
└──────────────┘                            └──────────┘
```

### State Descriptions

| State | Description | User Action | System Behavior |
|-------|-------------|-------------|-----------------|
| **IDLE** | GPS not in use | - | No GPS activity |
| **REQUESTING** | Asking for permission | Wait for response | Show permission dialog |
| **DENIED** | Permission denied | Grant permission or use fallback | Show instructions + fallback options |
| **INITIALIZING** | Getting first GPS fix | Wait | Show loading spinner + "GPS 신호 검색 중" |
| **TIMEOUT** | Initial GPS timeout | Retry or use fallback | Show timeout message + options |
| **TRACKING** | Actively tracking with good signal | Continue workout | Update position regularly |
| **LOW_ACCURACY** | Tracking but accuracy poor | Continue or wait | Show warning + continue option |
| **DEGRADED** | Using cached/estimated position | Continue with caution | Show degraded mode indicator |
| **FALLBACK** | Manual input mode | Enter data manually | No GPS tracking |
| **FINISHED** | Workout completed | - | Save data |

---

## Accuracy Thresholds

### Accuracy Levels

```typescript
enum GPSAccuracyLevel {
  EXCELLENT = 'excellent',  // 0-10m
  GOOD = 'good',           // 10-30m
  ACCEPTABLE = 'acceptable', // 30-50m
  POOR = 'poor',           // 50-100m
  UNACCEPTABLE = 'unacceptable' // >100m
}

const ACCURACY_THRESHOLDS = {
  EXCELLENT: 10,      // Perfect for outdoor running
  GOOD: 30,          // Good for most activities
  ACCEPTABLE: 50,    // Minimum acceptable for tracking
  POOR: 100,         // Can continue but warn user
  MAX_USABLE: 200    // Beyond this, reject position
};
```

### Accuracy-Based Behavior

```
Accuracy Range     │ Behavior                      │ UI Indicator
───────────────────┼───────────────────────────────┼──────────────────
0-10m (Excellent)  │ • Full tracking              │ 🟢 "GPS 우수"
                   │ • High confidence             │
───────────────────┼───────────────────────────────┼──────────────────
10-30m (Good)      │ • Full tracking              │ 🔵 "GPS 좋음"
                   │ • Normal operation            │
───────────────────┼───────────────────────────────┼──────────────────
30-50m (Acceptable)│ • Full tracking              │ 🟡 "GPS 보통"
                   │ • Minor smoothing             │ "실외 이동 권장"
───────────────────┼───────────────────────────────┼──────────────────
50-100m (Poor)     │ • Continue with warning      │ 🟠 "GPS 낮음"
                   │ • Aggressive filtering        │ "정확도 낮음"
                   │ • Prompt to move outdoors     │ "실외 이동 필요"
───────────────────┼───────────────────────────────┼──────────────────
>100m (Unacceptable)│ • Reject position updates   │ 🔴 "GPS 매우 낮음"
                   │ • Use last known good pos     │ "신호 없음"
                   │ • Suggest fallback mode       │ "수동 입력 권장"
```

### Dynamic Threshold Adjustment

```typescript
// Adjust thresholds based on context
function getContextualThreshold(context: {
  isMoving: boolean;
  speed: number; // km/h
  duration: number; // minutes
  environment: 'outdoor' | 'indoor' | 'urban';
}): number {
  let threshold = ACCURACY_THRESHOLDS.ACCEPTABLE;

  // Relax threshold if moving fast (less precision needed)
  if (context.speed > 10) {
    threshold = ACCURACY_THRESHOLDS.POOR;
  }

  // Tighten threshold at start (need good initial fix)
  if (context.duration < 2) {
    threshold = ACCURACY_THRESHOLDS.GOOD;
  }

  // Relax for indoor/urban (expect lower accuracy)
  if (context.environment === 'indoor' || context.environment === 'urban') {
    threshold = ACCURACY_THRESHOLDS.POOR;
  }

  return threshold;
}
```

---

## Permission Flow

### Permission State Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    GPS Permission Flow                           │
└─────────────────────────────────────────────────────────────────┘

                        ┌──────────────┐
                        │   APP START  │
                        └──────┬───────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Check Permission     │
                    │ Status               │
                    └──────┬───────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ GRANTED  │    │  PROMPT  │    │  DENIED  │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │                │
         │               │ User allows    │
         │               ▼                │
         │         ┌──────────┐          │
         │         │ Request  │          │
         │         │ Position │          │
         │         └────┬─────┘          │
         │              │                │
         │    ┌─────────┼─────────┐     │
         │    │ Allow   │ Deny    │     │
         │    ▼         ▼         │     │
         │  ┌─────┐  ┌─────┐     │     │
         └─►│ GPS │  │BLOCK│◄────┘     │
            │START│  └──┬──┘           │
            └─────┘     │              │
                        ▼              ▼
                  ┌───────────────────────┐
                  │  FALLBACK OPTIONS     │
                  ├───────────────────────┤
                  │ 1. Settings Guide     │
                  │ 2. Manual Entry       │
                  │ 3. Map Pin Selection  │
                  │ 4. Use Last Location  │
                  └───────────────────────┘
```

### Permission Request Strategy

```typescript
// Permission request with educational prompt
async function requestGPSPermission(): Promise<PermissionStatus> {
  // 1. Check current status
  const status = await navigator.permissions.query({ name: 'geolocation' });

  if (status.state === 'granted') {
    return 'granted';
  }

  if (status.state === 'denied') {
    // Show settings guide
    showPermissionSettingsGuide();
    return 'denied';
  }

  // 2. Show educational prompt BEFORE browser permission
  const userConsent = await showEducationalPrompt({
    title: 'GPS 권한이 필요합니다',
    message: '운동 경로를 추적하기 위해 위치 정보가 필요합니다.',
    benefits: [
      '실시간 거리 및 속도 측정',
      '정확한 경로 기록',
      '자동 페이스 계산'
    ],
    privacy: '위치 정보는 기기에만 저장되며, 외부로 전송되지 않습니다.'
  });

  if (!userConsent) {
    return 'denied';
  }

  // 3. Request browser permission
  try {
    await navigator.geolocation.getCurrentPosition(() => {});
    return 'granted';
  } catch (error) {
    return 'denied';
  }
}
```

### Settings Guide (Platform-Specific)

```typescript
function showPermissionSettingsGuide() {
  const platform = detectPlatform();

  const guides = {
    ios: {
      steps: [
        '설정 앱 열기',
        'Safari 또는 Chrome 찾기',
        '위치 → 사용 중 허용',
        '앱으로 돌아오기'
      ],
      image: '/assets/ios-permission-guide.png'
    },
    android: {
      steps: [
        '설정 → 앱',
        'Chrome 또는 브라우저 선택',
        '권한 → 위치',
        '허용으로 변경'
      ],
      image: '/assets/android-permission-guide.png'
    },
    desktop: {
      steps: [
        '주소창 왼쪽 자물쇠 아이콘 클릭',
        '사이트 설정',
        '위치 → 허용'
      ]
    }
  };

  showModal({
    title: 'GPS 권한 설정 방법',
    content: guides[platform],
    actions: [
      { label: '설정으로 이동', action: () => openSettings() },
      { label: '수동 입력 사용', action: () => useFallbackMode() }
    ]
  });
}
```

---

## Fallback Strategies

### Fallback Hierarchy

```
Priority 1: Real-time GPS (Best)
    │
    ├─ Accuracy check passed ✓
    │
    ▼
Priority 2: Cached Last Known Position
    │
    ├─ GPS temporarily unavailable
    ├─ Age < 5 minutes
    ├─ Accuracy < 100m
    │
    ▼
Priority 3: Network-based Location (IP Geolocation)
    │
    ├─ GPS unavailable
    ├─ Accuracy ~1-5km (city level)
    ├─ Good for start location only
    │
    ▼
Priority 4: Manual Map Pin Selection
    │
    ├─ User drops pin on map
    ├─ Accuracy: User-dependent
    ├─ Good for start/end points
    │
    ▼
Priority 5: Manual Entry (Fallback)
    │
    ├─ No GPS tracking
    ├─ Enter distance/duration manually
    └─ No route data saved
```

### Implementation Strategy

```typescript
interface FallbackOptions {
  useLastKnown: boolean;
  useNetworkLocation: boolean;
  allowMapPin: boolean;
  allowManualEntry: boolean;
}

async function getPositionWithFallback(
  options: FallbackOptions
): Promise<Position | null> {
  // Try 1: Real-time GPS
  try {
    const position = await getCurrentPosition({ timeout: 10000 });
    if (position.accuracy < ACCURACY_THRESHOLDS.ACCEPTABLE) {
      return position;
    }
  } catch (error) {
    console.warn('GPS failed, trying fallback');
  }

  // Try 2: Last Known Position
  if (options.useLastKnown) {
    const cached = getLastKnownPosition();
    if (cached && isFreshEnough(cached) && isAccurateEnough(cached)) {
      showNotification('마지막 위치 사용 중', 'warning');
      return cached;
    }
  }

  // Try 3: Network Location
  if (options.useNetworkLocation) {
    try {
      const networkPos = await getNetworkLocation();
      showNotification('네트워크 위치 사용 중 (정확도 낮음)', 'warning');
      return networkPos;
    } catch (error) {
      console.warn('Network location failed');
    }
  }

  // Try 4: Map Pin Selection
  if (options.allowMapPin) {
    showModal('GPS 신호를 찾을 수 없습니다. 지도에서 위치를 선택하시겠습니까?');
    const userSelection = await waitForMapPinSelection();
    if (userSelection) {
      return userSelection;
    }
  }

  // Try 5: Manual Entry Mode
  if (options.allowManualEntry) {
    showModal('GPS를 사용할 수 없습니다. 수동 입력 모드로 전환합니다.');
    switchToManualMode();
    return null;
  }

  // Complete failure
  throw new Error('No position available');
}
```

### Cached Position Strategy

```typescript
interface CachedPosition {
  position: Position;
  timestamp: number;
  source: 'gps' | 'network' | 'user';
}

class PositionCache {
  private cache: CachedPosition | null = null;
  private readonly MAX_AGE = 5 * 60 * 1000; // 5 minutes

  save(position: Position, source: 'gps' | 'network' | 'user') {
    this.cache = {
      position,
      timestamp: Date.now(),
      source
    };

    // Persist to localStorage for app restart
    localStorage.setItem('lastKnownPosition', JSON.stringify(this.cache));
  }

  get(): CachedPosition | null {
    // Try memory first
    if (this.cache && this.isFresh(this.cache)) {
      return this.cache;
    }

    // Try localStorage
    const stored = localStorage.getItem('lastKnownPosition');
    if (stored) {
      const cached = JSON.parse(stored);
      if (this.isFresh(cached)) {
        this.cache = cached;
        return cached;
      }
    }

    return null;
  }

  private isFresh(cached: CachedPosition): boolean {
    return Date.now() - cached.timestamp < this.MAX_AGE;
  }

  clear() {
    this.cache = null;
    localStorage.removeItem('lastKnownPosition');
  }
}
```

---

## Multipath Noise Handling

### Indoor/Urban Challenges

```
Environment Issues:
┌────────────────────────────────────────────────────────┐
│ INDOOR                                                 │
│ • GPS signals blocked by building materials           │
│ • Signal bouncing off walls (multipath)               │
│ • Weak signal strength                                 │
│ • Solution: Kalman filtering + aggressive outlier     │
│   rejection                                            │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ URBAN CANYON (High-rise buildings)                    │
│ • Signal reflection off buildings                      │
│ • Limited sky view                                     │
│ • Sudden jumps in position                            │
│ • Solution: Speed validation + path smoothing          │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ TUNNELS / OVERPASSES                                   │
│ • Complete signal loss                                 │
│ • Dead reckoning needed                                │
│ • Solution: Use last known velocity + time to         │
│   estimate position                                    │
└────────────────────────────────────────────────────────┘
```

### Noise Filtering Strategy

```typescript
class GPSNoiseFilter {
  private positions: Position[] = [];
  private readonly WINDOW_SIZE = 5;
  private readonly MAX_SPEED_KMH = 30; // Maximum realistic running speed
  private readonly MAX_JUMP_METERS = 100; // Maximum realistic position jump

  /**
   * Filter incoming GPS position
   * Returns filtered position or null if rejected
   */
  filter(newPosition: Position): Position | null {
    // 1. Accuracy check
    if (newPosition.accuracy > ACCURACY_THRESHOLDS.MAX_USABLE) {
      console.warn('Position rejected: accuracy too low', newPosition.accuracy);
      return null;
    }

    // 2. Speed validation (no GPS jump)
    if (this.positions.length > 0) {
      const lastPos = this.positions[this.positions.length - 1];
      const timeDelta = (newPosition.timestamp - lastPos.timestamp) / 1000; // seconds
      const distance = calculateDistance(lastPos, newPosition); // km

      if (timeDelta > 0) {
        const speedKmh = (distance / timeDelta) * 3600;

        if (speedKmh > this.MAX_SPEED_KMH) {
          console.warn('Position rejected: unrealistic speed', speedKmh);
          return null;
        }
      }

      // 3. Jump detection
      if (distance > this.MAX_JUMP_METERS / 1000) {
        console.warn('Position rejected: large jump', distance * 1000, 'm');
        return null;
      }
    }

    // 4. Add to window
    this.positions.push(newPosition);
    if (this.positions.length > this.WINDOW_SIZE) {
      this.positions.shift();
    }

    // 5. Apply smoothing (moving average)
    const smoothed = this.applyMovingAverage();

    return smoothed;
  }

  /**
   * Moving average smoothing
   */
  private applyMovingAverage(): Position {
    if (this.positions.length === 0) {
      throw new Error('No positions to average');
    }

    // Weighted average (more recent = higher weight)
    let totalLat = 0;
    let totalLon = 0;
    let totalWeight = 0;

    this.positions.forEach((pos, index) => {
      const weight = index + 1; // Linear weighting (most recent = highest)
      totalLat += pos.latitude * weight;
      totalLon += pos.longitude * weight;
      totalWeight += weight;
    });

    const latest = this.positions[this.positions.length - 1];

    return {
      latitude: totalLat / totalWeight,
      longitude: totalLon / totalWeight,
      accuracy: latest.accuracy,
      timestamp: latest.timestamp
    };
  }

  /**
   * Detect if in indoor/urban environment
   */
  detectEnvironment(): 'outdoor' | 'indoor' | 'urban' {
    if (this.positions.length < 3) {
      return 'outdoor'; // Assume outdoor by default
    }

    const recentPositions = this.positions.slice(-5);

    // Calculate average accuracy
    const avgAccuracy = recentPositions.reduce((sum, p) => sum + p.accuracy, 0) / recentPositions.length;

    // Calculate accuracy variance
    const accuracyVariance = this.calculateVariance(recentPositions.map(p => p.accuracy));

    // High accuracy variance = indoor (signal bouncing)
    if (accuracyVariance > 1000) {
      return 'indoor';
    }

    // Moderate accuracy + low variance = urban canyon
    if (avgAccuracy > 50 && accuracyVariance < 500) {
      return 'urban';
    }

    return 'outdoor';
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Dead reckoning (estimate position when GPS unavailable)
   */
  estimatePosition(timeSinceLastFix: number): Position | null {
    if (this.positions.length < 2) {
      return null;
    }

    // Calculate velocity from last 2 positions
    const lastPos = this.positions[this.positions.length - 1];
    const prevPos = this.positions[this.positions.length - 2];

    const timeDelta = (lastPos.timestamp - prevPos.timestamp) / 1000; // seconds
    const distance = calculateDistance(prevPos, lastPos); // km

    if (timeDelta === 0) {
      return lastPos;
    }

    const velocity = distance / timeDelta; // km/s

    // Bearing (direction)
    const bearing = calculateBearing(prevPos, lastPos);

    // Estimate new position
    const estimatedDistance = velocity * timeSinceLastFix;
    const estimated = projectPosition(lastPos, bearing, estimatedDistance);

    return {
      ...estimated,
      accuracy: 200, // Mark as low confidence
      timestamp: Date.now()
    };
  }

  reset() {
    this.positions = [];
  }
}
```

### Kalman Filter (Advanced)

```typescript
/**
 * Simplified Kalman Filter for GPS smoothing
 * Reduces noise while maintaining responsiveness
 */
class SimpleKalmanFilter {
  private Q = 0.01; // Process variance
  private R = 4;    // Measurement variance (GPS accuracy)
  private P = 1;    // Estimation error covariance
  private K = 0;    // Kalman gain
  private x = { lat: 0, lon: 0 }; // Estimated state

  filter(measurement: { lat: number; lon: number }, accuracy: number): { lat: number; lon: number } {
    // Initialize on first measurement
    if (this.x.lat === 0 && this.x.lon === 0) {
      this.x = measurement;
      return measurement;
    }

    // Adjust R based on GPS accuracy
    this.R = accuracy / 10;

    // Prediction
    this.P = this.P + this.Q;

    // Update (for both lat and lon)
    this.K = this.P / (this.P + this.R);

    this.x.lat = this.x.lat + this.K * (measurement.lat - this.x.lat);
    this.x.lon = this.x.lon + this.K * (measurement.lon - this.x.lon);

    this.P = (1 - this.K) * this.P;

    return { ...this.x };
  }

  reset() {
    this.P = 1;
    this.x = { lat: 0, lon: 0 };
  }
}
```

---

## Offline UX

### Offline Detection & Handling

```
Network States:
┌────────────────────────────────────────────────────────┐
│ ONLINE (Normal Operation)                              │
│ • Real-time API sync                                   │
│ • GPS tracking works normally                          │
│ • Instant save to server                               │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│ OFFLINE DETECTED                                       │
│ • Switch to offline mode                               │
│ • GPS still works (no network needed)                  │
│ • Save to IndexedDB                                    │
│ • Show offline indicator                               │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│ WORKOUT IN PROGRESS (Offline)                         │
│ • Continue GPS tracking                                │
│ • Buffer all position data                             │
│ • No API calls attempted                               │
│ • User can complete workout                            │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│ WORKOUT FINISHED (Offline)                            │
│ • Save to IndexedDB with "pending sync" flag          │
│ • Show "저장됨 (동기화 대기 중)" message                │
│ • Display in workout list (with sync icon)            │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│ ONLINE RECONNECTED                                     │
│ • Detect connectivity restored                         │
│ • Auto-sync pending workouts                           │
│ • Show sync progress                                   │
│ • Update UI on success                                 │
└────────────────────────────────────────────────────────┘
```

### Offline Storage Strategy

```typescript
/**
 * IndexedDB wrapper for offline workout storage
 */
class OfflineWorkoutStore {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'WorkoutDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'workouts';

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store
        const store = db.createObjectStore(this.STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });

        // Create indexes
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      };
    });
  }

  async save(workout: Workout): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const workoutWithStatus = {
        ...workout,
        syncStatus: 'pending',
        savedAt: new Date().toISOString()
      };

      const request = store.add(workoutWithStatus);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSync(): Promise<Workout[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('syncStatus');

      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(id: number, serverId: number) {
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const request = store.get(id);

      request.onsuccess = () => {
        const workout = request.result;
        workout.syncStatus = 'synced';
        workout.serverId = serverId;
        workout.syncedAt = new Date().toISOString();

        const updateRequest = store.put(workout);

        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<Workout[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
```

### Sync Manager

```typescript
/**
 * Background sync manager for offline workouts
 */
class SyncManager {
  private store: OfflineWorkoutStore;
  private isSyncing = false;

  constructor(store: OfflineWorkoutStore) {
    this.store = store;

    // Listen for online event
    window.addEventListener('online', () => {
      this.syncPendingWorkouts();
    });

    // Try sync on app load (if online)
    if (navigator.onLine) {
      this.syncPendingWorkouts();
    }
  }

  async syncPendingWorkouts() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('Cannot sync: offline');
      return;
    }

    this.isSyncing = true;
    showNotification('운동 기록 동기화 중...', 'info');

    try {
      const pendingWorkouts = await this.store.getPendingSync();

      if (pendingWorkouts.length === 0) {
        console.log('No workouts to sync');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const workout of pendingWorkouts) {
        try {
          // Upload to server
          const savedWorkout = await workoutAPI.createWorkout(workout);

          // Mark as synced in IndexedDB
          await this.store.markSynced(workout.id!, savedWorkout.id);

          successCount++;
        } catch (error) {
          console.error('Failed to sync workout', workout.id, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        showNotification(
          `${successCount}개 운동 기록 동기화 완료`,
          'success'
        );
      }

      if (failCount > 0) {
        showNotification(
          `${failCount}개 운동 기록 동기화 실패. 나중에 다시 시도됩니다.`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Sync failed', error);
      showNotification('동기화 실패. 나중에 다시 시도됩니다.', 'error');
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Manual sync trigger
   */
  async forceSyncNow() {
    await this.syncPendingWorkouts();
  }
}
```

### Offline UI Components

```typescript
/**
 * Offline Indicator Component
 */
function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-banner">
      <span className="offline-icon">📡</span>
      <span>오프라인 모드 - GPS는 정상 작동하며, 온라인 연결 시 자동 동기화됩니다.</span>
    </div>
  );
}

/**
 * Pending Sync Badge
 */
function WorkoutSyncBadge({ syncStatus }: { syncStatus: 'synced' | 'pending' | 'failed' }) {
  if (syncStatus === 'synced') return null;

  const badges = {
    pending: {
      icon: '🔄',
      label: '동기화 대기 중',
      color: 'yellow'
    },
    failed: {
      icon: '⚠️',
      label: '동기화 실패',
      color: 'red'
    }
  };

  const badge = badges[syncStatus];

  return (
    <span className={`sync-badge sync-badge-${badge.color}`}>
      {badge.icon} {badge.label}
    </span>
  );
}
```

---

## Component Architecture

### File Structure

```
src/
├── hooks/
│   ├── useGPS.ts                    # Main GPS hook
│   ├── useGPSPermission.ts          # Permission handling
│   ├── useGPSAccuracy.ts            # Accuracy monitoring
│   ├── useGPSNoise Filter.ts        # Noise filtering
│   ├── useOfflineSync.ts            # Offline sync management
│   └── useNetworkStatus.ts          # Online/offline detection
│
├── services/
│   ├── gpsManager.ts                # GPS service (from previous)
│   ├── gpsNoiseFilter.ts            # Noise filtering logic
│   ├── positionCache.ts             # Position caching
│   ├── offlineStore.ts              # IndexedDB wrapper
│   └── syncManager.ts               # Sync orchestration
│
├── components/
│   ├── GPSStatus/
│   │   ├── GPSStatus.tsx            # Status indicator
│   │   ├── GPSAccuracyBadge.tsx    # Accuracy level display
│   │   └── GPSEnvironmentAlert.tsx  # Indoor/urban warnings
│   │
│   ├── GPSPermission/
│   │   ├── GPSPermissionRequest.tsx # Permission request UI
│   │   ├── GPSPermissionDenied.tsx  # Denial recovery UI
│   │   └── GPSSettingsGuide.tsx     # Platform-specific guide
│   │
│   ├── GPSFallback/
│   │   ├── FallbackModeSelector.tsx # Choose fallback method
│   │   ├── ManualEntryForm.tsx      # Manual distance/time entry
│   │   ├── MapPinSelector.tsx       # Map-based location picker
│   │   └── LastKnownLocation.tsx    # Use cached position
│   │
│   └── Offline/
│       ├── OfflineIndicator.tsx     # Offline mode banner
│       ├── SyncStatusBadge.tsx      # Sync status per workout
│       └── SyncProgressBar.tsx      # Bulk sync progress
│
└── utils/
    ├── gpsCalculations.ts           # Distance, bearing, etc.
    ├── gpsValidation.ts             # Validation helpers
    └── environmentDetection.ts      # Detect indoor/urban
```

---

## Implementation Pseudocode

### Main GPS Hook

```typescript
// src/hooks/useGPS.ts

function useGPS(options: GPSOptions) {
  // State
  const [state, setState] = useState<GPSState>('IDLE');
  const [position, setPosition] = useState<Position | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<GPSError | null>(null);
  const [environment, setEnvironment] = useState<Environment>('outdoor');

  // Services
  const noiseFilter = useRef(new GPSNoiseFilter());
  const kalmanFilter = useRef(new SimpleKalmanFilter());
  const positionCache = useRef(new PositionCache());

  // Permissions
  const { hasPermission, requestPermission, permissionState } = useGPSPermission();

  // Start GPS tracking
  const start = async () => {
    setState('REQUESTING');

    // 1. Request permission
    const granted = await requestPermission();
    if (!granted) {
      setState('DENIED');
      setError({ code: 'GPS_001', message: 'Permission denied' });
      return;
    }

    setState('INITIALIZING');

    // 2. Get initial position
    try {
      const initialPos = await getCurrentPosition({ timeout: 10000 });

      // Validate accuracy
      if (initialPos.accuracy > ACCURACY_THRESHOLDS.ACCEPTABLE) {
        setState('LOW_ACCURACY');
        setError({ code: 'GPS_004', message: 'Low accuracy' });
      } else {
        setState('TRACKING');
      }

      setPosition(initialPos);
      setAccuracy(initialPos.accuracy);
      positionCache.current.save(initialPos, 'gps');

      // 3. Start watching
      watchPosition();
    } catch (error) {
      // Timeout or error
      setState('TIMEOUT');
      setError({ code: 'GPS_003', message: 'GPS timeout' });

      // Try fallback
      await attemptFallback();
    }
  };

  // Watch position updates
  const watchPosition = () => {
    const watchId = navigator.geolocation.watchPosition(
      (rawPosition) => {
        // Filter noise
        const filtered = noiseFilter.current.filter(rawPosition);

        if (!filtered) {
          console.warn('Position rejected by filter');
          return;
        }

        // Apply Kalman smoothing
        const smoothed = kalmanFilter.current.filter(
          { lat: filtered.latitude, lon: filtered.longitude },
          filtered.accuracy
        );

        const finalPosition = {
          ...filtered,
          latitude: smoothed.lat,
          longitude: smoothed.lon
        };

        setPosition(finalPosition);
        setAccuracy(finalPosition.accuracy);

        // Update state based on accuracy
        if (finalPosition.accuracy > ACCURACY_THRESHOLDS.POOR) {
          setState('LOW_ACCURACY');
        } else if (state === 'LOW_ACCURACY' && finalPosition.accuracy < ACCURACY_THRESHOLDS.ACCEPTABLE) {
          setState('TRACKING');
        }

        // Cache for fallback
        positionCache.current.save(finalPosition, 'gps');

        // Detect environment
        const env = noiseFilter.current.detectEnvironment();
        setEnvironment(env);
      },
      (error) => {
        handleGPSError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return watchId;
  };

  // Fallback strategy
  const attemptFallback = async () => {
    // Try cached position
    const cached = positionCache.current.get();
    if (cached && cached.source === 'gps') {
      setState('DEGRADED');
      setPosition(cached.position);
      setAccuracy(cached.position.accuracy);
      return;
    }

    // Show fallback options to user
    showFallbackOptions();
  };

  // Stop tracking
  const stop = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
    setState('FINISHED');
  };

  return {
    state,
    position,
    accuracy,
    error,
    environment,
    start,
    stop,
    hasPermission
  };
}
```

### Permission Hook

```typescript
// src/hooks/useGPSPermission.ts

function useGPSPermission() {
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [hasPermission, setHasPermission] = useState(false);

  // Check permission status
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionState(result.state);
      setHasPermission(result.state === 'granted');

      // Listen for changes
      result.addEventListener('change', () => {
        setPermissionState(result.state);
        setHasPermission(result.state === 'granted');
      });
    } catch (error) {
      // Fallback: try getting position
      try {
        await navigator.geolocation.getCurrentPosition(() => {});
        setHasPermission(true);
      } catch {
        setHasPermission(false);
      }
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    // Show educational prompt first
    const userConsent = await showEducationalPrompt();
    if (!userConsent) {
      return false;
    }

    // Request browser permission
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setHasPermission(true);
          setPermissionState('granted');
          resolve(true);
        },
        () => {
          setHasPermission(false);
          setPermissionState('denied');
          resolve(false);
        }
      );
    });
  };

  return {
    permissionState,
    hasPermission,
    requestPermission,
    checkPermissionStatus
  };
}
```

### Offline Hook

```typescript
// src/hooks/useOfflineSync.ts

function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const store = useRef(new OfflineWorkoutStore());
  const syncManager = useRef<SyncManager | null>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      await store.current.init();
      syncManager.current = new SyncManager(store.current);

      // Load pending count
      const pending = await store.current.getPendingSync();
      setPendingCount(pending.length);
    };

    init();
  }, []);

  // Listen for online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (syncManager.current) {
        syncManager.current.syncPendingWorkouts();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save workout (online or offline)
  const saveWorkout = async (workout: Workout) => {
    if (isOnline) {
      try {
        // Try online save
        const saved = await workoutAPI.createWorkout(workout);
        return saved;
      } catch (error) {
        // Fallback to offline
        console.warn('Online save failed, saving offline', error);
      }
    }

    // Save offline
    const id = await store.current.save(workout);
    setPendingCount(prev => prev + 1);

    return { ...workout, id, syncStatus: 'pending' };
  };

  // Manual sync trigger
  const triggerSync = async () => {
    if (!isOnline) {
      showNotification('오프라인 상태입니다', 'error');
      return;
    }

    setIsSyncing(true);
    await syncManager.current?.forceSyncNow();
    setIsSyncing(false);

    // Reload pending count
    const pending = await store.current.getPendingSync();
    setPendingCount(pending.length);
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    saveWorkout,
    triggerSync
  };
}
```

---

**End of GPS UX Design Document**

---

## Summary

This design provides:

✅ **Complete GPS state machine** with 10 states
✅ **Accuracy thresholds** with contextual adjustment
✅ **Permission flow** with educational prompts and platform-specific guides
✅ **4-tier fallback hierarchy** (Cached → Network → Map Pin → Manual)
✅ **Multipath noise handling** with Kalman filtering and outlier rejection
✅ **Offline UX** with IndexedDB storage and auto-sync
✅ **Component architecture** with 20+ files organized by responsibility
✅ **Implementation pseudocode** for all major hooks and services

**Next Steps**:
1. Implement core `useGPS` hook
2. Build permission flow components
3. Add noise filtering service
4. Implement offline storage
5. Create UI components for all states
6. Add comprehensive tests

Would you like me to implement any specific component or hook from this design?
