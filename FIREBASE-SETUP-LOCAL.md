# Firebase Setup for Local Development

## The Problem

Your AI Mood Playlist Generator needs to access Firestore to fetch songs, but Firebase credentials aren't configured for local development.

**Error:** `Could not load the default credentials`

## Solution: Download Firebase Service Account Key

### Step 1: Get Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **spotify-8fefc**
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Click **Generate Key** - a JSON file will download

### Step 2: Save the Key File

1. Rename the downloaded file to: `firebase-service-account.json`
2. Move it to: `backend/firebase-service-account.json`
3. **IMPORTANT:** This file contains sensitive credentials - never commit it to Git!

### Step 3: Update Backend .env

Add this line to `backend/.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

### Step 4: Restart Backend

```bash
# Stop the current backend (Ctrl+C in the terminal)
# Then restart:
cd backend
npm start
```

## Alternative: Use Existing Production Credentials

If you don't want to download a new key, you can use the existing Firebase Admin SDK initialization which uses Application Default Credentials. However, you'll need to:

1. Install Google Cloud SDK
2. Run: `gcloud auth application-default login`
3. Select your Firebase project

## Verify It Works

After setup, try generating a playlist again:

1. Go to: `http://localhost:3000/mood-playlist`
2. Enter: "feeling happy and energetic"
3. Click "Generate Playlist"
4. Should see 20 songs! 🎵

## Security Notes

⚠️ **NEVER commit firebase-service-account.json to Git!**

The `.gitignore` should already have:
```
firebase-service-account.json
*.json
```

If not, add it manually.

## Troubleshooting

### Still getting credential errors?

Check that:
- File path is correct: `backend/firebase-service-account.json`
- Environment variable is set: `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json`
- Backend was restarted after adding the env var

### File not found error?

Use absolute path instead:
```env
GOOGLE_APPLICATION_CREDENTIALS=E:/Mavrixfy/Mavrixfy-web/backend/firebase-service-account.json
```

### Permission denied?

Make sure the JSON file has read permissions and isn't corrupted.

---

**Once configured, your AI Mood Playlist Generator will work perfectly!** 🚀
