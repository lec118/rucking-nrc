// FILE: /lib/bodyImpact.ts
// Body Impact 모델 - 순수 함수 (I/O 없음)
// RuckScore 및 서브 메트릭을 신체 영향 레벨(0-5)로 매핑

export type ImpactLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface BodyImpact {
  cardiovascular: ImpactLevel; // 심혈관계 (TRIMP 기반)
  muscular: ImpactLevel; // 근육계 (MechLoad + RuckScore 혼합)
  bone: ImpactLevel; // 골격계 (BMS 기반)
  metabolic: ImpactLevel; // 대사계 (kcal 기반)
  posture: ImpactLevel; // 자세/코어 (Load/BW, Dist, Gain 기반)
  acwr: number; // Acute:Chronic Workload Ratio
  overloadWarning: boolean; // ACWR > 1.5
  heavyLoadWarning: boolean; // Load > 0.2*BW && Dist > 8km
  notes: string[]; // 한국어 팁
}

export interface BodyImpactInput {
  // 세션 메트릭
  kcal: number;
  trimp: number;
  mechLoadKgKm: number;
  vertWorkKj: number;
  bms: number; // 0-10
  ruckScore: number; // 0-100

  // 컨텍스트
  bodyWeightKg: number;
  loadKg: number;
  distanceKm: number;
  movingTimeMin: number;
  elevationGainM: number;
  rpe?: number; // 0-10

  // ACWR 계산용
  recent7RuckScoreSum: number;
  recent28RuckScoreSum: number;
}

// 임계값 상수 (튜닝 가능)
export const IMPACT_THRESHOLDS = {
  // 심혈관계 (TRIMP)
  CV: {
    L0: 0,   // 매우 낮음
    L1: 20,  // 낮음
    L2: 40,  // 보통
    L3: 70,  // 높음
    L4: 110, // 매우 높음
    L5: 150, // 극도로 높음
  },

  // 골격계 (BMS 0-10)
  BONE: {
    L0: 0,
    L1: 1,
    L2: 3,
    L3: 5,
    L4: 7,
    L5: 9,
  },

  // 대사계 (kcal)
  META: {
    L0: 0,
    L1: 150,
    L2: 300,
    L3: 500,
    L4: 700,
    L5: 900,
  },

  // 근육계 정규화 기준
  MUSC_NORM: {
    mechLoad: 120, // kg·km
    ruckScore: 100,
  },

  // 자세 정규화 기준
  POST_NORM: {
    loadRatio: 0.2, // Load/BW
    distance: 10,   // km
    gain: 400,      // m
  },

  // 안전 경고 임계값
  SAFETY: {
    acwrWarning: 1.5,
    heavyLoadRatio: 0.2,
    heavyLoadDistance: 8,
  },
} as const;

/**
 * Body Impact 계산 (순수 함수)
 */
export function calculateBodyImpact(input: BodyImpactInput): BodyImpact {
  const {
    kcal,
    trimp,
    mechLoadKgKm,
    vertWorkKj,
    bms,
    ruckScore,
    bodyWeightKg,
    loadKg,
    distanceKm,
    movingTimeMin,
    elevationGainM,
    rpe,
    recent7RuckScoreSum,
    recent28RuckScoreSum,
  } = input;

  // 1. 심혈관계 (TRIMP)
  const cardiovascular = getCardiovascularLevel(trimp);

  // 2. 근육계 (MechLoad + RuckScore 혼합)
  const muscular = getMuscularLevel(mechLoadKgKm, ruckScore);

  // 3. 골격계 (BMS)
  const bone = getBoneLevel(bms);

  // 4. 대사계 (kcal)
  const metabolic = getMetabolicLevel(kcal);

  // 5. 자세/코어 (Load/BW, Dist, Gain)
  const posture = getPostureLevel(loadKg, bodyWeightKg, distanceKm, elevationGainM);

  // 6. ACWR (Acute:Chronic Workload Ratio)
  const acwr = calculateACWR(recent7RuckScoreSum, recent28RuckScoreSum);

  // 7. 경고
  const overloadWarning = acwr > IMPACT_THRESHOLDS.SAFETY.acwrWarning;
  const heavyLoadWarning = loadKg > IMPACT_THRESHOLDS.SAFETY.heavyLoadRatio * bodyWeightKg
    && distanceKm > IMPACT_THRESHOLDS.SAFETY.heavyLoadDistance;

  // 8. 팁 생성
  const notes = generateNotes({
    cardiovascular,
    muscular,
    bone,
    metabolic,
    posture,
    acwr,
    overloadWarning,
    heavyLoadWarning,
    rpe,
  });

  return {
    cardiovascular,
    muscular,
    bone,
    metabolic,
    posture,
    acwr,
    overloadWarning,
    heavyLoadWarning,
    notes,
  };
}

