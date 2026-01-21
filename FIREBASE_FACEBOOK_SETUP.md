# Firebase Facebook Authentication Setup Guide

This guide will help you set up Facebook Login using Firebase's built-in authentication provider. This is much simpler and more secure than custom implementations.

## Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Consumer" as the app type
4. Fill in your app details:
   - **App Name**: Mavrixfy (or your preferred name)
   - **App Contact Email**: Your email
   - **App Purpose**: Authentication & Account Creation

## Step 2: Configure Facebook Login Product

1. In your Facebook App dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Choose "Web" as the platform
4. Enter your Site URL: `https://yourdomain.com` (or `http://localhost:3000` for development)

## Step 3: Get Facebook App Credentials

1. Go to Settings → Basic in your Facebook App
2. Copy your **App ID** and **App Secret**
3. Keep these secure - you'll need them for Firebase configuration

## Step 4: Configure Firebase Authentication

### 4.1 Enable Facebook Provider in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **spotify-8fefc**
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Facebook** in the providers list
5. Click **Enable**

### 4.2 Add Facebook App Credentials to Firebase

In the Facebook configuration section:

1. **App ID**: Paste your Facebook App ID
2. **App Secret**: Paste your Facebook App Secret
3. **OAuth redirect URI**: Copy this URI from Firebase (you'll need it for Facebook)

The OAuth redirect URI will look like:
```
https://spotify-8fefc.firebaseapp.com/__/auth/handler
```

### 4.3 Save Configuration

Click **Save** to enable Facebook authentication in Firebase.

## Step 5: Configure Facebook App OAuth Settings

1. Go back to your Facebook App dashboard
2. Navigate to **Facebook Login** → **Settings**
3. Add the Firebase OAuth redirect URI to **Valid OAuth Redirect URIs**:
   ```
   https://spotify-8fefc.firebaseapp.com/__/auth/handler
   ```

4. Also add your website URLs:
   ```
   https://yourdomain.com/
   https://yourdomain.com/login
   https://yourdomain.com/register
   http://localhost:3000/
   http://localhost:3000/login
   http://localhost:3000/register
   ```

## Step 6: Configure App Domains

1. In Facebook App Settings → Basic
2. Add your domains to **App Domains** (one per line):
   ```
   localhost
   mavrixfy.site
   spotify-8fefc.firebaseapp.com
   ```

**Important Notes:**
- Don't include `http://` or `https://` in App Domains
- Don't include ports (like `:3000`) in App Domains
- Add each domain on a separate line
- Include both your production domain and Firebase domain

## Step 6.1: Configure Valid OAuth Redirect URIs

1. Go to **Facebook Login** → **Settings**
2. In **Valid OAuth Redirect URIs**, add these URLs (one per line):
   ```
   https://spotify-8fefc.firebaseapp.com/__/auth/handler
   http://localhost:3000/
   https://localhost:3000/
   https://mavrixfy.site/
   https://www.mavrixfy.site/
   https://mavrixfy.site/login
   https://mavrixfy.site/register
   https://www.mavrixfy.site/login
   https://www.mavrixfy.site/register
   ```

## Step 6.2: Set Site URL

1. In **Facebook Login** → **Settings**
2. Set **Site URL**:
   - Development: `http://localhost:3000`
   - Production: `https://mavrixfy.site`

## Step 7: Set Privacy Policy URL

1. In Settings → Basic
2. Add your Privacy Policy URL:
   ```
   https://mavrixfy.site/privacy
   ```

## Step 8: Test Your Integration

### 8.1 Development Testing

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Click "Continue with Facebook"
4. Complete the Facebook login flow
5. Verify that the user is created in Firebase Authentication

### 8.2 Check Firebase Console

1. Go to Firebase Console → Authentication → Users
2. You should see the new user with Facebook as the provider
3. Check that user data is properly synced

## Step 9: Go Live (Production)

### 9.1 Complete Facebook App Review

1. In Facebook App Review → App Details
2. Fill in all required information:
   - App description
   - Privacy Policy URL
   - Terms of Service URL
   - App icon
   - Screenshots

### 9.2 Switch to Live Mode

1. In Facebook App dashboard
2. Switch from "Development" to "Live" mode
3. Your Facebook Login is now available to all users!

## Environment Variables

You don't need to add Facebook credentials to your frontend environment variables when using Firebase authentication. Firebase handles all the OAuth flow internally.

## Security Benefits of Firebase Facebook Auth

✅ **No App Secret in Frontend** - Firebase handles server-side validation  
✅ **Secure Token Exchange** - Firebase manages OAuth flow securely  
✅ **Built-in Security** - Firebase handles token validation and refresh  
✅ **Simplified Implementation** - No custom backend endpoints needed  
✅ **Automatic User Management** - Firebase creates and manages user accounts  

## Troubleshooting

### Common Issues:

1. **"The domain of this URL isn't included in the app's domains" Error**
   - Go to Facebook App Settings → Basic
   - Add your domain to **App Domains**: `localhost` (for development)
   - Don't include `http://`, `https://`, or port numbers in App Domains
   - Add each domain on a separate line
   - Make sure **Site URL** is set in Facebook Login → Settings

2. **"App Not Setup" Error**
   - Verify Facebook App ID is correctly configured in Firebase
   - Ensure Facebook Login product is added to your Facebook app

3. **"Invalid OAuth Redirect URI" Error**
   - Check that Firebase OAuth redirect URI is added to Facebook app
   - Ensure the URI matches exactly (copy from Firebase console)
   - Add both HTTP and HTTPS versions for development

4. **"This app is in development mode" Error**
   - Add test users in Facebook App Review → Roles
   - Or complete app review and switch to Live mode

5. **Firebase Authentication Fails**
   - Check Firebase project configuration
   - Verify Facebook provider is enabled in Firebase console
   - Ensure App Secret is correctly entered in Firebase

### Testing with Test Users

1. Go to Facebook App Review → Roles
2. Add test users with their Facebook accounts
3. These users can test the login flow even in development mode

## Features Included

✅ **Firebase Integration** - Uses Firebase's built-in Facebook provider  
✅ **Secure Authentication** - No custom backend required  
✅ **User Profile Sync** - Automatically syncs Facebook profile data  
✅ **Error Handling** - Comprehensive error handling for all scenarios  
✅ **Loading States** - Visual feedback during authentication  
✅ **Responsive Design** - Works on both mobile and desktop  
✅ **Account Linking** - Can link Facebook to existing accounts  

## API Usage

The implementation uses Firebase's built-in methods:

```typescript
import { signInWithPopup, FacebookAuthProvider } from "firebase/auth";

// Create provider
const provider = new FacebookAuthProvider();
provider.addScope('email');
provider.addScope('public_profile');

// Sign in
const result = await signInWithPopup(auth, provider);
```

## Next Steps

1. ✅ **Complete Facebook App setup** following this guide
2. ✅ **Configure Firebase Authentication** with Facebook provider
3. ✅ **Test the integration** in development
4. ✅ **Deploy to production** with HTTPS
5. ✅ **Complete Facebook App Review** and go live

Your Firebase Facebook Authentication is now ready! 🎉

## Advantages Over Custom Implementation

- **Simpler Setup**: No custom backend endpoints needed
- **Better Security**: Firebase handles all token validation
- **Automatic Updates**: Firebase maintains Facebook API compatibility
- **Built-in Features**: Account linking, user management, etc.
- **Reduced Maintenance**: No need to maintain Facebook SDK integration