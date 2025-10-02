import { useMemo, memo } from 'react';
import { useWorkout } from '../context/WorkoutContext';

const MUSCLE_GROUPS = [
  { name: 'Legs', engagement: 95, color: 'from-orange-500 to-red-500' },
  { name: 'Core', engagement: 75, color: 'from-pink-500 to-purple-500' },
  { name: 'Back', engagement: 80, color: 'from-blue-500 to-cyan-500' },
  { name: 'Shoulders', engagement: 70, color: 'from-green-500 to-emerald-500' },
  { name: 'Arms', engagement: 60, color: 'from-yellow-500 to-orange-500' },
];

const COLOR_MAP = {
  orange: 'text-orange-400',
  pink: 'text-pink-400',
  blue: 'text-blue-400'
};

const StatCard = memo(({ label, value, unit, icon, color }) => (
  <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-xl">
    <div>
      <p className="text-sm text-zinc-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${COLOR_MAP[color]}`}>
        {value} <span className="text-sm text-zinc-500">{unit}</span>
      </p>
    </div>
    <span className="text-3xl">{icon}</span>
  </div>
));

const MuscleBar = memo(({ name, engagement, color }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-zinc-300">{name}</span>
      <span className="text-sm text-zinc-500">{engagement}%</span>
    </div>
    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full`}
        style={{ width: `${engagement}%` }}
      />
    </div>
  </div>
));

export default function BodyEffectiveness() {
  const { workouts } = useWorkout();

  const stats = useMemo(() => {
    if (workouts.length === 0) return null;

    let totalLoad = 0;
    let totalCalories = 0;
    let totalDuration = 0;

    workouts.forEach(w => {
      const distance = w.distance || 0;
      const weight = w.weight || 0;
      totalLoad += weight * distance;
      totalCalories += distance * (60 + weight * 10);
      totalDuration += w.duration || 0;
    });

    return {
      totalLoad,
      totalCalories: Math.round(totalCalories),
      trainingHours: (totalDuration / 60).toFixed(1)
    };
  }, [workouts]);

  if (!stats) return null;

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <h2 className="text-2xl font-bold mb-6">Body Impact</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Body Stats */}
        <div className="space-y-6">
          <StatCard label="Total Load" value={stats.totalLoad.toFixed(1)} unit="kg·km" icon="💪" color="orange" />
          <StatCard label="Est. Calories Burned" value={stats.totalCalories.toLocaleString()} unit="kcal" icon="🔥" color="pink" />
          <StatCard label="Training Hours" value={stats.trainingHours} unit="hrs" icon="⏱️" color="blue" />
        </div>

        {/* Right: Muscle Engagement */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-zinc-300">Muscle Engagement</h3>
          <div className="space-y-4">
            {MUSCLE_GROUPS.map(m => (
              <MuscleBar key={m.name} name={m.name} engagement={m.engagement} color={m.color} />
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            * Based on rucking activity patterns and load distribution
          </p>
        </div>
      </div>
    </div>
  );
}