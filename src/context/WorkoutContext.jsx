import { createContext, useContext, useState, useEffect } from 'react';
import { workoutAPI } from '../services/api';

const WorkoutContext = createContext();

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within WorkoutProvider');
  }
  return context;
};

export default function WorkoutProvider({ children }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load workouts from API on mount
  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const data = await workoutAPI.getWorkouts();
      setWorkouts(data);
    } catch (error) {
      console.error('Failed to load workouts:', error);
      // Fallback to localStorage if API fails
      const saved = localStorage.getItem('workouts');
      if (saved) {
        setWorkouts(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  const addWorkout = async (workout) => {
    try {
      const newWorkout = await workoutAPI.createWorkout(workout);
      setWorkouts(prev => [newWorkout, ...prev]);
    } catch (error) {
      console.error('Failed to add workout:', error);
      // Fallback to local
      const localWorkout = { ...workout, id: Date.now(), date: new Date().toISOString() };
      setWorkouts(prev => [localWorkout, ...prev]);
    }
  };

  const deleteWorkout = async (id) => {
    try {
      await workoutAPI.deleteWorkout(id);
      setWorkouts(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      console.error('Failed to delete workout:', error);
      // Still remove from UI
      setWorkouts(prev => prev.filter(w => w.id !== id));
    }
  };

  const getTotalStats = () => {
    return workouts.reduce((acc, workout) => ({
      distance: acc.distance + (workout.distance || 0),
      duration: acc.duration + (workout.duration || 0),
      count: acc.count + 1
    }), { distance: 0, duration: 0, count: 0 });
  };

  return (
    <WorkoutContext.Provider value={{ workouts, addWorkout, deleteWorkout, getTotalStats, loading }}>
      {children}
    </WorkoutContext.Provider>
  );
}