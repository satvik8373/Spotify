# Firebase Setup Guide

## Overview
This project uses Firebase for authentication and database services. The Firebase project ID is `spotify-8fefc`.

## Environment Variables

The following environment variables are required for Firebase to work properly:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=spotify-8fefc
FIREBASE_STORAGE_BUCKET=spotify-8fefc.firebasestorage.app
FIREBASE_DATABASE_URL=https://spotify-8fefc-default-rtdb.firebaseio.com
```

## Common Issues and Solutions

### 1. "Unable to detect a Project Id" Error

**Problem**: Firebase Admin SDK can't find the project ID.

**Solution**: 
- Make sure the `.env` file exists in the `backend` directory
- Verify that `FIREBASE_PROJECT_ID=spotify-8fefc` is set in your `.env` file
- Restart your server after making changes

### 2. Firebase Authentication Fails

**Problem**: Firebase auth middleware fails to verify tokens.

**Solutions**:
- Check that your frontend is using the correct Firebase configuration
- Ensure the Firebase project is properly set up in the Firebase Console
- Verify that Authentication is enabled in your Firebase project

### 3. Service Account Issues

**Problem**: Need to use a service account for production.

**Solution**:
1. Go to Firebase Console > Project Settings > Service Accounts
2. Generate a new private key
3. Add the JSON content to your `.env` file as `FIREBASE_SERVICE_ACCOUNT`

## Setup Commands

```bash
# Create .env file with proper configuration
node setup-env.js

# Install dependencies
npm install

# Start the server
npm start
```

## Firebase Project Details

- **Project ID**: spotify-8fefc
- **Storage Bucket**: spotify-8fefc.firebasestorage.app
- **Database URL**: https://spotify-8fefc-default-rtdb.firebaseio.com

## Frontend Configuration

The frontend Firebase configuration is in `frontend/src/lib/firebase.ts` and should match the project settings above.

## Troubleshooting

1. **Check if .env file exists**: `ls -la .env`
2. **Verify environment variables**: `echo $FIREBASE_PROJECT_ID`
3. **Check server logs**: Look for Firebase initialization messages
4. **Test Firebase connection**: Try accessing Firebase Console

## Development vs Production

- **Development**: Uses Application Default Credentials with explicit project ID
- **Production**: Should use a service account for better security
