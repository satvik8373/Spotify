# Mavrixfy Web App - Music Streaming Platform

A full-stack web music streaming application with React frontend and Node.js backend.

## Project Structure

```
mavrixfy-web/
├── frontend/          # React web application
├── backend/           # Node.js/Express API server
├── functions/         # Firebase Cloud Functions
└── firestore.rules    # Firestore security rules
```

## Quick Start

### Prerequisites

- Node.js 20.x
- Firebase account
- Spotify Developer account

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with:
   - Firebase credentials
   - Spotify API keys
   - Other required environment variables

5. Start development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with:
   - Firebase config
   - Spotify client ID
   - API URL

5. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables

### Backend (.env)
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON
- `SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret
- `FRONTEND_URL` - Frontend URL for CORS

### Frontend (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_FIREBASE_*` - Firebase configuration
- `VITE_SPOTIFY_CLIENT_ID` - Spotify client ID
- `VITE_REDIRECT_URI` - Spotify callback URL

## Deployment

### Backend (Vercel)
```bash
cd backend
vercel deploy --prod
```

### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel deploy --prod
```

## Features

### Web App
- ✅ Spotify integration for music streaming
- ✅ User authentication (Firebase)
- ✅ Playlist management
- ✅ Liked songs
- ✅ Search functionality
- ✅ Real-time sync

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `GET /api/songs/search` - Search songs
- `GET /api/liked-songs` - Get liked songs
- `POST /api/spotify/callback` - Spotify OAuth callback

## Tech Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router
- Zustand (state management)

### Backend
- Node.js
- Express.js
- Firebase Admin SDK
- Spotify Web API
- CORS enabled

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.