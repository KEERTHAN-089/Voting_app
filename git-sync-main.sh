#!/bin/bash

# Git sync script to help resolve the non-fast-forward error

echo "====== Git Branch Sync Script ======"
echo "Current branch status:"
git status

echo -e "\nFetching latest changes from remote..."
git fetch origin

echo -e "\nOptions to resolve the error:"
echo "1. Merge remote changes into your local branch (safer option)"
echo "2. Force push your local changes (overwrites remote - use with caution!)"
echo "3. Create a new branch from your current work"
echo ""
echo "Run one of the following commands:"
echo ""
echo "Option 1 (recommended):"
echo "git pull origin main"
echo "git push origin main"
echo ""
echo "Option 2 (use with caution - will overwrite remote changes):"
echo "git push -f origin main"
echo ""
echo "Option 3 (create a new branch):"
echo "git checkout -b main-updated"
echo "git push origin main-updated"
echo ""
echo "If your work is already on feature-branch and you want to create a pull request:"
echo "Go to: https://github.com/KEERTHAN-089/Voting_app/pull/new/feature-branch"
