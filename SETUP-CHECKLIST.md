# Setup Checklist for AI Mood Playlist Generator

## Prerequisites ✓

- [x] Backend server installed (`npm install` in backend/)
- [x] Frontend server installed (`npm install` in frontend/)
- [x] Feature code integrated
- [x] Routes configured
- [x] UI component added

## Required Credentials ⚠️

### 1. HuggingFace API Key

- [ ] Go to https://huggingface.co/settings/tokens
- [ ] Create new token (Read access)
- [ ] Copy token (starts with `hf_...`)
- [ ] Update `backend/.env`: `HUGGINGFACE_API_KEY=hf_YOUR_TOKEN`

**Current Status:** ❌ Getting 401 Unauthorized (key invalid/expired)

### 2. Firebase Service Account

- [ ] Go to https://console.firebase.google.com/
- [ ] Select project: `spotify-8fefc`
- [ ] Navigate to: Settings ⚙️ → Project Settings → Service Accounts
- [ ] Click: Generate New Private Key
- [ ] Save as: `backend/firebase-service-account.json`
- [ ] Update `backend/.env`: Uncomment `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json`

**Current Status:** ❌ Missing credentials (Firestore queries failing)

## Testing Steps

Once credentials are configured:

1. **Restart Backend**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend** (in new terminal)
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test the Feature**
   - Open: http://localhost:3000/mood-playlist
   - Enter: "feeling happy and energetic"
   - Click: "Generate Playlist"
   - Expected: 20 songs displayed

4. **Verify Logs**
   - Check backend terminal for errors
   - Should see: `[PlaylistGenerator] Generated playlist with 20 songs`

## Current Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Server | ✅ Running | Port 5000 |
| Frontend Server | ✅ Running | Port 3000 |
| Firebase Auth | ✅ Working | User login successful |
| Emotion Detection | ⚠️ Fallback | HuggingFace API failing, fallback working |
| Genre Mapping | ✅ Working | Correctly mapped emotions to genres |
| Firestore Queries | ❌ Failing | Missing credentials |
| Playlist Generation | ❌ Failing | Depends on Firestore |

## Quick Fix Commands

```bash
# 1. Update HuggingFace API key in backend/.env
# 2. Add Firebase service account file
# 3. Restart backend
cd backend
npm start
```

## Files to Check

- `backend/.env` - Environment variables
- `backend/firebase-service-account.json` - Should exist (not in Git)
- `TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `FIREBASE-SETUP-LOCAL.md` - Firebase setup instructions

## Security Notes

⚠️ These files should NEVER be committed to Git:
- `backend/.env`
- `backend/firebase-service-account.json`

They're already in `.gitignore` - verify with:
```bash
git check-ignore backend/.env backend/firebase-service-account.json
```

## Next Steps

1. Fix HuggingFace API key (5 min)
2. Add Firebase credentials (10 min)
3. Restart backend
4. Test playlist generation
5. Celebrate! 🎉
