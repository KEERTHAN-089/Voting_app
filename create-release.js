const { execSync } = require('child_process');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const createRelease = async () => {
  try {
    // Navigate to the project directory
    const projectDir = __dirname;
    
    // Ask for version number
    const version = await new Promise(resolve => {
      rl.question('Enter version number (e.g., 1.0.0): ', answer => resolve(answer.trim() || '1.0.0'));
    });
    
    // Create an annotated tag
    const tagMessage = await new Promise(resolve => {
      rl.question('Enter release description: ', answer => 
        resolve(answer.trim() || 'Voting App Complete Release'));
    });
    
    console.log(`Creating release v${version}...`);
    
    // Create and push tag
    execSync(`git tag -a v${version} -m "${tagMessage}"`, { cwd: projectDir });
    execSync('git push --tags', { stdio: 'inherit', cwd: projectDir });
    
    console.log(`\n✅ Successfully created release v${version}!`);
    console.log(`\nTo create a proper release on GitHub:`);
    console.log(`1. Go to your GitHub repository`);
    console.log(`2. Click "Releases" on the right side`);
    console.log(`3. Click "Create a new release"`);
    console.log(`4. Select tag "v${version}"`);
    console.log(`5. Fill in release details and click "Publish release"`);
  } catch (error) {
    console.error('❌ Error creating release:', error.message);
  } finally {
    rl.close();
  }
};

createRelease();
