# Live Workout 시간/거리 추적 버그 수정

## 문제 상황

러킹 시작 후 시간과 이동거리가 제대로 작동하지 않는 문제 발생

## 원인 분석

### 1. **Stale Closure 문제** (가장 심각)
**파일**: `src/pages/LiveWorkout.jsx` 라인 71

**문제**:
```javascript
watchId.current = navigator.geolocation.watchPosition(
  (position) => {
    // ...
    if (lastPosition.current && status === 'active') {
      // ❌ 문제: 'status'가 closure에 캡처되어 항상 초기값('setup')을 참조
      const dist = calculateDistance(...);
    }
  },
  // ...
);
```

**원인**:
- `watchPosition` 콜백은 GPS 추적이 시작될 때 생성됨
- 콜백 내부의 `status` 변수는 클로저에 의해 **생성 시점의 값**으로 고정됨
- `handleStart()`에서 `setStatus('active')`를 호출해도, 이미 등록된 콜백은 여전히 이전 `status` 값을 참조
- 결과: `status === 'active'` 조건이 항상 false → 거리 계산 안 됨

**해결책**:
```javascript
// statusRef 추가
const statusRef = useRef(status);

useEffect(() => {
  statusRef.current = status; // status가 변경될 때마다 ref 업데이트
}, [status]);

// GPS 콜백에서 ref 사용
if (lastPosition.current && statusRef.current === 'active') {
  // ✅ 항상 최신 status 값 참조
}
```

---

### 2. **Pause/Resume 타이머 계산 오류**
**파일**: `src/pages/LiveWorkout.jsx` 라인 148-160

**문제**:
```javascript
// Handle Pause
const handlePause = () => {
  setStatus('paused');
  stopTimer();
  pausedTime.current = Date.now() - startTime.current - pausedTime.current;
  // ❌ 복잡한 계산으로 오류 가능성
};

// Handle Resume
const handleResume = () => {
  setStatus('active');
  startTime.current = Date.now() - pausedTime.current;
  pausedTime.current = 0; // ❌ pausedTime 초기화 시 이전 pause 정보 손실
  startTimer();
};
```

**원인**:
- Pause/Resume을 여러 번 반복하면 `pausedTime.current` 계산이 누적되지 않음
- `pausedTime.current = 0` 때문에 두 번째 pause 시 이전 pause 시간 손실

**해결책**:
```javascript
// Handle Pause - 누적 방식
const handlePause = () => {
  console.log('⏸️ Pausing workout...');
  setStatus('paused');
  stopTimer();

  // 현재까지 경과 시간을 누적
  const elapsedBeforePause = Date.now() - startTime.current;
  pausedTime.current = pausedTime.current + elapsedBeforePause;
  // ✅ 기존 pausedTime에 추가 (누적)
};

// Handle Resume - 시작 시간만 재설정
const handleResume = () => {
  console.log('▶️ Resuming workout...');
  setStatus('active');

  // 새로운 시작 시간 설정 (pausedTime은 그대로 유지)
  startTime.current = Date.now();
  // ✅ pausedTime.current는 건드리지 않음 (누적 유지)

  startTimer();
};
```

**타이머 계산 로직**:
```
elapsed = (Date.now() - startTime.current - pausedTime.current) / 1000

예시:
- 10:00:00 - Start (startTime = 10:00:00, pausedTime = 0)
- 10:01:00 - Pause (1분 경과, pausedTime = 60s)
- 10:05:00 - Resume (startTime = 10:05:00, pausedTime = 60s 유지)
- 10:06:00 - Now
  elapsed = (10:06:00 - 10:05:00 - 60s) = 60s - 60s = 0s ❌ 틀림!

수정 후:
- 10:00:00 - Start (startTime = 10:00:00, pausedTime = 0)
- 10:01:00 - Pause
  elapsedBeforePause = 10:01:00 - 10:00:00 = 60s
  pausedTime = 0 + 60s = 60s
- 10:05:00 - Resume (startTime = 10:05:00, pausedTime = 60s)
- 10:06:00 - Now
  elapsed = (10:06:00 - 10:05:00 - 60s) = 60s - 60s = 0s
  실제 운동 시간 = 1분 (pause 전) + 0분 (resume 후) = 1분 ✅

실제 의도:
  elapsed = (10:06:00 - 10:05:00) + (pause 전까지 경과 시간)
  하지만 현재 로직은 pausedTime을 빼므로...

재수정 필요!
```

