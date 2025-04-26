import mongoose from "mongoose";

/**
 * Connect to MongoDB database with retry logic for production environment
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;
  let connected = false;
  
  // Get MongoDB URI or handle missing configuration gracefully
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("MONGODB_URI environment variable is not set!");
    if (process.env.NODE_ENV === 'production') {
      console.error("This is critical for production environment. Please set it in your Vercel project settings.");
      
      // On Vercel, mark the DB as having failed rather than throw
      if (process.env.VERCEL) {
        global.dbConnectionFailed = true;
        return null;
      }
    }
    throw new Error("MongoDB connection string not found");
  }

  // Connection options
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: process.env.VERCEL ? 10000 : 5000, // Give Vercel more time
    socketTimeoutMS: 45000,
    // Auto create indexes on all environments except production
    autoIndex: process.env.NODE_ENV !== 'production'
  };

  // Retry logic for production
  while (!connected && retries < MAX_RETRIES) {
    try {
      if (retries > 0) {
        console.log(`Retrying MongoDB connection (attempt ${retries + 1}/${MAX_RETRIES})...`);
        // Exponential backoff for retries
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
      
      const conn = await mongoose.connect(MONGODB_URI, options);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      
      // Add connection event listeners
      mongoose.connection.on('error', err => {
        console.error('MongoDB connection error:', err);
        global.dbConnectionFailed = true;
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        global.dbConnectionFailed = true;
      });
      
      // Clear any previous connection failure flag
      global.dbConnectionFailed = false;
      connected = true;
      return conn;
    } catch (error) {
      console.error(`MongoDB connection attempt ${retries + 1} failed:`, error.message);
      
      // Show more detailed error info
      if (error.name === 'MongoNetworkError') {
        console.error('This appears to be a network connectivity issue.');
      } else if (error.name === 'MongoServerSelectionError') {
        console.error('Could not select a MongoDB server. Check your connection string and network.');
      }
      
      retries++;
      if (retries >= MAX_RETRIES) {
        console.error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts.`);
        
        // On Vercel, set a global flag rather than throwing
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          global.dbConnectionFailed = true;
          return null;
        }
        
        throw error;
      }
    }
  }
}; 