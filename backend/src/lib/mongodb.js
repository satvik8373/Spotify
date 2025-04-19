import mongoose from 'mongoose';
import env from './env.js';

// This is a workaround for Vercel serverless functions
// We need to maintain a connection across function invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB database
 * @returns {Promise<typeof mongoose>}
 */
export async function connectToDatabase() {
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 0,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    };

    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    console.log('Connecting to MongoDB...');
    cached.promise = mongoose.connect(env.MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }
} 