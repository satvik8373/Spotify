import mongoose from "mongoose";
import env from "./env.js";

let cachedConnection = null;

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  if (cachedConnection) {
    console.log("Using cached database connection");
    return cachedConnection;
  }

  try {
    // Check if we already have a connection
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      cachedConnection = mongoose.connection;
      return cachedConnection;
    }
    
    if (!env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined");
    }
    
    const conn = await mongoose.connect(env.MONGODB_URI, {
      // These options help with serverless environments
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return cachedConnection;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Don't exit in serverless environment
    if (env.NODE_ENV !== "production") {
      process.exit(1);
    }
    throw error; // Re-throw the error to be handled by the caller
  }
}; 