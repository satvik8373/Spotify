import { 
  signOut as firebaseSignOut,
  updateProfile,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { migrateAnonymousLikedSongs } from "@/services/likedSongsService";
import axiosInstance from "@/lib/axios";
import { Timestamp } from "firebase/firestore";

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Hybrid authentication service that works with both Firebase and the backend API
 * - Uses Firebase for authentication
 * - Creates user in Firestore database
 * - Syncs user data with backend API
 */

// Cache login attempts to prevent duplicate calls
const loginCache = new Map();

// Define FirestoreUser interface
interface FirestoreUser {
  uid: string;
  email: string | null;
  displayName?: string;
  photoURL?: string | null;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

// Define custom user profile interface
interface UserProfile {
  id: string;
  email: string | null;
  name: string;
  picture: string | null;
}

// Sign in with email and password
export const login = async (email: string, password: string): Promise<UserProfile | null> => {
  try {
    // Generate a cache key
    const cacheKey = `${email}:${Date.now()}`;
    
    // Check if we have an ongoing login attempt with this email
    const existingLoginPromise = loginCache.get(email);
    if (existingLoginPromise) {
      console.log("Using cached login promise for", email);
      return existingLoginPromise;
    }

    // Create a promise for this login attempt and cache it
    const loginPromise = (async () => {
      console.log("Starting login process for", email);
      
      // Step 1: Firebase Authentication
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Firebase Auth Error:", errorCode, errorMessage);
        
        // Provide more user-friendly error messages
        if (errorCode === 'auth/user-not-found') {
          throw new Error("No account found with this email address");
        } else if (errorCode === 'auth/wrong-password') {
          throw new Error("Incorrect password");
        } else if (errorCode === 'auth/too-many-requests') {
          throw new Error("Too many failed login attempts. Please try again later or reset your password");
        } else if (errorCode === 'auth/invalid-credential') {
          throw new Error("Invalid login credentials");
        } else {
          throw new Error(`Authentication failed: ${errorMessage}`);
        }
      }
      
      if (!userCredential?.user) {
        throw new Error("Login failed: No user returned from Firebase");
      }
      
      const firebaseUser = userCredential.user;
      
      // Get fresh ID token with short timeout
      const idToken = await firebaseUser.getIdToken(true);
      
      // Step 2: Fetch Firestore User Profile with retry
      let firestoreUser = null;
      let retryCount = 0;
      const MAX_RETRIES = 3;
      
      while (retryCount < MAX_RETRIES) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            firestoreUser = userDoc.data() as FirestoreUser;
            break;
          } else if (retryCount === MAX_RETRIES - 1) {
            console.warn("User document not found in Firestore. Creating new profile...");
            // Create a basic profile if not found on final retry
            firestoreUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || email,
              displayName: firebaseUser.displayName || email.split('@')[0],
              photoURL: firebaseUser.photoURL || null,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };
            
            await setDoc(doc(db, "users", firebaseUser.uid), firestoreUser);
          }
        } catch (error) {
          console.error(`Error fetching user document (attempt ${retryCount + 1}):`, error);
          retryCount++;
          
          if (retryCount === MAX_RETRIES) {
            console.error("Max retries reached for fetching user document");
            // Continue with available data instead of failing
            firestoreUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || email,
              displayName: firebaseUser.displayName || email.split('@')[0],
              photoURL: firebaseUser.photoURL || null,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
          }
        }
      }

      // Step 3: Update Auth Store
      const userProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        name: firestoreUser?.displayName || firebaseUser.displayName || email.split('@')[0],
        picture: firestoreUser?.photoURL || firebaseUser.photoURL || null,
      };
      
      // Set user auth state in store before backend sync for faster UI updates
      useAuthStore.getState().setAuthStatus(true, firebaseUser.uid);
      useAuthStore.getState().setUserProfile(userProfile.name, userProfile.picture || undefined);
      
      // Step 4: Sync with Backend API (optional, do in background)
      try {
        // Attempt backend sync but don't block login process
        await syncWithBackend(idToken, firebaseUser);
      } catch (error) {
        console.warn("Could not initiate backend sync, continuing with Firebase auth:", error);
      }
      
      // Step 5: Handle Anonymous User Data Migration (if present)
      try {
        await migrateAnonymousLikedSongs(firebaseUser.uid);
      } catch (error) {
        console.warn("Error migrating liked songs:", error);
        // Continue without failing the login
      }
      
      console.log("Login completed successfully for", email);
      return userProfile;
    })();
    
    // Store the promise in the cache
    loginCache.set(email, loginPromise);
    
    // Set a timeout to clear the cache entry to prevent memory leaks
    setTimeout(() => {
      loginCache.delete(email);
    }, 30000); // Clear after 30 seconds
    
    return await loginPromise;
  } catch (error: any) {
    console.error("Login failed:", error);
    // Clear cache on error
    loginCache.delete(email);
    throw error;
  }
};

