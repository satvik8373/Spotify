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

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Hybrid authentication service that works with both Firebase and the backend API
 * - Uses Firebase for authentication
 * - Creates user in Firestore database
 * - Syncs user data with backend API
 */

// Sign in with email and password
export const login = async (email: string, password: string) => {
  try {
    // First authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    // Update auth store
    useAuthStore.getState().setAuthStatus(true, user.uid);
    useAuthStore.getState().setUserProfile(
      userData?.fullName || user.displayName || "",
      userData?.imageUrl || user.photoURL || undefined
    );
    
    // Synchronize with backend if it's available
    if (API_URL) {
      try {
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
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
            displayName: userData?.fullName || user.displayName,
            photoURL: userData?.imageUrl || user.photoURL
          })
        });
        
        if (!response.ok) {
          console.warn('Failed to sync user with backend, but Firebase auth successful');
        }
      } catch (error) {
        console.warn('Backend sync failed, but Firebase auth successful:', error);
      }
    }
    
    // Migrate any liked songs from anonymous user
    migrateAnonymousLikedSongs(user.uid);
    
    return user;
  } catch (error: any) {
    console.error("Error in login:", error);
    throw new Error(error.message || "Failed to login");
  }
};

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
    // Get current user ID before signing out
    const userId = auth.currentUser?.uid;
    
    // Sign out from Firebase
    await firebaseSignOut(auth);
    
    // Reset auth store
    useAuthStore.getState().reset();
    
    // Sign out from backend if it's available
    if (API_URL && userId) {
      try {
        const response = await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uid: userId })
        });
        
        if (!response.ok) {
          console.warn('Failed to logout from backend, but Firebase logout successful');
        }
      } catch (error) {
        console.warn('Backend logout failed, but Firebase logout successful:', error);
      }
    }
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
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    // Check if user already exists in Firestore
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
    
    // Synchronize with backend if it's available
    if (API_URL) {
      try {
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
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
    
    // Update auth store
    useAuthStore.getState().setAuthStatus(true, user.uid);
    useAuthStore.getState().setUserProfile(
      user.displayName || "",
      user.photoURL || undefined
    );
    
    // Migrate any liked songs from anonymous user
    migrateAnonymousLikedSongs(user.uid);
    
    return user;
  } catch (error: any) {
    console.error("Error in Google login:", error);
    throw new Error(error.message || "Failed to login with Google");
  }
}; 