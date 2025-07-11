import axios from 'axios';

// Create axios instance with default config
const instance = axios.create({
  baseURL: '/',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Request interceptor for debugging
instance.interceptors.request.use(request => {
  console.log('Starting API request:', request.url);
  return request;
});

// Response interceptor for error handling
instance.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

// Export both direct methods and named endpoints
const api = {
  // Direct HTTP methods (for backward compatibility)
  get: (url, config) => instance.get(url, config),
  post: (url, data, config) => instance.post(url, data, config),
  put: (url, data, config) => instance.put(url, data, config),
  delete: (url, config) => instance.delete(url, config),
  
  // Named endpoints for better organization
  getCandidates: () => instance.get('/api/candidates'),
  createCandidate: (data) => {
    console.log('Creating candidate with data:', data);
    return instance.post('/api/candidates', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  updateCandidate: (id, data) => instance.put(`/api/candidates/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  deleteCandidate: (id) => instance.delete(`/api/candidates/${id}`),
  
  // User authentication endpoints
  login: (credentials) => instance.post('/user/login', credentials),
  register: (userData) => instance.post('/user/signup', userData),
  getProfile: () => instance.get('/user/profile'),
  checkVoteStatus: () => instance.get('/user/vote/status'),
  
  // Voting endpoints
  voteForCandidate: (id) => {
    console.log('Voting for candidate with ID:', id);
    return instance.post(`/api/candidates/vote/${id}`, {}, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  },
  getResults: () => instance.get('/api/candidates/vote/count')
};

export default api;
