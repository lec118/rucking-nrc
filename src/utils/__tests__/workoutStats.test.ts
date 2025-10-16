import {
  calculateAverageWeight,
  calculateConsistency,
  calculateImprovement,
  calculatePace,
  formatPace,
  getLast7Days,
  getStatsForPeriod,
  groupByMonth,
  groupByWeek
} from '../workoutStats';
import { createWorkoutSeries, createWorkout } from '../../test/mocks/workouts';

describe('workoutStats utilities', () => {
  describe('calculatePace', () => {
    it('returns minutes per kilometer for valid input', () => {
      expect(calculatePace(30, 5)).toBeCloseTo(6);
    });

    it('returns 0 when distance is zero', () => {
      expect(calculatePace(30, 0)).toBe(0);
    });

    it('handles floating point precision', () => {
      expect(calculatePace(25.5, 5.1)).toBeCloseTo(5, 1);
    });
  });

  describe('groupByWeek', () => {
    it('groups workouts by week and calculates totals', () => {
      const workouts = [
        createWorkout({ date: '2024-01-01T08:00:00Z', distance: 5, duration: 60 }),
        createWorkout({ date: '2024-01-03T10:00:00Z', distance: 7, duration: 70 }),
        createWorkout({ date: '2024-01-09T07:00:00Z', distance: 6, duration: 66 })
      ];

      const result = groupByWeek(workouts);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        distance: 12,
        duration: 130,
        count: 2
      });
    });
  });

  describe('calculateConsistency', () => {
    it('returns 0 when there are no workouts', () => {
      expect(calculateConsistency([])).toBe(0);
    });

    it('returns average workouts per week', () => {
      const workouts = createWorkoutSeries(6);
      expect(Number(calculateConsistency(workouts))).toBeGreaterThan(0);
    });
  });

  describe('calculateImprovement', () => {
    it('returns null when there are fewer than six workouts', () => {
      expect(calculateImprovement(createWorkoutSeries(5))).toBeNull();
    });

    it('calculates improvement percentage', () => {
      const workouts = [
        ...createWorkoutSeries(3).map((workout, index) => ({
          ...workout,
          date: new Date(Date.now() - (index + 6) * 24 * 60 * 60 * 1000).toISOString(),
          duration: 70 + index * 2
        })),
        ...createWorkoutSeries(3).map((workout, index) => ({
          ...workout,
          date: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
          duration: 55 - index
        }))
      ];

      const result = calculateImprovement(workouts);
      expect(result).not.toBeNull();
      expect(result?.isImproving).toBe(true);
    });
  });

  describe('getLast7Days', () => {
    it('returns last seven days with aggregated stats', () => {
      const workouts = [
        createWorkout({ date: new Date().toISOString(), distance: 5, duration: 60 }),
        createWorkout({
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          distance: 4,
          duration: 48
        })
      ];

      const result = getLast7Days(workouts);
      expect(result).toHaveLength(7);
      expect(result.some(day => day.distance > 0)).toBe(true);
    });
  });

  describe('formatPace', () => {
    it('formats pace with minutes and seconds', () => {
      expect(formatPace(5.5)).toBe('5:30');
      expect(formatPace(6.01)).toBe('6:01');
    });
  });

  describe('groupByMonth', () => {
    it('groups workouts by month and aggregates totals', () => {
      const workouts = [
        createWorkout({ date: '2024-01-01T00:00:00Z', distance: 5, duration: 60, weight: 15 }),
        createWorkout({ date: '2024-01-15T00:00:00Z', distance: 10, duration: 120, weight: 18 }),
        createWorkout({ date: '2024-02-03T00:00:00Z', distance: 8, duration: 90 })
      ];

      const result = groupByMonth(workouts);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        month: '2024-01',
        distance: 15,
        duration: 180,
        count: 2,
        weightCount: 2
      });
    });
  });

  describe('calculateAverageWeight', () => {
    it('returns 0 when no weight data is present', () => {
      expect(calculateAverageWeight([createWorkout({ weight: null })])).toBe(0);
    });

    it('returns average weight rounded to one decimal', () => {
      const workouts = [
        createWorkout({ weight: 15 }),
        createWorkout({ weight: 17 }),
        createWorkout({ weight: null })
      ];

      expect(calculateAverageWeight(workouts)).toBe('16.0');
    });
  });

  describe('getStatsForPeriod', () => {
    it('returns totals for weekly period', () => {
      const workouts = createWorkoutSeries(7);
      const stats = getStatsForPeriod(workouts, 'weekly');

      expect(stats.count).toBeGreaterThan(0);
      expect(Number(stats.totalDistance)).toBeGreaterThan(0);
    });

    it('returns totals for monthly period', () => {
      const workouts = [
        createWorkout({ date: new Date().toISOString(), distance: 5, duration: 60 }),
        createWorkout({ date: new Date().toISOString(), distance: 6, duration: 70 })
      ];

      const stats = getStatsForPeriod(workouts, 'monthly');
      expect(stats.totalDuration).toBe(130);
      expect(stats.count).toBe(2);
    });
  });
});
