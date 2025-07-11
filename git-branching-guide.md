# Git Branching Guide for Voting Application

## Creating and Switching to a New Branch

1. **Check current branch**
   ```bash
   git branch
   ```

2. **Create a new branch**
   ```bash
   git branch feature-candidate-images
   ```

3. **Switch to the new branch**
   ```bash
   git checkout feature-candidate-images
   ```

   Or do both in one command:
   ```bash
   git checkout -b feature-candidate-images
   ```

## Committing Changes to Your Branch

1. **Check which files have been modified**
   ```bash
   git status
   ```

2. **Add files to staging area**
   ```bash
   # Add specific files
   git add src/components/CandidateForm.js src/App.css

   # Or add all modified files
   git add .
   ```

3. **Commit your changes with a meaningful message**
   ```bash
   git commit -m "Add candidate image upload functionality"
   ```

## Pushing Your Branch to GitHub/Remote Repository

1. **Push the branch to the remote repository**
   ```bash
   git push -u origin feature-candidate-images
   ```

## Switching Back to Main Branch

```bash
git checkout main
```

## Merging Your Branch into Main (when ready)

1. **Switch to main branch first**
   ```bash
   git checkout main
   ```

2. **Pull latest changes from remote**
   ```bash
   git pull origin main
   ```

3. **Merge your feature branch**
   ```bash
   git merge feature-candidate-images
   ```

4. **Push the merged changes**
   ```bash
   git push origin main
   ```

## Creating a Pull Request (if using GitHub/GitLab/etc)

Instead of directly merging, you can create a pull request:

1. Push your branch to the remote repository
2. Go to your repository on GitHub/GitLab
3. Click "New Pull Request"
4. Select your branch to merge into main
5. Add description and create the pull request
6. Have team members review your code
7. Merge when approved

## Common Git Commands for Branch Management

```bash
# List all branches
git branch

# Delete a local branch
git branch -d feature-candidate-images

# Delete a remote branch
git push origin --delete feature-candidate-images

# Discard local changes to a file
git checkout -- filename.js

# Stash changes temporarily
git stash
git stash pop  # to bring back stashed changes
```
