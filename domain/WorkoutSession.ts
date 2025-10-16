/**
 * 운동 세션 상태 머신
 * - idle: 시작 전
 * - running: 진행 중
 * - paused: 일시정지
 * - ended: 종료됨
 */
export type WorkoutState = 'idle' | 'running' | 'paused' | 'ended';

export interface WorkoutSession {
  state: WorkoutState;

  // 단조 시간 (monotonic time) - 드리프트 없음
  startMonotonic: number; // performance.now() 또는 systemUptime
  pauseAccum: number; // 일시정지 누적 시간 (ms)
  lastPauseStart: number | null;

  // 이동 통계 (움직이는 동안만 측정)
  movingTime: number; // ms - 실제 이동한 시간만
  movingDistance: number; // m - 실제 이동한 거리만
  totalDistance: number; // m - 전체 거리

  // 속도/페이스
  avgSpeed: number; // km/h
  currentPace: number | null; // min/km, null이면 '--:--'

  // 경로
  path: Array<{
    lat: number;
    lng: number;
    timestamp: number;
    accuracy: number;
  }>;

  // 정지 감지
  lastMovingTimestamp: number; // 마지막으로 움직인 시간
  stoppedDuration: number; // 정지 지속 시간 (ms)
}

/**
 * 초기 세션 생성
 */
export function createSession(startMonotonic: number): WorkoutSession {
  return {
    state: 'idle',
    startMonotonic,
    pauseAccum: 0,
    lastPauseStart: null,
    movingTime: 0,
    movingDistance: 0,
    totalDistance: 0,
    avgSpeed: 0,
    currentPace: null,
    path: [],
    lastMovingTimestamp: startMonotonic,
    stoppedDuration: 0,
  };
}

/**
 * 경과 시간 계산 (일시정지 시간 제외)
 */
export function getElapsedTime(
  session: WorkoutSession,
  currentMonotonic: number
): number {
  if (session.state === 'idle') return 0;

  let elapsed = currentMonotonic - session.startMonotonic - session.pauseAccum;

  // 현재 일시정지 중이면 추가 시간 제외
  if (session.state === 'paused' && session.lastPauseStart !== null) {
    elapsed -= (currentMonotonic - session.lastPauseStart);
  }

  return Math.max(0, elapsed);
}

/**
 * 시간 포맷 (mm:ss 또는 HH:mm:ss)
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    // 1시간 이상: HH:mm:ss
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    // 1시간 미만: mm:ss
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * 페이스 포맷 (min/km)
 * null이면 '--:--' 반환
 */
export function formatPace(paceMinPerKm: number | null): string {
  if (paceMinPerKm === null || !isFinite(paceMinPerKm)) {
    return '--:--';
  }

  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.floor((paceMinPerKm - minutes) * 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 세션 시작
 */
export function startSession(session: WorkoutSession): WorkoutSession {
  if (session.state !== 'idle') return session;

  return {
    ...session,
    state: 'running',
  };
}

/**
 * 세션 일시정지
 */
export function pauseSession(
  session: WorkoutSession,
  currentMonotonic: number
): WorkoutSession {
  if (session.state !== 'running') return session;

  return {
    ...session,
    state: 'paused',
    lastPauseStart: currentMonotonic,
  };
}

/**
 * 세션 재개
 */
export function resumeSession(
  session: WorkoutSession,
  currentMonotonic: number
): WorkoutSession {
  if (session.state !== 'paused') return session;

  const pauseDuration = session.lastPauseStart !== null
    ? currentMonotonic - session.lastPauseStart
    : 0;

  return {
    ...session,
    state: 'running',
    pauseAccum: session.pauseAccum + pauseDuration,
    lastPauseStart: null,
  };
}

/**
 * 세션 종료
 */
export function endSession(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    state: 'ended',
  };
}

/**
 * 위치 업데이트 (움직임 감지 포함)
 * - speed < 0.4 m/s가 5초 이상 지속되면 정지로 간주
 * - 정지 중에는 movingTime/Distance 증가 안 함, pace는 '--:--'
 */
export function updateLocation(
  session: WorkoutSession,
  lat: number,
  lng: number,
  speed: number, // m/s
  accuracy: number,
  currentMonotonic: number
): WorkoutSession {
  if (session.state !== 'running') return session;

  // 정확도 필터: 30m 초과 샘플 무시
  if (accuracy > 30) {
    console.log(`정확도 낮음 (${accuracy.toFixed(1)}m) - 샘플 무시`);
    return session;
  }

  const STOP_THRESHOLD = 0.4; // m/s
  const STOP_DURATION = 5000; // ms

  const isMoving = speed >= STOP_THRESHOLD;

  let newMovingTime = session.movingTime;
  let newMovingDistance = session.movingDistance;
  let newStoppedDuration = session.stoppedDuration;
  let newLastMovingTimestamp = session.lastMovingTimestamp;
  let newCurrentPace = session.currentPace;

  if (isMoving) {
    // 움직이는 중
    const timeSinceLastMoving = currentMonotonic - session.lastMovingTimestamp;
    newMovingTime += timeSinceLastMoving;
    newLastMovingTimestamp = currentMonotonic;
    newStoppedDuration = 0;

    // 거리 계산 (이전 위치와의 거리)
    if (session.path.length > 0) {
      const last = session.path[session.path.length - 1];
      const distance = calculateDistance(
        last.lat,
        last.lng,
        lat,
        lng
      );
      newMovingDistance += distance;
    }

    // 페이스 계산 (movingTime 기준)
    if (newMovingDistance > 0) {
      const paceMinPerKm = (newMovingTime / 1000 / 60) / (newMovingDistance / 1000);
      newCurrentPace = paceMinPerKm;
    }
  } else {
    // 정지 중
    const stopDuration = currentMonotonic - session.lastMovingTimestamp;
    newStoppedDuration = stopDuration;

    // 5초 이상 정지 시 페이스 '--:--'
    if (stopDuration >= STOP_DURATION) {
      newCurrentPace = null;
    }
  }

  const newTotalDistance = session.totalDistance + (
    session.path.length > 0
      ? calculateDistance(
          session.path[session.path.length - 1].lat,
          session.path[session.path.length - 1].lng,
          lat,
          lng
        )
      : 0
  );

  const newAvgSpeed = newMovingTime > 0
    ? (newMovingDistance / 1000) / (newMovingTime / 1000 / 3600)
    : 0;

  return {
    ...session,
    movingTime: newMovingTime,
    movingDistance: newMovingDistance,
    totalDistance: newTotalDistance,
    avgSpeed: newAvgSpeed,
    currentPace: newCurrentPace,
    lastMovingTimestamp: newLastMovingTimestamp,
    stoppedDuration: newStoppedDuration,
    path: [
      ...session.path,
      { lat, lng, timestamp: currentMonotonic, accuracy },
    ],
  };
}

/**
 * Haversine 거리 계산 (미터)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // 지구 반지름 (m)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
