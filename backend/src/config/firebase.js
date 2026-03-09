import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let serviceAccount;

try {
  // Try to load service account from environment variable (JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('[Firebase] Loading credentials from FIREBASE_SERVICE_ACCOUNT env var');
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } 
  // Try individual environment variables (Vercel-friendly)
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    console.log('[Firebase] Loading credentials from individual env vars');
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };
  }
  // Or from a path on disk (local development)
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('[Firebase] Loading credentials from file path');
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const fullPath = credPath.startsWith('.') ? path.resolve(process.cwd(), credPath) : credPath;
    serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  }
  else {
    console.warn('[Firebase] No service account provided. Using Application Default Credentials.');
  }
} catch (error) {
  console.error('[Firebase] Error loading credentials:', error.message);
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'spotify-8fefc',
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://spotify-8fefc-default-rtdb.firebaseio.com',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'spotify-8fefc.firebasestorage.app',
      });
      console.log('[Firebase] Admin SDK initialized successfully with service account');
      console.log('[Firebase] Project ID:', serviceAccount.project_id);
    } else {
      // Fallback: Use application default credentials with explicit project ID
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'spotify-8fefc',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'spotify-8fefc.firebasestorage.app',
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://spotify-8fefc-default-rtdb.firebaseio.com'
      });
      console.log('[Firebase] Admin SDK initialized with default credentials');
    }
  } catch (error) {
    console.error('[Firebase] Error initializing Admin SDK:', error.message);
    throw error;
  }
} else {
  console.log('[Firebase] Admin SDK already initialized');
}

export default admin; 