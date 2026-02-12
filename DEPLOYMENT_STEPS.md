# Backend Deployment Steps for Google OAuth

## Current Issue
The error "Cannot GET /auth/google-mobile" means your backend code changes haven't been deployed to Vercel yet.

## Quick Fix (3 Steps)

### Step 1: Deploy Backend to Vercel

Run this command in your terminal:

```bash
cd backend
vercel --prod
```

Or on Windows, use the deployment script:
```bash
cd backend
deploy.bat
```

### Step 2: Add Environment Variables to Vercel

After deployment, add these to your Vercel project:

1. Go to: https://vercel.com/your-username/your-project/settings/environment-variables

2. Add these variables:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

3. Click "Save" and redeploy

### Step 3: Get Google OAuth Credentials

If you haven't already:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI:
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback
   ```
4. Copy the Client ID and Client Secret
5. Add them to Vercel (Step 2)

## Verify Deployment

After deploying, test the endpoint:

```
https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=test
```

You should be redirected to Google sign-in (not see "Cannot GET").

## Alternative: Deploy via Git

If you have the backend connected to a Git repository:

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Add Google OAuth mobile endpoints"
   git push
   ```

2. Vercel will auto-deploy from your Git repository

## Troubleshooting

**"vercel: command not found"**
Install Vercel CLI:
```bash
npm install -g vercel
```

**"Not authorized"**
Login to Vercel:
```bash
vercel login
```

**Changes not showing**
- Clear Vercel cache and redeploy
- Check deployment logs in Vercel dashboard
- Verify the correct branch is deployed

## Files Modified (Already Done)

✅ `backend/src/controllers/auth.controller.js` - Added Google OAuth handlers
✅ `backend/src/routes/auth.route.js` - Added routes
✅ `backend/.env.example` - Updated with Google OAuth config

Now you just need to deploy!
