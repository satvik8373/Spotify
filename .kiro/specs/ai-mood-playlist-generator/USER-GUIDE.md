# AI Mood Playlist Generator - User Guide

## How to Access the Feature

The AI Mood Playlist Generator is now integrated into your Mavrixfy web app! Here's how to access and use it:

### 🎯 Access Methods

#### Method 1: Sidebar Navigation (Recommended)
1. Look at the left sidebar in your app
2. Find the **"AI Mood Playlist"** item (with a sparkles ✨ icon)
3. It's located right below "Liked Songs"
4. Click on it to open the mood playlist generator

#### Method 2: Direct URL
Navigate directly to: `https://mavrixfy.site/mood-playlist`

### 📱 How to Use

1. **Describe Your Mood**
   - Enter a description of how you're feeling (3-200 characters)
   - Examples:
     - "feeling energetic and ready to conquer the day"
     - "sad and missing someone"
     - "happy and celebrating with friends"
     - "anxious about tomorrow's presentation"
     - "in love and feeling romantic"

2. **Generate Playlist**
   - Click the "Generate Playlist" button
   - Wait a few seconds while AI analyzes your mood
   - You'll see a loading animation with "Analyzing your vibe…"

3. **Enjoy Your Playlist**
   - Get a personalized 20-song playlist
   - See the detected emotion (joy, sadness, anger, love, fear, surprise)
   - Play, save, or share your playlist

### 🎵 Features

#### Play Instantly
- Click the play button to start listening immediately
- Songs are queued in your player

#### Save to Library
- Click "Save" to add the playlist to your library
- Access it anytime from your playlists

#### Share with Friends
- Click "Share" to get a shareable link
- Link is automatically copied to clipboard
- Friends can access the playlist without logging in

#### Generate More
- Click "Generate Another Playlist" to try a different mood
- Each generation creates a unique playlist

### 💎 Rate Limits

#### Free Users
- 3 playlist generations per day
- Resets at midnight UTC
- Upgrade to premium for unlimited generations

#### Premium Users
- Unlimited playlist generations
- No daily limits

### 🎨 Emotion Categories

The AI detects 6 emotions and maps them to music genres:

| Emotion | Genres | Example Moods |
|---------|--------|---------------|
| 😭 Sadness | Lofi, Sad Hindi, Acoustic | "feeling down", "heartbroken" |
| 😀 Joy | Dance, Pop, Bollywood | "happy", "excited", "energetic" |
| 🤬 Anger | Rap, Rock | "angry", "frustrated", "mad" |
| ❤️ Love | Romantic, Soft | "in love", "romantic", "affectionate" |
| 😨 Fear | Instrumental | "scared", "anxious", "worried" |
| 😲 Surprise | Indie | "surprised", "amazed", "unexpected" |

### 🚀 Tips for Best Results

1. **Be Specific**: Instead of "happy", try "happy and dancing at a party"
2. **Use Emotions**: Include emotion words like "sad", "excited", "angry"
3. **Add Context**: "feeling nostalgic about summer" works better than just "nostalgic"
4. **Try Different Lengths**: Longer descriptions (50-100 chars) often give better results
5. **Experiment**: Try different phrasings to discover new music

### 🔧 Technical Details

#### How It Works
1. Your mood text is analyzed by AI (HuggingFace emotion detection)
2. If AI is unavailable, a keyword-based fallback system is used
3. The detected emotion is mapped to music genres
4. 20 songs are selected from the database matching those genres
5. Songs with matching mood tags are prioritized
6. Results are cached for 24 hours for faster repeat access

#### Performance
- Cache hit (same mood within 24h): < 1 second
- Cache miss (new mood): < 10 seconds
- Fallback mode (AI unavailable): < 6 seconds

### 🐛 Troubleshooting

#### "Rate limit exceeded" Error
- You've used your 3 free generations today
- Wait until midnight UTC or upgrade to premium
- Premium users get unlimited generations

#### "Failed to generate playlist" Error
- Check your internet connection
- Try refreshing the page
- If problem persists, the backend might be down

#### Playlist Doesn't Match My Mood
- Try being more specific in your description
- Use emotion keywords (happy, sad, angry, etc.)
- Generate another playlist - each one is unique

#### Can't Save Playlist
- Make sure you're logged in
- Check if you have a stable internet connection
- Try again in a few seconds

### 📊 Analytics

The system tracks:
- Mood submissions
- Emotion detections
- Playlist generations
- Play events
- Save events
- Rate limit hits

This helps improve the feature over time!

### 🎯 Next Steps

1. **Start the Backend**: Make sure your backend server is running
   ```bash
   cd backend
   npm start
   ```

2. **Start the Frontend**: Make sure your frontend is running
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Feature**: Navigate to `http://localhost:5173/mood-playlist` (or your frontend URL)

4. **Try It Out**: Enter a mood and generate your first AI playlist!

### 🔐 Authentication

- The mood playlist generator requires authentication
- Users must be logged in to generate playlists
- Shared playlists can be accessed without authentication

### 🌐 Browser Support

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### 📱 Mobile Experience

The feature is fully responsive and works great on mobile devices:
- Touch-friendly interface
- Optimized for small screens
- Fast loading times
- Native-like experience

---

## Quick Start Checklist

- [ ] Backend server is running
- [ ] Frontend server is running
- [ ] You're logged into Mavrixfy
- [ ] Navigate to "AI Mood Playlist" in sidebar
- [ ] Enter your mood (3-200 characters)
- [ ] Click "Generate Playlist"
- [ ] Enjoy your personalized music! 🎵

---

**Need Help?** Check the API documentation at `.kiro/specs/ai-mood-playlist-generator/API-DOCUMENTATION.md`
