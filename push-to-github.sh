#!/bin/bash

# Script to push Spotify Sync implementation to GitHub
# Excludes mavrixfy_flutter folder

echo "🚀 Pushing Spotify Sync Implementation to GitHub"
echo "================================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not initialized"
    echo "Run: git init"
    exit 1
fi

# Add mavrixfy_flutter to .gitignore if not already there
if ! grep -q "mavrixfy_flutter/" .gitignore; then
    echo "mavrixfy_flutter/" >> .gitignore
    echo "✅ Added mavrixfy_flutter/ to .gitignore"
fi

# Show what will be committed
echo "📋 Files to be committed:"
echo "------------------------"
git status --short

echo ""
echo "🔍 Verifying mavrixfy_flutter is excluded..."
if git ls-files | grep -q "mavrixfy_flutter/"; then
    echo "⚠️  Warning: mavrixfy_flutter files are tracked by git"
    echo "Run: git rm -r --cached mavrixfy_flutter/"
    read -p "Remove mavrixfy_flutter from git tracking? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git rm -r --cached mavrixfy_flutter/
        echo "✅ Removed mavrixfy_flutter from git tracking"
    fi
else
    echo "✅ mavrixfy_flutter is not tracked"
fi

echo ""
echo "📦 Staging changes..."
git add .

echo ""
echo "📝 Creating commit..."
read -p "Enter commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="feat: Add Spotify sync implementation for web and mobile"
fi

git commit -m "$commit_msg"

echo ""
echo "🔗 Remote repository:"
git remote -v

echo ""
read -p "Push to origin main? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⬆️  Pushing to GitHub..."
    git push origin main
    echo ""
    echo "✅ Successfully pushed to GitHub!"
else
    echo "ℹ️  Commit created but not pushed"
    echo "To push manually, run: git push origin main"
fi

echo ""
echo "🎉 Done!"
