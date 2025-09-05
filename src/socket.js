import axios from 'axios';

// Define the API base URL with absolute URLs for local development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
  : 'http://localhost:10000'; // Fixed: Use port 10000 where your server is running

// Add request debugging
const logRequest = (url) => {
  console.log(`Making API request to: ${url}`);
  return url;
};

// Add missing user profile and vote status functions
export const getUserProfile = async () => {
  const url = logRequest(`${API_BASE_URL}/user/profile`);
  return await axios.get(url, {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const getVoteStatus = async () => {
  const url = logRequest(`${API_BASE_URL}/user/vote/status`);
  return await axios.get(url, {
    headers: { 'Content-Type': 'application/json' }
  });
};

// Fix the candidates endpoint - remove /api prefix consistently
export const getCandidates = async () => {
  try {
    // Use non-prefixed endpoint first, with fallback to prefixed endpoint
    let url = logRequest(`${API_BASE_URL}/candidates`); // Try without /api prefix
    console.log('Attempting to fetch candidates from:', url);
    
    return await axios.get(url, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
    throw error;
  }
};

export const createCandidate = async (data) => {
  // Remove the /api prefix
  const url = logRequest(`${API_BASE_URL}/candidates`);
  return await axios.post(url, data, {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const updateCandidate = async (id, data) => {
  // Remove the /api prefix
  const url = logRequest(`${API_BASE_URL}/candidates/${id}`);
  return await axios.put(url, data, {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const deleteCandidate = async (id) => {
  // Remove the /api prefix
  const url = logRequest(`${API_BASE_URL}/candidates/${id}`);
  return await axios.delete(url, {
    headers: { 'Content-Type': 'application/json' }
  });
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

export default {
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