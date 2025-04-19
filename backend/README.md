# Spotify Clone Backend

This is the backend for the Spotify Clone application.

## Environment Variables

The following environment variables are required for the application to work properly:

### Required Variables

- `MONGODB_URI`: MongoDB connection string
- `CLERK_PUBLISHABLE_KEY`: Clerk publishable key for authentication
- `CLERK_SECRET_KEY`: Clerk secret key for authentication

### Optional Variables

- `PORT`: Port number (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `ADMIN_EMAIL`: Admin email address
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `FRONTEND_URL`: Frontend URL (default: https://spotify-clone-satvik8373.vercel.app)

## Vercel Deployment

To deploy to Vercel, follow these steps:

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Set up the following environment variables in Vercel:

```
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/?retryWrites=true&w=majority
CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.vercel.app
```

4. Deploy your application

## Local Development

To run the application locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables
4. Run the development server: `npm run dev`

## API Endpoints

- `GET /api/health`: Health check endpoint
- `GET /api/users`: Get all users
- `GET /api/songs`: Get all songs
- `GET /api/albums`: Get all albums
- `GET /api/spotify`: Spotify API endpoints
- `GET /api/music`: Music API endpoints

## Troubleshooting

If you encounter a 500 error in Vercel:

1. Check the Vercel logs for detailed error messages
2. Verify that all required environment variables are set
3. Test the `/api/health` endpoint to verify the server is running
4. Check the MongoDB connection string for validity
5. Ensure Clerk authentication is properly configured