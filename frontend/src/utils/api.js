import axios from 'axios';

// The API is always on the same address as this app. In production the backend
// serves the app; in development the "proxy" setting in package.json forwards
// /api to the backend, which also lets a phone on the same Wi-Fi reach it.
const API_BASE = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000
});

// Add request interceptor to attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// When the session expires, sign out and let the page send the user back to sign-in
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export const imageUrl = (imageId) => (imageId ? `${API_BASE}/images/${imageId}` : null);

// The message to show a person when a request fails
export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.request && !error.response) return 'Cannot reach the server. Check your connection and try again.';
  // A 5xx with no message of its own, such as the dev server reporting that the backend is down
  if (error.response?.status >= 500) return 'The server is not available right now. Please try again in a moment.';
  return error.message || fallback;
};

export default api;
