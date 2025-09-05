import axios from 'axios';

// Define base URLs to try in order of preference
const POSSIBLE_BASE_URLS = [
  process.env.REACT_APP_API_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  window.location.origin // Fallback to same origin
];

// Find the first valid URL (not undefined or empty)
const API_BASE_URL = POSSIBLE_BASE_URLS.find(url => url && url !== '') || 'http://localhost:3000';

console.log('API configured to use base URL:', API_BASE_URL);

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

// Add request interceptor to attach auth token and debug information
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log(`API ${config.method} request to: ${API_BASE_URL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('API request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`API response from ${response.config.url}:`, { 
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      console.error(`API error response (${error.response.status}):`, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API no response error:', { 
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL,
        message: 'Server did not respond. Check if backend is running on the correct port.'
      });
    } else {
      // Something happened in setting up the request
      console.error('API setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Connection diagnostics with improved error handling
export const diagnoseConnection = async () => {
  // Try multiple potential backend URLs
  const potentialUrls = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:8080',
    window.location.origin + '/api'
  ];
  
  const results = [];
  
  for (const url of potentialUrls) {
    try {
      console.log(`Testing connection to: ${url}`);
      const startTime = Date.now();
      
      // Try accessing the health endpoint with a short timeout
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      // Try to parse the response as JSON, catch parsing errors
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`Response is not valid JSON: ${parseError.message}`);
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        results.push({
          url,
          success: true,
          status: response.status,
          responseTime,
          data
        });
        
        console.log(`✅ Connection to ${url} successful (${responseTime}ms)`);
        // If we found a working URL, update the API base URL
        api.defaults.baseURL = url;
        return { success: true, workingUrl: url, diagnostics: results };
      } else {
        results.push({
          url,
          success: false,
          status: response.status,
          statusText: response.statusText,
          responseTime
        });
        console.log(`❌ Connection to ${url} failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      results.push({
        url,
        success: false,
        error: error.message
      });
      console.log(`❌ Connection to ${url} error: ${error.message}`);
    }
  }
  
  return { success: false, diagnostics: results };
};

// Authentication APIs
const login = async (credentials) => {
  console.log('Login API called with:', credentials);
  try {
    // Run diagnostics first if having connection issues
    const connectionStatus = await diagnoseConnection();
    if (!connectionStatus.success) {
      console.error('All connection attempts failed. See diagnostics:', connectionStatus.diagnostics);
      throw new Error('Cannot connect to the server. Please check if the backend is running.');
    }
    
    return await api.post('/user/login', credentials);
  } catch (error) {
    console.error('Login API error:', error.message);
    throw error;
  }
};

// User authentication functions
const signup = async (userData) => {
  console.log('API signup called with:', {...userData, password: '******'});
  return await api.post('/user/signup', userData);
};

// Voting and candidate functions
const getCandidates = async () => {
  return await api.get('/candidates');
};

const getVoteCount = async () => {
  return await api.get('/candidates/vote/count');
};

const checkVoteStatus = async () => {
  // Use /user/profile to check if the user has voted
  const res = await api.get('/user/profile');
  return { hasVoted: res.data.isVoted, role: res.data.role };
};

const castVote = async (candidateId) => {
  return await api.post(`/candidates/${candidateId}/vote`);
};

const voteForCandidate = async (candidateId) => {
  return await api.post(`/candidates/${candidateId}/vote`);
};

const getElectionResults = async () => {
  return await api.get('/election/results');
};

// Add or update the getProfile function
const getProfile = async () => {
  try {
    return await api.get('/user/profile');
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

// Add or fix the deleteCandidate function
const deleteCandidate = async (candidateId) => {
  try {
    if (!candidateId) {
      throw new Error('Candidate ID is required');
    }
    console.log(`Deleting candidate with ID: ${candidateId}`);
    return await api.delete(`/candidates/${candidateId}`);
  } catch (error) {
    console.error(`Error deleting candidate ${candidateId}:`, error);
    throw error;
  }
};

// Add updateCandidate function
const updateCandidate = async (candidateId, candidateData) => {
  try {
    if (!candidateId) {
      throw new Error('Candidate ID is required');
    }
    console.log(`Updating candidate with ID: ${candidateId}`, candidateData);
    return await api.put(`/candidates/${candidateId}`, candidateData);
  } catch (error) {
    console.error(`Error updating candidate ${candidateId}:`, error);
    throw error;
  }
};

// Export individual functions
export { 
  signup, 
  getCandidates, 
  getVoteCount, 
  checkVoteStatus,
  castVote,
  voteForCandidate,
  getElectionResults,
  getProfile,
  login,
  deleteCandidate,
  updateCandidate  // Add updateCandidate to named exports
};

// Update the default export object
const apiDefault = {
  // Authentication
  signup,
  login,
  getProfile,
  
  // Candidates and voting
  getCandidates,
  getVoteCount,
  checkVoteStatus,
  castVote,
  voteForCandidate,
  getElectionResults,
  deleteCandidate,
  updateCandidate,  // Add updateCandidate to default exports
  
  // HTTP methods
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
  
  // Diagnostics
  diagnoseConnection
};

export default apiDefault;
// Remove duplicate and erroneous code below this line.
// Your API functions and default export are already defined above.
