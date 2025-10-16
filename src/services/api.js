const API_URL = 'https://rucking-nrc-production.up.railway.app/api';

async function parseJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function createHttpError(status, data, fallbackMessage) {
  const error = new Error(fallbackMessage);
  error.response = {
    status,
    data: data || { message: fallbackMessage },
  };
  return error;
}

async function handleResponse(response, fallbackMessage) {
  const data = await parseJson(response);

  if (!response.ok) {
    throw createHttpError(response.status, data, fallbackMessage);
  }

  return data;
}

async function request(path, { method = 'GET', body, token, csrfToken } = {}) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined
  });

  return handleResponse(response, 'Request failed');
}

export const workoutAPI = {
  // Get all workouts
  async getWorkouts(token) {
    return request('/workouts', { token });
  },

  // Get single workout
  async getWorkout(id, token) {
    return request(`/workouts/${id}`, { token });
  },

  // Create new workout
  async createWorkout(workout, token, csrfToken) {
    return request('/workouts', {
      method: 'POST',
      body: workout,
      token,
      csrfToken
    });
  },

  // Delete workout
  async deleteWorkout(id, token, csrfToken) {
    return request(`/workouts/${id}`, {
      method: 'DELETE',
      token,
      csrfToken
    });
  },

  // Health check
  async healthCheck() {
    return request('/health');
  },
};
