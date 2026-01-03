#!/bin/bash

# This script tells Vercel when to skip builds to prevent duplicate deployments
# It will only build when there are changes in the frontend directory

echo "🔍 Checking if frontend changes exist..."

# Check if there are changes in the frontend directory
if git diff HEAD^ HEAD --quiet -- .; then
  echo "❌ No frontend changes detected. Skipping build."
  exit 0
else
  echo "✅ Frontend changes detected. Proceeding with build."
  exit 1
fi