import { 
  signOut as firebaseSignOut,
  updateProfile,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";

// Sign in with email and password
export const login = async (email: string, password: string) => {
  try {
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
    
    // Note: Liked songs are now automatically managed via Firestore
    // No manual migration needed when user logs in
    
    return user;
  } catch (error: any) {
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
      
    });
    
    // Update auth store
    useAuthStore.getState().setAuthStatus(true, user.uid);
    useAuthStore.getState().setUserProfile(fullName, undefined);
    
    return user;
  } catch (error: any) {
    throw new Error(error.message || "Failed to register");
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    useAuthStore.getState().reset();
  } catch (error: any) {
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
    
    // Update auth store
    useAuthStore.getState().setUserProfile(
      data.fullName || user.displayName || "",
      imageUrl || undefined
    );
    
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update profile");
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to send password reset email");
  }
};



// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
}; 