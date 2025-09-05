#!/bin/bash

echo "🔧 Git Merge Conflict Resolution Script"
echo "======================================="

# Create backup of conflicted files
echo "📁 Creating backups of conflicted files..."
mkdir -p merge-backups
[ -f backend/models/candidate.js ] && cp backend/models/candidate.js merge-backups/candidate.js.bak
[ -f backend/models/user.js ] && cp backend/models/user.js merge-backups/user.js.bak
[ -f backend/package.json ] && cp backend/package.json merge-backups/backend-package.json.bak
[ -f package.json ] && cp package.json merge-backups/package.json.bak
[ -f server.js ] && cp server.js merge-backups/server.js.bak

echo "✅ Backups created in merge-backups directory"

# Fix backend/models/Candidate.js - we'll use our latest version
echo "🔄 Resolving conflict in backend/models/candidate.js..."
cat > backend/models/candidate.js << 'EOL'
const mongoose = require('mongoose');

// Define a schema for the votes to ensure proper structure
const voteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  votedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  party: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  age: {
    type: Number,
    required: true
  },
  imageUrl: {
    type: String,
    default: '/default-candidate.jpg'
  },
  voteCount: {
    type: Number,
    default: 0
  },
  // Fix votes array definition to use either ObjectIds or vote objects
  votes: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      return ret;
    },
    virtuals: true
  }
});

// Add a pre-save hook to ensure vote count is always accurate
candidateSchema.pre('save', function(next) {
  try {
    // Ensure votes is an array
    if (!Array.isArray(this.votes)) {
      this.votes = [];
    }
    
    // Update vote count
    this.voteCount = this.votes.length;
    next();
  } catch (error) {
    next(error);
  }
});

// Update the voting route to use consistent vote format
candidateSchema.methods.addVote = function(userId) {
  // Ensure votes is an array
  if (!Array.isArray(this.votes)) {
    this.votes = [];
  }
  
  // Add vote in consistent format
  this.votes.push({
    user: userId,
    votedAt: new Date()
  });
  
  // Update vote count
  this.voteCount = this.votes.length;
  return this;
};

// Check if model exists before creating to prevent OverwriteModelError
const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;
EOL

# Fix backend/models/User.js
echo "🔄 Resolving conflict in backend/models/user.js..."
cat > backend/models/user.js << 'EOL'
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  age: {
    type: Number,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }, 
  mobile: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true
  },  
  aadharCardNumber: {
    type: Number,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },  
  role: {
    type: String,
    enum: ['admin', 'voter'],
    default: 'voter'
  },
  // Keep both field names for backward compatibility during transition
  isVoted: {
    type: Boolean,
    default: false
  },
  hasVoted: {
    type: Boolean,
    default: false
  },
  votedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    default: null
  }
}, {
  timestamps: true
});

// Add a pre-save middleware to synchronize isVoted and hasVoted
userSchema.pre('save', async function(next) {
  // Keep both voting status fields in sync
  if (this.isModified('isVoted')) {
    this.hasVoted = this.isVoted;
  }
  if (this.isModified('hasVoted')) {
    this.isVoted = this.hasVoted;
  }
  
  // Handle password hashing
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Check if model already exists before creating a new one
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
EOL

# Fix backend/package.json
echo "🔄 Resolving conflict in backend/package.json..."
cat > backend/package.json << 'EOL'
{
  "name": "voting-app-backend",
  "version": "1.0.0",
  "description": "Backend for Voting Application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^7.0.0",
    "multer": "^1.4.4",
    "mongodb": "^5.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  },
  "author": "",
  "license": "ISC"
}
EOL

# Fix root package.json
echo "🔄 Resolving conflict in package.json..."
cat > package.json << 'EOL'
{
  "name": "voting-app",
  "version": "1.0.0",
  "description": "Secure Electronic Voting Application",
  "main": "index.js",
  "scripts": {
    "start": "node server.js",
    "server": "cd backend && npm start",
    "client": "cd frontend && npm start",
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "install-all": "npm install && cd backend && npm install && cd ../frontend && npm install",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "concurrently": "^8.2.0"
  },
  "keywords": [
    "voting",
    "election",
    "mern",
    "react",
    "node",
    "mongodb"
  ],
  "author": "",
  "license": "ISC"
}
EOL

# Fix server.js in root
echo "🔄 Resolving conflict in server.js..."
cat > server.js << 'EOL'
// Root server.js is just a wrapper that loads the backend server
console.log('Loading backend server...');
require('./backend/server');
EOL

# Stage the resolved files
echo "📦 Staging resolved files..."
git add backend/models/candidate.js backend/models/user.js backend/package.json package.json server.js

# Stage all other files
echo "📦 Staging remaining files..."
git add .

# Status check
echo "🔍 Current git status:"
git status

echo "✅ Merge conflicts resolved!"
echo ""
echo "Next steps:"
echo "1. Review the changes with 'git diff --staged'"
echo "2. Commit the changes with 'git commit -m \"Resolve merge conflicts\"'"
echo "3. Push to GitHub with 'git push'"
echo ""
echo "Command to run in PowerShell or CMD:"
echo "git commit -m \"Resolve merge conflicts and fix Candidate voting model\""
echo "git push"
