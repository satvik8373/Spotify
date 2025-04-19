# Spotify Clone

A full-featured Spotify clone with real-time functionality, including:

- Music streaming from multiple sources
- User authentication with Google OAuth
- Liked songs functionality
- Search functionality across multiple music catalogs
- Mobile-responsive design

## Live Demo

- **Frontend**: [https://mavrixfilms.live/](https://mavrixfilms.live/)
- **Backend**: [https://spotify-delta-puce.vercel.app/](https://spotify-delta-puce.vercel.app/)

## Features

- **Music player**: Full-featured audio player with play/pause, skip, shuffle, and repeat
- **Real-time music discovery**: Trending songs, new releases, Bollywood, Hollywood, and more
- **Authentication**: Google sign-in integration
- **Liked Songs**: Save and manage your favorite songs
- **Search**: Find songs across multiple music catalogs

## Technologies Used

- **Frontend**: React, TypeScript, TailwindCSS, Zustand
- **Authentication**: Clerk
- **API**: External music APIs with proxy endpoints
- **Styling**: Modern UI with responsive design
- **Deployment**: Frontend on custom domain, Backend on Vercel

## Installation

1. Clone the repository
2. Install dependencies
   ```
   cd frontend
   npm install
   ```
3. Start the development server
   ```
   npm run dev
   ```

## Credits

This project was created as a learning exercise.

<h1 align="center">Realtime Spotify Application ✨</h1>

![Demo App](/frontend/public/screenshot-for-readme.png)

[Watch Full Tutorial on Youtube](https://youtu.be/4sbklcQ0EXc)

About This Course:

-   🎸 Listen to music, play next and previous songs
-   🔈 Update the volume with a slider
-   🎧 Admin dashboard to create albums and songs
-   💬 Real-time Chat App integrated into Spotify
-   👨🏼‍💼 Online/Offline status
-   👀 See what other users are listening to in real-time
-   📊 Aggregate data for the analytics page
-   🚀 And a lot more...

### Setup .env file in _backend_ folder

```bash
PORT=...
MONGODB_URI=...
ADMIN_EMAIL=...
NODE_ENV=...

CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_CLOUD_NAME=...


CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

### Setup .env file in _frontend_ folder

```bash
VITE_CLERK_PUBLISHABLE_KEY=...
```
