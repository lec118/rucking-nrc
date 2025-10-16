/**
 * 속도 스무딩 유틸리티
 * - 이동 평균 (Moving Average)
 * - 간단한 칼만 필터 (Simple Kalman Filter)
 */

const WINDOW_SIZE = 5; // 이동 평균 윈도우 크기
const speedBuffer: number[] = [];

// 칼만 필터 상태
let kalmanEstimate = 0;
let kalmanErrorEstimate = 1;
const PROCESS_NOISE = 0.01; // Q
const MEASUREMENT_NOISE = 0.1; // R

/**
 * 속도 스무딩 (이동 평균 + 칼만 필터)
 */
export function smoothSpeed(rawSpeed: number): number {
  // 1. 이동 평균
  speedBuffer.push(rawSpeed);
  if (speedBuffer.length > WINDOW_SIZE) {
    speedBuffer.shift();
  }

  const movingAvg = speedBuffer.reduce((a, b) => a + b, 0) / speedBuffer.length;

  // 2. 간단한 칼만 필터
  // Predict
  const predictedEstimate = kalmanEstimate;
  const predictedError = kalmanErrorEstimate + PROCESS_NOISE;

  // Update
  const kalmanGain = predictedError / (predictedError + MEASUREMENT_NOISE);
  kalmanEstimate = predictedEstimate + kalmanGain * (movingAvg - predictedEstimate);
  kalmanErrorEstimate = (1 - kalmanGain) * predictedError;

  return Math.max(0, kalmanEstimate); // 음수 방지
}

/**
 * 스무더 리셋 (새 운동 시작 시 호출)
 */
export function resetSmoother() {
  speedBuffer.length = 0;
  kalmanEstimate = 0;
  kalmanErrorEstimate = 1;
}
