import { createContext, useContext, useState, useEffect } from 'react';
import { workoutAPI } from '../services/api';
import { WorkoutSubmitSchema, validateWorkout } from '../schemas/workout.schema';
import { createClientValidationError, toFieldErrors } from '../utils/formValidation';
import { handleApiError, parseValidationErrors } from '../utils/errorHandler';
import { ErrorType } from '../types/errors';
import { useLogger } from '../hooks/useLogger';
import { withNetworkRetry } from '../utils/networkRetry';
import { useAuth } from './AuthContext.jsx';

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
  const { accessToken, csrfToken, isAuthenticated } = useAuth();
  const { logError, logInfo } = useLogger('workout-context');

  // Load workouts from API on mount
  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const data = await withNetworkRetry(() => workoutAPI.getWorkouts(accessToken), {
        attempts: 3,
        baseDelayMs: 600
      });
      setWorkouts(data);
      logInfo('Workouts loaded from API', { count: data.length });
    } catch (error) {
      logError('Failed to load workouts', error);
      // Fallback to localStorage if API fails
      const saved = localStorage.getItem('workouts');
      if (saved) {
        setWorkouts(JSON.parse(saved));
        logInfo('Loaded workouts from localStorage fallback', { source: 'localStorage' });
      }
    } finally {
      setLoading(false);
    }
  };

  const addWorkout = async (workout) => {
    // 항상 로컬 저장 우선 (운동 데이터 손실 방지)
    const localWorkout = {
      ...workout,
      id: workout.id || Date.now(),
      date: workout.date || new Date().toISOString()
    };

    // 즉시 로컬에 저장
    setWorkouts(prev => [localWorkout, ...prev]);

    // localStorage에도 백업
    try {
      const currentWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]');
      localStorage.setItem('workouts', JSON.stringify([localWorkout, ...currentWorkouts]));
    } catch (e) {
      logError('Failed to save to localStorage', e);
    }

    logInfo('Workout saved locally', { id: localWorkout.id });

    // 백그라운드에서 API 동기화 시도 (실패해도 괜찮음)
    try {
      const validation = validateWorkout(WorkoutSubmitSchema, workout);

      if (validation.success) {
        const payload = validation.data;
        const newWorkout = await withNetworkRetry(
          () => workoutAPI.createWorkout(payload, accessToken, csrfToken),
          { attempts: 2, baseDelayMs: 500 }
        );

        // API 저장 성공시 ID 업데이트
        setWorkouts(prev => prev.map(w =>
          w.id === localWorkout.id ? { ...w, id: newWorkout.id } : w
        ));
        logInfo('Workout synced to API', { id: newWorkout.id });
      }
    } catch (error) {
      // API 동기화 실패해도 로컬에는 이미 저장됨
      logError('API sync failed, but workout is saved locally', error);
    }

    return localWorkout;
  };

  const deleteWorkout = async (id) => {
    try {
      await withNetworkRetry(() => workoutAPI.deleteWorkout(id, accessToken, csrfToken), {
        attempts: 2,
        baseDelayMs: 500
      });
      setWorkouts(prev => prev.filter(w => w.id !== id));
      logInfo('Workout deleted', { id });
    } catch (error) {
      logError('Failed to delete workout', { id, error });
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
    <WorkoutContext.Provider
      value={{
        workouts,
        addWorkout,
        deleteWorkout,
        getTotalStats,
        loading,
        isAuthenticated
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}
