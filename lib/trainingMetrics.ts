// FILE: /lib/trainingMetrics.ts
// RuckScore 및 하위 메트릭 계산 - 순수 함수 (I/O 없음)

export interface MetricsInput {
  bodyWeightKg: number;
  loadKg: number;
  distanceKm: number;
  movingTimeMin: number;
  elevationGainM?: number;

  // 심박수 (선택)
  hrAvg?: number;
  hrRest?: number;
  hrMax?: number;

  // RPE (선택, 0-10)
  rpe?: number;

  // 보정 계수
  calibrationFactor?: number;
  vdotRefKmh?: number;
}

export interface MetricsResult {
  kcal: number;
  trimp: number; // TRIMP or eTRIMP
  mechLoadKgKm: number;
  vertWorkKj: number;
  bms: number; // Bone/Muscle Stimulus (0-10)
  ruckScore: number; // 0-100
}

/**
 * RuckScore 및 전체 메트릭 계산
 */
export function calculateMetrics(input: MetricsInput): MetricsResult {
  const {
    bodyWeightKg,
    loadKg,
    distanceKm,
    movingTimeMin,
    elevationGainM = 0,
    hrAvg,
    hrRest,
    hrMax,
    rpe,
    calibrationFactor = 1.0,
    vdotRefKmh = 5.5,
  } = input;

  // 1. 속도 (km/h)
  const speedKmh = movingTimeMin > 0 ? (distanceKm / movingTimeMin) * 60 : 0;

  // 2. 에너지 소비 (kcal)
  const kcal = calculateEnergyExpenditure(
    bodyWeightKg,
    loadKg,
    distanceKm,
    movingTimeMin,
    speedKmh,
    calibrationFactor
  );

  // 3. TRIMP (심박수 있으면 TRIMP, 없으면 eTRIMP)
  const trimp = hrAvg && hrRest && hrMax
    ? calculateTRIMP(movingTimeMin, hrAvg, hrRest, hrMax)
    : calculateETRIMP(movingTimeMin, speedKmh, vdotRefKmh);

  // 4. 기계적 부하 (kg·km)
  const mechLoadKgKm = loadKg * distanceKm;

  // 5. 수직 일 (kJ)
  const vertWorkKj = calculateVerticalWork(bodyWeightKg, loadKg, elevationGainM);

  // 6. 골격/근육 자극 (BMS, 0-10)
  const bms = calculateBMS(loadKg, distanceKm, elevationGainM);

  // 7. RuckScore (0-100)
  const ruckScore = calculateRuckScore(kcal, trimp, mechLoadKgKm, vertWorkKj, bms);

  return {
    kcal: Math.round(kcal),
    trimp: Math.round(trimp),
    mechLoadKgKm: Math.round(mechLoadKgKm * 10) / 10,
    vertWorkKj: Math.round(vertWorkKj * 10) / 10,
    bms: Math.round(bms * 10) / 10,
    ruckScore: Math.round(ruckScore),
  };
}

/**
 * 에너지 소비 계산 (kcal)
 * MET = 1.0 + 0.9 * Speed_kmh
 * LoadFactor = 1 + (Load / BW) * 0.6
 * kcal = MET * BW * (Time/60) * LoadFactor * calibrationFactor
 */
function calculateEnergyExpenditure(
  bodyWeightKg: number,
  loadKg: number,
  distanceKm: number,
  movingTimeMin: number,
  speedKmh: number,
  calibrationFactor: number
): number {
  if (bodyWeightKg <= 0 || movingTimeMin <= 0) return 0;

  const MET = 1.0 + 0.9 * speedKmh;
  const loadFactor = 1 + (loadKg / bodyWeightKg) * 0.6;
  const timeHours = movingTimeMin / 60;

  return MET * bodyWeightKg * timeHours * loadFactor * calibrationFactor;
}

/**
 * TRIMP 계산 (심박수 기반)
 * HRr = (HRavg - HRrest) / (HRmax - HRrest)
 * TRIMP = Time * HRr * 100
 */
