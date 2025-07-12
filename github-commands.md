# GitHub Commands for Pushing Your Completed Project

## Pushing Backend Changes
```bash
# Navigate to your project directory
cd "C:\Users\keert\OneDrive\Desktop\NNM22CS089\Voting_app"

# Make sure you're on the main branch
git checkout main

# Add all backend changes
git add backend/ server.js models/ middleware/ *.js package.json package-lock.json

# Commit the changes
git commit -m "Final backend implementation"

# Push to GitHub
git push origin main
```

## Pushing Frontend Changes
```bash
# Switch to the frontend branch
git checkout fmain

# Add frontend changes
git add frontend/

# Commit the changes
git commit -m "Complete frontend implementation"

# Push to GitHub
git push origin fmain
```

## Merging Frontend into Main (Optional)
```bash
# Switch back to main branch
git checkout main

# Merge the frontend branch
git merge fmain --no-ff -m "Merge frontend into main branch"

# Push the merged changes
git push origin main
```

## Creating a Release (Recommended)
```bash
# Create an annotated tag
git tag -a v1.0.0 -m "Voting App Complete Release"

# Push the tag
git push --tags
```

Then go to your GitHub repository and create a proper release from this tag.
