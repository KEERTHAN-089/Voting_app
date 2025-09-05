import api from './api';

export function logApiMethods() {
  console.group('API Methods Check');
  console.log('API Object Type:', typeof api);
  console.log('API Methods Available:', Object.keys(api));
  
  // Check each important method
  console.log('api.register is function?', typeof api.register === 'function');
  console.log('api.login is function?', typeof api.login === 'function');
  console.log('api.getCandidates is function?', typeof api.getCandidates === 'function');
  console.log('api.createCandidate is function?', typeof api.createCandidate === 'function');
  console.groupEnd();
  
  return api; // Return the api for chaining
}

// This immediately logs api methods when imported
logApiMethods();

export default api;