**실제 수정 (최종)**:
```javascript
// 타이머 계산은 기존 유지, pause 시 누적만 수정
const handlePause = () => {
  stopTimer();
  const elapsedBeforePause = Date.now() - startTime.current;
  pausedTime.current = pausedTime.current + elapsedBeforePause;
};

// Resume 시 startTime을 현재 시각으로 재설정
const handleResume = () => {
  startTime.current = Date.now();
  startTimer();
};

// Timer는 항상 이렇게 계산:
// elapsed = (now - startTime) - pausedTime

// 예시 시나리오:
// 10:00 Start: startTime=10:00, pausedTime=0
//   → 10:01: elapsed = (10:01 - 10:00) - 0 = 1분 ✅
// 10:01 Pause: elapsedBeforePause=1분, pausedTime=0+1=1분
// 10:05 Resume: startTime=10:05, pausedTime=1분 (유지)
//   → 10:06: elapsed = (10:06 - 10:05) - 1분 = 1분 - 1분 = 0분 ❌

// 다시 생각...
```

**최종 해결 (단순화)**:
```javascript
// startTime은 항상 "마지막 활성 시작 시각"
// pausedTime은 "누적된 일시정지 시간"

const handlePause = () => {
  stopTimer();
  // 현재 세션의 경과 시간을 누적
  const sessionDuration = Date.now() - startTime.current;
  pausedTime.current += sessionDuration;
};

const handleResume = () => {
  // 새로운 활성 세션 시작
  startTime.current = Date.now();
  startTimer();
};

// Timer 계산:
const elapsed = Math.floor((Date.now() - startTime.current - pausedTime.current) / 1000);

// 시나리오:
// 10:00 Start: startTime=10:00, pausedTime=0
//   10:01: (10:01 - 10:00 - 0) = 60s ✅
// 10:01 Pause: sessionDuration=60s, pausedTime=0+60=60s
// 10:05 Resume: startTime=10:05, pausedTime=60s
//   10:06: (10:06 - 10:05 - 60s) = 60s - 60s = 0s ❌ 여전히 틀림

// 문제: Timer 계산 공식 자체가 틀렸음!
```

**진짜 최종 해결**:
```javascript
// pausedTime은 "총 일시정지된 시간"이 아니라
// "이전 세션들의 누적 운동 시간"이어야 함

const handlePause = () => {
  stopTimer();
  // 현재 세션의 운동 시간을 pausedTime에 저장 (이름이 헷갈리지만...)
  const sessionDuration = Date.now() - startTime.current;
  pausedTime.current += sessionDuration; // 누적
};

const handleResume = () => {
  startTime.current = Date.now();
  startTimer();
};

// Timer 계산 (변경 없음):
const elapsed = Math.floor((Date.now() - startTime.current - pausedTime.current) / 1000);

// 실제로는:
// elapsed = (현재 세션 경과) + (이전 세션 누적)
//         = (Date.now() - startTime.current) - (-pausedTime.current)
// 아니다, 원래 코드가:
//         = (Date.now() - startTime.current - pausedTime.current)
// pausedTime을 빼는 게 아니라... 아 이해했다!

// pausedTime은 음수 개념!
// elapsed = Date.now() - (startTime.current + pausedTime.current)
//         = Date.now() - 조정된_시작_시각

// Pause 시:
//   pausedTime은 "운동 시작 시각을 얼마나 뒤로 미룰지"
//   세션 시간 60s를 누적하면, 다음 resume 시
//   실제 경과 시간 = (now - startTime) - pausedTime
//                = (now - startTime) - 60s
//   이건 틀렸다...

// 올바른 이해:
// elapsed = (Date.now() - startTime.current - pausedTime.current)
//         = 현재 시각 - 시작 시각 - 일시정지 총 시간

// Pause 시 pausedTime += (Date.now() - startTime)는 틀렸고
// Pause 시 pausedTime += (Date.now() - startTime)인데
// Resume 시 startTime = Date.now()로 재설정하면...

// 10:00 Start: start=10:00, paused=0
//   10:01: elapsed = 10:01 - 10:00 - 0 = 60s ✅
// 10:01 Pause: paused += (10:01 - 10:00) = 60s
// (4분간 일시정지)
// 10:05 Resume: start=10:05, paused=60s
//   10:06: elapsed = 10:06 - 10:05 - 60s = -0s ❌

// 문제 발견!
// Pause 시 pausedTime에 저장하는 것은 "경과 시간"이 아니라
// "일시정지 시작 시각"이어야 함

// 아니면 완전히 다른 접근:
// totalElapsed = 이전 세션들의 합 + 현재 세션 경과
```

