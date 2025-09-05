// Helper to check if we're importing the correct API functions
import * as api from '../api';

export function logApiSettings() {
  console.log('API Configuration:');
  console.log('- getCandidates function hash:', api.getCandidates.toString().slice(0, 50) + '...');
  console.log('- API Base URL used:', process.env.NODE_ENV === 'production' ? 'Production (relative URLs)' : 'http://localhost:3000'); // Updated port
  
  // More detailed debugging info
  console.log('- Current hostname:', window.location.hostname);
  console.log('- Current port:', window.location.port);
  console.log('- React app proxy settings:', process.env.REACT_APP_PROXY || 'None configured');
  
  // Test the connection directly
  fetch('http://localhost:10000/candidates')
    .then(response => {
      console.log('Test fetch to /candidates:', response.status, response.ok ? 'OK' : 'Failed');
      return response.json();
    })
    .then(data => console.log('Data received:', data))
    .catch(err => console.error('Test fetch error:', err));
}

// Call this function when importing this module
logApiSettings();

export default { logApiSettings };
