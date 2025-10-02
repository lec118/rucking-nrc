import { useWorkout } from '../context/WorkoutContext';

export default function WorkoutTrace() {
  const { workouts } = useWorkout();

  if (workouts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📍</div>
        <p className="text-zinc-500 text-lg">No workout traces yet</p>
        <p className="text-zinc-600 text-sm">Your workout history will appear here</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span>📍</span>
        <span>Workout Trace</span>
        <span className="text-sm font-normal text-zinc-500">({workouts.length} total)</span>
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 via-red-500 to-pink-600"></div>

        {/* Timeline items */}
        <div className="space-y-6">
          {workouts.map((workout, index) => {
            const date = new Date(workout.date);
            const timeAgo = getTimeAgo(date);

            return (
              <div key={workout.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className="absolute left-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>

                {/* Workout card */}
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-white">{workout.title || 'Workout'}</h4>
                      <p className="text-xs text-zinc-500">{timeAgo}</p>
                    </div>
                    {index === 0 && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Latest</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="bg-zinc-800/50 rounded p-2">
                      <p className="text-xs text-zinc-500">Distance</p>
                      <p className="text-lg font-bold text-orange-400">{workout.distance} km</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2">
                      <p className="text-xs text-zinc-500">Time</p>
                      <p className="text-lg font-bold text-blue-400">{workout.duration} min</p>
                    </div>
                    {workout.weight ? (
                      <div className="bg-zinc-800/50 rounded p-2">
                        <p className="text-xs text-zinc-500">Weight</p>
                        <p className="text-lg font-bold text-purple-400">{workout.weight} kg</p>
                      </div>
                    ) : (
                      <div className="bg-zinc-800/50 rounded p-2">
                        <p className="text-xs text-zinc-500">Pace</p>
                        <p className="text-lg font-bold text-green-400">{workout.pace || '0.0'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
