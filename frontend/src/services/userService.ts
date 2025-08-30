import { doc, getDoc, setDoc, updateDoc, serverTimestamp, FieldValue } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
  // Stats
  likedSongsCount: number;
  playlistsCount: number;
  // Preferences
  theme?: 'light' | 'dark' | 'system';
  qualityPreference?: 'low' | 'medium' | 'high';
}

// Get current user profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

// Create or update user profile
export const saveUserProfile = async (userData: Partial<UserProfile>): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      throw new Error("No authenticated user");
    }
    
    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);
    
    // Check if user already exists
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new user
      await setDoc(userRef, {
        uid,
        email: auth.currentUser.email || '',
        fullName: auth.currentUser.displayName || 'User',
        imageUrl: auth.currentUser.photoURL || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        likedSongsCount: 0,
        playlistsCount: 0,
        ...userData
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error saving user profile:", error);
    return false;
  }
};

// Update user stats (likes counts, playlist counts)
export const updateUserStats = async (stats: { 
  likedSongsCount?: number | FieldValue, 
  playlistsCount?: number | FieldValue 
}): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      throw new Error("No authenticated user");
    }
    
    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);
    
    await updateDoc(userRef, {
      ...stats,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating user stats:", error);
    return false;
  }
};

 