import { smoothSpeed } from '@/lib/paceSmoother';

/**
 * 위치 업데이트 콜백
 */
export type LocationCallback = (data: {
  lat: number;
  lng: number;
  speed: number; // m/s (스무딩 적용됨)
  accuracy: number;
  heading: number | null;
}) => void;

/**
 * 웹 브라우저 기반 GPS 서비스
 * - navigator.geolocation.watchPosition 사용
 * - 속도 스무딩 (이동 평균 + 간단한 칼만 필터)
 * - 정확도 필터링 (30m 초과 무시)
 */
export class GeoService {
  private watchId: number | null = null;
  private callback: LocationCallback | null = null;
  private lastPosition: { lat: number; lng: number; timestamp: number } | null = null;

  /**
   * 위치 추적 시작
   */
  start(callback: LocationCallback) {
    this.callback = callback;

    if (!navigator.geolocation) {
      console.error('Geolocation을 지원하지 않는 브라우저입니다');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleError(error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  }

  /**
   * 위치 추적 중지
   */
  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.callback = null;
    this.lastPosition = null;
  }

  private handlePosition(position: GeolocationPosition) {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const timestamp = position.timestamp;

    // 정확도 필터: 30m 초과 무시
    if (accuracy > 30) {
      console.log(`정확도 낮음 (${accuracy.toFixed(1)}m) - 샘플 무시`);
      return;
    }

    // 속도 계산
    let computedSpeed = speed ?? 0; // m/s

    // coords.speed가 null이거나 신뢰할 수 없을 때 직접 계산
    if (computedSpeed === null || computedSpeed === 0) {
      if (this.lastPosition) {
        const distance = this.calculateDistance(
          this.lastPosition.lat,
          this.lastPosition.lng,
          latitude,
          longitude
        );
        const timeDelta = (timestamp - this.lastPosition.timestamp) / 1000; // 초
        if (timeDelta > 0) {
          computedSpeed = distance / timeDelta;
        }
      }
    }

    // 속도 스무딩 (이동 평균 + 칼만 필터)
    const smoothedSpeed = smoothSpeed(computedSpeed);

    // 콜백 호출
    if (this.callback) {
      this.callback({
        lat: latitude,
        lng: longitude,
        speed: smoothedSpeed,
        accuracy,
        heading: heading,
      });
    }

    // 마지막 위치 저장
    this.lastPosition = { lat: latitude, lng: longitude, timestamp };
  }

  private handleError(error: GeolocationPositionError) {
    console.error('위치 정보 오류:', error.message);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
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
}
