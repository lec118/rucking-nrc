import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useWorkout } from '../context/WorkoutContext';
import { getLast7Days, groupByWeek } from '../utils/workoutStats';
import { useState, useMemo, memo } from 'react';

const CustomTooltip = memo(({ active, payload, view }) => {
  if (!active || !payload?.length) return null;

  const duration = payload.find(p => p.dataKey === 'duration');
  const distance = payload.find(p => p.dataKey === 'distance');

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium mb-1">
        {view === 'daily' ? payload[0].payload.date : `Week of ${payload[0].payload.week}`}
      </p>
      {distance && <p className="text-xs text-orange-400">Distance: {distance.value.toFixed(2)} km</p>}
      {duration && <p className="text-xs text-pink-400">Duration: {duration.value} min</p>}
    </div>
  );
});

export default function WorkoutChart() {
  const { workouts } = useWorkout();
  const [view, setView] = useState('daily');

  const data = useMemo(() => {
    return view === 'daily'
      ? getLast7Days(workouts)
      : groupByWeek(workouts).slice(-8);
  }, [workouts, view]);

  if (workouts.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
        <h2 className="text-2xl font-bold mb-4">Activity Overview</h2>
        <p className="text-zinc-500 text-center py-8">Start logging workouts to see your progress!</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Activity Overview</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'daily'
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setView('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'weekly'
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey={view === 'daily' ? 'date' : 'week'}
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 12 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip view={view} />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar yAxisId="left" dataKey="duration" fill="#ec4899" name="Duration (min)" radius={[8, 8, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="distance" stroke="#f97316" strokeWidth={3} name="Distance (km)" dot={{ fill: '#f97316', r: 5 }} activeDot={{ r: 7 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}