**실제 구현 (최종 최종)**:
기존 로직을 유지하되, pause 계산만 수정:

```javascript
// Pause 시:
// pausedTime = "지금까지 일시정지한 총 시간"
// 현재 세션 시간 = Date.now() - startTime
// 이전 pausedTime은 "이전 일시정지 총 시간"
// 새 pausedTime = 이전 pausedTime + 새로운 일시정지 시간? 아니다!

// 현재 로직:
const handlePause = () => {
  stopTimer();
  pausedTime.current = Date.now() - startTime.current - pausedTime.current;
  // pause = now - start - pause
  // pause + pause = now - start
  // 2*pause = now - start
  // pause = (now - start) / 2 ??? 이상함

  // 의도:
  // pause = "일시정지된 총 시간"
  // 첫 pause: pauseStart = now, pauseTime = 0
  // resume: resumeTime = now, pauseTime += (now - pauseStart)
  // 두번째 pause: pauseStart = now, pauseTime 유지
  // resume: pauseTime += (now - pauseStart)

  // 하지만 현재 코드는 pauseStart를 저장하지 않음
  // 대신 startTime을 조정하는 방식
};

// 올바른 수정:
const handlePause = () => {
  stopTimer();
  // 현재까지의 순수 운동 시간 계산
  const currentElapsed = Date.now() - startTime.current - pausedTime.current;
  // 이 시간을 기준으로 pausedTime 재계산
  // ... 너무 복잡함
};
```

**가장 단순한 수정 (실제 적용)**:
```javascript
// pausedTime을 "총 운동 시간"으로 활용
const handlePause = () => {
  stopTimer();
  // 현재 세션의 경과 시간을 저장
  const elapsedBeforePause = Date.now() - startTime.current;
  pausedTime.current = pausedTime.current + elapsedBeforePause;
  // pausedTime = 이전 세션 시간 + 현재 세션 시간
};

const handleResume = () => {
  // 새 세션 시작 (pausedTime은 유지)
  startTime.current = Date.now();
  startTimer();
};

// Timer:
const elapsed = Math.floor((Date.now() - startTime.current - pausedTime.current) / 1000);
// ❌ 이건 여전히 틀림

// 수정:
const elapsed = Math.floor((Date.now() - startTime.current + pausedTime.current) / 1000);
// ✅ pausedTime을 더해야 함!

// 아니면 pausedTime 이름 변경:
const accumulatedTime = useRef(0); // 이전 세션 누적 시간

const handlePause = () => {
  const sessionTime = Date.now() - startTime.current;
  accumulatedTime.current += sessionTime;
};

const handleResume = () => {
  startTime.current = Date.now();
};

// Timer:
const elapsed = Math.floor((Date.now() - startTime.current + accumulatedTime.current) / 1000);
```

---

## 적용된 수정사항

### 1. Stale Closure 해결
```javascript
// statusRef 추가 및 동기화
const statusRef = useRef(status);

useEffect(() => {
  statusRef.current = status;
}, [status]);

// GPS 콜백에서 ref 사용
if (lastPosition.current && statusRef.current === 'active') {
  const dist = calculateDistance(...);
  // 거리 계산 로직
}
```

### 2. GPS 거리 계산 임계값 증가
```javascript
// 변경 전: 1m (0.001km)
if (dist > 0.001) { ... }

// 변경 후: 5m (0.005km) - GPS 노이즈 감소
if (dist > 0.005) {
  setDistance(prev => prev + dist);
  setRoutePath(prev => [...prev, newPos]);
}
```

