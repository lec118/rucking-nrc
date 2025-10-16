const API_URL = 'https://rucking-nrc-production.up.railway.app/api';

async function request(path, { method = 'POST', body, headers = {} } = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    init.body = JSON.stringify(body);
  } else if (method === 'GET') {
    delete init.headers['Content-Type'];
  }

  const response = await fetch(`${API_URL}${path}`, init);

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(data.message || 'Authentication request failed');
    error.response = { status: response.status, data };
    throw error;
  }

  return data;
}

export const authAPI = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  refreshToken: (refreshToken) =>
    request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken }
    }),
  logout: (refreshToken) =>
    request('/auth/logout', {
      method: 'POST',
      body: { refreshToken }
    }),
  csrfToken: () => request('/csrf-token', { method: 'GET' })
};
