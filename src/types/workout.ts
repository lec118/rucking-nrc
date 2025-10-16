// src/types/workout.ts
// Workout-related type definitions

export type LatLng = [number, number]; // [latitude, longitude]

export interface WorkoutSummaryProps {
  path: LatLng[];
  totalDist: number; // in meters
  elapsedMs: number; // in milliseconds
  onStartNew: () => void;
}

export interface WorkoutData {
  title: string;
  distance: number; // km
  duration: number; // minutes
  pace: number | null; // min/km
  weight: number | null; // kg
  date: string; // ISO string
  route: LatLng[];
}
