const fs = require('fs');
const path = require('path');

// Files that can be safely removed
const filesToRemove = [
  // Temporary files
  'stash-and-checkout.js',
  'checkout-commit.js',
  'git-second-last.js',
  'organize-project.js',
  'get-commits.js',
  'build-and-deploy.js',
  'build-and-serve.js',
  'check-case-sensitivity.js',
  'connection-troubleshooting.md',
  'git-fix-merge.sh',
  'git-setup.js',
  'git-setup.sh',
  'merge-branches.js',
  
  // Duplicate files
  'frontend/download-icons.js',
  
  // Old model files with uppercase naming (if already renamed)
  'backend/models/User.js.backup',
  'backend/models/Candidate.js.backup',
  
  // Temporary backend files
  'backend/start-server.js',
  'backend/index.js',
  'backend/checkServer.js'
];

// Directories to remove if empty
const emptyDirsToRemove = [
  'temp',
  'tmp',
  '.temp',
  'logs',
  'merge-backups'
];

console.log('🧹 Starting project cleanup...');

// Remove files
let removedCount = 0;
filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
      removedCount++;
    } catch (err) {
      console.error(`❌ Error removing ${file}: ${err.message}`);
    }
  }
});

// Remove empty directories
let emptyDirsRemoved = 0;
emptyDirsToRemove.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    try {
      // Check if directory is empty
      const files = fs.readdirSync(dirPath);
      if (files.length === 0) {
        fs.rmdirSync(dirPath);
        console.log(`✅ Removed empty directory: ${dir}`);
        emptyDirsRemoved++;
      } else {
        console.log(`⚠️ Directory not empty, skipping: ${dir}`);
      }
    } catch (err) {
      console.error(`❌ Error removing directory ${dir}: ${err.message}`);
    }
  }
});

console.log(`\n🎉 Cleanup complete! Removed ${removedCount} files and ${emptyDirsRemoved} empty directories.`);
console.log('\nTo run this cleanup script:');
console.log('node cleanup.js');
