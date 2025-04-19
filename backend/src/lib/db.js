import mongoose from "mongoose";

let cachedConnection = null;

/**
 * Connect to MongoDB database
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async () => {
  if (cachedConnection) {
    console.log("Using cached database connection");
    return cachedConnection;
  }

  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    return null;
  }
}; 