#!/bin/bash

# Deployment script for Mavrixfy Backend
echo "🚀 Starting deployment process..."

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the backend directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if nodemailer is installed
if ! npm list nodemailer > /dev/null 2>&1; then
    echo "❌ Error: nodemailer not installed. Running npm install again..."
    npm install nodemailer
fi

echo "✅ Dependencies installed"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Verify environment variables in Vercel dashboard"
echo "2. Test the registration flow at https://www.mavrixfy.site/register"
echo "3. Check email for OTP code"
