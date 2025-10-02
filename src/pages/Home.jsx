import { useState } from 'react';
import { useWorkout } from '../context/WorkoutContext';
import StatsCard from '../components/StatsCard';
import WorkoutList from '../components/WorkoutList';
import Hero from '../components/Hero';
import WorkoutChart from '../components/WorkoutChart';
import EffectivenessMetrics from '../components/EffectivenessMetrics';
import BodyEffectiveness from '../components/BodyEffectiveness';
import WorkoutTrace from '../components/WorkoutTrace';

export default function Home() {
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const { getTotalStats } = useWorkout();
  const stats = getTotalStats();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Rucking Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Rucking</h2>
        <Hero />
      </section>

      {/* Result Section */}
      <section>
        <h2 className="text-3xl font-bold mb-8">Result</h2>

        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">Your Stats</h3>
            <button
              onClick={() => setShowWorkoutDetails(!showWorkoutDetails)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm font-medium"
            >
              {showWorkoutDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              label="Total Distance"
              value={stats.distance.toFixed(1)}
              unit="km"
              icon="🏃"
            />
            <StatsCard
              label="Total Time"
              value={stats.duration.toFixed(1)}
              unit="min"
              icon="⏱️"
            />
            <StatsCard
              label="Workouts"
              value={stats.count}
              unit="runs"
              icon="🎯"
            />
          </div>

          {showWorkoutDetails && (
            <div className="mt-8 space-y-8">
              <WorkoutTrace />
              <WorkoutList />
            </div>
          )}
        </div>

        <div className="mb-12">
          <WorkoutChart />
        </div>

        <div className="mb-12">
          <EffectivenessMetrics />
        </div>

        <div className="mb-12">
          <BodyEffectiveness />
        </div>
      </section>
    </div>
  );
}