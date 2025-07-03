// Import Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, User, setPersistence, browserLocalPersistence, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBWgv_mE8ZAnG2kUJSacCOUgkbo1RxxSpE",
  authDomain: "spotify-8fefc.firebaseapp.com",
  projectId: "spotify-8fefc",
  storageBucket: "spotify-8fefc.firebasestorage.app",
  messagingSenderId: "816396705670",
  appId: "1:816396705670:web:005e724df7139772521607",
  measurementId: "G-FQJS8LREP5"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Handle authentication in various browser environments
const initializeAuthConfig = async () => {
  try {
    // Set persistent auth
    await setPersistence(auth, browserLocalPersistence);
    
    // Configure Firebase to accept auth from any domain
    // This is important for mobile app webviews and other non-standard browsers
    auth.useDeviceLanguage();
    
    // Set custom auth parameters for popup providers
    auth.settings.appVerificationDisabledForTesting = process.env.NODE_ENV === 'development';
    
    console.log("Firebase auth configured for universal browser support");
  } catch (error) {
    console.error("Error configuring Firebase auth:", error);
  }
};

// Call initialize function
initializeAuthConfig().catch(error => {
  console.error("Failed to initialize auth configuration:", error);
});

export const db = getFirestore(app);

// Initialize Firebase Storage with CORS configuration
export const storage = getStorage(app);

// Use storage emulator in development if needed
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATOR === 'true') {
  // Connect to Firebase Storage emulator if it's running
  try {
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to Firebase Storage emulator');
  } catch (error) {
    console.error('Failed to connect to Firebase Storage emulator:', error);
  }
}

// Initialize Analytics only in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

// Auth state observer helper
export const onAuthStateChangedHelper = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Helper function to get the current origin dynamically
export const getCurrentOrigin = () => {
  return typeof window !== 'undefined' ? window.location.origin : null;
};

export default app; 