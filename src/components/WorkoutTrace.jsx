import { useState } from 'react';
import { useWorkout } from '../context/WorkoutContext';

export default function WorkoutTrace() {
  const { workouts } = useWorkout();
  const [expandedWorkout, setExpandedWorkout] = useState(null);

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
                      <p className="text-lg font-bold text-orange-400">{workout.distance.toFixed(1)} km</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2">
                      <p className="text-xs text-zinc-500">Time</p>
                      <p className="text-lg font-bold text-blue-400">{workout.duration.toFixed(1)} min</p>
                    </div>
                    {workout.weight ? (
                      <div className="bg-zinc-800/50 rounded p-2">
                        <p className="text-xs text-zinc-500">Weight</p>
                        <p className="text-lg font-bold text-purple-400">{workout.weight.toFixed(1)} kg</p>
                      </div>
                    ) : (
                      <div className="bg-zinc-800/50 rounded p-2">
                        <p className="text-xs text-zinc-500">Pace</p>
                        <p className="text-lg font-bold text-green-400">{workout.pace ? workout.pace.toFixed(1) : '0.0'}</p>
                      </div>
                    )}
                  </div>

                  {/* GPS Route Map */}
                  {workout.route && workout.route.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                        className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <span>🗺️</span>
                        <span>{expandedWorkout === workout.id ? 'Hide' : 'Show'} Route Map</span>
                      </button>

                      {expandedWorkout === workout.id && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-zinc-700">
                          <iframe
                            src={getMapUrl(workout.route)}
                            className="w-full h-64 border-0"
                            title={`Route map for ${workout.title}`}
                          />
                          <div className="bg-zinc-800 px-3 py-2 text-xs text-zinc-400">
                            {workout.route.length} GPS points tracked
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

function getMapUrl(route) {
  if (!route || route.length === 0) return '';

  // Get center point (first GPS point)
  const center = route[0];
  const lat = center[0];
  const lon = center[1];

  // Calculate bounding box from all points
  const lats = route.map(p => p[0]);
  const lons = route.map(p => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // Add padding
  const padding = 0.005;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon-padding},${minLat-padding},${maxLon+padding},${maxLat+padding}&layer=mapnik&marker=${lat},${lon}`;
}
