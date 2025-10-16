import { useState } from 'react';
import { ManualWorkoutSchema, WorkoutSubmitSchema, validateWorkout } from '../schemas/workout.schema';
import { createClientValidationError, formatFormErrorMessage, toFieldErrors } from '../utils/formValidation';
import { useWorkout } from '../context/WorkoutContext';

export default function AddWorkoutModal({ onClose }) {
  const { addWorkout } = useWorkout();
  const [formData, setFormData] = useState({
    title: '',
    distance: '',
    duration: '',
    weight: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const manualResult = validateWorkout(ManualWorkoutSchema, {
      ...formData,
      date: new Date().toISOString()
    });

    if (!manualResult.success) {
      const errors = toFieldErrors(manualResult.errors);
      setFieldErrors(errors);
      setFormError(createClientValidationError(errors));
      return;
    }

    const manualData = manualResult.data;
    const pace = Number((manualData.duration / manualData.distance).toFixed(1));

    const submitResult = validateWorkout(WorkoutSubmitSchema, {
      title: manualData.title?.trim() || 'Manual Workout',
      distance: manualData.distance,
      duration: manualData.duration,
      pace,
      weight: manualData.weight,
      date: manualData.date,
      route: null
    });

    if (!submitResult.success) {
      const errors = toFieldErrors(submitResult.errors);
      setFieldErrors(errors);
      setFormError(createClientValidationError(errors));
      return;
    }

    setIsSubmitting(true);
    try {
      await addWorkout(submitResult.data);
      onClose();
    } catch (error) {
      if (error?.formError) {
        setFormError(error.formError);
      }
      if (error?.fieldErrors) {
        setFieldErrors(error.fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (fieldErrors[name]) {
      const { [name]: _removed, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
    if (formError) {
      setFormError(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-8 border border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Add Workout</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {formatFormErrorMessage(formError)}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Workout Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Morning Ruck"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {fieldErrors.title && (
              <p className="mt-2 text-xs text-red-300">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Distance (km) *
            </label>
            <input
              type="number"
              name="distance"
              value={formData.distance}
              onChange={handleChange}
              step="0.1"
              required
              placeholder="5.0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {fieldErrors.distance && (
              <p className="mt-2 text-xs text-red-300">{fieldErrors.distance}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Duration (minutes) *
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              required
              placeholder="45"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {fieldErrors.duration && (
              <p className="mt-2 text-xs text-red-300">{fieldErrors.duration}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Ruck Weight (kg)
            </label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              step="0.5"
              placeholder="10.0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {fieldErrors.weight && (
              <p className="mt-2 text-xs text-red-300">{fieldErrors.weight}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-full border border-zinc-700 text-white hover:bg-zinc-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:opacity-90 transition-opacity font-bold"
            >
              {isSubmitting ? 'Saving...' : 'Add Workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
