# 🚀 Mavrixfy-web Backend Deployment

## Quick Deploy to GitHub

### Windows:
```bash
cd Mavrixfy-web
push-backend.bat
```

### Mac/Linux:
```bash
cd Mavrixfy-web
chmod +x push-backend.sh
./push-backend.sh
```

### Manual:
```bash
cd Mavrixfy-web
git add backend/
git commit -m "feat(backend): Add version API and fix JioSaavn playlists"
git push origin main
```

---

## 📋 What's Being Deployed

### New Files:
```
✅ backend/app-version.json
   - Version configuration
   - Update messages and changelog
   - Store URLs for Android/iOS

✅ backend/src/routes/version.route.js
   - GET /api/version/check
   - POST /api/version/compare
```

### Modified Files:
```
✅ backend/src/index.js
   - Added version routes import
   - Registered /api/version endpoint

✅ backend/src/services/jiosaavn.service.js
   - Added getCompletePlaylistDetails()
   - Added pagination support
   - Fetches all songs (up to 500)

✅ backend/src/routes/jiosaavn.route.js
   - Updated /playlists endpoint
   - Added complete parameter
```

---

## 🔍 Verify Files Before Push

```bash
# Check files exist
ls backend/app-version.json
ls backend/src/routes/version.route.js

# Check git status
git status backend/
```

---

## ✅ After Pushing

### 1. Wait for Vercel Deployment
Vercel auto-deploys when you push to GitHub.
**Wait 1-2 minutes** for deployment to complete.

### 2. Test Version API

```bash
# Test version check endpoint
curl https://spotify-api-drab.vercel.app/api/version/check

# Expected response:
{
  "success": true,
  "data": {
    "latestVersion": "1.1.0",
    "minimumSupportedVersion": "1.0.0",
    "forceUpdate": false,
    "updateUrl": {
      "android": "https://play.google.com/store/apps/details?id=com.mavrixfy.app",
      "ios": "https://apps.apple.com/app/mavrixfy/id123456789"
    },
    "message": "New version available with improved performance and bug fixes",
    "changelog": [...],
    "features": [...]
  }
}
```

```bash
# Test version compare endpoint
curl -X POST https://spotify-api-drab.vercel.app/api/version/compare \
  -H "Content-Type: application/json" \
  -d '{"currentVersion":"1.0.0"}'

# Expected response:
{
  "success": true,
  "data": {
    "currentVersion": "1.0.0",
    "latestVersion": "1.1.0",
    "updateAvailable": true,
    "forceUpdate": false,
    ...
  }
}
```

### 3. Test JioSaavn Playlists

```bash
# Test playlist endpoint (should return all songs)
curl "https://spotify-api-drab.vercel.app/api/jiosaavn/playlists?id=YOUR_PLAYLIST_ID"

# Should return playlist with ALL songs, not just 10
```

### 4. Test from Mobile App

```bash
cd ../Mavrixfy_App
npm run test:api
```

Expected output:
```
✅ Backend is reachable
✅ Version check endpoint working
✅ Version compare endpoint working
✅ All tests passed!
```

---

## 🔧 Configuration

### app-version.json Structure

```json
{
  "latestVersion": "1.1.0",              // Latest app version
  "minimumSupportedVersion": "1.0.0",    // Minimum required version
  "forceUpdate": false,                   // Force users to update?
  "updateUrl": {
    "android": "Play Store URL",
    "ios": "App Store URL"
  },
  "message": "Update message",            // Shown in modal
  "changelog": [                          // List of changes
    "Feature 1",
    "Feature 2"
  ],
  "releaseDate": "2026-02-23",           // Release date
  "features": [                           // Featured items
    {
      "title": "Feature Title",
      "description": "Feature description"
    }
  ]
}
```

---

## 🎯 Update Version Config

When releasing a new app version:

### 1. Edit app-version.json

```bash
cd Mavrixfy-web/backend
nano app-version.json
```

### 2. Update Version Info

```json
{
  "latestVersion": "1.2.0",
  "message": "New features and improvements",
  "changelog": [
    "Added offline mode",
    "Improved search",
    "Bug fixes"
  ]
}
```

### 3. Push Changes

```bash
git add backend/app-version.json
git commit -m "Update version to 1.2.0"
git push origin main
```

**Users will see update notification immediately!**

---

## 🚨 Force Update (Critical)

For critical security updates:

```json
{
  "latestVersion": "1.2.0",
  "minimumSupportedVersion": "1.2.0",
  "forceUpdate": true,
  "message": "Critical security update required"
}
```

Users on older versions will see non-dismissible update dialog.

---

## 📊 API Endpoints

### Version Check
```
GET /api/version/check
```
Returns latest version configuration.

### Version Compare
```
POST /api/version/compare
Body: { "currentVersion": "1.0.0" }
```
Compares current version with latest and returns update info.

### JioSaavn Playlists
```
GET /api/jiosaavn/playlists?id=PLAYLIST_ID&complete=true
```
Returns playlist with ALL songs (pagination enabled).

---

## 🔍 Troubleshooting

### API Returns 404

**Problem:** Version endpoints not found

**Solution:**
1. Check if backend is deployed
2. Verify `index.js` has version routes
3. Check Vercel deployment logs
4. Redeploy if needed

### Playlists Still Show 10 Songs

**Problem:** Pagination not working

**Solution:**
1. Verify backend is deployed
2. Check `jiosaavn.service.js` has new functions
3. Test endpoint directly with curl
4. Check Vercel logs for errors

### Vercel Deployment Failed

**Problem:** Build errors

**Solution:**
1. Check Vercel dashboard
2. Look for syntax errors
3. Verify all imports are correct
4. Check environment variables

---

## 📝 Deployment Checklist

Before pushing:
- [ ] `app-version.json` exists
- [ ] `version.route.js` exists
- [ ] `index.js` imports version routes
- [ ] `jiosaavn.service.js` has pagination
- [ ] All files committed

After pushing:
- [ ] Vercel deployment successful
- [ ] Version API working
- [ ] JioSaavn playlists working
- [ ] Mobile app can connect
- [ ] Test API passes

---

## 🌐 Your Backend

**URL:** https://spotify-api-drab.vercel.app
**Repo:** https://github.com/satvik8373/Spotify.git

**Endpoints:**
- `/api/version/check` - Version info
- `/api/version/compare` - Compare versions
- `/api/jiosaavn/playlists` - Playlists with all songs

---

## 📞 Support

If deployment fails:

1. **Check Vercel Logs:**
   ```bash
   vercel logs
   ```

2. **Test Locally:**
   ```bash
   cd backend
   npm run server:dev
   ```

3. **Verify Files:**
   ```bash
   git status backend/
   ```

4. **Test Endpoints:**
   ```bash
   curl http://localhost:5000/api/version/check
   ```

---

## ✅ Ready to Deploy!

Run the push script:

```bash
# Windows
push-backend.bat

# Mac/Linux
./push-backend.sh
```

Or manually:

```bash
git add backend/
git commit -m "feat(backend): Add version API and fix JioSaavn playlists"
git push origin main
```

**Your backend will be live in 1-2 minutes! 🚀**