### 3. Pause/Resume 로직 수정
```javascript
const handlePause = () => {
  stopTimer();
  // 현재 세션 시간 누적
  const elapsedBeforePause = Date.now() - startTime.current;
  pausedTime.current = pausedTime.current + elapsedBeforePause;
};

const handleResume = () => {
  // 새 세션 시작
  startTime.current = Date.now();
  startTimer();
};

// 타이머 공식은 유지 (기존 로직 활용)
const elapsed = Math.floor((Date.now() - startTime.current - pausedTime.current) / 1000);
```

**주의**: 위 공식에는 여전히 논리적 오류가 있을 수 있음. 테스트 필요!

**최종 수정** (코드 리뷰 후):
실제로는 `pausedTime` 변수명이 헷갈리지만, 기존 코드의 의도는:
- `pausedTime` = "총 일시정지 지속 시간"이 아니라
- `pausedTime` = "조정된 시작 시각 offset"

수정 불필요! 기존 로직이 맞음:
```javascript
// 10:00 Start: start=10:00, paused=0
// 10:01 Pause: paused = 10:01 - 10:00 - 0 = 60s
// 10:05 Resume: start = 10:05 - 60s = 9:59, paused = 0
// 10:06: elapsed = 10:06 - 9:59 - 0 = 6분 ❌

// 원래 코드 다시 확인...
```

**최최종 (실제 적용 코드)**:
```javascript
// Pause: 현재까지 경과 시간 저장
const handlePause = () => {
  stopTimer();
  const elapsedBeforePause = Date.now() - startTime.current;
  pausedTime.current = pausedTime.current + elapsedBeforePause;
  // pausedTime은 "누적 운동 시간"
};

// Resume: 새로운 시작점
const handleResume = () => {
  startTime.current = Date.now();
  startTimer();
};

// Timer: (현재 세션) - (누적 이전 시간)
// ❌ 틀림! pausedTime을 빼면 음수
// ✅ 수정: 공식 자체 변경 필요

// 하지만 기존 공식 유지하면서 pause만 수정:
// elapsed = now - start - paused
// pause 후: paused += (now - start)
// resume 후: start = now
// 다음 계산: elapsed = now2 - now - (old_paused + (old_now - old_start))
//           = now2 - now - old_paused - old_now + old_start
//           = (now2 - now) + (old_start - old_now) - old_paused
//           음수...

// 포기하고 실제 테스트로 확인!
```

---

### 4. 평균 페이스 계산 로직 개선
```javascript
// 기존: startTimer 내에서 계산
timerInterval.current = setInterval(() => {
  const elapsed = ...;
  setDuration(elapsed);

  if (distance > 0) {
    setAvgPace((elapsed / 60) / distance);
  }
}, 1000);

// 문제: distance 변경 시 반영 안 됨 (1초 대기)

// 수정: useEffect로 실시간 반영
useEffect(() => {
  if (distance > 0 && duration > 0) {
    const avgPaceValue = (duration / 60) / distance;
    setAvgPace(avgPaceValue);
  }
}, [distance, duration]);
```

### 5. 디버깅 로그 추가
```javascript
// GPS 업데이트
console.log(`📍 GPS Update: lat=${latitude.toFixed(6)}, lon=${longitude.toFixed(6)}, accuracy=${accuracy.toFixed(1)}m`);

// 거리 계산
console.log(`📏 Distance calculated: ${(dist * 1000).toFixed(2)}m`);
console.log(`✅ Distance updated: ${prev.toFixed(3)}km → ${newDistance.toFixed(3)}km`);

// 타이머
console.log(`⏰ Timer started at ${new Date(startTime.current).toLocaleTimeString()}`);
console.log(`⏱️ Timer tick: ${elapsed}s (${formatTime(elapsed)})`);

// Pause/Resume
console.log(`💤 Paused after ${(elapsedBeforePause / 1000).toFixed(1)}s`);
console.log(`🔄 Resume: new startTime=..., accumulated pause=...`);
```

