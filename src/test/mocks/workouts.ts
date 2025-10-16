import type { WorkoutSubmitData } from '../schemas/workout.schema';

export interface WorkoutSeed {
  id?: number;
  title?: string;
  distance?: number;
  duration?: number;
  pace?: number | null;
  weight?: number | null;
  date?: string;
  route?: [number, number][] | null;
}

export function createWorkout(seed: WorkoutSeed = {}) {
  const now = new Date();
  return {
    id: seed.id ?? Math.floor(Math.random() * 100000),
    title: seed.title ?? 'Morning Ruck',
    distance: seed.distance ?? 5.6,
    duration: seed.duration ?? 72,
    pace: seed.pace ?? 12.9,
    weight: seed.weight ?? 18,
    date: seed.date ?? now.toISOString(),
    route: seed.route ?? [
      [37.5665, 126.978],
      [37.567, 126.979]
    ]
  };
}

export function createWorkoutSeries(count = 6): ReturnType<typeof createWorkout>[] {
  const workouts = [];
  const today = new Date();

  for (let index = 0; index < count; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    workouts.push(createWorkout({
      id: index + 1,
      date: date.toISOString(),
      distance: 4 + index * 0.5,
      duration: 55 + index * 3,
      pace: 12.5 - index * 0.2,
      weight: 15 + (index % 3)
    }));
  }

  return workouts;
}

export function createWorkoutPayload(seed: Partial<WorkoutSubmitData> = {}): WorkoutSubmitData {
  return {
    title: seed.title ?? 'Training Session',
    distance: seed.distance ?? 6.2,
    duration: seed.duration ?? 68,
    pace: seed.pace ?? 11,
    weight: seed.weight ?? 14,
    date: seed.date ?? new Date().toISOString(),
    route: seed.route ?? [
      [37.565, 126.978],
      [37.566, 126.979]
    ]
  };
}
