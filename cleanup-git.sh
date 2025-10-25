#!/bin/bash

# Git Cleanup Script - Remove tracked files that should be ignored
# This script safely removes build artifacts and cached files from git

set -e

echo "🧹 Git Cleanup Script"
echo "====================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}WARNING: This will remove build artifacts from git tracking${NC}"
echo "Files will still exist locally, just not tracked by git."
echo ""
echo "Files to be removed from git:"
echo "  - web-interface/.next/ (Next.js build output)"
echo "  - dist/ (TypeScript build output)"
echo "  - .DS_Store files"
echo ""
echo "Continue? (y/n)"
read -r answer

if [ "$answer" != "y" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Step 1: Removing .next from git..."
git rm -r --cached web-interface/.next/ 2>/dev/null || echo "  (already removed or doesn't exist)"

echo ""
echo "Step 2: Removing dist from git..."
git rm -r --cached dist/ 2>/dev/null || echo "  (already removed or doesn't exist)"

echo ""
echo "Step 3: Removing .DS_Store files..."
find . -name .DS_Store -print0 | xargs -0 git rm --cached 2>/dev/null || echo "  (none found)"

echo ""
echo "Step 4: Committing cleanup changes..."
git add .gitignore web-interface/.gitignore
git commit -m "chore: remove build artifacts and update gitignore

- Remove .next/ and dist/ from git tracking
- Update .gitignore to prevent future tracking
- Remove .DS_Store files
- Add comprehensive environment file protection" || echo "No changes to commit"

echo ""
echo -e "${GREEN}✓ Cleanup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run 'git status' to verify"
echo "2. Push changes: git push"
echo "3. Build artifacts will no longer be tracked"
echo ""
