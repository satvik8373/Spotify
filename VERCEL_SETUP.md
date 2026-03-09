# Vercel Deployment Setup Guide

## Current Issues
- ❌ 500 Internal Server Error on `/api/playlists/mood-history`
- ❌ CORS errors on `/api/playlists/mood-generate`
- ❌ 504 Gateway Timeout on mood generation

## Root Cause
Firebase Admin SDK credentials are not configured in Vercel environment variables.

## Solution: Add Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Select your project: `spotify-api-drab`
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Required Environment Variables

Add these variables one by one:

#### Firebase Configuration (REQUIRED)
```
FIREBASE_PROJECT_ID
spotify-8fefc
```

```
FIREBASE_CLIENT_EMAIL
firebase-adminsdk-fbsvc@spotify-8fefc.iam.gserviceaccount.com
```

```
FIREBASE_PRIVATE_KEY
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDX5A7Sjnq0q85c
6hv0BuUbt+1q/AJP+pC78jfCmIlEKlSAVxpsD8ccBvbW8RZbdbdFAWYyYNh+gjw8
33VjFQWvWrzlLaBzvyMLhRVhy4smDMIMEFjLcbG+tMqkCSAMcNJEaKg1xvTq2Qfp
mDpTh+23fr88QQTQUXQ+eN6HdWHnQmLZ+a8EhIm3x/Oj8k6M7dngABImrHcj1IZD
YTTaNcFY0tiqHtrgUaUp1SPETGj2JwDg7kPWKJ831/Q8fU0D/ZzKqh11vsBlMCh/
IKKUZyT6I5y8cFkVUR0vVgg+i+VwpKfpNiLWKKeMXYwwqfizuxv+AM6VMC7KvrTS
6JcUz0NHAgMBAAECggEAW1qxuv93hQQ+aqrV8UkJodUOrfq9r8JDhIRWfA236BRR
dY1mLNvwUTfRM9sIruL9DkItUJwSgFXzz35vWeIHadBnpkLMZq420iUaiytqUkuL
wTcZm90cbaprJUaHPTxwfWob48Ww1b/IzVwRMk+Ok9saaRDKTKxrGBRldcSCDS0O
2qhDoXaJSAGrmHUigX9MvRIConnqnw8lFCzqi+gcSV9pk3PHrssP5nJ1Q3UbLBvi
jsj8Ea0kemGWLgnJ5a/10llDLUiUB5k/mFBVXuRF1Pfv4ck0NeNo7LDBlVKwV7Wj
SxSbkUaQxHpdK+r0RLI/r8r0MvD7sSOV+ROCgwn1IQKBgQD8Q0KU7ZegZiS7bcMc
IyffHUqIaynfON98n9SaWaflxKT2wFJ8vwHosEsS1U2gL09j7tHZ93ydboCnDzDK
EYt1fErIfpOf6m7c8ZR69Z/3+4V7Ca6+5Vs9wXpHwvTnQ/e2NAwtKgt5FhU2Zlyy
PrtdnTPPj4opogwJsars+yH2ewKBgQDbFtpFKjeVxXsDGBV4SaHPOQclCK2QVtXV
upJpmycFLe/lNcbynj1liiuwW37aMayuiMTDuGgVEM74QNUY3eYHO+sdhI5U8rZM
iRSKJJQaHVKmPhnCqlU5RDEQcVvvRYts9MlNiTy7vs+c0AYn/0vXnapcWcCeYKVP
VBwRD2hSpQKBgQC3Uv3xExVM+M4a87KGITpZl4TRzOc6FK+9dr3fieZNQXIM7ElF
5N2zR2LXhfIKxjbwzd7tg0CpfGO8hHqVbtilgbUrLWmFHq6AnIOmNBiT89LWTnwS
uMVtBM0jl5e49ZjwbbSnodWCory5svwMgTBS4OqFHbBvfxc2eEpaPEs7PwKBgQCq
lEZpZ49Tqyg1poDA4QN85jfr26/XG+TtvY/VbZmZ7MRFP/OgXxgKgOO3MeW4WMjM
M2yPvno7PJUIsOG5tLsukrZiixyOg1LwkCJP1F8DXiVFjkBcUmZ8ad2RodEkoI8H
zCcXmWyR+OSIgWbpqVoRjI5hzPet2C2dcC1SEx70iQKBgH7nbFPIRq9BmD6ztOFG
kL0GB5mBNOyqz9R/mjD8ilqDm+FxpbMBlXd9NURe/EghpmdPYW53Iqv2uHCHwR3v
IoAPR/IzhwwGQzPGtAj/IhbtfjQSMHDKw8A3eN+TboFrwgO4MBv7VO23UgEZEn4h
NjoCAllnNHta/nHsnrwZkNoE
-----END PRIVATE KEY-----
```

