const { execSync } = require('child_process');

console.log('Pushing frontend changes to GitHub...');

try {
  // Navigate to the project directory
  const projectDir = __dirname;
  
  // Switch to the frontend branch
  execSync('git checkout fmain', { stdio: 'inherit', cwd: projectDir });
  
  // Stage frontend changes (adjust paths as needed)
  execSync('git add frontend/', { stdio: 'inherit', cwd: projectDir });
  
  // Commit the changes
  execSync('git commit -m "Complete frontend implementation"', { stdio: 'inherit', cwd: projectDir });
  
  // Push to GitHub
  execSync('git push origin fmain', { stdio: 'inherit', cwd: projectDir });
  
  console.log('✅ Frontend changes pushed successfully to fmain branch!');
} catch (error) {
  console.error('❌ Error pushing frontend changes:', error.message);
}
