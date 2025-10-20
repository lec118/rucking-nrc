// FILE: /lib/aggregateMetrics.ts
// 워크아웃 집계 및 통계 계산 (순수 함수)

export interface WorkoutSession {
  id: string;
  title: string;
  distance: number; // km
  duration: number; // minutes
  pace: number | null; // min/km
  weight: number | null; // kg (load)
  date: string; // ISO string
  route?: any[];

  // RuckScore 메트릭 (선택)
  ruckScore?: number;
  kcal?: number;
  trimp?: number;
  mechLoadKgKm?: number;
  vertWorkKj?: number;
  bms?: number;
}

export interface AggregateStats {
  totalWorkouts: number;
  totalDistance: number; // km
  totalDuration: number; // minutes
  totalKcal: number;
  avgRuckScore: number;
  avgDistance: number; // km
  avgDuration: number; // minutes
}

export interface WindowStats {
  recent7Days: AggregateStats;
  recent28Days: AggregateStats;
  allTime: AggregateStats;
}

/**
 * 날짜 필터링 (최근 N일)
 */
export function filterRecentDays(workouts: WorkoutSession[], days: number): WorkoutSession[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return workouts.filter((w) => {
    const workoutDate = new Date(w.date);
    return workoutDate >= cutoff;
  });
}

/**
 * 워크아웃 집계 계산
 */
export function calculateAggregate(workouts: WorkoutSession[]): AggregateStats {
  if (workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalDistance: 0,
      totalDuration: 0,
      totalKcal: 0,
      avgRuckScore: 0,
      avgDistance: 0,
      avgDuration: 0,
    };
  }

  const totalDistance = workouts.reduce((sum, w) => sum + w.distance, 0);
  const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
  const totalKcal = workouts.reduce((sum, w) => sum + (w.kcal || 0), 0);
  const totalRuckScore = workouts.reduce((sum, w) => sum + (w.ruckScore || 0), 0);

  const avgRuckScore = totalRuckScore / workouts.length;
  const avgDistance = totalDistance / workouts.length;
  const avgDuration = totalDuration / workouts.length;

  return {
    totalWorkouts: workouts.length,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalDuration: Math.round(totalDuration),
    totalKcal: Math.round(totalKcal),
    avgRuckScore: Math.round(avgRuckScore),
    avgDistance: Math.round(avgDistance * 10) / 10,
    avgDuration: Math.round(avgDuration),
  };
}

/**
 * 윈도우별 통계 계산 (7일/28일/전체)
 */
export function calculateWindowStats(workouts: WorkoutSession[]): WindowStats {
  const recent7 = filterRecentDays(workouts, 7);
  const recent28 = filterRecentDays(workouts, 28);

  return {
    recent7Days: calculateAggregate(recent7),
    recent28Days: calculateAggregate(recent28),
    allTime: calculateAggregate(workouts),
  };
}

/**
 * ACWR 계산용 RuckScore 합계
 */
export function getAcwrInputs(workouts: WorkoutSession[]): {
  recent7RuckScoreSum: number;
  recent28RuckScoreSum: number;
} {
  const recent7 = filterRecentDays(workouts, 7);
  const recent28 = filterRecentDays(workouts, 28);

  const recent7Sum = recent7.reduce((sum, w) => sum + (w.ruckScore || 0), 0);
  const recent28Sum = recent28.reduce((sum, w) => sum + (w.ruckScore || 0), 0);

  return {
    recent7RuckScoreSum: recent7Sum,
    recent28RuckScoreSum: recent28Sum,
  };
}

/**
 * 연속 운동 일수 (streak)
 */
export function calculateStreak(workouts: WorkoutSession[]): number {
  if (workouts.length === 0) return 0;

  // 날짜별로 그룹화
  const sortedWorkouts = [...workouts].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const uniqueDates = new Set<string>();
  sortedWorkouts.forEach((w) => {
    const date = new Date(w.date).toISOString().split('T')[0];
    uniqueDates.add(date);
  });

  const sortedDates = Array.from(uniqueDates).sort().reverse();

  // 연속 일수 계산
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let currentDate = new Date(today);

  for (const dateStr of sortedDates) {
    const workoutDate = dateStr;
    const expectedDate = currentDate.toISOString().split('T')[0];

    if (workoutDate === expectedDate) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 주간 목표 진행률
 */
export function calculateWeeklyProgress(
  workouts: WorkoutSession[],
  weeklyGoal: number // 예: 3회
): { completed: number; target: number; percentage: number } {
  const recent7 = filterRecentDays(workouts, 7);

  const completed = recent7.length;
  const percentage = Math.min((completed / weeklyGoal) * 100, 100);

  return {
    completed,
    target: weeklyGoal,
    percentage: Math.round(percentage),
  };
}

/**
 * 트렌드 계산 (델타)
 */
export function calculateTrend(
  current: number,
  previous: number
): { delta: number; percentage: number; direction: 'up' | 'down' | 'stable' } {
  if (previous === 0) {
    return { delta: current, percentage: 0, direction: 'stable' };
  }

  const delta = current - previous;
  const percentage = (delta / previous) * 100;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (delta > 0) direction = 'up';
  else if (delta < 0) direction = 'down';

  return {
    delta: Math.round(delta * 10) / 10,
    percentage: Math.round(percentage),
    direction,
  };
}

/**
 * 최근 워크아웃 조회 (N개)
 */
export function getRecentWorkouts(workouts: WorkoutSession[], limit: number): WorkoutSession[] {
  return [...workouts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/**
 * 날짜 포맷팅 (한국어)
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}.${month}.${day}`;
}