// Helper function to synchronize with the backend
async function syncWithBackend(idToken: string, firebaseUser: any) {
  try {
    // Set the auth token for API requests
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
    
    // Sync user with backend
    const response = await axiosInstance.post('/api/auth/firebase-login', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    });
    
    return response.data;
  } catch (error) {
    console.error("Error syncing with backend:", error);
    throw error;
  }
}

// Register new user
export const register = async (email: string, password: string, fullName: string): Promise<UserProfile> => {
  try {
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, {
      displayName: fullName,
    });
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      fullName,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      isAdmin: false,
    });
    
    // Create a user profile object
    const userProfile: UserProfile = {
      id: user.uid,
      email: user.email,
      name: fullName,
      picture: null
    };
    
    // Synchronize with backend if it's available
    if (API_URL) {
      try {
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
        // Call backend API to create user
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            email,
            fullName,
            uid: user.uid
          })
        });
        
        if (!response.ok) {
          console.warn('Failed to register user with backend, but Firebase registration successful');
        }
      } catch (error) {
        console.warn('Backend registration failed, but Firebase registration successful:', error);
      }
    }
    
    // Update auth store
    useAuthStore.getState().setAuthStatus(true, user.uid);
    useAuthStore.getState().setUserProfile(fullName, undefined);
    
    return userProfile;
  } catch (error: any) {
    console.error("Error in register:", error);
    throw new Error(error.message || "Failed to register");
  }
};

// Sign out
export const signOut = async () => {
  try {
    // Get current user ID before signing out
    const userId = auth.currentUser?.uid;
    
    // Reset auth store before Firebase signout for faster UI response
    useAuthStore.getState().reset();
    
    // Sign out from Firebase (can be slow sometimes)
    await firebaseSignOut(auth);
    
    // Sign out from backend if it's available (do in background)
    if (API_URL && userId) {
      fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uid: userId })
      }).catch(error => {
        console.warn('Backend logout error:', error);
      });
    }
    
    // Clear auth-related localStorage items
    localStorage.removeItem('firebase:authUser:AIzaSyBWgv_mE8ZAnG2kUJSacCOUgkbo1RxxSpE:[DEFAULT]');
    localStorage.removeItem('auth-store');
    
    // Clear any potential Firebase auth related items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('firebase') || key.includes('auth'))) {
        localStorage.removeItem(key);
      }
    }
    
    // Also clear session storage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('firebase') || key.includes('auth'))) {
        sessionStorage.removeItem(key);
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in signOut:", error);
    // Still reset store even if Firebase logout fails
    useAuthStore.getState().reset();
    
    // Don't throw error, just return success: false
    return { success: false, error: error.message };
  }
};

