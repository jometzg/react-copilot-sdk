#!/bin/bash

# Git Cleanup Script - Remove build artifacts and dependencies from git history
# Usage: bash scripts/cleanup-git.sh

set -e

echo "🧹 React Copilot Git Cleanup Script"
echo "===================================="
echo ""

# Check if we're in a git repo
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository. Run from project root."
    exit 1
fi

echo "📊 Current git repo size:"
du -sh .git/

echo ""
echo "🔍 Checking for build artifacts and dependencies..."
echo ""

# Arrays to track what we're removing
declare -a TO_REMOVE=()

# Check for common culprits
CHECK_PATHS=(
    "node_modules"
    "backend/node_modules"
    "frontend/node_modules"
    "dist"
    "backend/dist"
    "frontend/dist"
    "build"
    "backend/build"
    ".env"
    "backend/.env"
    "frontend/.env"
    "data/uploads"
    "data/outputs"
)

for path in "${CHECK_PATHS[@]}"; do
    if git ls-files "$path" &>/dev/null; then
        echo "  ✓ Found: $path"
        TO_REMOVE+=("$path")
    fi
done

if [ ${#TO_REMOVE[@]} -eq 0 ]; then
    echo "✅ No build artifacts or dependencies found in git!"
    exit 0
fi

echo ""
echo "⚠️  About to remove ${#TO_REMOVE[@]} item(s) from git history"
echo ""
echo "Files/folders to remove:"
for item in "${TO_REMOVE[@]}"; do
    echo "  - $item"
done

echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo ""
echo "🗑️  Removing from git..."

for path in "${TO_REMOVE[@]}"; do
    echo "  Removing: $path"
    git rm -r --cached "$path" 2>/dev/null || true
done

echo ""
echo "📝 Staging .gitignore..."
git add .gitignore

echo ""
echo "💾 Committing cleanup..."
git commit -m "Remove build artifacts, dependencies, and generated files from git history

- Remove node_modules/ (dependencies, not source)
- Remove dist/, build/ (compiled output)
- Remove .env files (configuration/secrets)
- Remove data/ directories (user uploads and outputs)

Going forward, .gitignore prevents these from being committed."

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 New git repo size:"
du -sh .git/

echo ""
echo "📝 Verify cleanup with:"
echo "   git log --oneline -3"
echo "   git ls-files | wc -l"
echo "   du -sh .git/"

echo ""
echo "🚀 Ready to push:"
echo "   git push origin $(git rev-parse --abbrev-ref HEAD)"
