# Facebook Login Setup Guide

This guide will help you set up Facebook Login for your Mavrixfy application.

## Prerequisites

1. A Facebook Developer Account
2. Your application domain/URL
3. Firebase project with authentication enabled

## Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Consumer" as the app type
4. Fill in your app details:
   - **App Name**: Mavrixfy (or your preferred name)
   - **App Contact Email**: Your email
   - **App Purpose**: Authentication & Account Creation

## Step 2: Configure Facebook Login

1. In your Facebook App dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Choose "Web" as the platform
4. Enter your Site URL: `https://yourdomain.com` (or `http://localhost:3000` for development)

## Step 3: Configure OAuth Settings

1. Go to Facebook Login → Settings
2. Add these URLs to "Valid OAuth Redirect URIs":
   ```
   https://yourdomain.com/
   https://yourdomain.com/login
   https://yourdomain.com/register
   http://localhost:3000/
   http://localhost:3000/login
   http://localhost:3000/register
   ```

## Step 4: Get App Credentials

1. Go to Settings → Basic
2. Copy your **App ID** and **App Secret**
3. Add these to your environment variables:

### Frontend (.env)
```env
VITE_FACEBOOK_APP_ID=your_facebook_app_id_here
```

### Backend (.env)
```env
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
```

## Step 5: Configure App Domains

1. In Settings → Basic, add your domain to "App Domains":
   ```
   yourdomain.com
   localhost
   ```

## Step 6: Set Privacy Policy URL

1. In Settings → Basic, add your Privacy Policy URL:
   ```
   https://yourdomain.com/privacy
   ```

## Step 7: Configure Data Use Checkup

1. Go to App Review → Permissions and Features
2. Request these permissions if needed:
   - `email` (usually approved automatically)
   - `public_profile` (usually approved automatically)

## Step 8: Test Your Integration

1. Start your development server
2. Navigate to the login page
3. Click "Continue with Facebook"
4. Complete the Facebook login flow
5. Verify that the user is created in your Firebase Authentication

## Step 9: Go Live

1. In App Review → App Details, fill in all required information
2. Switch your app from "Development" to "Live" mode
3. Your Facebook Login is now available to all users!

## Troubleshooting

### Common Issues:

1. **"App Not Setup" Error**
   - Make sure your App ID is correct in the environment variables
   - Verify that Facebook Login product is added to your app

2. **"Invalid OAuth Redirect URI" Error**
   - Check that your redirect URIs are correctly configured
   - Ensure the domain matches exactly (including http/https)

3. **"This app is in development mode" Error**
   - Add test users in App Review → Roles
   - Or switch the app to Live mode

4. **Backend Authentication Fails**
   - Verify your App Secret is correct
   - Check that the Facebook API endpoints are accessible
   - Ensure Firebase Admin SDK is properly configured

### Testing with Test Users

1. Go to App Review → Roles
2. Add test users with their Facebook accounts
3. These users can test the login flow even in development mode

## Security Best Practices

1. **Never expose your App Secret** in frontend code
2. **Always validate tokens** on the backend
3. **Use HTTPS** in production
4. **Regularly rotate** your App Secret
5. **Monitor** your app's usage in Facebook Analytics

## API Endpoints

The implementation includes these backend endpoints:

- `POST /api/facebook/auth` - Authenticate with Facebook token
- `POST /api/facebook/profile` - Get Facebook user profile
- `POST /api/facebook/revoke` - Revoke Facebook access token

## Frontend Integration

The Facebook login is integrated into:

- Login page (`/login`)
- Register page (`/register`)
- Both mobile and desktop layouts

## Features Included

✅ **Facebook SDK Integration** - Automatic SDK loading and initialization
✅ **Token Validation** - Backend validates Facebook access tokens
✅ **Firebase Integration** - Creates Firebase custom tokens for seamless auth
✅ **User Profile Sync** - Syncs Facebook profile data with your database
✅ **Error Handling** - Comprehensive error handling and user feedback
✅ **Loading States** - Visual feedback during authentication process
✅ **Responsive Design** - Works on both mobile and desktop

## Next Steps

1. Set up your Facebook App following this guide
2. Add your credentials to environment variables
3. Test the login flow
4. Deploy to production
5. Switch Facebook App to Live mode

Your Facebook Login integration is now complete and ready to use!