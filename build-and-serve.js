const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths
const frontendDir = path.join(__dirname, 'frontend');
const buildDir = path.join(frontendDir, 'build');

// Check if frontend directory exists
if (!fs.existsSync(frontendDir)) {
  console.error('Frontend directory not found. Creating it...');
  fs.mkdirSync(frontendDir, { recursive: true });
}

// Check if necessary files exist
try {
  // Build the application
  console.log('Building the React application...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
  
  // Check if build was successful
  if (fs.existsSync(path.join(buildDir, 'index.html'))) {
    console.log('Build successful! Starting server...');
    
    // Serve the application using npx serve
    console.log('Application will be available at http://localhost:3000');
    execSync('npx serve -s build -l 3000', { cwd: frontendDir, stdio: 'inherit' });
  } else {
    console.error('Build directory exists but index.html was not found.');
  }
} catch (error) {
  console.error('Error during build process:', error.message);
}
