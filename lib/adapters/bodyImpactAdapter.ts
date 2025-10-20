/**
 * BodyImpact 계산을 위한 어댑터
 * - 운동 데이터와 사용자 프로필을 BodyImpactInput으로 변환
 */

import { BodyImpactInput } from '../bodyImpact';
import { calculateMetrics, MetricsInput } from '../trainingMetrics';
import { UserProfile } from '../../src/context/UserProfileContext';

interface WorkoutData {
  distance: number;
  duration: number;
  loadKg?: number;
  avgHR?: number;
  elevation?: number;
}

/**
 * 운동 데이터와 사용자 프로필을 BodyImpactInput으로 변환
 */
export function adaptWorkoutToBodyImpact(
  workout: WorkoutData,
  profile: UserProfile,
  recent7RuckScoreSum: number,
  recent28RuckScoreSum: number
): BodyImpactInput {
  // 1. MetricsInput 구성
  const metricsInput: MetricsInput = {
    bodyWeightKg: profile.bodyWeightKg,
    loadKg: workout.loadKg || profile.defaultLoadKg,
    distanceKm: workout.distance,
    movingTimeMin: workout.duration,
    elevationGainM: workout.elevation || 0,
    hrAvg: workout.avgHR,
    hrMax: profile.maxHR,
    hrRest: 60, // 기본 안정시 심박수 (추후 프로필에 추가 가능)
  };

  // 2. 메트릭 계산
  const metrics = calculateMetrics(metricsInput);

  // 3. BodyImpactInput으로 변환
  const bodyImpactInput: BodyImpactInput = {
    kcal: metrics.kcal,
    trimp: metrics.trimp,
    mechLoadKgKm: metrics.mechLoadKgKm,
    vertWorkKj: metrics.vertWorkKj,
    bms: metrics.bms,
    ruckScore: metrics.ruckScore,
    bodyWeightKg: profile.bodyWeightKg,
    loadKg: workout.loadKg || profile.defaultLoadKg,
    distanceKm: workout.distance,
    movingTimeMin: workout.duration,
    elevationGainM: workout.elevation || 0,
    recent7RuckScoreSum,
    recent28RuckScoreSum,
  };

  return bodyImpactInput;
}
