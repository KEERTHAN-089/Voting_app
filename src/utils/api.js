import axios from 'axios';

// Define the base URL for API requests
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
  : 'http://localhost:3000';

// Create the axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});

// Add request/response interceptors for logging
// ...existing code...

// Export individual API methods for direct use
export const getCandidates = async () => {
  // ...existing code...
};

export const createCandidate = async (data) => {
  // ...existing code...
};

// ...other existing API functions...

// Create a proper default export that includes HTTP methods
const api = {
  // Basic HTTP methods
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
  
  // Specialized API methods
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

export default api;