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
export const login = async (email: string, password: string): Promise<User | null> => {
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
      // Return the Firebase user instead of the userProfile to fix type error
      return firebaseUser;
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
export const register = async (email: string, password: string, fullName: string) => {
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
    
    return user;
  } catch (error: any) {
    console.error("Error in register:", error);
    throw new Error(error.message || "Failed to register");
  }
};

// Sign out
export const signOut = async () => {
  try {
    // Start timer for performance tracking
    const startTime = performance.now();
    
    // Get current user ID before signing out
    const userId = auth.currentUser?.uid;
    
    // Reset auth store immediately for faster UI response
    useAuthStore.getState().reset();
    
    // Create a promise for Firebase signout
    const firebaseSignOutPromise = firebaseSignOut(auth);
    
    // If we have a backend API and user ID, create a promise for backend signout
    let backendSignOutPromise = Promise.resolve();
    if (API_URL && userId) {
      backendSignOutPromise = (async () => {
        try {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: userId })
          });
        } catch (error) {
          console.warn('Backend logout failed, but Firebase logout will still proceed:', error);
        }
      })();
    }
    
    // Wait for both operations to complete
    await Promise.all([firebaseSignOutPromise, backendSignOutPromise]);
    
    // Clear any auth-related cached data
    localStorage.removeItem('firebase:previous_websocket_failure');
    
    console.log(`Signout completed in ${Math.round(performance.now() - startTime)}ms`);
  } catch (error: any) {
    console.error("Error in signOut:", error);
    throw new Error(error.message || "Failed to sign out");
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
export const signInWithGoogle = async () => {
  try {
    // Start timer for performance tracking
    const startTime = performance.now();
    
    // Configure Google provider with optimized settings
    const provider = new GoogleAuthProvider();
    
    // Add login hint for faster authentication if user has logged in before
    provider.setCustomParameters({
      prompt: 'select_account',
      // Enable one-tap sign-in for returning users
      'login_hint': localStorage.getItem('lastGoogleEmail') || ''
    });
    
    // Start Firebase popup authentication
    const userCredentialPromise = signInWithPopup(auth, provider);
    
    // Set loading state to true 
    useAuthStore.getState().isLoading = true;
    
    // Wait for Firebase authentication
    const userCredential = await userCredentialPromise;
    const user = userCredential.user;
    
    // Store email for faster future logins
    if (user.email) {
      localStorage.setItem('lastGoogleEmail', user.email);
    }
    
    // Optimistically update auth store immediately after authentication
    // Don't wait for Firestore or backend sync
    useAuthStore.getState().setAuthStatus(true, user.uid);
    useAuthStore.getState().setUserProfile(
      user.displayName || "",
      user.photoURL || undefined
    );
    
    console.log(`Google auth completed in ${Math.round(performance.now() - startTime)}ms`);
    
    // Now we can perform the following operations in parallel
    // since we've already authenticated the user
    
    // Create a batch of promises to run in parallel
    const promises = [];
    
    // 1. Check if user exists in Firestore and create if needed
    promises.push((async () => {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user document in Firestore
        await setDoc(userDocRef, {
          email: user.email,
          fullName: user.displayName,
          imageUrl: user.photoURL,
          createdAt: new Date().toISOString(),
          isAdmin: false,
        });
      }
    })());
    
    // 2. Handle backend sync if API_URL is available
    if (API_URL) {
      promises.push((async () => {
        try {
          // Get Firebase ID token - no need to force refresh
          const idToken = await user.getIdToken();
          
          // Set auth header for all future requests
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
          
          // Call backend API to sync user
          await axiosInstance.post('/api/auth/sync', {
            email: user.email,
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL
          }).catch(err => {
            console.warn('Failed to sync Google user with backend, but Firebase auth successful');
          });
        } catch (error) {
          // Don't block the authentication flow if backend sync fails
          console.warn('Backend sync failed for Google login, but Firebase auth successful:', error);
        }
      })());
    }
    
    // 3. Migrate any liked songs from anonymous user
    promises.push(migrateAnonymousLikedSongs(user.uid).catch(error => {
      console.warn('Failed to migrate liked songs, but login successful:', error);
    }));
    
    // Wait for all the promises to complete - but don't block the UI
    // This runs in the background
    Promise.all(promises).then(() => {
      console.log(`Complete Google login flow finished in ${Math.round(performance.now() - startTime)}ms`);
    }).catch(error => {
      console.warn("Background tasks completed with some errors:", error);
    }).finally(() => {
      useAuthStore.getState().isLoading = false;
    });
    
    // Return authenticated user immediately
    return user;
  } catch (error: any) {
    useAuthStore.getState().isLoading = false;
    console.error("Error in Google login:", error);
    throw new Error(error.message || "Failed to login with Google");
  }
};

// Add a refresh user data function that can be called from components
export const refreshUserData = async (): Promise<User | null> => {
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
    
    return currentUser;
  } catch (error) {
    console.error("Error refreshing user data:", error);
    return null;
  }
}; 