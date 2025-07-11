// This is a helper script to install the required dependencies
const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Installing required dependencies...');
  execSync('npm install cors express mongoose dotenv bcryptjs jsonwebtoken', { 
    stdio: 'inherit',
    cwd: path.join(__dirname) 
  });
  console.log('Dependencies installed successfully!');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
}
