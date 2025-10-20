/**
 * GPS 트랙 처리 유틸리티
 * 순수 함수로 구성, I/O 없음
 */

export interface TrackPoint {
  lat: number;
  lon: number;
  t: number; // timestamp (ms)
  accuracy?: number; // meters
}

export interface MergedTrack {
  polyline: [number, number][]; // [lat, lon][]
  distanceKm: number;
  movingTimeMin: number;
  avgPace: string; // "M:SS" format
  totalPoints: number;
  filteredPoints: number;
}

/**
 * GPS 정확도 임계값 (미터)
 * 30m 이상의 정확도를 가진 포인트는 제외
 */
const ACCURACY_THRESHOLD = 30;

/**
 * Haversine 공식으로 두 GPS 좌표 간 거리 계산 (km)
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 평균 페이스 계산 (분:초/km)
 */
function calculateAvgPace(distanceKm: number, timeMin: number): string {
  if (distanceKm === 0) return '--:--';
  const paceMin = timeMin / distanceKm;
  const minutes = Math.floor(paceMin);
  const seconds = Math.round((paceMin - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 오늘 세션들의 GPS 트랙을 병합하고 집계
 *
 * @param sessionsToday - 오늘의 운동 세션 배열
 * @returns 병합된 트랙 정보
 */
export function mergeTodaySegments(
  sessionsToday: Array<{
    path?: TrackPoint[];
    elapsedMs?: number;
  }>
): MergedTrack {
  let allPoints: TrackPoint[] = [];

  // 모든 세션의 포인트 수집
  for (const session of sessionsToday) {
    if (session.path && Array.isArray(session.path)) {
      allPoints = allPoints.concat(session.path);
    }
  }

  const totalPoints = allPoints.length;

  // 정확도 필터링 (accuracy > 30m 제거)
  const filteredPoints = allPoints.filter(
    (p) => p.accuracy === undefined || p.accuracy <= ACCURACY_THRESHOLD
  );

  // 시간순 정렬
  filteredPoints.sort((a, b) => a.t - b.t);

  // 폴리라인 생성 ([lat, lon] 형식)
  const polyline: [number, number][] = filteredPoints.map((p) => [p.lat, p.lon]);

  // 거리 계산
  let distanceKm = 0;
  for (let i = 1; i < filteredPoints.length; i++) {
    const prev = filteredPoints[i - 1];
    const curr = filteredPoints[i];
    distanceKm += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
  }

  // 이동 시간 계산 (모든 세션의 elapsedMs 합산)
  let movingTimeMs = 0;
  for (const session of sessionsToday) {
    if (session.elapsedMs) {
      movingTimeMs += session.elapsedMs;
    }
  }
  const movingTimeMin = movingTimeMs / 60000;

  // 평균 페이스
  const avgPace = calculateAvgPace(distanceKm, movingTimeMin);

  return {
    polyline,
    distanceKm: Math.round(distanceKm * 100) / 100, // 소수점 2자리
    movingTimeMin: Math.round(movingTimeMin * 10) / 10, // 소수점 1자리
    avgPace,
    totalPoints,
    filteredPoints: filteredPoints.length,
  };
}

/**
 * YYYY-MM-DD 형식의 날짜 문자열 생성 (로컬 타임존)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 세션이 특정 날짜에 시작했는지 확인
 */
export function isSessionOnDate(sessionDate: string, targetDate: string): boolean {
  // sessionDate: ISO string 또는 YYYY-MM-DD
  // targetDate: YYYY-MM-DD
  if (!sessionDate) return false;
  const sessionDay = sessionDate.split('T')[0]; // ISO에서 날짜 부분만 추출
  return sessionDay === targetDate;
}
