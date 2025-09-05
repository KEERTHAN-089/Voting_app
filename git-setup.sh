#!/bin/bash

# Git Setup Script for Voting App

# Initialize Git repository (if not already done)
if [ ! -d .git ]; then
  echo "Initializing Git repository..."
  git init
  echo "Git repository initialized."
else
  echo "Git repository already exists."
fi

# Create .gitignore file
echo "Creating .gitignore file..."
cat > .gitignore << EOL
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build files
/build
/frontend/build
/dist

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
.DS_Store
EOL
echo ".gitignore file created."

# Stage all files
echo "Staging files..."
git add .
echo "Files staged."

# Show git status
echo "Current Git status:"
git status

# Instructions for committing and pushing
echo "
Next steps:
1. Commit your changes:
   git commit -m \"Initial commit of Voting App\"

2. If you have a GitHub repository:
   git remote add origin https://github.com/YOUR_USERNAME/Voting_app.git
   git branch -M main
   git push -u origin main

3. Or to create a new GitHub repository:
   - Go to https://github.com/new
   - Name your repository 'Voting_app'
   - Don't initialize with README, .gitignore, or license
   - Click 'Create repository'
   - Follow the instructions for 'push an existing repository from the command line'
"
