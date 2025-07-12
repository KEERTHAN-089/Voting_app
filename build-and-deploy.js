const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths
const frontendDir = path.join(__dirname, 'frontend');
const frontendBuildDir = path.join(frontendDir, 'build');
const backendDir = path.join(__dirname, 'backend');
const deployDir = path.join(backendDir, '..', 'frontend', 'build');

// Ensure directories exist
if (!fs.existsSync(path.join(backendDir, '..', 'frontend'))) {
  fs.mkdirSync(path.join(backendDir, '..', 'frontend'), { recursive: true });
}

try {
  console.log('Building React app...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
  
  console.log('Copying build files to backend...');
  // Check if frontend/build exists
  if (fs.existsSync(frontendBuildDir)) {
    // If deploy directory exists, remove it first
    if (fs.existsSync(deployDir)) {
      fs.rmSync(deployDir, { recursive: true, force: true });
    }
    
    // Create deploy directory
    fs.mkdirSync(deployDir, { recursive: true });
    
    // Copy files
    fs.cpSync(frontendBuildDir, deployDir, { recursive: true });
    console.log('Build deployed successfully!');
  } else {
    console.error('Build directory does not exist. Build may have failed.');
  }
} catch (error) {
  console.error('Error during build and deploy:', error);
}