function calculateTRIMP(
  movingTimeMin: number,
  hrAvg: number,
  hrRest: number,
  hrMax: number
): number {
  if (hrMax <= hrRest) return 0;

  const hrReserve = (hrAvg - hrRest) / (hrMax - hrRest);
  const hrr = Math.max(0, Math.min(1, hrReserve)); // clamp [0, 1]

  return movingTimeMin * hrr * 100;
}

/**
 * eTRIMP 계산 (심박수 없을 때 속도 기반 추정)
 * Intensity = clamp(Speed_kmh / vdotRefKmh, 0, 1.5)
 * eTRIMP = Time * Intensity * 100
 */
function calculateETRIMP(
  movingTimeMin: number,
  speedKmh: number,
  vdotRefKmh: number
): number {
  const intensity = Math.max(0, Math.min(1.5, speedKmh / vdotRefKmh));
  return movingTimeMin * intensity * 100;
}

/**
 * 수직 일 계산 (kJ)
 * VertWork_kJ = ((BW + Load) * 9.81 * Gain) / 1000
 */
function calculateVerticalWork(
  bodyWeightKg: number,
  loadKg: number,
  elevationGainM: number
): number {
  const totalMassKg = bodyWeightKg + loadKg;
  const workJ = totalMassKg * 9.81 * elevationGainM;
  return workJ / 1000; // J to kJ
}

/**
 * 골격/근육 자극 계산 (BMS, 0-10)
 * Lnorm = min(Load/20, 1)
 * Dnorm = min(Dist/10, 1)
 * Gnorm = min(Gain/400, 1)
 * BMS = 10 * (0.4*Lnorm + 0.3*Dnorm + 0.3*Gnorm)
 */
function calculateBMS(
  loadKg: number,
  distanceKm: number,
  elevationGainM: number
): number {
  const lNorm = Math.min(loadKg / 20, 1);
  const dNorm = Math.min(distanceKm / 10, 1);
  const gNorm = Math.min(elevationGainM / 400, 1);

  return 10 * (0.4 * lNorm + 0.3 * dNorm + 0.3 * gNorm);
}

/**
 * RuckScore 계산 (0-100)
 * EE_norm = min(kcal/800, 1)
 * TRIMP_norm = min(trimp/150, 1)
 * Mech_norm = min(MechLoad/120, 1)
 * Vert_norm = min(VertWork_kJ/12, 1)
 * BMS_norm = BMS/10
 * RuckScore = 100 * (0.3*EE_norm + 0.25*TRIMP_norm + 0.25*Mech_norm + 0.10*Vert_norm + 0.10*BMS_norm)
 */
function calculateRuckScore(
  kcal: number,
  trimp: number,
  mechLoadKgKm: number,
  vertWorkKj: number,
  bms: number
): number {
  const eeNorm = Math.min(kcal / 800, 1);
  const trimpNorm = Math.min(trimp / 150, 1);
  const mechNorm = Math.min(mechLoadKgKm / 120, 1);
  const vertNorm = Math.min(vertWorkKj / 12, 1);
  const bmsNorm = bms / 10;

  const score = 100 * (
    0.3 * eeNorm +
    0.25 * trimpNorm +
    0.25 * mechNorm +
    0.10 * vertNorm +
    0.10 * bmsNorm
  );

  return Math.max(0, Math.min(100, score));
}

/**
 * ACWR (Acute:Chronic Workload Ratio) 경고 체크
 * 1주일 / 4주일 RuckScore 비율이 1.5 초과 시 경고
 */
export function checkACWR(
  weeklyRuckScore: number,
  fourWeekRuckScore: number
): { warning: boolean; ratio: number } {
  if (fourWeekRuckScore === 0) {
    return { warning: false, ratio: 0 };
  }

  const ratio = weeklyRuckScore / fourWeekRuckScore;
  const warning = ratio > 1.5;

  return { warning, ratio };
}

/**
 * 과부하 경고 체크
 * Load > 0.2 * BW && Dist > 8km
 */
export function checkOverload(
  loadKg: number,
  bodyWeightKg: number,
  distanceKm: number
): boolean {
  return loadKg > 0.2 * bodyWeightKg && distanceKm > 8;
}
