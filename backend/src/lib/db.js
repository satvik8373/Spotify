import mongoose from "mongoose";
import env from "./env.js";

let cachedConnection = null;

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  try {
    // If we have a cached connection, check if it's still valid
    if (cachedConnection) {
      if (mongoose.connection.readyState === 1) {
        console.log("Using cached database connection");
        return cachedConnection;
      } else {
        console.log("Cached connection is not ready, creating new connection");
        cachedConnection = null;
      }
    }

    // Check if we already have a connection
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      cachedConnection = mongoose.connection;
      return cachedConnection;
    }
    
    if (!env.MONGODB_URI) {
      console.error("MONGODB_URI is not defined");
      throw new Error("MONGODB_URI is not defined");
    }
    
    console.log("Connecting to MongoDB...");
    const conn = await mongoose.connect(env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 0,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    });
    
    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return cachedConnection;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.error("Full error:", error);
    
    // Don't exit in serverless environment
    if (env.NODE_ENV !== "production") {
      process.exit(1);
    }
    
    // Clear cached connection on error
    cachedConnection = null;
    throw error;
  }
}; 