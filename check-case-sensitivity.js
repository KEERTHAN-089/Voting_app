const fs = require('fs');
const path = require('path');

// List of file paths to check for case sensitivity issues
const filesToCheck = [
  'backend/routes/userRoutes.js',
  'backend/routes/candidateRoute.js',
  'backend/models/user.js',
  'backend/models/candidate.js'
];

// Paths that should be lowercase
const pathsToLowercase = [
  '../models/User',
  '../models/Candidate'
];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let hasIssues = false;
    
    pathsToLowercase.forEach(path => {
      if (content.includes(path)) {
        console.log(`[ISSUE] ${filePath} contains "${path}" - should be lowercase`);
        hasIssues = true;
      }
    });
    
    if (!hasIssues) {
      console.log(`[OK] ${filePath} has no case sensitivity issues`);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
  }
}

console.log('Checking for case sensitivity issues in imports...');
filesToCheck.forEach(checkFile);
