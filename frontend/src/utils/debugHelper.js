/**
 * Debug Helper Utility
 * 
 * Provides consistent logging and inspection of API responses
 */

// Enhanced console log with type information
export const logData = (label, data) => {
  const type = Array.isArray(data) ? 'array' : typeof data;
  const count = Array.isArray(data) ? data.length : (typeof data === 'object' && data !== null ? Object.keys(data).length : null);
  
  console.log(
    `%c${label} %c[${type}${count !== null ? `: ${count}` : ''}]`,
    'color: blue; font-weight: bold',
    'color: gray; font-style: italic'
  );
  
  // Log the actual data
  console.log(data);
  
  // For arrays, provide additional detail about items
  if (Array.isArray(data) && data.length > 0) {
    console.log(`First item type: ${typeof data[0]}`);
    console.log('First item sample:', data[0]);
  }
  
  return data; // Return for chaining
};

// Inspect a data structure for missing or null properties
export const inspectObject = (obj, requiredProps = []) => {
  if (!obj) {
    console.warn('Object is null or undefined');
    return false;
  }
  
  // Check if object is empty
  if (Object.keys(obj).length === 0) {
    console.warn('Object is empty');
    return false;
  }
  
  // Check required properties
  const missingProps = requiredProps.filter(prop => !(prop in obj) || obj[prop] === null || obj[prop] === undefined);
  
  if (missingProps.length > 0) {
    console.warn(`Missing required properties: ${missingProps.join(', ')}`);
    return false;
  }
  
  return true;
};

export default {
  logData,
  inspectObject
};
