const fs = require('fs');
const path = require('path');

// Files to remove
const filesToRemove = [
  // Temporary Git helpers
  'git-fix-merge.sh',
  'git-setup.sh',
  'git-setup.js',
  'git-commands.sh',
  'merge-branches.js',
  
  // Debugging helpers
  'check-case-sensitivity.js',
  'frontend/src/utils/debugHelper.js',
  
  // Build scripts that are no longer needed
  'build-and-deploy.js',
  'build-and-serve.js',
  'backend-push.js',
  'frontend-push.js',
  'create-release.js',
  'atlas-test.js',
  'backend/atlas-test.js',
  'backend/test-connection.js',
  'backend/test-mongo-connection.js',
  'backend/install-dependencies.js',
  'mongodb-atlas-setup.js',
  'generate-secret.js',
  
  // Backup and temporary files
  'models/User.js',
  'models/User.js.backup',
  'models/Candidate.js',
  'middleware/admin.js',
  'middleware/auth.js',
  'routes/candidates.js',
  'routes/users.js'
];

// Directories to remove
const dirsToRemove = [
  'merge-backups',
  'temp',
  'config'
];

// Fix case sensitivity issues in imports
const filesToFix = [
  {
    path: 'backend/routes/candidateRoute.js',
    fixes: [
      { from: '../models/User', to: '../models/user' },
      { from: '../models/Candidate', to: '../models/candidate' }
    ]
  },
  {
    path: 'backend/routes/userRoutes.js',
    fixes: [
      { from: '../models/User', to: '../models/user' }
    ]
  }
];

// Clean up files
console.log('Removing unnecessary files...');
filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
    } catch (err) {
      console.error(`❌ Error removing ${file}: ${err.message}`);
    }
  }
});

// Clean up directories
console.log('\nRemoving unnecessary directories...');
dirsToRemove.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed directory: ${dir}`);
    } catch (err) {
      console.error(`❌ Error removing directory ${dir}: ${err.message}`);
    }
  }
});

// Fix imports in files
console.log('\nFixing import paths...');
filesToFix.forEach(fileConfig => {
  const filePath = path.join(__dirname, fileConfig.path);
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      fileConfig.fixes.forEach(fix => {
        content = content.replace(
          new RegExp(`require\\(['"]${fix.from}['"]\\)`, 'g'), 
          `require('${fix.to}')`
        );
      });
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in: ${fileConfig.path}`);
    } catch (err) {
      console.error(`❌ Error fixing imports in ${fileConfig.path}: ${err.message}`);
    }
  } else {
    console.warn(`⚠️ File not found: ${fileConfig.path}`);
  }
});

console.log('\n✅ Cleanup complete! Your project structure is now cleaner.');

// Show final project structure
console.log('\nCurrent project structure:');
function printDir(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  // Sort directories first, then files
  const sortedEntries = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });
  
  sortedEntries.forEach((entry, i) => {
    const isLast = i === sortedEntries.length - 1;
    const line = prefix + (isLast ? '└── ' : '├── ');
    
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        console.log(`${line}${entry.name}/`);
        printDir(
          path.join(dir, entry.name),
          prefix + (isLast ? '    ' : '│   ')
        );
      }
    } else {
      console.log(`${line}${entry.name}`);
    }
  });
}

try {
  printDir(__dirname);
} catch (err) {
  console.error('Error showing directory structure:', err);
}
