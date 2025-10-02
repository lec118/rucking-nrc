import { useState, useMemo, memo } from 'react';
import { useWorkout } from '../context/WorkoutContext';
import { getStatsForPeriod } from '../utils/workoutStats';

const PERIODS = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' }
];

const PeriodButton = memo(({ value, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-orange-500 text-white'
        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
    }`}
  >
    {label}
  </button>
));

export default function EffectivenessMetrics() {
  const { workouts } = useWorkout();
  const [period, setPeriod] = useState('weekly');

  const stats = useMemo(() => {
    if (workouts.length === 0) return null;
    return getStatsForPeriod(workouts, period);
  }, [workouts, period]);

  if (!stats) return null;

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold">Performance Metrics</h2>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <PeriodButton
                key={p.value}
                value={p.value}
                label={p.label}
                isActive={period === p.value}
                onClick={() => setPeriod(p.value)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Workout Distance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <span>🏃</span>
            <span>Total Distance</span>
          </div>
          <div className="text-4xl font-bold text-orange-400">
            {stats.totalDistance}<span className="text-lg text-zinc-500 ml-1">km</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-pink-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((stats.totalDistance / 50) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-zinc-500">{stats.count} workout{stats.count !== 1 ? 's' : ''} completed</p>
        </div>

        {/* Consistency */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <span>🔥</span>
            <span>Consistency</span>
          </div>
          <div className="text-4xl font-bold text-pink-400">
            {stats.consistency}<span className="text-lg text-zinc-500 ml-1">
              {period === 'daily' ? 'today' : period === 'weekly' ? 'this week' : 'this month'}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-red-600 rounded-full transition-all duration-500"
              style={{
                width: period === 'monthly'
                  ? `${Math.min((stats.consistency / 5) * 100, 100)}%`
                  : `${Math.min((stats.consistency / 7) * 100, 100)}%`
              }}
            ></div>
          </div>
          <p className="text-xs text-zinc-500">
            {period === 'daily' && 'Keep the streak going!'}
            {period === 'weekly' && 'Workouts this week'}
            {period === 'monthly' && 'Workouts this month'}
          </p>
        </div>

        {/* Average Weight */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <span>💪</span>
            <span>Average Weight</span>
          </div>
          <div className="text-4xl font-bold text-blue-400">
            {stats.avgWeight > 0 ? stats.avgWeight : '0'}<span className="text-lg text-zinc-500 ml-1">kg</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((stats.avgWeight / 30) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-zinc-500">
            {stats.avgWeight > 0 ? 'Load carried during rucks' : 'No weight data yet'}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mt-6 p-4 bg-gradient-to-r from-zinc-800 to-zinc-800/50 rounded-xl border border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 mb-1">
              {period === 'daily' && "Today's Summary"}
              {period === 'weekly' && "This Week's Summary"}
              {period === 'monthly' && "This Month's Summary"}
            </p>
            <p className="text-lg font-medium">
              <span className="text-white">{stats.totalDistance} km</span>
              <span className="text-zinc-500"> · </span>
              <span className="text-white">{stats.totalDuration} min</span>
              {stats.avgWeight > 0 && (
                <>
                  <span className="text-zinc-500"> · </span>
                  <span className="text-white">{stats.avgWeight} kg avg</span>
                </>
              )}
            </p>
          </div>
          <div className="text-4xl">
            {stats.count > 0 ? '💯' : '🎯'}
          </div>
        </div>
      </div>
    </div>
  );
}