#!/bin/bash

# Check current git status
echo "Checking git status..."
git status

# Stage all changed files
echo "Adding all changes to git..."
git add .

# Commit changes with a descriptive message
echo "Committing changes..."
git commit -m "Fix candidate vote handling and form submission issues

- Fixed validation error in candidate votes array
- Improved image upload handling
- Added proper error handling for form submissions
- Updated candidate routes to handle FormData correctly
- Enhanced user experience with better error messages"

# Push to the remote repository
echo "Pushing to remote repository..."
git push

echo "Done!"
