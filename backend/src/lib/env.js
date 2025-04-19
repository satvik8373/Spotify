import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
];

// Check for missing environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  
  // In development, we can exit, but in production we should continue
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  } else {
    console.warn('Continuing with missing environment variables in production mode');
  }
}

// Validate MongoDB URI format
const validateMongoDBUri = (uri) => {
  if (!uri) return false;
  try {
    // Basic validation for MongoDB URI format
    return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
  } catch (error) {
    console.error('Error validating MongoDB URI:', error);
    return false;
  }
};

// Set default values for optional environment variables
const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://spotify-clone-satvik8373.vercel.app',
};

// Validate MongoDB URI
if (env.MONGODB_URI && !validateMongoDBUri(env.MONGODB_URI)) {
  console.error('Invalid MongoDB URI format');
  if (env.NODE_ENV !== 'production') {
    process.exit(1);
  }
}

export default env; 