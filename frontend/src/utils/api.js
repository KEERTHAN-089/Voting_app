import axios from 'axios';

// Configure the base URL for all API requests
const api = axios.create({
  // Remove the '/api' prefix as your backend routes don't use it
  baseURL: '/', 
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000, // 10 second timeout
  // Allow credentials (cookies) to be sent with requests
  withCredentials: true
});

// Add a request interceptor to include auth token with every request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export default api;
