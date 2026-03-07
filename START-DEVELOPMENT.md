# Development Server Startup Guide

## Quick Start

### 1. Start Backend Server

Open a terminal in the backend directory:

```bash
cd backend
npm start
```

Or for development with auto-reload:

```bash
cd backend
npm run dev
```

**Expected Output:**
```
Server is running on port 5000
Frontend URL: https://mavrixfy.site
Environment: production
```

**Backend will be available at:** `http://localhost:5000`

### 2. Start Frontend Server

Open a NEW terminal in the frontend directory:

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

**Frontend will be available at:** `http://localhost:3000`

### 3. Access the AI Mood Playlist Feature

Once both servers are running:

1. Open your browser to: `http://localhost:3000`
2. Log in to your account
3. Click on **"AI Mood Playlist"** in the left sidebar (with sparkles ✨ icon)
4. Or navigate directly to: `http://localhost:3000/mood-playlist`

## Environment Configuration

### Backend (.env)
Located at: `backend/.env`

Key settings for mood playlist:
```env
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxx
MOOD_PLAYLIST_ENABLED=true
MOOD_PLAYLIST_CACHE_TTL_HOURS=24
MOOD_PLAYLIST_FREE_LIMIT=3
```

### Frontend (.env.local)
Located at: `frontend/.env.local` (created for you)

```env
VITE_API_URL=http://localhost:5000/api
VITE_REDIRECT_URI=http://localhost:3000/spotify-callback
VITE_MOOD_PLAYLIST_ENABLED=true
```

## Troubleshooting

### Backend Issues

#### Port 5000 Already in Use
```bash
# Windows - Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

#### MongoDB Connection Error
- Check if MongoDB is running
- Verify MONGODB_URI in backend/.env

#### Firebase Error
- Ensure Firebase credentials are properly configured
- Check FIREBASE_PROJECT_ID in backend/.env

### Frontend Issues

#### Port 3000 Already in Use
Vite will automatically try the next available port (3001, 3002, etc.)

#### API Connection Error
- Verify backend is running on port 5000
- Check `frontend/.env.local` has correct VITE_API_URL
- Clear browser cache and reload

#### Module Not Found Errors
```bash
cd frontend
npm install
```

### Mood Playlist Specific Issues

#### "Rate limit exceeded" on First Try
- This is normal if you've already used 3 generations today
- Wait until midnight UTC or test with a premium account

#### "Failed to generate playlist"
- Check backend console for errors
- Verify HuggingFace API key is valid
- Check if Firebase is properly configured

#### Playlist Generation Takes Too Long
- First request may take 5-10 seconds (AI processing)
- Subsequent requests with same mood should be < 1 second (cached)
- Check backend console for timeout errors

## Testing the Feature

### Test Flow:

1. **Generate a Playlist**
   - Enter: "feeling happy and energetic"
   - Click "Generate Playlist"
   - Wait 5-10 seconds
   - Should see a 20-song playlist with "joy" emotion

2. **Test Caching**
   - Enter the SAME mood text again
   - Should return results in < 1 second
   - Playlist should be identical

3. **Test Different Emotions**
   - Try: "feeling sad and lonely" → should detect "sadness"
   - Try: "angry and frustrated" → should detect "anger"
   - Try: "in love and romantic" → should detect "love"

4. **Test Rate Limiting (Free User)**
   - Generate 3 playlists
   - 4th attempt should show rate limit error
   - Error should suggest upgrading to premium

5. **Test Save & Share**
   - Click "Save" button → should save to library
   - Click "Share" button → should copy link to clipboard
   - Open share link in incognito → should work without login

## Monitoring

### Backend Logs to Watch:

```
[MoodPlaylistAPI] Validation failed: ...
[EmotionAnalyzer] API error, using fallback: ...
[MoodPlaylistAPI] Cache hit for mood text
[PlaylistGenerator] Generated playlist: ...
```

### Frontend Console:

```
[Analytics] playlist_generated { emotion: 'joy', ... }
[Analytics] playlist_played { playlistId: '...', ... }
[Analytics] playlist_saved { playlistId: '...', ... }
```

## Quick Commands Reference

```bash
# Backend
cd backend
npm start              # Start production server
npm run dev            # Start with nodemon (auto-reload)
npm test               # Run tests

# Frontend
cd frontend
npm run dev            # Start development server
npm run build          # Build for production
npm run preview        # Preview production build

# Both (from root)
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm run dev
```

## API Endpoints

Once backend is running, test these endpoints:

### Health Check
```bash
curl http://localhost:5000/api
```

### Generate Mood Playlist (requires auth)
```bash
curl -X POST http://localhost:5000/api/playlists/mood-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"moodText": "feeling happy and energetic"}'
```

### Get Shared Playlist (no auth required)
```bash
curl http://localhost:5000/api/playlists/share/SHARE_ID
```

## Success Indicators

✅ Backend running: Console shows "Server is running on port 5000"
✅ Frontend running: Browser opens to http://localhost:3000
✅ API connected: No CORS errors in browser console
✅ Feature visible: "AI Mood Playlist" appears in sidebar
✅ Generation works: Playlist appears after entering mood
✅ Caching works: Second request with same mood is instant
✅ Save works: Playlist appears in library
✅ Share works: Link copied to clipboard

## Need Help?

Check these files for more details:
- `.kiro/specs/ai-mood-playlist-generator/USER-GUIDE.md` - User guide
- `.kiro/specs/ai-mood-playlist-generator/API-DOCUMENTATION.md` - API docs
- `.kiro/specs/ai-mood-playlist-generator/test-checkpoint-summary.md` - Test status

---

**Ready to start?** Run the commands above and enjoy your AI Mood Playlist Generator! 🎵✨
