# Mavrixfy Backend API

This is the backend API for the Mavrixfy application.

## Deployment on Vercel

The backend is configured to be deployed on Vercel. The setup includes:

1. A `vercel.json` file that configures how the API should be built and deployed
2. A build script in `package.json` that ensures proper build process
3. Environment variable handling for production and development environments
4. Special handling for Vercel-specific environment limitations

## API Endpoints

### Testing Endpoints

- `GET /api/test/health` - Check if the API is running
- `GET /api/test/db-status` - Check if the database is connected
- `GET /api/test/routes` - Get a list of all available routes

### Core Endpoints

- `GET /api/users` - User management
- `GET /api/songs` - Song management
- `GET /api/albums` - Album management
- `GET /api/playlists` - Playlist management
- `GET /api/music` - Music exploration and discovery
- `GET /api/spotify` - Spotify integration 

## Environment Variables

The following environment variables are required:

```
NODE_ENV=production
MONGODB_URI=your-mongodb-connection-string
CLERK_SECRET_KEY=your-clerk-secret-key
FRONTEND_URL=your-frontend-url
```

## Local Development

To run the backend locally:

```bash
npm install
npm run dev
```

## Vercel Deployment

The backend is set up to be deployed directly to Vercel through GitHub integration or using the Vercel CLI:

```bash
vercel
```

## Checking Deployment Status

After deployment, visit `/api/test/health` to verify that the API is functioning correctly. 