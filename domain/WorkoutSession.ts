// FILE: /domain/WorkoutSession.ts
// 워크아웃 세션 도메인 모델 - 상태 머신 기반 (idle → running → paused → ended)
// 순수 비즈니스 로직, I/O 없음

export type WorkoutState = 'idle' | 'running' | 'paused' | 'ended';

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy: number; // meters
  timestamp: number; // monotonic time (ms)
  speed?: number; // m/s
  heading?: number; // degrees
}

export interface WorkoutSession {
  id: string;
  state: WorkoutState;
  startTime: number | null; // monotonic time (ms)
  elapsedMs: number; // 실제 경과 시간 (pause 제외)
  movingTimeMs: number; // 이동 시간만 (정지 시 제외)
  pausedAt: number | null;
  totalPausedMs: number;

  // GPS 데이터
  path: GeoPoint[];
  distanceM: number; // 총 이동 거리 (meters)
  elevationGainM: number; // 누적 상승 고도 (meters)

  // 사용자 입력
  bodyWeightKg: number;
  loadKg: number;

  // 심박수 (선택)
  hrAvg?: number;
  hrRest?: number;
  hrMax?: number;

  // RPE (선택, 0-10)
  rpe?: number;
}

/**
 * 새 워크아웃 세션 생성
 */
export function createWorkoutSession(params: {
  bodyWeightKg: number;
  loadKg: number;
  hrRest?: number;
  hrMax?: number;
}): WorkoutSession {
  return {
    id: generateId(),
    state: 'idle',
    startTime: null,
    elapsedMs: 0,
    movingTimeMs: 0,
    pausedAt: null,
    totalPausedMs: 0,
    path: [],
    distanceM: 0,
    elevationGainM: 0,
    bodyWeightKg: params.bodyWeightKg,
    loadKg: params.loadKg,
    hrRest: params.hrRest,
    hrMax: params.hrMax,
  };
}

/**
 * 워크아웃 시작
 */
export function startWorkout(session: WorkoutSession, nowMs: number): WorkoutSession {
  if (session.state !== 'idle') {
    throw new Error(`Cannot start workout in state: ${session.state}`);
  }

  return {
    ...session,
    state: 'running',
    startTime: nowMs,
  };
}

/**
 * 워크아웃 일시정지
 */
export function pauseWorkout(session: WorkoutSession, nowMs: number): WorkoutSession {
  if (session.state !== 'running') {
    throw new Error(`Cannot pause workout in state: ${session.state}`);
  }

  const elapsed = computeElapsed(session, nowMs);

  return {
    ...session,
    state: 'paused',
    pausedAt: nowMs,
    elapsedMs: elapsed,
  };
}

/**
 * 워크아웃 재개
 */
export function resumeWorkout(session: WorkoutSession, nowMs: number): WorkoutSession {
  if (session.state !== 'paused' || session.pausedAt === null) {
    throw new Error(`Cannot resume workout in state: ${session.state}`);
  }

  const pauseDuration = nowMs - session.pausedAt;

  return {
    ...session,
    state: 'running',
    pausedAt: null,
    totalPausedMs: session.totalPausedMs + pauseDuration,
  };
}

/**
 * 워크아웃 종료
 */
export function endWorkout(
  session: WorkoutSession,
  nowMs: number,
  rpe?: number
): WorkoutSession {
  if (session.state !== 'running' && session.state !== 'paused') {
    throw new Error(`Cannot end workout in state: ${session.state}`);
  }

  const elapsed = session.state === 'paused'
    ? session.elapsedMs
    : computeElapsed(session, nowMs);

  return {
    ...session,
    state: 'ended',
    elapsedMs: elapsed,
    rpe,
  };
}

/**
 * GPS 포인트 추가 (정확도 검증 포함)
 */
export function addGeoPoint(
  session: WorkoutSession,
  point: GeoPoint,
  minAccuracyM: number = 30
): WorkoutSession {
  if (session.state !== 'running') {
    return session;
  }

  if (point.accuracy > minAccuracyM) {
    return session;
  }

  const newPath = [...session.path, point];

  let newDistance = session.distanceM;

  if (session.path.length > 0) {
    const prev = session.path[session.path.length - 1];
    const segmentDist = haversineDistance(
      prev.lat, prev.lng,
      point.lat, point.lng
    );
    newDistance += segmentDist;
  }

  return {
    ...session,
    path: newPath,
    distanceM: newDistance,
  };
}

/**
 * 경과 시간 계산 (pause 시간 제외)
 */
export function computeElapsed(session: WorkoutSession, nowMs: number): number {
  if (session.startTime === null) return 0;

  const raw = nowMs - session.startTime;

  if (session.state === 'paused' && session.pausedAt !== null) {
    return session.pausedAt - session.startTime - session.totalPausedMs;
  }

  return raw - session.totalPausedMs;
}

/**
 * Haversine 거리 계산 (meters)
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
