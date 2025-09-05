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
}

try {
  printDir(__dirname);
} catch (err) {
  console.error('Error showing directory structure:', err);
}
