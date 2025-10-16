import { describe, expect, it } from 'vitest';
import {
  ManualWorkoutSchema,
  WorkoutSubmitSchema,
  validateWorkout
} from '../workout.schema';

describe('workout schemas', () => {
  it('validates manual workout form data successfully', () => {
    const result = validateWorkout(ManualWorkoutSchema, {
      title: 'Morning Ruck',
      distance: '5.25',
      duration: '75.5',
      weight: '15.0',
      date: '2024-05-01T09:00:00Z'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.distance).toBeCloseTo(5.25);
      expect(result.data.duration).toBeCloseTo(75.5);
      expect(result.data.weight).toBeCloseTo(15);
      expect(result.data.title).toBe('Morning Ruck');
    }
  });

  it('rejects manual workout when distance is below minimum', () => {
    const result = validateWorkout(ManualWorkoutSchema, {
      title: 'Short Walk',
      distance: '0',
      duration: '10',
      weight: '',
      date: '2024-05-01T09:00:00Z'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.distance).toBe('Distance must be at least 0.01 km');
    }
  });

  it('rejects workout submission when pace does not match distance and duration', () => {
    const result = validateWorkout(WorkoutSubmitSchema, {
      title: 'Evening Ruck',
      distance: 5,
      duration: 60,
      pace: 2,
      weight: 10,
      date: '2024-05-01T09:00:00Z',
      route: [
        [37.5, 127.0],
        [37.51, 127.01]
      ]
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.pace).toBe('Pace must match the distance and duration within ±0.5 min/km');
    }
  });
});
