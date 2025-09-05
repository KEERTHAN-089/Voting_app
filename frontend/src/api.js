import axios from 'axios';

// Define the API base URL with a more robust approach
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return ''; // Use relative URLs in production
  }
  
  // Try connecting to these ports in order
  return 'http://localhost:3000'; // Server is running on port 3000
};

const API_BASE_URL = getBaseUrl();

// Add connection checking before making requests
const checkServerConnection = async () => {
  try {
    await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET', 
      mode: 'no-cors',
      timeout: 2000
    });
    return true;
  } catch (error) {
    console.error('Server connection check failed:', error);
    return false;
  }
};

// Create client with better error handling
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Add request interceptor with connection check
  client.interceptors.request.use(
    async config => {
      console.log(`Making API request to: ${config.url}`);
      const isConnected = await checkServerConnection();
      if (!isConnected) {
        alert('Server connection lost. Please ensure the backend is running.');
        return Promise.reject(new Error('Server is not running'));
      }
      return config;
    },
    error => Promise.reject(error)
  );
  
  // Add better error handling
  client.interceptors.response.use(
    response => response,
    error => {
      if (error.code === 'ERR_NETWORK') {
        console.error('Network error - server might be down:', error);
        alert('Cannot connect to server. Please ensure the backend is running on port 3000.');
      }
      return Promise.reject(error);
    }
  );
  
  return client;
};

const apiClient = createApiClient();

// Export improved API functions
export default apiClient;