const { execSync } = require('child_process');

console.log('Pushing backend changes to GitHub...');

try {
  // Navigate to the project directory
  const projectDir = __dirname;
  
  // Make sure you're on the main branch
  execSync('git checkout main', { stdio: 'inherit', cwd: projectDir });
  
  // Stage backend changes (adjust paths as needed)
  execSync('git add backend/ server.js package.json package-lock.json', { stdio: 'inherit', cwd: projectDir });
  
  // Commit the changes
  execSync('git commit -m "Update backend with final changes"', { stdio: 'inherit', cwd: projectDir });
  
  // Push to GitHub
  execSync('git push origin main', { stdio: 'inherit', cwd: projectDir });
  
  console.log('✅ Backend changes pushed successfully to main branch!');
} catch (error) {
  console.error('❌ Error pushing backend changes:', error.message);
}
