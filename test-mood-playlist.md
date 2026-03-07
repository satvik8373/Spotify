# Test AI Mood Playlist Feature

## Pre-flight Checklist

Before testing, ensure:

- [ ] Backend server is running on port 5000
- [ ] Frontend server is running on port 3000
- [ ] You're logged into Mavrixfy
- [ ] `.env.local` file exists in frontend directory

## Step-by-Step Test

### 1. Check Backend is Running

Open: `http://localhost:5000/api`

**Expected:** Should see some response (not 404)

### 2. Check Frontend is Running

Open: `http://localhost:3000`

**Expected:** Mavrixfy homepage loads

### 3. Navigate to Mood Playlist

**Method A:** Click sidebar link
- Look for "AI Mood Playlist" with sparkles ✨ icon
- Click it

**Method B:** Direct URL
- Navigate to: `http://localhost:3000/mood-playlist`

**Expected:** 
- Page loads with gradient header
- "AI Mood Playlist Generator" title visible
- Text input box visible
- Character counter shows "0 / 200 characters"

### 4. Test Input Validation

**Test 1: Empty Input**
- Leave text box empty
- Click "Generate Playlist"
- **Expected:** Error message "Please enter your mood"

**Test 2: Too Short**
- Type: "hi"
- **Expected:** Character counter shows yellow, button disabled

**Test 3: Valid Input**
- Type: "feeling happy and energetic today"
- **Expected:** Character counter shows green, button enabled

### 5. Generate First Playlist

**Input:** "feeling happy and energetic today"

**Click:** "Generate Playlist" button

**Expected:**
1. Loading screen appears with animated waveform
2. Message: "Analyzing your vibe…"
3. After 5-10 seconds, playlist appears with:
   - Emotion badge (likely "joy")
   - Playlist name (e.g., "Joy vibes")
   - 20 songs listed
   - Play, Save, Share buttons

**If it fails:**
- Check browser console for errors (F12)
- Check backend terminal for errors
- Verify you're logged in

### 6. Test Caching

**Input:** Same text "feeling happy and energetic today"

**Click:** "Generate Playlist" button

**Expected:**
- Results appear in < 1 second (much faster)
- Same playlist as before
- "cached: true" in response (check network tab)

### 7. Test Different Emotions

Try these and verify correct emotion detection:

| Input | Expected Emotion |
|-------|------------------|
| "feeling sad and lonely" | sadness |
| "angry and frustrated at work" | anger |
| "in love and feeling romantic" | love |
| "scared and anxious about tomorrow" | fear |
| "surprised and amazed by the news" | surprise |

### 8. Test Play Function

**Click:** Play button on generated playlist

**Expected:**
- First song starts playing
- Player controls appear at bottom
- Song shows in "Now Playing"

### 9. Test Save Function

**Click:** Save button

**Expected:**
- Toast notification: "Playlist saved to your library!"
- Playlist appears in your library

**Verify:**
- Go to Library page
- Find the saved playlist
- Click it - should open and play

### 10. Test Share Function

**Click:** Share button

**Expected:**
- Toast notification: "Share link copied to clipboard!"
- Link is in clipboard

**Verify:**
- Open incognito/private window
- Paste the link
- Should see playlist without logging in

### 11. Test Rate Limiting (Free Users)

**Generate 3 playlists** with different moods:
1. "happy"
2. "sad"  
3. "excited"

**Try 4th generation:**

**Expected:**
- Error message appears
- Message mentions "3 playlists per day"
- "Upgrade to Premium" button visible
- Can't generate more until midnight UTC

### 12. Test Error Handling

**Test offline mode:**
- Stop backend server
- Try to generate playlist

**Expected:**
- Error message: "Something went wrong. Please try again."
- No crash, graceful error handling

## Common Issues & Solutions

### Issue: "Failed to generate playlist"

**Check:**
1. Backend console for errors
2. Browser console (F12) for network errors
3. Is backend running on port 5000?
4. Is `.env.local` configured correctly?

**Solution:**
```bash
# Restart backend
cd backend
npm start
```

### Issue: "Please log in to generate mood playlists"

**Check:**
- Are you logged in?
- Check browser console for auth errors

**Solution:**
- Log out and log back in
- Clear browser cache
- Check Firebase configuration

### Issue: Page shows 404

**Check:**
- Is route added to App.tsx?
- Is frontend server running?

**Solution:**
- Verify `frontend/src/App.tsx` has mood-playlist route
- Restart frontend server

### Issue: Sidebar link not visible

**Check:**
- Is LeftSidebar.tsx updated?
- Browser cache cleared?

**Solution:**
- Hard refresh (Ctrl+Shift+R)
- Check `frontend/src/layout/components/LeftSidebar.tsx`

### Issue: API returns 500 error

**Check backend console for:**
- MongoDB connection errors
- Firebase authentication errors
- HuggingFace API errors

**Solution:**
- Check backend `.env` file
- Verify all environment variables are set
- Check backend logs for specific error

## Success Criteria

✅ All 12 tests pass
✅ No console errors
✅ Smooth user experience
✅ Fast response times (< 1s for cache hits)
✅ Proper error messages
✅ Rate limiting works
✅ Save and share functions work

## Performance Benchmarks

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Cache hit | < 1s | < 2s |
| Cache miss | < 10s | < 15s |
| Save playlist | < 2s | < 3s |
| Share link | < 1s | < 2s |
| Page load | < 2s | < 3s |

## Browser Console Commands

Test API directly from console:

```javascript
// Test generate playlist
fetch('http://localhost:5000/api/playlists/mood-generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({ moodText: 'feeling happy' })
})
.then(r => r.json())
.then(console.log)
```

## Report Template

After testing, fill this out:

```
Date: ___________
Tester: ___________

Tests Passed: __ / 12
Tests Failed: __ / 12

Issues Found:
1. 
2. 
3. 

Performance:
- Cache hit: ___s
- Cache miss: ___s
- Save: ___s
- Share: ___s

Notes:


Overall Status: [ ] Pass [ ] Fail
```

---

**Ready to test?** Follow the steps above and report any issues! 🧪✨
