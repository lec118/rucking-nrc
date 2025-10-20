/**
 * 애플리케이션 전역 상수
 */

export const APP_CONSTANTS = {
  // 운동 목표
  WEEKLY_WORKOUT_GOAL: 3,

  // UI 표시 제한
  RECENT_WORKOUTS_DISPLAY_LIMIT: 3,

  // 지도 설정
  MAP_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  MAP_DEFAULT_HEIGHT: '50vh',
  MAP_MIN_HEIGHT: '300px',

  // GPS 필터링
  GPS_ACCURACY_THRESHOLD_METERS: 30,

  // METs 임계값 (대사당량)
  METS: {
    BASE_WALKING: 3.5,
    SLOW_RUCKING: 4.5,      // ~4.5 km/h
    MODERATE_RUCKING: 5.5,  // ~5.5 km/h
    FAST_RUCKING: 6.5,      // ~6.5 km/h
  },

  // 계산 상수
  CALCULATION: {
    STRENGTH_WORK_DIVISOR: 500,     // 근력 점수 계산용
    STEPS_PER_KM: 1300,             // 1km당 예상 걸음 수
    BONE_SCORE_MULTIPLIER: 20,      // 골자극 점수 계산용
    MENTAL_DURATION_DIVISOR: 60,    // 정신건강 점수 계산용 (분 -> 점수)
  },
} as const;
