// FILE: /lib/workoutBenefits.ts
// 운동 후 정량화 가능한 러킹 장점 계산

export interface WorkoutBenefitsInput {
  distanceKm: number;
  durationMin: number;
  loadKg?: number;
  bodyWeightKg?: number;
}

export interface WorkoutBenefits {
  cardio: {
    score: number; // 0-100 심폐지구력 점수
    label: string;
    percentage: number; // 0-100 for progress bar
  };
  strength: {
    score: number; // 0-100 근력 점수
    label: string;
    percentage: number;
  };
  bone: {
    score: number; // 0-100 골밀도 점수
    label: string;
    percentage: number;
  };
  calories: {
    kcal: number; // 실제 칼로리
    label: string;
    percentage: number;
  };
  mentalHealth: {
    score: number; // 0-100 정신건강 점수 (운동시간 기반)
    label: string;
    percentage: number;
  };
}

/**
 * 운동 데이터를 바탕으로 러킹의 장점을 정량화
 */
export function calculateWorkoutBenefits(input: WorkoutBenefitsInput): WorkoutBenefits {
  const { distanceKm, durationMin, loadKg = 0, bodyWeightKg = 70 } = input;

  // 1. 심폐지구력 (유산소) - 거리와 시간 기반
  // METs (Metabolic Equivalents) 기반 계산
  const speedKmh = distanceKm / (durationMin / 60);
  let cardioMETs = 3.5; // 기본 걷기

  if (speedKmh >= 6.5) cardioMETs = 6.5; // 빠른 러킹
  else if (speedKmh >= 5.5) cardioMETs = 5.5; // 보통 러킹
  else if (speedKmh >= 4.5) cardioMETs = 4.5; // 천천히 러킹

  // 무게 추가시 METs 증가
  if (loadKg > 0) {
    const loadRatio = loadKg / bodyWeightKg;
    cardioMETs += loadRatio * 2; // 무게 비율에 따라 METs 증가
  }

  const cardioScore = Math.min(100, Math.round((cardioMETs / 8) * 100));
  const cardioLabel = getCardioLabel(cardioScore);

  // 2. 근력 향상 - 무게 부하와 거리 기반
  const totalLoadKg = loadKg + bodyWeightKg;
  const workDone = totalLoadKg * distanceKm; // kg·km
  const strengthScore = Math.min(100, Math.round((workDone / 500) * 100));
  const strengthLabel = getStrengthLabel(strengthScore);

  // 3. 골밀도 증가 - 충격과 부하 기반
  // BMS (Bone Mechanical Stress) 추정
  const stepsEstimate = distanceKm * 1300; // 1km ≈ 1300 steps
  const impactForce = (totalLoadKg * 9.8) / 1000; // kN (체중 + 무게)
  const boneStress = (stepsEstimate * impactForce) / 10000;
  const boneScore = Math.min(100, Math.round(boneStress * 20));
  const boneLabel = getBoneLabel(boneScore);

  // 4. 칼로리 소모 - METs 기반 정확한 계산
  // kcal = METs × 체중(kg) × 시간(h)
  const caloriesBurned = Math.round(cardioMETs * bodyWeightKg * (durationMin / 60));
  const caloriesLabel = getCaloriesLabel(caloriesBurned);
  const caloriesPercentage = Math.min(100, Math.round((caloriesBurned / 600) * 100));

  // 5. 정신 건강 - 운동 시간 기반 (30분 이상 권장)
  const mentalScore = Math.min(100, Math.round((durationMin / 60) * 100));
  const mentalLabel = getMentalLabel(mentalScore);

  return {
    cardio: {
      score: cardioScore,
      label: cardioLabel,
      percentage: cardioScore,
    },
    strength: {
      score: strengthScore,
      label: strengthLabel,
      percentage: strengthScore,
    },
    bone: {
      score: boneScore,
      label: boneLabel,
      percentage: boneScore,
    },
    calories: {
      kcal: caloriesBurned,
      label: caloriesLabel,
      percentage: caloriesPercentage,
    },
    mentalHealth: {
      score: mentalScore,
      label: mentalLabel,
      percentage: mentalScore,
    },
  };
}

// 레벨 라벨 함수들
function getCardioLabel(score: number): string {
  if (score >= 80) return '매우 높음';
  if (score >= 60) return '높음';
  if (score >= 40) return '보통';
  if (score >= 20) return '낮음';
  return '매우 낮음';
}

function getStrengthLabel(score: number): string {
  if (score >= 80) return '강도 높음';
  if (score >= 60) return '강도 중상';
  if (score >= 40) return '강도 중';
  if (score >= 20) return '강도 약';
  return '가벼움';
}

function getBoneLabel(score: number): string {
  if (score >= 80) return '매우 효과적';
  if (score >= 60) return '효과적';
  if (score >= 40) return '보통';
  if (score >= 20) return '약간';
  return '미미함';
}

function getCaloriesLabel(kcal: number): string {
  if (kcal >= 500) return '매우 높음';
  if (kcal >= 350) return '높음';
  if (kcal >= 200) return '보통';
  if (kcal >= 100) return '낮음';
  return '매우 낮음';
}

function getMentalLabel(score: number): string {
  if (score >= 80) return '탁월';
  if (score >= 60) return '우수';
  if (score >= 40) return '양호';
  if (score >= 20) return '보통';
  return '가벼움';
}