// Update user profile
export const updateUserProfile = async (user: User, data: { 
  fullName?: string, 
  imageFile?: File 
}) => {
  try {
    let imageUrl = user.photoURL;
    
    // Upload image if provided
    if (data.imageFile) {
      const storageRef = ref(storage, `profile-images/${user.uid}`);
      await uploadBytes(storageRef, data.imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }
    
    // Update display name if provided
    if (data.fullName) {
      await updateProfile(user, {
        displayName: data.fullName,
        ...(imageUrl ? { photoURL: imageUrl } : {})
      });
    } else if (imageUrl !== user.photoURL) {
      await updateProfile(user, {
        photoURL: imageUrl
      });
    }
    
    // Update user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      fullName: data.fullName || user.displayName,
      imageUrl: imageUrl,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    // Synchronize with backend if it's available
    if (API_URL) {
      try {
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
        // Call backend API to update user
        const response = await fetch(`${API_URL}/api/auth/update-profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            uid: user.uid,
            fullName: data.fullName || user.displayName,
            imageUrl: imageUrl
          })
        });
        
        if (!response.ok) {
          console.warn('Failed to update profile with backend, but Firebase update successful');
        }
      } catch (error) {
        console.warn('Backend profile update failed, but Firebase update successful:', error);
      }
    }
    
    // Update auth store
    useAuthStore.getState().setUserProfile(
      data.fullName || user.displayName || "",
      imageUrl || undefined
    );
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateUserProfile:", error);
    throw new Error(error.message || "Failed to update profile");
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    
    // Notify backend if it's available
    if (API_URL) {
      try {
        const response = await fetch(`${API_URL}/api/auth/reset-password-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
          console.warn('Failed to notify backend about password reset, but Firebase reset successful');
        }
      } catch (error) {
        console.warn('Backend password reset notification failed, but Firebase reset successful:', error);
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in resetPassword:", error);
    throw new Error(error.message || "Failed to send password reset email");
  }
};

// Check if user is admin
export const checkAdminStatus = async (uid: string) => {
  try {
    // First check Firestore
    const userDoc = await getDoc(doc(db, "users", uid));
    const userData = userDoc.data();
    
    if (userData?.isAdmin === true) {
      return true;
    }
    
    // If not in Firestore, check backend
    if (API_URL) {
      try {
        // Get Firebase ID token
        const idToken = await auth.currentUser?.getIdToken();
        
        // Call backend API to check admin status
        const response = await fetch(`${API_URL}/api/auth/check-admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ uid })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.isAdmin === true;
        }
      } catch (error) {
        console.warn('Backend admin check failed, using Firestore result:', error);
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserProfile> => {
  try {
    // Cache check - prevent duplicate signins
    const cacheKey = `google:${Date.now()}`;
    
    // Create a new GoogleAuthProvider instance with universal browser support
    const provider = new GoogleAuthProvider();
    
    // Add scopes for better auth data
    provider.addScope('profile');
    provider.addScope('email');
    
    // Configure provider with parameters that work in all browsers
    provider.setCustomParameters({
      // Force account selection even when one account is available
      prompt: 'select_account',
      // Allow redirect in WebView and mobile app browsers
      display: 'popup',
      // Enable multiple domains support
      hd: '*'
    });
    
    // Start Firebase authentication
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    // Create a user profile object
    const userProfile: UserProfile = {
      id: user.uid,
      email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'User',
      picture: user.photoURL,
    };
    
    // Update auth store immediately for faster UI response
    useAuthStore.getState().setAuthStatus(true, user.uid);
    useAuthStore.getState().setUserProfile(
      userProfile.name,
      userProfile.picture || undefined
    );
    
    // Perform Firestore and backend operations in the background 
    // without blocking the UI response
    (async () => {
      try {
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
          // Create user document in Firestore if this is their first sign in
          await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            fullName: user.displayName,
            imageUrl: user.photoURL,
            createdAt: new Date().toISOString(),
            isAdmin: false,
          });
        }
        
        // Synchronize with backend if available (non-blocking)
        if (API_URL) {
          try {
            // Call backend API to sync user
            const response = await fetch(`${API_URL}/api/auth/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                email: user.email,
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL
              })
            });
            
            if (!response.ok) {
              console.warn('Failed to sync Google user with backend, but Firebase auth successful');
            }
          } catch (error) {
            console.warn('Backend sync failed for Google login, but Firebase auth successful:', error);
          }
        }
        
        // Migrate any liked songs from anonymous user
        await migrateAnonymousLikedSongs(user.uid);
      } catch (error) {
        console.error("Background operations failed, but user is authenticated:", error);
      }
    })();
    
    return userProfile;
  } catch (error: any) {
    console.error("Error in Google login:", error);
    
    // Provide more helpful error messages for various browser environments
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Sign in was cancelled. Please try again.");
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error("Sign in popup was blocked. Please allow popups for this site or try in a different browser.");
    } else if (error.code === 'auth/cancelled-popup-request') {
      throw new Error("Another sign in attempt is in progress. Please try again.");
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error("Network error. Please check your internet connection and try again.");
    } else if (error.code === 'auth/unauthorized-domain') {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
      console.error(`Unauthorized domain: ${currentOrigin}`);
      throw new Error(`This domain (${currentOrigin}) is not authorized for Firebase authentication. Please contact support.`);
    } else {
      throw new Error(error.message || "Failed to login with Google");
    }
  }
};

// Add a refresh user data function that can be called from components
export const refreshUserData = async (): Promise<UserProfile | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }
    
    // Get fresh ID token
    const idToken = await currentUser.getIdToken(true);
    
    // Fetch user data from Firestore
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    let firestoreUser = null;
    
    if (userDoc.exists()) {
      firestoreUser = userDoc.data() as FirestoreUser;
    }
    
    // Update auth store
    const userProfile: UserProfile = {
      id: currentUser.uid,
      email: currentUser.email,
      name: firestoreUser?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      picture: firestoreUser?.photoURL || currentUser.photoURL || null,
    };
    
    useAuthStore.getState().setAuthStatus(true, currentUser.uid);
    useAuthStore.getState().setUserProfile(userProfile.name, userProfile.picture || undefined);
    
    return userProfile;
  } catch (error) {
    console.error("Error refreshing user data:", error);
    return null;
  }
};

// Helper function to check if current domain is in Firebase authorized domains
export const checkCurrentDomain = async () => {
  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : null;
    if (!currentOrigin) return { authorized: false, message: 'Cannot determine current origin' };
    
    const hostname = new URL(currentOrigin).hostname;
    
    console.log(`Current origin: ${currentOrigin}`);
    console.log(`Hostname: ${hostname}`);
    
    // List of known good domains that should work with Firebase
    const knownDomains = [
      'localhost',
      '127.0.0.1',
      'spotify-8fefc.firebaseapp.com',
      'spotify-8fefc.web.app'
    ];
    
    if (knownDomains.includes(hostname)) {
      return { 
        authorized: true, 
        message: `Domain ${hostname} is a known authorized domain.` 
      };
    }
    
    // Check if it's an IP address (often used in testing)
    const isIPAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    
    if (isIPAddress) {
      return { 
        authorized: false, 
        message: `${hostname} appears to be an IP address. Firebase authentication may not work. Add this IP to your Firebase authorized domains.` 
      };
    }
    
    return { 
      authorized: false, 
      message: `Domain ${hostname} may not be authorized in Firebase. If authentication fails, add this domain to your Firebase authorized domains list.` 
    };
  } catch (error) {
    console.error("Error checking domain:", error);
    return { authorized: false, message: 'Error checking domain authorization status' };
  }
}; 