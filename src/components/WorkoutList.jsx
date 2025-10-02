import { useWorkout } from '../context/WorkoutContext';

export default function WorkoutList() {
  const { workouts, deleteWorkout } = useWorkout();

  if (workouts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-lg">No workouts yet. Start your journey!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Recent Workouts</h2>
      <div className="space-y-4">
        {workouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} onDelete={deleteWorkout} />
        ))}
      </div>
    </div>
  );
}

function WorkoutCard({ workout, onDelete }) {
  const date = new Date(workout.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎒</span>
            <h3 className="text-xl font-bold">{workout.title || 'Rucking Workout'}</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-4">{formattedDate}</p>
          <div className="flex gap-6">
            <div>
              <p className="text-zinc-500 text-xs mb-1">Distance</p>
              <p className="text-2xl font-bold">{workout.distance} <span className="text-sm text-zinc-500">km</span></p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-1">Duration</p>
              <p className="text-2xl font-bold">{workout.duration} <span className="text-sm text-zinc-500">min</span></p>
            </div>
            {workout.weight && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Weight</p>
                <p className="text-2xl font-bold">{workout.weight} <span className="text-sm text-zinc-500">kg</span></p>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(workout.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-500 p-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}