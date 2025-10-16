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
    const validation = validateWorkout(WorkoutSubmitSchema, workout);

    if (!validation.success) {
      const fieldErrors = toFieldErrors(validation.errors);
      return Promise.reject({
        formError: createClientValidationError(fieldErrors),
        fieldErrors
      });
    }

    const payload = validation.data;

    try {
      const newWorkout = await withNetworkRetry(
        () => workoutAPI.createWorkout(payload, accessToken, csrfToken),
        { attempts: 3, baseDelayMs: 800 }
      );
      setWorkouts(prev => [newWorkout, ...prev]);
      logInfo('Workout created via API', { id: newWorkout.id });
      return newWorkout;
    } catch (error) {
      const appError = handleApiError(error);
      const isClientError =
        appError.type === ErrorType.VALIDATION_ERROR ||
        (appError.statusCode && appError.statusCode >= 400 && appError.statusCode < 500);

      if (isClientError) {
        const fieldErrors = parseValidationErrors(appError);
        logError('Client validation failed while creating workout', fieldErrors);
        throw {
          formError: createClientValidationError(fieldErrors),
          fieldErrors
        };
      }

      if (appError.type === ErrorType.NETWORK_ERROR || appError.retryable) {
        const localWorkout = { ...payload, id: Date.now() };
        setWorkouts(prev => [localWorkout, ...prev]);
        logInfo('Workout stored locally due to offline mode', { id: localWorkout.id });
        return localWorkout;
      }

      logError('Unhandled error while creating workout', appError);
      throw {
        formError: createClientValidationError({ general: appError.message }),
        fieldErrors: {}
      };
    }
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
