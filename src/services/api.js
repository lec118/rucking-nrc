const API_URL = 'https://rucking-nrc-production.up.railway.app/api';

export const workoutAPI = {
  // Get all workouts
  async getWorkouts() {
    const response = await fetch(`${API_URL}/workouts`);
    if (!response.ok) throw new Error('Failed to fetch workouts');
    return response.json();
  },

  // Get single workout
  async getWorkout(id) {
    const response = await fetch(`${API_URL}/workouts/${id}`);
    if (!response.ok) throw new Error('Failed to fetch workout');
    return response.json();
  },

  // Create new workout
  async createWorkout(workout) {
    const response = await fetch(`${API_URL}/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workout),
    });
    if (!response.ok) throw new Error('Failed to create workout');
    return response.json();
  },

  // Delete workout
  async deleteWorkout(id) {
    const response = await fetch(`${API_URL}/workouts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete workout');
    return response.json();
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) throw new Error('API is down');
    return response.json();
  },
};
