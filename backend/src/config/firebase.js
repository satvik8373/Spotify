import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let serviceAccount;

try {
  // Try to load service account from environment variable (JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } 
  // Or from a path on disk
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  }
  else {
    console.warn("No Firebase service account provided in environment variables. Using Application Default Credentials.");
  }
} catch (error) {
  console.error("Error loading Firebase credentials:", error);
}

// Validate required environment variables
const requiredEnvVars = ['FIREBASE_PROJECT_ID'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  console.error('Please create a .env file in the backend directory with the required variables.');
  console.error('You can copy .env.example and fill in the values.');
  process.exit(1);
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const config = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    };

    if (serviceAccount) {
      config.credential = admin.credential.cert(serviceAccount);
      console.log("Firebase Admin SDK initialized with service account");
    } else {
      // Try to use Application Default Credentials
      console.log("Firebase Admin SDK initialized with Application Default Credentials");
    }

    admin.initializeApp(config);
    console.log(`Firebase Admin SDK initialized successfully for project: ${process.env.FIREBASE_PROJECT_ID}`);
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    console.error("This might be because:");
    console.error("1. Firebase service account is not configured");
    console.error("2. Application Default Credentials are not set up");
    console.error("3. Network connectivity issues");
    console.error("\nFor development, you can:");
    console.error("1. Add FIREBASE_SERVICE_ACCOUNT to your .env file");
    console.error("2. Or set up Application Default Credentials with 'gcloud auth application-default login'");
    
    // Don't exit in development - let the app start but Firebase features won't work
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.warn("⚠️  Firebase not initialized - authentication features will not work");
    }
  }
}

export default admin; 