# Spotify Clone

A full-featured Spotify clone with real-time functionality, including:

- Music streaming from multiple sources
- User authentication with Google OAuth
- Liked songs functionality
- Search functionality across multiple music catalogs
- Mobile-responsive design

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

## Deployment with Vercel

Follow these steps to deploy the application to Vercel:

1. **Create a Vercel account**
   - Go to [vercel.com](https://vercel.com) and sign up or log in

2. **Install Vercel CLI** (optional)
   ```
   npm install -g vercel
   ```

3. **Configure Frontend deployment**
   - Connect your GitHub repository to Vercel
   - Set the following configuration:
     - Framework Preset: Vite
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `dist`

4. **Set up environment variables**
   - Add the following environment variables in Vercel project settings:
     ```
     VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
     ```

5. **Deploy**
   - Using Vercel Dashboard: Click "Deploy"
   - OR using Vercel CLI:
     ```
     cd frontend
     vercel
     ```

6. **Configure custom domain** (optional)
   - Go to your project settings in Vercel
   - Navigate to "Domains"
   - Add and configure your custom domain

7. **Set up automatic deployments**
   - Vercel will automatically deploy when you push to your repository

Your application will be accessible via the Vercel-provided URL or your custom domain.

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
