import axios from 'axios';

// Update the port to match your backend server
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
  : 'http://localhost:3000'; // Changed from 10000 to 3000 to match backend

// Create a configured instance of axios with better error handling
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 seconds
  proxy: false // Disable proxy to avoid port redirections
});

// Add better logging for debugging
apiClient.interceptors.request.use(
  config => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => {
    console.log(`API Response from ${response.config.url}:`, response.status);
    return response;
  },
  error => {
    console.error(`API Error Response for ${error.config?.url}:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Add request debugging
const logRequest = (url) => {
  console.log(`Making API request to: ${url}`);
  return url;
};

// Improve the getCandidates function with better error handling and fallback
export const getCandidates = async () => {
  try {
    // First try without /api prefix
    console.log('Attempting to fetch candidates from /candidates endpoint...');
    return await apiClient.get('/candidates');
  } catch (firstError) {
    console.warn('Failed to fetch from /candidates, trying with /api prefix...');
    try {
      // Then try with /api prefix as fallback
      return await apiClient.get('/api/candidates');
    } catch (secondError) {
      // If both fail, try a direct fetch as last resort
      console.warn('Both API paths failed, trying direct fetch...');
      const response = await fetch(`${API_BASE_URL}/candidates`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return { data: await response.json() };
    }
  }
};

// Fix the exported methods to use apiClient consistently
export const createCandidate = async (data) => {
  return await apiClient.post('/candidates', data);
};

export const updateCandidate = async (id, data) => {
  return await apiClient.put(`/candidates/${id}`, data);
};

export const deleteCandidate = async (id) => {
  return await apiClient.delete(`/candidates/${id}`);
};

export const voteForCandidate = async (id) => {
  // Remove the /api prefix
  const url = logRequest(`${API_BASE_URL}/candidates/${id}/vote`);
  return await axios.post(url, {}, {
    headers: { 'Content-Type': 'application/json' }
  });
};

// Fix inconsistent paths - make sure we use the same pattern everywhere
export const getElectionResults = async () => {
  try {
    // Use the same URL pattern as other successful requests
    const url = logRequest(`${API_BASE_URL}/election/results`);
    console.log('Fetching election results from:', url);
    return await axios.get(url, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to fetch election results:', error);
    throw error;
  }
};

// Also update getVoteCounts to be consistent with other working endpoints
export const getVoteCounts = async () => {
  try {
    const url = logRequest(`${API_BASE_URL}/candidates/vote/count`); // Remove /api prefix
    console.log('Fetching vote counts from:', url);
    return await axios.get(url, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to fetch vote counts:', error);
    throw error;
  }
};

// For user authentication, also remove /api prefix
export const signup = async (data) => {
  const url = logRequest(`${API_BASE_URL}/user/signup`);
  console.log('Making signup request to:', url);
  return await axios.post(url, data, {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const login = async (data) => {
  const url = logRequest(`${API_BASE_URL}/user/login`);
  console.log('Making login request to:', url);
  return await axios.post(url, data, {
    headers: { 'Content-Type': 'application/json' }
  });
};

// Fix the default export to include properly bound HTTP methods
export default {
  // Bind HTTP methods properly to maintain context
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
  
  // Include all named exports
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  voteForCandidate,
  getVoteCounts,
  signup,
  login,
  getUserProfile,
  getVoteStatus,
  getElectionResults
};