/**
 * 심혈관계 레벨 (TRIMP 기반)
 */
function getCardiovascularLevel(trimp: number): ImpactLevel {
  const { CV } = IMPACT_THRESHOLDS;

  if (trimp >= CV.L5) return 5;
  if (trimp >= CV.L4) return 4;
  if (trimp >= CV.L3) return 3;
  if (trimp >= CV.L2) return 2;
  if (trimp >= CV.L1) return 1;
  return 0;
}

/**
 * 근육계 레벨 (MechLoad + RuckScore 혼합)
 */
function getMuscularLevel(mechLoadKgKm: number, ruckScore: number): ImpactLevel {
  const { mechLoad, ruckScore: ruckScoreNorm } = IMPACT_THRESHOLDS.MUSC_NORM;

  // 정규화 (0-1)
  const mechNorm = clamp(mechLoadKgKm / mechLoad, 0, 1);
  const scoreNorm = clamp(ruckScore / ruckScoreNorm, 0, 1);

  // 혼합 (60% mechLoad, 40% ruckScore)
  const raw = 0.6 * mechNorm + 0.4 * scoreNorm;

  // 0-5 스케일로 변환
  const level = Math.round(raw * 5);

  return clamp(level, 0, 5) as ImpactLevel;
}

/**
 * 골격계 레벨 (BMS 기반)
 */
function getBoneLevel(bms: number): ImpactLevel {
  const { BONE } = IMPACT_THRESHOLDS;

  if (bms >= BONE.L5) return 5;
  if (bms >= BONE.L4) return 4;
  if (bms >= BONE.L3) return 3;
  if (bms >= BONE.L2) return 2;
  if (bms >= BONE.L1) return 1;
  return 0;
}

/**
 * 대사계 레벨 (kcal 기반)
 */
function getMetabolicLevel(kcal: number): ImpactLevel {
  const { META } = IMPACT_THRESHOLDS;

  if (kcal >= META.L5) return 5;
  if (kcal >= META.L4) return 4;
  if (kcal >= META.L3) return 3;
  if (kcal >= META.L2) return 2;
  if (kcal >= META.L1) return 1;
  return 0;
}

/**
 * 자세/코어 레벨 (Load/BW, Dist, Gain 기반)
 */
function getPostureLevel(
  loadKg: number,
  bodyWeightKg: number,
  distanceKm: number,
  elevationGainM: number
): ImpactLevel {
  if (bodyWeightKg <= 0) return 0;

  const { loadRatio, distance, gain } = IMPACT_THRESHOLDS.POST_NORM;

  // 정규화
  const loadNorm = clamp((loadKg / bodyWeightKg) / loadRatio, 0, 1);
  const distNorm = clamp(distanceKm / distance, 0, 1);
  const gainNorm = clamp(elevationGainM / gain, 0, 1);

  // 혼합 (50% load, 30% dist, 20% gain)
  const score = 0.5 * loadNorm + 0.3 * distNorm + 0.2 * gainNorm;

  // 0-5 스케일로 변환
  const level = Math.round(score * 5);

  return clamp(level, 0, 5) as ImpactLevel;
}