**IMPORTANT:** When adding `FIREBASE_PRIVATE_KEY`, make sure to:
- Copy the ENTIRE key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep the line breaks (Vercel will handle them automatically)

#### Other Required Variables
```
FIREBASE_STORAGE_BUCKET
spotify-8fefc.firebasestorage.app
```

```
FIREBASE_DATABASE_URL
https://spotify-8fefc-default-rtdb.firebaseio.com
```

```
HUGGINGFACE_API_KEY
your-huggingface-api-key-here
```

```
NODE_ENV
production
```

```
FRONTEND_URL
https://mavrixfy.site
```

```
EMAIL_SERVICE
gmail
```

```
EMAIL_USER
mavrixesports22@gmail.com
```

```
EMAIL_APP_PASSWORD
orqkxmutwjgifekc
```

```
SPOTIFY_CLIENT_ID
7f22a495ad7e4587acf6cc2f82e41748
```

```
SPOTIFY_CLIENT_SECRET
6bba9755ba50486cb299448e011b55e3
```

```
SPOTIFY_REDIRECT_URI
https://mavrixfy.site/spotify-callback
```

```
OTA_BASE_URL
https://spotify-api-drab.vercel.app
```

```
APK_DOWNLOAD_URL
https://github.com/satvik8373/Mavrixfy-App/releases/download/v1.2.0/mavrixfy.apk
```

```
MOOD_PLAYLIST_ENABLED
true
```

```
MOOD_PLAYLIST_CACHE_TTL_HOURS
24
```

```
MOOD_PLAYLIST_FREE_LIMIT
3
```

### Step 3: Redeploy

After adding all environment variables:

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Redeploy** button
4. Wait for deployment to complete

### Step 4: Verify

Test these endpoints:
- https://spotify-api-drab.vercel.app/ (should return API info)
- https://spotify-api-drab.vercel.app/api/playlists/mood-credit-status (with auth token)

## Alternative: Use Vercel CLI

If you prefer command line:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link to project
vercel link

# Add environment variables
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
# ... add all other variables

# Redeploy
vercel --prod
```

## Troubleshooting

### If CORS errors persist:
1. Clear browser cache
2. Check Vercel deployment logs for errors
3. Verify all environment variables are set correctly

### If 500 errors persist:
1. Check Vercel function logs: https://vercel.com/[your-username]/spotify-api-drab/logs
2. Look for Firebase initialization errors
3. Verify `FIREBASE_PRIVATE_KEY` has correct line breaks

### If 504 timeout errors persist:
- The mood generation endpoint takes time due to HuggingFace API
- Consider upgrading Vercel plan for longer function timeout (currently 60s max on free tier)
- Or optimize the mood generation logic to be faster

## Quick Copy-Paste for Vercel CLI

```bash
vercel env add FIREBASE_PROJECT_ID production
# Enter: spotify-8fefc

vercel env add FIREBASE_CLIENT_EMAIL production
# Enter: firebase-adminsdk-fbsvc@spotify-8fefc.iam.gserviceaccount.com

vercel env add FIREBASE_PRIVATE_KEY production
# Paste the entire private key with line breaks

vercel env add HUGGINGFACE_API_KEY production
# Enter: your-huggingface-api-key

vercel env add NODE_ENV production
# Enter: production

vercel env add FRONTEND_URL production
# Enter: https://mavrixfy.site

# Deploy
vercel --prod
```

## Expected Result

After proper configuration:
- ✅ No CORS errors
- ✅ `/api/playlists/mood-history` returns 200
- ✅ `/api/playlists/mood-generate` works (may take 30-60s)
- ✅ Firebase logs show successful initialization