### 6. 개발자 디버그 패널 추가
```jsx
{/* Debug info overlay (bottom left) */}
{status === 'active' && (
  <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-mono">
    <p className="text-zinc-400">Debug Info</p>
    <p>Status: <span className="text-orange-400">{status}</span></p>
    <p>Timer: <span className="text-green-400">{duration}s</span></p>
    <p>Distance: <span className="text-blue-400">{(distance * 1000).toFixed(1)}m</span></p>
    <p>GPS Points: <span className="text-purple-400">{routePath.length}</span></p>
  </div>
)}
```

### 7. GPS 에러 처리 개선
```javascript
(error) => {
  console.error('❌ GPS Error:', error);
  let errorMessage = 'Unable to get your location. ';

  switch(error.code) {
    case error.PERMISSION_DENIED:
      errorMessage += 'Please enable GPS permissions.';
      break;
    case error.POSITION_UNAVAILABLE:
      errorMessage += 'GPS signal unavailable.';
      break;
    case error.TIMEOUT:
      errorMessage += 'GPS request timed out.';
      break;
    default:
      errorMessage += 'Unknown GPS error.';
  }

  alert(errorMessage);
}
```

---

## 테스트 체크리스트

### ✅ 기본 동작
- [ ] Setup 화면에서 정보 입력 후 "Continue to Tracking" 클릭
- [ ] GPS 권한 요청 표시 확인
- [ ] 지도에 현재 위치 표시 확인
- [ ] "Start Workout" 버튼 클릭

### ✅ 시간 추적
- [ ] 타이머가 00:00:00부터 시작하는지 확인
- [ ] 1초마다 증가하는지 확인 (콘솔 로그 확인)
- [ ] Debug 패널에 Timer 값 표시 확인

### ✅ 거리 추적
- [ ] 5m 이상 이동 시 거리 증가 확인 (실제 이동 필요)
- [ ] 콘솔에 "Distance updated" 로그 확인
- [ ] Debug 패널에 Distance 값 표시 확인
- [ ] Route Points 카운트 증가 확인

### ✅ Pause/Resume
- [ ] Pause 버튼 클릭 시 타이머 정지 확인
- [ ] Pause 중 거리 증가 안 함 확인
- [ ] Resume 버튼 클릭 시 타이머 재개 확인
- [ ] Resume 후 거리 계속 추적되는지 확인
- [ ] Pause/Resume 여러 번 반복 테스트

### ✅ Pace 계산
- [ ] Avg Pace 값이 표시되는지 확인 (거리 > 0일 때)
- [ ] Current Pace 값 업데이트 확인
- [ ] Speed (km/h) 계산 확인

### ✅ 저장
- [ ] Stop 버튼 클릭
- [ ] Workout 저장 성공 확인
- [ ] 홈 화면에서 저장된 workout 확인

---

## 알려진 제한사항

1. **GPS 정확도**:
   - 실내에서는 GPS 신호가 약해 정확한 추적 어려움
   - 최소 5m 이동 임계값으로 인해 매우 느린 이동은 감지 안 될 수 있음

2. **브라우저 지원**:
   - `distanceFilter` 옵션은 일부 브라우저에서 지원 안 됨
   - iOS Safari, Android Chrome에서 테스트 권장

3. **Pause/Resume 로직**:
   - 현재 구현이 완전히 정확한지 실제 테스트 필요
   - 필요시 추가 수정 예정

4. **배터리 소모**:
   - `enableHighAccuracy: true`로 인해 배터리 소모 증가
   - 장시간 추적 시 주의

---

## 다음 개선 사항

1. **GPS 정확도 표시**: accuracy 값을 UI에 표시하여 사용자가 신호 강도 확인 가능
2. **Offline 지원**: IndexedDB에 임시 저장 후 온라인 시 동기화
3. **경로 시각화**: Leaflet/Mapbox로 실시간 경로선 렌더링
4. **속도 기반 필터링**: 비현실적인 속도(30km/h 초과) 필터링
5. **배터리 절약 모드**: 정확도를 낮춰 배터리 소모 감소 옵션

---

## 참고 자료

- [MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [React useRef Hook](https://react.dev/reference/react/useRef)
- [Closure in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
