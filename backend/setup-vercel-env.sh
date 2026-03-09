#!/bin/bash

# Vercel Environment Variables Setup Script
# This script helps you quickly add all required environment variables to Vercel
# 
# Prerequisites:
# 1. Install Vercel CLI: npm i -g vercel
# 2. Login: vercel login
# 3. Link project: vercel link
#
# Usage: bash setup-vercel-env.sh

echo "🚀 Setting up Vercel Environment Variables"
echo "=========================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Read .env file and set variables
if [ ! -f ".env" ]; then
    echo "❌ .env file not found in current directory"
    echo "   Please run this script from the backend directory"
    exit 1
fi

echo "📝 Reading .env file..."
echo ""

# Function to add environment variable
add_env_var() {
    local key=$1
    local value=$2
    
    if [ -z "$value" ]; then
        echo "⏭️  Skipping $key (empty value)"
        return
    fi
    
    echo "➕ Adding $key..."
    echo "$value" | vercel env add "$key" production --force
}

# Parse .env file and add variables
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue
    
    # Remove quotes from value
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    
    # Skip certain variables
    if [[ $key == "GOOGLE_APPLICATION_CREDENTIALS" ]]; then
        echo "⏭️  Skipping $key (not needed in Vercel)"
        continue
    fi
    
    add_env_var "$key" "$value"
    
done < .env

echo ""
echo "=========================================="
echo "✅ Environment variables setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify variables in Vercel dashboard"
echo "2. Deploy: vercel --prod"
echo "3. Test endpoints with: node test-vercel-deployment.js"
echo ""
