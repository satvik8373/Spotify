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

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Optional database URL
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        // Optional storage bucket
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } else {
      // Use application default credentials (for environments like Cloud Run)
      admin.initializeApp();
    }
    
    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
  }
}

export default admin; 