/**
 * ACWR 계산 (Acute:Chronic Workload Ratio)
 */
function calculateACWR(recent7Sum: number, recent28Sum: number): number {
  const chronic = recent28Sum / 4; // 4주 평균

  if (chronic === 0) return 0;

  const acwr = recent7Sum / chronic;

  return Math.max(0, acwr);
}

/**
 * 한국어 팁 생성
 */
function generateNotes(impact: BodyImpact & { rpe?: number }): string[] {
  const notes: string[] = [];

  // 과부하 경고
  if (impact.overloadWarning) {
    notes.push('⚠️ 급격한 부하 증가 감지! 부상 위험이 높습니다. 회복 기간을 늘려주세요.');
  }

  if (impact.heavyLoadWarning) {
    notes.push('⚠️ 고중량 장거리 운동! 자세와 페이스에 주의하세요.');
  }

  // ACWR 가이드
  if (impact.acwr > 1.3 && impact.acwr <= 1.5) {
    notes.push('📊 부하가 점진적으로 증가 중입니다. 몸 상태를 주의깊게 관찰하세요.');
  }

  if (impact.acwr < 0.8) {
    notes.push('📉 최근 활동량이 감소했습니다. 점진적으로 강도를 높여보세요.');
  }

  // 심혈관계
  if (impact.cardiovascular >= 4) {
    notes.push('❤️ 고강도 심혈관 운동! 충분한 수분 섭취와 회복이 필요합니다.');
  }

  // 근육계
  if (impact.muscular >= 4) {
    notes.push('💪 근육에 강한 자극! 단백질 섭취와 스트레칭을 권장합니다.');
  }

  // 골격계
  if (impact.bone >= 4) {
    notes.push('🦴 골밀도 증가에 효과적인 강도! 칼슘과 비타민D 섭취를 확인하세요.');
  }

  // 대사계
  if (impact.metabolic >= 4) {
    notes.push('🔥 높은 칼로리 소모! 운동 후 영양 보충이 중요합니다.');
  }

  // 자세/코어
  if (impact.posture >= 4) {
    notes.push('🧘 코어와 자세 유지에 높은 부하! 요추 건강에 주의하세요.');
  }

  // RPE 기반 팁
  if (impact.rpe !== undefined) {
    if (impact.rpe >= 8 && impact.cardiovascular < 3) {
      notes.push('💡 주관적 강도가 높지만 객관적 지표는 낮습니다. 페이스 조절을 고려해보세요.');
    }

    if (impact.rpe <= 3 && impact.cardiovascular >= 4) {
      notes.push('💡 객관적으로 고강도지만 편하게 느껴집니다. 체력이 향상되고 있습니다!');
    }
  }

  // 기본 팁 (경고 없을 때)
  if (notes.length === 0) {
    notes.push('✅ 적절한 강도의 운동입니다. 꾸준히 유지하세요!');
  }

  return notes;
}

/**
 * Body Impact 팁 조회 (재사용 가능)
 */
export function getBodyImpactTips(impact: BodyImpact): string[] {
  return impact.notes;
}

/**
 * 레벨별 설명 (한국어)
 */
export function getLevelDescription(level: ImpactLevel): string {
  const descriptions = {
    0: '매우 낮음',
    1: '낮음',
    2: '보통',
    3: '높음',
    4: '매우 높음',
    5: '극도로 높음',
  };

  return descriptions[level];
}

/**
 * 레벨별 색상
 */
export function getLevelColor(level: ImpactLevel): string {
  const colors = {
    0: '#6B7872', // 회색
    1: '#00B46E', // 녹색
    2: '#00FF88', // 연녹색
    3: '#FFB800', // 노란색
    4: '#FF8800', // 주황색
    5: '#FF4444', // 빨간색
  };

  return colors[level];
}

/**
 * Clamp 유틸리티
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
