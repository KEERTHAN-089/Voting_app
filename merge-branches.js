const { execSync } = require('child_process');

console.log('Merging frontend branch into main...');

try {
  // Navigate to the project directory
  const projectDir = __dirname;
  
  // Switch to main branch
  execSync('git checkout main', { stdio: 'inherit', cwd: projectDir });
  
  // Merge the fmain branch into main
  execSync('git merge fmain --no-ff -m "Merge frontend into main"', { stdio: 'inherit', cwd: projectDir });
  
  // Push the merged result
  execSync('git push origin main', { stdio: 'inherit', cwd: projectDir });
  
  console.log('✅ Successfully merged frontend branch into main!');
  console.log('Your complete project is now available in the main branch.');
} catch (error) {
  console.error('❌ Error during merge:', error.message);
  console.error('You may need to resolve conflicts manually before completing the merge.');
}
