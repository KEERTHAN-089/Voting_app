const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to execute git commands
function execCommand(command) {
  try {
    console.log(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to execute: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Main function
async function setupGit() {
  console.log('🚀 Setting up Git and pushing to GitHub...');
  
  // Check if git is installed
  try {
    execSync('git --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Git is not installed. Please install Git and try again.');
    process.exit(1);
  }
  
  // Check if .git directory already exists
  if (fs.existsSync(path.join(__dirname, '.git'))) {
    console.log('✅ Git repository is already initialized.');
  } else {
    console.log('Initializing Git repository...');
    if (!execCommand('git init')) {
      process.exit(1);
    }
  }
  
  // Get GitHub username
  const askUsername = () => {
    return new Promise((resolve) => {
      rl.question('Enter your GitHub username: ', (username) => {
        if (!username.trim()) {
          console.log('❌ GitHub username cannot be empty!');
          return askUsername().then(resolve);
        }
        resolve(username.trim());
      });
    });
  };
  
  // Get repository name
  const askRepo = () => {
    return new Promise((resolve) => {
      rl.question('Enter repository name (default: voting-app): ', (repo) => {
        resolve(repo.trim() || 'voting-app');
      });
    });
  };
  
  // Get branch name
  const askBranch = () => {
    return new Promise((resolve) => {
      rl.question('Enter branch name (default: main): ', (branch) => {
        resolve(branch.trim() || 'main');
      });
    });
  };
  
  const username = await askUsername();
  const repoName = await askRepo();
  const branchName = await askBranch();
  
  // Add all files
  console.log('Adding files to Git...');
  if (!execCommand('git add .')) {
    process.exit(1);
  }
  
  // Commit changes
  console.log('Committing files...');
  if (!execCommand('git commit -m "Initial commit"')) {
    process.exit(1);
  }
  
  // Setup remote repository
  const remoteUrl = `https://github.com/${username}/${repoName}.git`;
  console.log(`Setting up remote repository: ${remoteUrl}`);
  if (!execCommand(`git remote add origin ${remoteUrl}`)) {
    process.exit(1);
  }
  
  // Push to GitHub
  console.log(`Pushing to GitHub (${branchName} branch)...`);
  if (!execCommand(`git push -u origin ${branchName}`)) {
    console.log('\n❌ Push failed. Please create the repository on GitHub first:');
    console.log(`1. Go to: https://github.com/new`);
    console.log(`2. Repository name: ${repoName}`);
    console.log(`3. Make it public or private as you prefer`);
    console.log(`4. Click "Create repository"`);
    console.log(`5. Run this script again`);
    process.exit(1);
  }
  
  console.log('\n✅ Successfully pushed to GitHub!');
  console.log(`Your repository is available at: https://github.com/${username}/${repoName}`);
  
  rl.close();
}

setupGit();
