# Vercel Deployment Checklist

## Quick Fix for Production Issues

Your backend works locally but fails on Vercel because Firebase credentials are missing.

### ✅ Checklist

- [ ] **Step 1:** Go to https://vercel.com/dashboard
- [ ] **Step 2:** Select project `spotify-api-drab`
- [ ] **Step 3:** Go to Settings → Environment Variables
- [ ] **Step 4:** Add these 3 CRITICAL variables:

```
FIREBASE_PROJECT_ID = spotify-8fefc
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-fbsvc@spotify-8fefc.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY = [Copy from backend/firebase-service-account.json]
```

- [ ] **Step 5:** Add other variables from `backend/.env`:
  - HUGGINGFACE_API_KEY
  - NODE_ENV (set to "production")
  - FRONTEND_URL
  - SPOTIFY_CLIENT_ID
  - SPOTIFY_CLIENT_SECRET
  - EMAIL_SERVICE
  - EMAIL_USER
  - EMAIL_APP_PASSWORD

- [ ] **Step 6:** Redeploy (Deployments tab → Redeploy)
- [ ] **Step 7:** Test at https://spotify-api-drab.vercel.app/

### 🚀 Automated Setup (Recommended)

If you have Vercel CLI installed:

```bash
cd backend
npm i -g vercel
vercel login
vercel link
.\setup-vercel-env.ps1  # Windows
# or
bash setup-vercel-env.sh  # Mac/Linux
vercel --prod
```

### 🧪 Test After Deployment

```bash
cd backend
node test-vercel-deployment.js
```

### 📊 Expected Results

After proper setup:
- ✅ https://spotify-api-drab.vercel.app/ returns API info
- ✅ No CORS errors
- ✅ `/api/playlists/mood-history` works
- ✅ `/api/playlists/mood-generate` works (may take 30-60s)

### 🔍 Troubleshooting

If issues persist:
1. Check Vercel logs: https://vercel.com/dashboard → Logs
2. Look for "Firebase" errors
3. Verify `FIREBASE_PRIVATE_KEY` includes line breaks
4. Clear browser cache and retry

### 📝 Important Notes

- The `FIREBASE_PRIVATE_KEY` must include the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Line breaks in the private key are important - Vercel handles them automatically
- After adding variables, you MUST redeploy for changes to take effect
